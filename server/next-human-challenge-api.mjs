import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import Busboy from "busboy";
import { ObjectId } from "mongodb";
import {
  CHALLENGE_LEVEL_COUNT,
  CHALLENGE_LEVEL_ONE_OPENS_ON,
  CHALLENGE_LEVEL_ONE_QUESTION_IDS,
  CHALLENGE_POOL_SIZE,
  CHALLENGE_QUESTION_COUNT,
  CHALLENGE_UNSCHEDULED_OPENS_ON,
  defaultQuestionPoolForLevel,
} from "./next-human-challenge-bank.mjs";

const LEVEL_MIN = 1;
const LEVEL_MAX = CHALLENGE_LEVEL_COUNT;
const QUESTION_COUNT = CHALLENGE_QUESTION_COUNT;
const CHALLENGE_KEY = "next-human-challenge-2026";
const SPONSOR_MEDIA_ROOT = process.env.SAS_DOCUMENT_STORAGE_DIR || path.resolve("var", "participation-documents");
const SPONSOR_MEDIA_DIR = path.join(SPONSOR_MEDIA_ROOT, "next-human-challenge-sponsors");
const SPONSOR_TEMP_DIR = path.join(SPONSOR_MEDIA_ROOT, "next-human-challenge-temp");
const MAX_SPONSOR_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_SPONSOR_LOGOS = new Map([["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);

function clean(value, maxLength = 500) {
  return String(value ?? "").replace(/\0/g, "").trim().slice(0, maxLength);
}

function levelNumber(value) {
  const level = Number(value);
  return Number.isInteger(level) && level >= LEVEL_MIN && level <= LEVEL_MAX ? level : 0;
}

function objectId(value) {
  return ObjectId.isValid(String(value || "")) ? new ObjectId(String(value)) : null;
}

function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function defaultOpeningDate(level) {
  if (Number(level) === 1) return CHALLENGE_LEVEL_ONE_OPENS_ON;
  return CHALLENGE_UNSCHEDULED_OPENS_ON;
}

function releaseStatus(opensOn, today = indiaDateKey()) {
  if (!opensOn || opensOn === CHALLENGE_UNSCHEDULED_OPENS_ON) return "closed";
  return opensOn <= today ? "live" : "scheduled";
}

function questionView(question) {
  return {
    id: clean(question.id || question._id, 100),
    subject: clean(question.subject, 100) || "General discovery",
    prompt: clean(question.prompt, 700),
    choices: Array.isArray(question.choices) ? question.choices.slice(0, 4).map(value => clean(value, 350)) : [],
    correctAnswer: clean(question.correctAnswer || question.answer, 350),
    note: clean(question.note, 900),
    source: clean(question.source, 30) || "curated",
  };
}

function defaultLevelSettings(level) {
  const pool = defaultQuestionPoolForLevel(level);
  const poolIds = new Set(pool.map(question => question.id));
  const launchSelection = level === 1 ? CHALLENGE_LEVEL_ONE_QUESTION_IDS.filter(id => poolIds.has(id)) : [];
  const selectedQuestionIds = (launchSelection.length === QUESTION_COUNT ? launchSelection : pool.slice(0, QUESTION_COUNT).map(question => question.id));
  return { level, label: `Level ${level}`, opensOn: defaultOpeningDate(level), selectedQuestionIds, publishedQuestionIds: selectedQuestionIds, revision: 1, publishedAt: null };
}

function orderedPublishedIds(selectedQuestionIds, revision) {
  if (!selectedQuestionIds.length) return [];
  const shift = Math.abs(Number(revision) || 1) % selectedQuestionIds.length;
  return selectedQuestionIds.map((_, index) => selectedQuestionIds[(index + shift) % selectedQuestionIds.length]);
}

async function loadChallengeConfiguration(db, organisationKey) {
  const [settings, customQuestions, sponsors] = await Promise.all([
    db.collection("nextHumanChallengeSettings").findOne({ organisationKey, challengeKey: CHALLENGE_KEY }),
    db.collection("nextHumanChallengeQuestions").find({ organisationKey, challengeKey: CHALLENGE_KEY }).sort({ createdAt: 1 }).toArray(),
    db.collection("nextHumanChallengeSponsors").find({ organisationKey, challengeKey: CHALLENGE_KEY }).sort({ createdAt: 1 }).toArray(),
  ]);
  const savedLevels = new Map((Array.isArray(settings?.levels) ? settings.levels : []).map(item => [Number(item.level), item]));
  const levels = Array.from({ length: LEVEL_MAX }, (_, index) => {
    const level = index + 1;
    const defaults = defaultLevelSettings(level);
    const saved = savedLevels.get(level) || {};
    const curated = defaultQuestionPoolForLevel(level).map(questionView);
    const custom = customQuestions.filter(question => Number(question.level) === level).map(questionView);
    const pool = [...curated, ...custom];
    const poolIds = new Set(pool.map(question => question.id));
    const selectedQuestionIds = (Array.isArray(saved.selectedQuestionIds) ? saved.selectedQuestionIds : defaults.selectedQuestionIds).map(String).filter(id => poolIds.has(id)).slice(0, QUESTION_COUNT);
    const completeSelection = selectedQuestionIds.length === QUESTION_COUNT ? selectedQuestionIds : defaults.selectedQuestionIds;
    const publishedQuestionIds = (Array.isArray(saved.publishedQuestionIds) ? saved.publishedQuestionIds : completeSelection).map(String).filter(id => poolIds.has(id)).slice(0, QUESTION_COUNT);
    const finalPublishedIds = publishedQuestionIds.length === QUESTION_COUNT ? publishedQuestionIds : completeSelection;
    const lookup = new Map(pool.map(question => [question.id, question]));
    return {
      ...defaults,
      ...saved,
      level,
      label: `Level ${level}`,
      releaseStatus: releaseStatus(saved.opensOn || defaults.opensOn),
      selectedQuestionIds: completeSelection,
      publishedQuestionIds: finalPublishedIds,
      pool,
      publishedQuestions: finalPublishedIds.map(id => lookup.get(id)).filter(Boolean),
    };
  });
  return {
    levels,
    sponsors: sponsors.map(document => ({
      id: String(document._id),
      name: document.name || "Sponsor",
      enabled: document.enabled !== false,
      levelIds: Array.isArray(document.levelIds) ? document.levelIds.map(Number).filter(levelNumber) : [],
      logo: document.logo ? { name: document.logo.name, mimeType: document.logo.mimeType, url: `/api/participation/member/next-human-challenge/sponsors/${String(document._id)}/logo` } : null,
      updatedAt: document.updatedAt || document.createdAt || null,
    })),
  };
}

async function parseSponsorUpload(request) {
  await Promise.all([mkdir(SPONSOR_MEDIA_DIR, { recursive: true }), mkdir(SPONSOR_TEMP_DIR, { recursive: true })]);
  const tempPath = path.join(SPONSOR_TEMP_DIR, randomUUID());
  let filePromise = null;
  let logo = null;
  const fields = {};
  await new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: request.headers, limits: { files: 1, fileSize: MAX_SPONSOR_LOGO_BYTES, fields: 20 } });
    busboy.on("field", (name, value) => { fields[name] = String(value || "").slice(0, 2000); });
    busboy.on("file", (_name, stream, info) => {
      const extension = ALLOWED_SPONSOR_LOGOS.get(info.mimeType);
      if (!extension) { stream.resume(); reject(Object.assign(new Error("Upload a JPG, PNG or WebP sponsor logo."), { statusCode: 422 })); return; }
      logo = { mimeType: info.mimeType, extension, name: path.basename(String(info.filename || "sponsor-logo")).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120), tempPath };
      filePromise = pipeline(stream, createWriteStream(tempPath));
    });
    busboy.on("error", reject);
    busboy.on("finish", resolve);
    request.pipe(busboy);
  });
  if (filePromise) await filePromise;
  return { fields, logo };
}

function memberSnapshot(actor) {
  return {
    memberNumber: clean(actor.memberNumber, 80),
    memberName: clean(actor.fullName || actor.name, 160),
    email: clean(actor.email, 200),
    mobile: clean(actor.mobile, 40),
  };
}

export function normaliseChallengeAttempt(body = {}) {
  const level = levelNumber(body.level);
  const questions = Array.isArray(body.questions) ? body.questions.slice(0, QUESTION_COUNT).map(item => ({
    prompt: clean(item?.prompt, 700),
    selectedAnswer: clean(item?.selectedAnswer, 350),
    correctAnswer: clean(item?.correctAnswer, 350),
    correct: clean(item?.selectedAnswer, 350) === clean(item?.correctAnswer, 350),
    note: clean(item?.note, 900),
  })) : [];
  if (!level) throw Object.assign(new Error("A valid challenge level is required."), { statusCode: 400 });
  if (questions.length !== QUESTION_COUNT || questions.some(item => !item.prompt || !item.selectedAnswer || !item.correctAnswer)) {
    throw Object.assign(new Error("All ten challenge questions and answers are required."), { statusCode: 400 });
  }
  const calculatedScore = questions.filter(item => item.correct).length * 10;
  return {
    level,
    realm: clean(body.realm, 120),
    title: clean(body.title, 180),
    questions,
    score: calculatedScore,
    passed: true,
    clientAttemptId: clean(body.clientAttemptId, 100) || randomUUID(),
  };
}

function progressView(document) {
  const completedLevels = Array.isArray(document?.completedLevels) ? document.completedLevels.map(Number).filter(levelNumber).sort((a, b) => a - b) : [];
  const certificateLevels = Array.isArray(document?.certificateLevels) ? document.certificateLevels.map(Number).filter(levelNumber).sort((a, b) => a - b) : [];
  return {
    currentLevel: Math.min(LEVEL_MAX, Math.max(1, Number(document?.currentLevel) || 1)),
    highestCompletedLevel: Math.max(0, Number(document?.highestCompletedLevel) || 0),
    completedLevels,
    certificateLevels,
    scores: document?.scores && typeof document.scores === "object" ? document.scores : {},
    reflections: document?.reflections && typeof document.reflections === "object" ? document.reflections : {},
    certificateDownloads: document?.certificateDownloads && typeof document.certificateDownloads === "object" ? document.certificateDownloads : {},
    lastActivityAt: document?.lastActivityAt || null,
  };
}

function attemptView(document) {
  return {
    id: String(document._id),
    attemptNumber: Number(document.attemptNumber || 1),
    level: Number(document.level),
    realm: document.realm || "",
    title: document.title || "",
    questions: Array.isArray(document.questions) ? document.questions : [],
    score: Number(document.score || 0),
    passed: Boolean(document.passed),
    completedAt: document.completedAt || document.createdAt || null,
  };
}

export async function handleNextHumanChallengeMemberRequest({ request, response, url, db, organisationKey, actor, readJson, sendJson }) {
  const base = "/api/participation/member/next-human-challenge";
  if (!url.pathname.startsWith(base)) return false;
  const progressCollection = db.collection("nextHumanChallengeProgress");
  const attemptsCollection = db.collection("nextHumanChallengeAttempts");

  if (request.method === "GET" && url.pathname === `${base}/progress`) {
    const [progress, recentAttempts, configuration] = await Promise.all([
      progressCollection.findOne({ organisationKey, memberId: actor._id }),
      attemptsCollection.find({ organisationKey, memberId: actor._id }).sort({ completedAt: -1 }).limit(100).toArray(),
      loadChallengeConfiguration(db, organisationKey),
    ]);
    const today = indiaDateKey();
    sendJson(response, 200, {
      progress: progressView(progress),
      attempts: recentAttempts.map(attemptView),
      levels: configuration.levels.map(level => ({ level: level.level, label: level.label, opensOn: level.opensOn, releaseStatus: releaseStatus(level.opensOn, today), available: releaseStatus(level.opensOn, today) === "live", questions: releaseStatus(level.opensOn, today) === "live" ? level.publishedQuestions : [] })),
      sponsors: configuration.sponsors.filter(sponsor => sponsor.enabled),
    });
    return true;
  }

  if (request.method === "GET" && url.pathname === `${base}/configuration`) {
    const configuration = await loadChallengeConfiguration(db, organisationKey);
    const today = indiaDateKey();
    sendJson(response, 200, {
      levels: configuration.levels.map(level => ({ level: level.level, label: level.label, opensOn: level.opensOn, releaseStatus: releaseStatus(level.opensOn, today), available: releaseStatus(level.opensOn, today) === "live", questions: releaseStatus(level.opensOn, today) === "live" ? level.publishedQuestions : [] })),
      sponsors: configuration.sponsors.filter(sponsor => sponsor.enabled),
      scoring: { questionsPerLevel: QUESTION_COUNT, marksPerCorrectAnswer: 10, maximumMarks: 100, negativeMarks: 0, qualificationRequired: false },
    });
    return true;
  }

  const sponsorLogoMatch = url.pathname.match(/^\/api\/participation\/member\/next-human-challenge\/sponsors\/([^/]+)\/logo$/);
  if (["GET", "HEAD"].includes(request.method) && sponsorLogoMatch) {
    const id = objectId(sponsorLogoMatch[1]);
    const sponsor = id ? await db.collection("nextHumanChallengeSponsors").findOne({ _id: id, organisationKey, challengeKey: CHALLENGE_KEY, enabled: { $ne: false } }) : null;
    const file = sponsor?.logo?.storagePath ? await stat(sponsor.logo.storagePath).catch(() => null) : null;
    if (!sponsor || !file) { sendJson(response, 404, { error: "Sponsor logo not found." }); return true; }
    response.writeHead(200, { "Content-Type": sponsor.logo.mimeType, "Content-Length": file.size, "Cache-Control": "private, max-age=3600", "Content-Disposition": `inline; filename="${sponsor.logo.name || "sponsor-logo"}"` });
    if (request.method === "HEAD") response.end(); else await pipeline(createReadStream(sponsor.logo.storagePath), response);
    return true;
  }

  if (request.method === "POST" && url.pathname === `${base}/attempts`) {
    const attempt = normaliseChallengeAttempt(await readJson(request));
    const configuration = await loadChallengeConfiguration(db, organisationKey);
    const levelConfiguration = configuration.levels.find(level => level.level === attempt.level);
    const today = indiaDateKey();
    if (!levelConfiguration || releaseStatus(levelConfiguration.opensOn, today) !== "live") {
      sendJson(response, 423, {
        error: `Level ${attempt.level} is not open yet.`,
        code: "CHALLENGE_LEVEL_LOCKED",
        opensOn: levelConfiguration?.opensOn || null,
      });
      return true;
    }
    const publishedPrompts = new Set(levelConfiguration.publishedQuestions.map(question => question.prompt));
    const attemptedPrompts = new Set(attempt.questions.map(question => question.prompt));
    if (publishedPrompts.size !== QUESTION_COUNT || attemptedPrompts.size !== QUESTION_COUNT || [...attemptedPrompts].some(prompt => !publishedPrompts.has(prompt))) {
      sendJson(response, 409, { error: "This level's published questions have changed. Reopen the level and try again.", code: "CHALLENGE_LEVEL_CHANGED" });
      return true;
    }
    const existing = await attemptsCollection.findOne({ organisationKey, memberId: actor._id, clientAttemptId: attempt.clientAttemptId });
    if (existing) {
      sendJson(response, 200, { attempt: attemptView(existing), progress: progressView(await progressCollection.findOne({ organisationKey, memberId: actor._id })) });
      return true;
    }
    const now = new Date();
    const attemptNumber = (await attemptsCollection.countDocuments({ organisationKey, memberId: actor._id, level: attempt.level })) + 1;
    const snapshot = memberSnapshot(actor);
    const document = { organisationKey, memberId: actor._id, ...snapshot, ...attempt, attemptNumber, completedAt: now, createdAt: now };
    const inserted = await attemptsCollection.insertOne(document);
    const setFields = { ...snapshot, lastActivityAt: now, updatedAt: now, [`scores.${attempt.level}`]: attempt.score };
    const update = {
      $set: setFields,
      $setOnInsert: { createdAt: now },
    };
    update.$max = { currentLevel: Math.min(LEVEL_MAX, attempt.level + 1), highestCompletedLevel: attempt.level };
    update.$addToSet = { completedLevels: attempt.level };
    await progressCollection.updateOne({ organisationKey, memberId: actor._id }, update, { upsert: true });
    await db.collection("auditLogs").insertOne({ organisationKey, actorMemberId: actor._id, actorName: snapshot.memberName, action: "next_human.challenge_attempt_saved", entityType: "nextHumanChallengeAttempt", entityId: String(inserted.insertedId), details: { level: attempt.level, score: attempt.score, passed: attempt.passed }, createdAt: now });
    sendJson(response, 201, { attempt: attemptView({ _id: inserted.insertedId, ...document }), progress: progressView(await progressCollection.findOne({ organisationKey, memberId: actor._id })) });
    return true;
  }

  const reflectionMatch = url.pathname.match(/^\/api\/participation\/member\/next-human-challenge\/levels\/(\d+)\/reflection$/);
  if (request.method === "POST" && reflectionMatch) {
    const level = levelNumber(reflectionMatch[1]);
    const body = await readJson(request);
    const reflection = clean(body.reflection, 2000);
    const completedAttempt = level && await attemptsCollection.findOne({ organisationKey, memberId: actor._id, level });
    if (!completedAttempt) {
      sendJson(response, 409, { error: "Complete this level before generating its certificate." });
      return true;
    }
    const now = new Date();
    await progressCollection.updateOne(
      { organisationKey, memberId: actor._id },
      {
        $set: { ...memberSnapshot(actor), [`reflections.${level}`]: reflection, [`certificateEarnedAt.${level}`]: now, lastActivityAt: now, updatedAt: now },
        $max: { currentLevel: Math.min(LEVEL_MAX, level + 1), highestCompletedLevel: level },
        $addToSet: { completedLevels: level, certificateLevels: level },
      },
      { upsert: true },
    );
    sendJson(response, 200, { progress: progressView(await progressCollection.findOne({ organisationKey, memberId: actor._id })) });
    return true;
  }

  const downloadMatch = url.pathname.match(/^\/api\/participation\/member\/next-human-challenge\/certificates\/(\d+)\/download$/);
  if (request.method === "POST" && downloadMatch) {
    const level = levelNumber(downloadMatch[1]);
    const progress = level && await progressCollection.findOne({ organisationKey, memberId: actor._id, certificateLevels: level });
    if (!progress) {
      sendJson(response, 409, { error: "This certificate has not been earned yet." });
      return true;
    }
    await progressCollection.updateOne({ _id: progress._id }, { $inc: { [`certificateDownloads.${level}`]: 1 }, $set: { lastActivityAt: new Date(), updatedAt: new Date() } });
    sendJson(response, 200, { saved: true });
    return true;
  }

  sendJson(response, 404, { error: "Challenge endpoint not found." });
  return true;
}

export async function handleNextHumanChallengeAdminRequest({ request, response, url, db, organisationKey, actor, readJson, sendJson }) {
  const base = "/api/participation/admin/next-human-challenge";
  if (!url.pathname.startsWith(base)) return false;

  if (request.method === "GET" && url.pathname === `${base}/configuration`) {
    const configuration = await loadChallengeConfiguration(db, organisationKey);
    sendJson(response, 200, {
      ...configuration,
      summary: {
        levels: LEVEL_MAX,
        curatedQuestions: LEVEL_MAX * CHALLENGE_POOL_SIZE,
        selectedQuestions: configuration.levels.reduce((sum, level) => sum + level.publishedQuestionIds.length, 0),
        activeSponsors: configuration.sponsors.filter(sponsor => sponsor.enabled).length,
      },
      scoring: { questionsPerLevel: QUESTION_COUNT, marksPerCorrectAnswer: 10, maximumMarks: 100, negativeMarks: 0, qualificationRequired: false },
    });
    return true;
  }

  const levelMatch = url.pathname.match(/^\/api\/participation\/admin\/next-human-challenge\/levels\/(\d+)$/);
  if (request.method === "PATCH" && levelMatch) {
    const level = levelNumber(levelMatch[1]);
    const body = await readJson(request);
    const configuration = await loadChallengeConfiguration(db, organisationKey);
    const currentLevel = configuration.levels.find(item => item.level === level);
    if (!currentLevel) { sendJson(response, 404, { error: "Challenge level not found." }); return true; }
    const selectedQuestionIds = Array.isArray(body.selectedQuestionIds) ? [...new Set(body.selectedQuestionIds.map(String))] : [];
    const allowedIds = new Set(currentLevel.pool.map(question => question.id));
    if (selectedQuestionIds.length !== QUESTION_COUNT || selectedQuestionIds.some(id => !allowedIds.has(id))) {
      sendJson(response, 422, { error: `Select exactly ${QUESTION_COUNT} questions from this level's question pool.` });
      return true;
    }
    const releaseMode = body.releaseMode === "closed" ? "closed" : "date";
    const requestedOpeningDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.opensOn || "")) ? String(body.opensOn) : "";
    if (releaseMode === "date" && !requestedOpeningDate) { sendJson(response, 422, { error: "Choose a valid opening date." }); return true; }
    const opensOn = releaseMode === "closed" ? CHALLENGE_UNSCHEDULED_OPENS_ON : requestedOpeningDate;
    const now = new Date();
    const savedSettings = await db.collection("nextHumanChallengeSettings").findOne({ organisationKey, challengeKey: CHALLENGE_KEY });
    const currentLevels = Array.isArray(savedSettings?.levels) ? savedSettings.levels : [];
    const previous = currentLevels.find(item => Number(item.level) === level) || defaultLevelSettings(level);
    const revision = Number(previous.revision || 0) + 1;
    const publishedQuestionIds = orderedPublishedIds(selectedQuestionIds, revision);
    const nextLevel = { ...previous, level, label: `Level ${level}`, opensOn, selectedQuestionIds, publishedQuestionIds, revision, publishedAt: now };
    const levels = [...currentLevels.filter(item => Number(item.level) !== level), nextLevel].sort((left, right) => Number(left.level) - Number(right.level));
    await db.collection("nextHumanChallengeSettings").updateOne(
      { organisationKey, challengeKey: CHALLENGE_KEY },
      { $set: { levels, updatedAt: now, updatedBy: actor?._id }, $setOnInsert: { organisationKey, challengeKey: CHALLENGE_KEY, createdAt: now } },
      { upsert: true },
    );
    await db.collection("auditLogs").insertOne({ organisationKey, actorMemberId: actor?._id, actorName: actor?.fullName || "Administrator", action: releaseMode === "closed" ? "next_human.challenge_level_closed" : "next_human.challenge_level_published", entityType: "nextHumanChallengeLevel", entityId: String(level), details: { level, opensOn, releaseMode, revision, questionCount: selectedQuestionIds.length }, createdAt: now });
    sendJson(response, 200, { level: (await loadChallengeConfiguration(db, organisationKey)).levels.find(item => item.level === level), message: releaseMode === "closed" ? `Level ${level} is closed. Members cannot see or start it.` : `Level ${level} will open automatically on ${opensOn}.` });
    return true;
  }

  if (request.method === "POST" && url.pathname === `${base}/questions`) {
    const body = await readJson(request);
    const level = levelNumber(body.level);
    const prompt = clean(body.prompt, 700);
    const choices = Array.isArray(body.choices) ? body.choices.slice(0, 4).map(value => clean(value, 350)) : [];
    const correctAnswer = clean(body.correctAnswer, 350);
    const note = clean(body.note, 900);
    if (!level || !prompt || choices.length !== 4 || choices.some(choice => !choice) || new Set(choices).size !== 4 || !choices.includes(correctAnswer) || !note) {
      sendJson(response, 422, { error: "Add the question, four distinct options, the correct option and the explanation." });
      return true;
    }
    const id = randomUUID();
    const now = new Date();
    const question = { id, organisationKey, challengeKey: CHALLENGE_KEY, level, subject: "Administrator question", prompt, choices, correctAnswer, note, source: "custom", createdBy: actor?._id, createdAt: now, updatedAt: now };
    await db.collection("nextHumanChallengeQuestions").insertOne(question);
    await db.collection("auditLogs").insertOne({ organisationKey, actorMemberId: actor?._id, actorName: actor?.fullName || "Administrator", action: "next_human.challenge_question_created", entityType: "nextHumanChallengeQuestion", entityId: id, details: { level }, createdAt: now });
    sendJson(response, 201, { question: questionView(question), message: `The new question is now available in Level ${level}.` });
    return true;
  }

  if (request.method === "POST" && url.pathname === `${base}/sponsors`) {
    const { fields, logo } = await parseSponsorUpload(request);
    const name = clean(fields.name, 120);
    let levelIds = [];
    try { levelIds = JSON.parse(fields.levelIds || "[]").map(Number).filter(levelNumber); } catch { levelIds = []; }
    levelIds = [...new Set(levelIds)].sort((left, right) => left - right);
    if (!name || !levelIds.length) {
      if (logo?.tempPath) await rm(logo.tempPath, { force: true });
      sendJson(response, 422, { error: "Add a sponsor name and choose at least one certificate level." });
      return true;
    }
    const id = new ObjectId();
    let logoDocument = null;
    if (logo) {
      const storagePath = path.join(SPONSOR_MEDIA_DIR, `${String(id)}${logo.extension}`);
      try { await rename(logo.tempPath, storagePath); } catch (error) { await rm(logo.tempPath, { force: true }); throw error; }
      logoDocument = { name: logo.name, mimeType: logo.mimeType, storagePath };
    }
    const now = new Date();
    const document = { _id: id, organisationKey, challengeKey: CHALLENGE_KEY, name, enabled: fields.enabled !== "false", levelIds, logo: logoDocument, createdBy: actor?._id, createdAt: now, updatedAt: now };
    await db.collection("nextHumanChallengeSponsors").insertOne(document);
    sendJson(response, 201, { sponsor: { id: String(id), name, enabled: document.enabled, levelIds, logo: logoDocument ? { name: logoDocument.name, mimeType: logoDocument.mimeType, url: `/api/participation/member/next-human-challenge/sponsors/${String(id)}/logo` } : null, updatedAt: now }, message: `${name} has been added to the selected certificate levels.` });
    return true;
  }

  const sponsorMatch = url.pathname.match(/^\/api\/participation\/admin\/next-human-challenge\/sponsors\/([^/]+)$/);
  if (request.method === "PATCH" && sponsorMatch) {
    const id = objectId(sponsorMatch[1]);
    const body = await readJson(request);
    const sponsor = id ? await db.collection("nextHumanChallengeSponsors").findOne({ _id: id, organisationKey, challengeKey: CHALLENGE_KEY }) : null;
    if (!sponsor) { sendJson(response, 404, { error: "Sponsor not found." }); return true; }
    const patch = { updatedAt: new Date(), updatedBy: actor?._id };
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (body.name !== undefined) patch.name = clean(body.name, 120) || sponsor.name;
    if (Array.isArray(body.levelIds)) patch.levelIds = [...new Set(body.levelIds.map(Number).filter(levelNumber))].sort((left, right) => left - right);
    await db.collection("nextHumanChallengeSponsors").updateOne({ _id: id }, { $set: patch });
    sendJson(response, 200, { message: `${patch.name || sponsor.name} has been updated.` });
    return true;
  }

  if (request.method === "GET" && url.pathname === `${base}/members`) {
    const [progressRows, attemptRows] = await Promise.all([
      db.collection("nextHumanChallengeProgress").find({ organisationKey }).sort({ lastActivityAt: -1 }).limit(2000).toArray(),
      db.collection("nextHumanChallengeAttempts").find({ organisationKey }).sort({ completedAt: -1 }).limit(10000).toArray(),
    ]);
    const members = new Map();
    for (const progress of progressRows) {
      const key = String(progress.memberId);
      members.set(key, { id: key, memberNumber: progress.memberNumber || "", memberName: progress.memberName || "Member", email: progress.email || "", mobile: progress.mobile || "", ...progressView(progress), attempts: [] });
    }
    for (const attempt of attemptRows) {
      const key = String(attempt.memberId);
      if (!members.has(key)) members.set(key, { id: key, memberNumber: attempt.memberNumber || "", memberName: attempt.memberName || "Member", email: attempt.email || "", mobile: attempt.mobile || "", ...progressView(null), attempts: [] });
      members.get(key).attempts.push(attemptView(attempt));
    }
    const rows = Array.from(members.values()).map(member => ({
      ...member,
      totalAttempts: member.attempts.length,
      passedAttempts: member.attempts.length,
      certificatesEarned: member.certificateLevels.length,
      certificateDownloadCount: Object.values(member.certificateDownloads).reduce((sum, value) => sum + (Number(value) || 0), 0),
    }));
    const sort = url.searchParams.get("sort") || "highest";
    rows.sort((left, right) => {
      if (sort === "recent") return new Date(right.lastActivityAt || 0) - new Date(left.lastActivityAt || 0);
      if (sort === "name") return left.memberName.localeCompare(right.memberName);
      if (sort === "certificates") return right.certificatesEarned - left.certificatesEarned || right.highestCompletedLevel - left.highestCompletedLevel;
      return right.highestCompletedLevel - left.highestCompletedLevel || right.completedLevels.length - left.completedLevels.length || left.memberName.localeCompare(right.memberName);
    });
    sendJson(response, 200, { members: rows, summary: { participatingMembers: rows.length, savedAttempts: attemptRows.length, certificatesEarned: rows.reduce((sum, member) => sum + member.certificatesEarned, 0) } });
    return true;
  }

  sendJson(response, 404, { error: "Challenge administration endpoint not found." });
  return true;
}
