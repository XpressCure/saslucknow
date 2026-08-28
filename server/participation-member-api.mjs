import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomInt, randomUUID } from "node:crypto";
import Busboy from "busboy";
import nodemailer from "nodemailer";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { ObjectId } from "mongodb";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  SESSION_DURATION_MS,
  validatePassword,
  verifyPassword,
} from "./participation-auth.mjs";
import {
  allocateMemberNumber,
  normalizeIdentity,
  publicMember,
  receiptNumber,
  validateActivation,
  validateContribution,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "./participation-member-core.mjs";
import { cleanText, publicSankalp } from "./participation-core.mjs";
import { activeMemberCampaignView } from "./participation-campaign-core.mjs";
import { handleNextHumanMemberRequest, recordNextHumanPayment } from "./next-human-event-api.mjs";

const MEMBER_COOKIE = "sas_member_session";
// Razorpay is production-ready but intentionally paused until the public contribution launch.
// Leave the integration code and environment configuration intact for simple reactivation later.
const ONLINE_CONTRIBUTIONS_ENABLED = false;
const loginWindows = new Map();
const passwordResetRequestWindows = new Map();
const passwordResetVerificationWindows = new Map();
const PASSWORD_RESET_DURATION_MS = 10 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const publicContributionWindows = new Map();
const SANGHA_TYPES = new Set(["Reflection", "Video", "Artwork", "Photo", "Poll"]);
const SANGHA_MAX_WORDS = 1000;
const SANGHA_OPTION_MAX_WORDS = 10;
const SANGHA_MAX_OPTIONS = 4;
const SANGHA_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const SANGHA_MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const SANGHA_MAX_REQUEST_BYTES = 82 * 1024 * 1024;
const SANGHA_STORAGE_ROOT = process.env.SAS_DOCUMENT_STORAGE_DIR || "/var/lib/saslucknow-participation/documents";
const SANGHA_TEMP_DIR = path.join(SANGHA_STORAGE_ROOT, "sangha-temp");
const SANGHA_MEDIA_DIR = path.join(SANGHA_STORAGE_ROOT, "sangha-media");
const REFLECTION_MAX_WORDS = 1000;
const REFLECTION_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const REFLECTION_MAX_REQUEST_BYTES = 13 * 1024 * 1024;
const REFLECTION_TEMP_DIR = path.join(SANGHA_STORAGE_ROOT, "reflection-temp");
const REFLECTION_MEDIA_DIR = path.join(SANGHA_STORAGE_ROOT, "reflection-media");
const MEMBERSHIP_DISABLED_MESSAGE = "Your membership access is currently disabled. Please contact Sri Aurobindo Society, Lucknow for assistance.";
const SANGHA_BUCKET = process.env.SAS_SANGHA_S3_BUCKET || process.env.S3_BUCKET || "xpresscure";
const SANGHA_REGION = process.env.SAS_SANGHA_S3_REGION || process.env.S3_REGION || "ap-south-1";
const SANGHA_ALLOWED_MEDIA = new Map([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["video/webm", "video"], ["video/quicktime", "video"],
]);
let sanghaS3Client;

function focusCampaignDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function objectId(value) {
  return ObjectId.isValid(String(value || "")) ? new ObjectId(String(value)) : null;
}

function rateAllowed(windows, key, limit, durationMs) {
  const now = Date.now();
  const attempts = (windows.get(key) || []).filter(value => now - value < durationMs);
  if (attempts.length >= limit) return false;
  attempts.push(now);
  windows.set(key, attempts);
  return true;
}

function passwordResetCodeHash(resetId, code) {
  return hashSessionToken(`${String(resetId)}:${String(code || "")}`);
}

function passwordResetTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

async function sendMemberPasswordResetCode({ email, code }) {
  const transport = passwordResetTransport();
  if (!transport) throw Object.assign(new Error("Member password recovery email is not configured."), { statusCode: 503 });
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `SAS Lucknow <${process.env.SMTP_USER}>`,
    to: email,
    replyTo: process.env.EMAIL_REPLY_TO || "info.saslucknow@gmail.com",
    subject: "Your SAS Lucknow member password reset code",
    text: `Your SAS Lucknow member password reset code is ${code}.\n\nThis code expires in 10 minutes and can be used only once. If you did not request it, you can safely ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5ead4;color:#163846;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #decba8;border-radius:18px;background:#fffaf0"><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#a66f1e">SRI AUROBINDO SOCIETY · LUCKNOW</div><h1 style="margin:14px 0 10px;font-family:Georgia,serif;font-size:30px">Reset your member password</h1><p style="line-height:1.65;color:#526a72">Enter this verification code on the Member Login page:</p><div style="margin:24px 0;padding:18px;border-radius:12px;background:#163846;color:#fff;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px">${code}</div><p style="line-height:1.65;color:#526a72">The code expires in 10 minutes and works once. If you did not request it, no action is required.</p></div></body></html>`,
  });
}

function wordCount(value) {
  const text = String(value || "").trim();
  return text ? text.split(/\s+/u).length : 0;
}

function cleanMultilineText(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

function istTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const shifted = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}T${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}:${String(shifted.getUTCSeconds()).padStart(2, "0")}+05:30`;
}

function safeFilename(value) {
  return path.basename(String(value || "media")).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "media";
}

function sanghaPostView(document, selectedOptionId = "", actorId = null, memberState = {}) {
  return {
    id: String(document._id),
    author: document.authorName,
    role: document.authorRole || "Member",
    type: document.type,
    text: document.text,
    createdAt: document.createdAt,
    createdAtIst: document.createdAtIst || istTimestamp(document.createdAt),
    timezone: "Asia/Kolkata",
    isMine: Boolean(actorId && String(document.memberId) === String(actorId)),
    resonates: Number(document.resonates || 0),
    replies: Number(document.replies || 0),
    resonated: Boolean(memberState.resonated),
    saved: Boolean(memberState.saved),
    comments: Array.isArray(memberState.comments) ? memberState.comments : [],
    media: document.media ? {
      kind: document.media.kind,
      mimeType: document.media.mimeType,
      name: document.media.name,
      url: `/api/participation/member/sangha/media/${String(document._id)}`,
    } : null,
    pollOptions: Array.isArray(document.pollOptions) ? document.pollOptions.map(option => ({ id: option.id, text: option.text, votes: Number(option.votes || 0) })) : [],
    selectedOptionId,
  };
}

function reflectionMediaView(reflectionId, entryId, media) {
  if (!media) return null;
  return {
    kind: "image",
    mimeType: media.mimeType,
    name: media.name,
    url: `/api/participation/member/reflections/media/${String(reflectionId)}/${encodeURIComponent(entryId)}`,
  };
}

function reflectionView(document) {
  return {
    id: String(document._id),
    text: document.text,
    sessionMinutes: Number(document.sessionMinutes || 0),
    createdAt: document.createdAt,
    createdAtIst: document.createdAtIst || istTimestamp(document.createdAt),
    updatedAt: document.updatedAt || document.createdAt,
    timezone: "Asia/Kolkata",
    media: reflectionMediaView(document._id, "base", document.media),
    followUps: Array.isArray(document.followUps) ? document.followUps.map(entry => ({
      id: entry.id,
      text: entry.text,
      createdAt: entry.createdAt,
      createdAtIst: entry.createdAtIst || istTimestamp(entry.createdAt),
      media: reflectionMediaView(document._id, entry.id, entry.media),
    })) : [],
  };
}

async function parseReflectionMultipart(request) {
  const length = Number(request.headers["content-length"] || 0);
  if (length > REFLECTION_MAX_REQUEST_BYTES) throw Object.assign(new Error("The reflection and photo must be 13 MB or smaller."), { statusCode: 413 });
  await mkdir(REFLECTION_TEMP_DIR, { recursive: true });
  const fields = {};
  const files = [];
  const writes = [];
  const problems = [];
  const parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: REFLECTION_MAX_IMAGE_BYTES, fields: 6, fieldSize: 24_000 } });
  parser.on("field", (name, value) => { fields[name] = value; });
  parser.on("file", (field, stream, info) => {
    if (field !== "media" || !info.filename) { stream.resume(); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(info.mimeType)) {
      problems.push("Add a JPG, PNG or WebP image.");
      stream.resume();
      return;
    }
    const tempPath = path.join(REFLECTION_TEMP_DIR, `${randomUUID()}-${safeFilename(info.filename)}`);
    const record = { tempPath, originalName: safeFilename(info.filename), mimeType: info.mimeType, kind: "image", size: 0, limited: false };
    stream.on("data", chunk => { record.size += chunk.length; });
    stream.on("limit", () => { record.limited = true; });
    files.push(record);
    writes.push(pipeline(stream, createWriteStream(tempPath, { flags: "wx" })));
  });
  parser.on("filesLimit", () => problems.push("Add only one image to a reflection."));
  await new Promise((resolve, reject) => {
    parser.once("close", resolve);
    parser.once("error", reject);
    request.pipe(parser);
  });
  await Promise.all(writes);
  const file = files[0] || null;
  if (file?.limited || file?.size > REFLECTION_MAX_IMAGE_BYTES) problems.push("The image must be 12 MB or smaller.");
  return { fields, file, problems };
}

async function storeReflectionMedia(reflectionId, entryId, memberId, file) {
  if (!file) return null;
  const key = `reflections/${new Date().getUTCFullYear()}/${memberId}/${reflectionId}/${entryId}-${randomUUID()}-${file.originalName}`;
  if (SANGHA_BUCKET) {
    sanghaS3Client ||= new S3Client({ region: SANGHA_REGION });
    await new Upload({ client: sanghaS3Client, params: { Bucket: SANGHA_BUCKET, Key: key, Body: createReadStream(file.tempPath), ContentType: file.mimeType, Metadata: { reflection: String(reflectionId), entry: String(entryId), member: String(memberId) } } }).done();
    await rm(file.tempPath, { force: true });
    return { storage: "s3", bucket: SANGHA_BUCKET, key, name: file.originalName, mimeType: file.mimeType, kind: "image", size: file.size };
  }
  const directory = path.join(REFLECTION_MEDIA_DIR, String(reflectionId));
  await mkdir(directory, { recursive: true });
  const name = `${entryId}-${randomUUID()}-${file.originalName}`;
  await rename(file.tempPath, path.join(directory, name));
  return { storage: "local", key: `${reflectionId}/${name}`, name: file.originalName, mimeType: file.mimeType, kind: "image", size: file.size };
}

async function parseSanghaMultipart(request) {
  const length = Number(request.headers["content-length"] || 0);
  if (length > SANGHA_MAX_REQUEST_BYTES) throw Object.assign(new Error("The complete post must be 82 MB or smaller."), { statusCode: 413 });
  await mkdir(SANGHA_TEMP_DIR, { recursive: true });
  const fields = {};
  const files = [];
  const writes = [];
  const problems = [];
  const parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: SANGHA_MAX_VIDEO_BYTES, fields: 12, fieldSize: 24_000 } });
  parser.on("field", (name, value) => { fields[name] = value; });
  parser.on("file", (field, stream, info) => {
    if (field !== "media" || !info.filename) { stream.resume(); return; }
    if (!SANGHA_ALLOWED_MEDIA.has(info.mimeType)) {
      problems.push("Only JPG, PNG, WebP, MP4, WebM and MOV files are accepted.");
      stream.resume();
      return;
    }
    const tempPath = path.join(SANGHA_TEMP_DIR, `${randomUUID()}-${safeFilename(info.filename)}`);
    const record = { tempPath, originalName: safeFilename(info.filename), mimeType: info.mimeType, kind: SANGHA_ALLOWED_MEDIA.get(info.mimeType), size: 0, limited: false };
    stream.on("data", chunk => { record.size += chunk.length; });
    stream.on("limit", () => { record.limited = true; });
    files.push(record);
    writes.push(pipeline(stream, createWriteStream(tempPath, { flags: "wx" })));
  });
  parser.on("filesLimit", () => problems.push("Add only one photo or video to a Sangha post."));
  await new Promise((resolve, reject) => {
    parser.once("close", resolve);
    parser.once("error", reject);
    request.pipe(parser);
  });
  await Promise.all(writes);
  const file = files[0] || null;
  if (file?.limited || (file?.kind === "image" && file.size > SANGHA_MAX_IMAGE_BYTES) || (file?.kind === "video" && file.size > SANGHA_MAX_VIDEO_BYTES)) {
    problems.push(file?.kind === "image" ? "The photo must be 12 MB or smaller." : "The video must be 80 MB or smaller.");
  }
  return { fields, file, problems };
}

async function storeSanghaMedia(postId, memberId, file) {
  if (!file) return null;
  const key = `sangha/${new Date().getUTCFullYear()}/${memberId}/${postId}/${randomUUID()}-${file.originalName}`;
  if (SANGHA_BUCKET) {
    sanghaS3Client ||= new S3Client({ region: SANGHA_REGION });
    await new Upload({ client: sanghaS3Client, params: { Bucket: SANGHA_BUCKET, Key: key, Body: createReadStream(file.tempPath), ContentType: file.mimeType, Metadata: { post: String(postId), member: String(memberId) } } }).done();
    await rm(file.tempPath, { force: true });
    return { storage: "s3", bucket: SANGHA_BUCKET, key, name: file.originalName, mimeType: file.mimeType, kind: file.kind, size: file.size };
  }
  const directory = path.join(SANGHA_MEDIA_DIR, String(postId));
  await mkdir(directory, { recursive: true });
  const name = `${randomUUID()}-${file.originalName}`;
  await rename(file.tempPath, path.join(directory, name));
  return { storage: "local", key: `${postId}/${name}`, name: file.originalName, mimeType: file.mimeType, kind: file.kind, size: file.size };
}

async function listSanghaPosts(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const posts = await db.collection("sanghaPosts").find({ organisationKey, status: "published" }).sort({ createdAt: -1 }).limit(100).toArray();
  const postIds = posts.map(post => post._id);
  const pollPostIds = posts.filter(post => post.type === "Poll").map(post => post._id);
  const [votes, resonances, saves, comments] = await Promise.all([
    pollPostIds.length ? db.collection("sanghaPollVotes").find({ organisationKey, memberId: actor._id, postId: { $in: pollPostIds } }).toArray() : [],
    postIds.length ? db.collection("sanghaResonances").find({ organisationKey, memberId: actor._id, postId: { $in: postIds } }).toArray() : [],
    postIds.length ? db.collection("sanghaSaves").find({ organisationKey, memberId: actor._id, postId: { $in: postIds } }).toArray() : [],
    postIds.length ? db.collection("sanghaComments").find({ organisationKey, postId: { $in: postIds }, status: "published" }).sort({ createdAt: 1 }).limit(500).toArray() : [],
  ]);
  const selectedByPost = new Map(votes.map(vote => [String(vote.postId), vote.optionId]));
  const resonatedPosts = new Set(resonances.map(item => String(item.postId)));
  const savedPosts = new Set(saves.map(item => String(item.postId)));
  const commentsByPost = new Map();
  for (const comment of comments) {
    const postId = String(comment.postId);
    const list = commentsByPost.get(postId) || [];
    list.push({ id: String(comment._id), author: comment.authorName, text: comment.text, createdAt: comment.createdAtIst || istTimestamp(comment.createdAt), isMine: String(comment.memberId) === String(actor._id) });
    commentsByPost.set(postId, list);
  }
  return sendJson(response, 200, { posts: posts.map(post => {
    const postId = String(post._id);
    const postComments = commentsByPost.get(postId) || [];
    const view = sanghaPostView(post, selectedByPost.get(postId) || "", actor._id, { resonated: resonatedPosts.has(postId), saved: savedPosts.has(postId), comments: postComments });
    view.replies = postComments.length;
    return view;
  }) });
}

async function createSanghaPost(request, response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) return sendJson(response, 400, { error: "Submit the Sangha post form with an optional photo or video." });
  let parsed;
  try {
    parsed = await parseSanghaMultipart(request);
    const { fields, file, problems } = parsed;
    const type = cleanText(fields.type, 20);
    const text = cleanMultilineText(fields.text, 16_000);
    if (!SANGHA_TYPES.has(type)) problems.push("Choose Reflection, Video, Artwork, Photo or Poll.");
    if (!text || wordCount(text) > SANGHA_MAX_WORDS) problems.push("Write a post of no more than 1,000 words.");
    let optionTexts = [];
    if (type === "Poll") {
      try { optionTexts = JSON.parse(String(fields.pollOptions || "[]")); } catch { optionTexts = []; }
      optionTexts = [...new Set(optionTexts.map(value => cleanText(value, 300)).filter(Boolean))];
      if (optionTexts.length < 2 || optionTexts.length > SANGHA_MAX_OPTIONS) problems.push("A poll needs two to four different options.");
      if (optionTexts.some(option => wordCount(option) > SANGHA_OPTION_MAX_WORDS)) problems.push("Each poll option must contain no more than 10 words.");
    }
    if (problems.length) {
      if (file) await rm(file.tempPath, { force: true });
      return sendJson(response, 422, { error: [...new Set(problems)][0], errors: [...new Set(problems)] });
    }
    const postId = new ObjectId();
    const media = await storeSanghaMedia(postId, actor._id, file);
    const now = new Date();
    const document = {
      _id: postId,
      organisationKey,
      memberId: actor._id,
      authorName: actor.fullName,
      authorRole: ["administrator", "super_administrator"].includes(actor.role) ? "Administrator" : "Member",
      type,
      text,
      media,
      pollOptions: type === "Poll" ? optionTexts.map(value => ({ id: randomUUID().slice(0, 12), text: value, votes: 0 })) : [],
      status: "published",
      resonates: 0,
      replies: 0,
      createdAt: now,
      createdAtIst: istTimestamp(now),
      timezone: "Asia/Kolkata",
      updatedAt: now,
    };
    await db.collection("sanghaPosts").insertOne(document);
    await audit(db, organisationKey, actor, "sangha.post_published", "sanghaPost", postId, { type, mediaKind: media?.kind || "none" });
    return sendJson(response, 201, { post: sanghaPostView(document, "", actor._id), message: "Your post is now shared with Sangha." });
  } catch (error) {
    if (parsed?.file) await rm(parsed.file.tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function serveSanghaMedia(request, response, context, actor, postId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(postId);
  const post = id ? await db.collection("sanghaPosts").findOne({ _id: id, organisationKey, status: "published", media: { $ne: null } }) : null;
  if (!post?.media) return sendJson(response, 404, { error: "Sangha media not found." });
  const headers = { "Content-Type": post.media.mimeType, "Content-Disposition": `inline; filename="${safeFilename(post.media.name)}"`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" };
  if (post.media.storage === "s3") {
    sanghaS3Client ||= new S3Client({ region: SANGHA_REGION });
    const result = await sanghaS3Client.send(new GetObjectCommand({ Bucket: post.media.bucket || SANGHA_BUCKET, Key: post.media.key }));
    response.writeHead(200, { ...headers, ...(result.ContentLength ? { "Content-Length": result.ContentLength } : {}) });
    await pipeline(result.Body, response);
    return;
  }
  const root = path.resolve(SANGHA_MEDIA_DIR);
  const filePath = path.resolve(SANGHA_MEDIA_DIR, post.media.key);
  if (!filePath.startsWith(`${root}${path.sep}`)) return sendJson(response, 404, { error: "Sangha media not found." });
  const details = await stat(filePath);
  response.writeHead(200, { ...headers, "Content-Length": details.size });
  await pipeline(createReadStream(filePath), response);
}

async function listReflections(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const reflections = await db.collection("memberReflections")
    .find({ organisationKey, memberId: actor._id })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  return sendJson(response, 200, { reflections: reflections.map(reflectionView) });
}

async function createReflection(request, response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) {
    return sendJson(response, 400, { error: "Submit the reflection form with an optional image." });
  }
  let parsed;
  try {
    parsed = await parseReflectionMultipart(request);
    const { fields, file, problems } = parsed;
    const text = cleanMultilineText(fields.text, 16_000);
    const sessionMinutes = Math.max(0, Math.min(24 * 60, Number(fields.sessionMinutes || 0) || 0));
    if (!text || wordCount(text) > REFLECTION_MAX_WORDS) problems.push("Write a reflection of no more than 1,000 words.");
    if (problems.length) {
      if (file) await rm(file.tempPath, { force: true });
      return sendJson(response, 422, { error: [...new Set(problems)][0], errors: [...new Set(problems)] });
    }
    const reflectionId = new ObjectId();
    const media = await storeReflectionMedia(reflectionId, "base", actor._id, file);
    const now = new Date();
    const document = {
      _id: reflectionId,
      organisationKey,
      memberId: actor._id,
      text,
      sessionMinutes,
      media,
      followUps: [],
      createdAt: now,
      createdAtIst: istTimestamp(now),
      timezone: "Asia/Kolkata",
      updatedAt: now,
    };
    await db.collection("memberReflections").insertOne(document);
    await audit(db, organisationKey, actor, "reflection.created", "memberReflection", reflectionId, { sessionMinutes, hasImage: Boolean(media) });
    return sendJson(response, 201, { reflection: reflectionView(document), message: "Your reflection has been saved privately." });
  } catch (error) {
    if (parsed?.file) await rm(parsed.file.tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function addReflectionFollowUp(request, response, context, actor, reflectionId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(reflectionId);
  const reflection = id ? await db.collection("memberReflections").findOne({ _id: id, organisationKey, memberId: actor._id }) : null;
  if (!reflection) return sendJson(response, 404, { error: "Reflection not found." });
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) {
    return sendJson(response, 400, { error: "Submit the follow-up form with an optional image." });
  }
  let parsed;
  try {
    parsed = await parseReflectionMultipart(request);
    const { fields, file, problems } = parsed;
    const text = cleanMultilineText(fields.text, 16_000);
    if (!text || wordCount(text) > REFLECTION_MAX_WORDS) problems.push("Write a follow-up of no more than 1,000 words.");
    if (problems.length) {
      if (file) await rm(file.tempPath, { force: true });
      return sendJson(response, 422, { error: [...new Set(problems)][0], errors: [...new Set(problems)] });
    }
    const entryId = randomUUID();
    const media = await storeReflectionMedia(id, entryId, actor._id, file);
    const now = new Date();
    const followUp = { id: entryId, text, media, createdAt: now, createdAtIst: istTimestamp(now), timezone: "Asia/Kolkata" };
    const update = await db.collection("memberReflections").updateOne(
      { _id: id, organisationKey, memberId: actor._id },
      { $push: { followUps: followUp }, $set: { updatedAt: now } },
    );
    if (!update.modifiedCount) return sendJson(response, 409, { error: "The reflection changed before this follow-up could be saved. Please try again." });
    await audit(db, organisationKey, actor, "reflection.follow_up_added", "memberReflection", id, { entryId, hasImage: Boolean(media) });
    const updated = await db.collection("memberReflections").findOne({ _id: id, organisationKey, memberId: actor._id });
    return sendJson(response, 201, { reflection: reflectionView(updated), message: "Your further thought has been added." });
  } catch (error) {
    if (parsed?.file) await rm(parsed.file.tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function serveReflectionMedia(request, response, context, actor, reflectionId, entryId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(reflectionId);
  const reflection = id ? await db.collection("memberReflections").findOne({ _id: id, organisationKey, memberId: actor._id }) : null;
  if (!reflection) return sendJson(response, 404, { error: "Reflection image not found." });
  const media = entryId === "base" ? reflection.media : reflection.followUps?.find(entry => entry.id === entryId)?.media;
  if (!media) return sendJson(response, 404, { error: "Reflection image not found." });
  const headers = { "Content-Type": media.mimeType, "Content-Disposition": `inline; filename="${safeFilename(media.name)}"`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" };
  if (media.storage === "s3") {
    sanghaS3Client ||= new S3Client({ region: SANGHA_REGION });
    const result = await sanghaS3Client.send(new GetObjectCommand({ Bucket: media.bucket || SANGHA_BUCKET, Key: media.key }));
    response.writeHead(200, { ...headers, ...(result.ContentLength ? { "Content-Length": result.ContentLength } : {}) });
    await pipeline(result.Body, response);
    return;
  }
  const root = path.resolve(REFLECTION_MEDIA_DIR);
  const filePath = path.resolve(REFLECTION_MEDIA_DIR, media.key);
  if (!filePath.startsWith(`${root}${path.sep}`)) return sendJson(response, 404, { error: "Reflection image not found." });
  const details = await stat(filePath);
  response.writeHead(200, { ...headers, "Content-Length": details.size });
  await pipeline(createReadStream(filePath), response);
}

async function voteOnSanghaPoll(request, response, context, actor, postId) {
  const { db, organisationKey, readJson, sendJson } = context;
  const id = objectId(postId);
  const body = await readJson(request);
  const optionId = cleanText(body.optionId, 40);
  const post = id ? await db.collection("sanghaPosts").findOne({ _id: id, organisationKey, status: "published", type: "Poll", "pollOptions.id": optionId }) : null;
  if (!post) return sendJson(response, 404, { error: "Poll or poll option not found." });
  const now = new Date();
  const vote = await db.collection("sanghaPollVotes").updateOne(
    { organisationKey, postId: id, memberId: actor._id },
    { $setOnInsert: { organisationKey, postId: id, memberId: actor._id, optionId, createdAt: now } },
    { upsert: true },
  );
  if (!vote.upsertedCount) return sendJson(response, 409, { error: "You have already responded to this poll." });
  await db.collection("sanghaPosts").updateOne({ _id: id, organisationKey }, { $inc: { "pollOptions.$[choice].votes": 1 }, $set: { updatedAt: now } }, { arrayFilters: [{ "choice.id": optionId }] });
  const updated = await db.collection("sanghaPosts").findOne({ _id: id, organisationKey });
  return sendJson(response, 200, { post: sanghaPostView(updated, optionId, actor._id), message: "Your response has been recorded." });
}

async function toggleSanghaResonance(response, context, actor, postId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(postId);
  const post = id ? await db.collection("sanghaPosts").findOne({ _id: id, organisationKey, status: "published" }) : null;
  if (!post) return sendJson(response, 404, { error: "Sangha post not found." });
  const filter = { organisationKey, postId: id, memberId: actor._id };
  const existing = await db.collection("sanghaResonances").findOne(filter);
  const now = new Date();
  if (existing) {
    await db.collection("sanghaResonances").deleteOne(filter);
    await db.collection("sanghaPosts").updateOne({ _id: id, organisationKey }, { $inc: { resonates: -1 }, $set: { updatedAt: now } });
  } else {
    await db.collection("sanghaResonances").insertOne({ ...filter, createdAt: now });
    await db.collection("sanghaPosts").updateOne({ _id: id, organisationKey }, { $inc: { resonates: 1 }, $set: { updatedAt: now } });
  }
  const updated = await db.collection("sanghaPosts").findOne({ _id: id, organisationKey });
  return sendJson(response, 200, { resonated: !existing, resonates: Math.max(0, Number(updated?.resonates || 0)), message: existing ? "Resonance removed." : "This post now resonates with you." });
}

async function toggleSanghaSave(response, context, actor, postId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(postId);
  const post = id ? await db.collection("sanghaPosts").findOne({ _id: id, organisationKey, status: "published" }) : null;
  if (!post) return sendJson(response, 404, { error: "Sangha post not found." });
  const filter = { organisationKey, postId: id, memberId: actor._id };
  const existing = await db.collection("sanghaSaves").findOne(filter);
  if (existing) await db.collection("sanghaSaves").deleteOne(filter);
  else await db.collection("sanghaSaves").insertOne({ ...filter, createdAt: new Date() });
  return sendJson(response, 200, { saved: !existing, message: existing ? "Removed from your saved posts." : "Saved to your private collection." });
}

async function addSanghaComment(request, response, context, actor, postId) {
  const { db, organisationKey, readJson, sendJson } = context;
  const id = objectId(postId);
  const post = id ? await db.collection("sanghaPosts").findOne({ _id: id, organisationKey, status: "published" }) : null;
  if (!post) return sendJson(response, 404, { error: "Sangha post not found." });
  const body = await readJson(request);
  const text = cleanMultilineText(body.text, 4_000);
  if (!text || wordCount(text) > 300) return sendJson(response, 422, { error: "Write a comment of no more than 300 words." });
  const now = new Date();
  const comment = { _id: new ObjectId(), organisationKey, postId: id, memberId: actor._id, authorName: actor.fullName, text, status: "published", createdAt: now, createdAtIst: istTimestamp(now), updatedAt: now };
  await db.collection("sanghaComments").insertOne(comment);
  await db.collection("sanghaPosts").updateOne({ _id: id, organisationKey }, { $inc: { replies: 1 }, $set: { updatedAt: now } });
  return sendJson(response, 201, { comment: { id: String(comment._id), author: comment.authorName, text: comment.text, createdAt: comment.createdAtIst, isMine: true }, replies: Number(post.replies || 0) + 1, message: "Your reflection has been added." });
}

function requestIsSecure(request) {
  return process.env.NODE_ENV === "production" || String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.host; } catch { return false; }
}

function memberCookie(token, { secure = false, maxAgeSeconds = SESSION_DURATION_MS / 1000 } = {}) {
  return [
    `${MEMBER_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

function loginAllowed(key) {
  const now = Date.now();
  const attempts = (loginWindows.get(key) || []).filter(value => now - value < 15 * 60 * 1000);
  if (attempts.length >= 8) return false;
  attempts.push(now);
  loginWindows.set(key, attempts);
  return true;
}

function publicContributionAllowed(key) {
  const now = Date.now();
  const attempts = (publicContributionWindows.get(key) || []).filter(value => now - value < 60 * 60 * 1000);
  if (attempts.length >= 10) return false;
  attempts.push(now);
  publicContributionWindows.set(key, attempts);
  return true;
}

async function audit(db, organisationKey, actor, action, entityType, entityId, details = {}) {
  await db.collection("auditLogs").insertOne({
    organisationKey,
    actorType: actor ? "member" : "system",
    actorMemberId: actor?._id || null,
    actorName: actor?.fullName || "System",
    action,
    entityType,
    entityId: entityId ? String(entityId) : "",
    details,
    createdAt: new Date(),
  });
}

async function createMemberSession({ request, db, organisationKey, member, clientAddress }) {
  const token = createSessionToken();
  const now = new Date();
  await db.collection("memberSessions").insertOne({
    organisationKey,
    memberId: member._id,
    tokenHash: hashSessionToken(token),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    revokedAt: null,
    ipAddress: clientAddress(request),
    userAgent: cleanText(request.headers["user-agent"], 240),
  });
  return token;
}

async function memberFromRequest(request, db, organisationKey) {
  const token = parseCookies(request.headers.cookie)[MEMBER_COOKIE];
  if (!token) return null;
  const session = await db.collection("memberSessions").findOne({
    organisationKey,
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
    revokedAt: null,
  });
  if (!session) return null;
  const member = await db.collection("members").findOne({ _id: session.memberId, organisationKey, status: "active", livingStatus: { $ne: "deceased" } });
  if (!member) return null;
  await db.collection("memberSessions").updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  return { member, session, membershipDisabled: member.membershipStatus === "disabled" };
}

async function activate(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const body = await readJson(request);
  const validation = validateActivation(body);
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const passwordError = validatePassword(body.password);
  if (passwordError) return sendJson(response, 422, { error: passwordError });
  const application = await db.collection("memberApplications").findOne({
    organisationKey,
    reference: validation.value.reference,
    mobile: validation.value.mobile,
    status: "approved",
    memberId: { $ne: null },
  });
  if (!application) return sendJson(response, 401, { error: "Approved Parichay details could not be verified. Ask the centre to confirm approval." });
  const member = await db.collection("members").findOne({ _id: application.memberId, organisationKey, status: "active" });
  if (!member || member.passwordCredential) return sendJson(response, 409, { error: "This account is already active. Please sign in or contact the centre." });
  if (member.membershipStatus === "disabled") return sendJson(response, 403, { error: MEMBERSHIP_DISABLED_MESSAGE, code: "MEMBERSHIP_DISABLED" });
  const passwordCredential = await hashPassword(String(body.password));
  const now = new Date();
  await db.collection("members").updateOne({ _id: member._id }, { $set: { passwordCredential: { ...passwordCredential, updatedAt: now }, accountActivatedAt: now, updatedAt: now } });
  const activated = { ...member, passwordCredential };
  const token = await createMemberSession({ request, db, organisationKey, member: activated, clientAddress });
  await audit(db, organisationKey, activated, "member.account_activated", "member", activated._id);
  return sendJson(response, 200, { member: publicMember(activated), message: "Your member account is ready." }, { "Set-Cookie": memberCookie(token, { secure: requestIsSecure(request) }) });
}

async function requestMemberPasswordReset(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!email || !email.includes("@")) return sendJson(response, 422, { error: "Enter your registered email address." });
  const address = clientAddress(request);
  if (!rateAllowed(passwordResetRequestWindows, `${address}:${email}`, 3, 15 * 60 * 1000)) {
    return sendJson(response, 429, { error: "Too many password reset requests. Please wait 15 minutes and try again." });
  }
  if (!passwordResetTransport()) {
    return sendJson(response, 503, { error: "Member password recovery email is temporarily unavailable. Please contact the centre." });
  }

  const message = "If this is a registered member email, a six-digit verification code has been sent. The code expires in 10 minutes.";
  const member = await db.collection("members").findOne({
    organisationKey,
    email,
    status: "active",
    livingStatus: { $ne: "deceased" },
    passwordCredential: { $ne: null },
  });
  if (!member) return sendJson(response, 200, { message });

  const now = new Date();
  const resetId = new ObjectId();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.collection("memberPasswordResets").updateMany(
    { organisationKey, memberId: member._id, usedAt: null, revokedAt: null },
    { $set: { revokedAt: now, revokeReason: "superseded" } },
  );
  await db.collection("memberPasswordResets").insertOne({
    _id: resetId,
    organisationKey,
    memberId: member._id,
    email,
    codeHash: passwordResetCodeHash(resetId, code),
    attempts: 0,
    maxAttempts: PASSWORD_RESET_MAX_ATTEMPTS,
    createdAt: now,
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_DURATION_MS),
    usedAt: null,
    revokedAt: null,
    deliveryStatus: "pending",
    ipAddress: address,
    userAgent: cleanText(request.headers["user-agent"], 240),
  });
  try {
    await sendMemberPasswordResetCode({ email, code });
    await db.collection("memberPasswordResets").updateOne({ _id: resetId }, { $set: { deliveryStatus: "sent", deliveredAt: new Date() } });
    await audit(db, organisationKey, member, "member.password_reset_requested", "member", member._id);
  } catch (error) {
    await db.collection("memberPasswordResets").updateOne({ _id: resetId }, { $set: { deliveryStatus: "failed", revokedAt: new Date(), failureMessage: cleanText(error instanceof Error ? error.message : "Email delivery failed", 180) } });
    console.error("Member password reset email could not be sent", error instanceof Error ? error.message : error);
    return sendJson(response, 503, { error: "The verification email could not be sent. Please try again shortly." });
  }
  return sendJson(response, 200, { message });
}

async function completeMemberPasswordReset(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  const passwordError = validatePassword(body.password);
  if (!email || !email.includes("@")) return sendJson(response, 422, { error: "Enter your registered email address." });
  if (!/^\d{6}$/.test(code)) return sendJson(response, 422, { error: "Enter the six-digit verification code sent to your email." });
  if (passwordError) return sendJson(response, 422, { error: passwordError });
  const address = clientAddress(request);
  if (!rateAllowed(passwordResetVerificationWindows, `${address}:${email}`, 8, 15 * 60 * 1000)) {
    return sendJson(response, 429, { error: "Too many verification attempts. Please wait 15 minutes and request a new code." });
  }

  const member = await db.collection("members").findOne({
    organisationKey,
    email,
    status: "active",
    livingStatus: { $ne: "deceased" },
    passwordCredential: { $ne: null },
  });
  const reset = member ? await db.collection("memberPasswordResets").findOne({
    organisationKey,
    memberId: member._id,
    email,
    usedAt: null,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: PASSWORD_RESET_MAX_ATTEMPTS },
  }, { sort: { createdAt: -1 } }) : null;
  if (!member || !reset || passwordResetCodeHash(reset._id, code) !== reset.codeHash) {
    if (reset) await db.collection("memberPasswordResets").updateOne({ _id: reset._id }, { $inc: { attempts: 1 } });
    return sendJson(response, 401, { error: "The verification code is incorrect or has expired. Request a new code and try again." });
  }

  const now = new Date();
  const claimed = await db.collection("memberPasswordResets").updateOne(
    { _id: reset._id, usedAt: null, revokedAt: null, expiresAt: { $gt: now }, codeHash: reset.codeHash },
    { $set: { usedAt: now }, $inc: { attempts: 1 } },
  );
  if (!claimed.modifiedCount) return sendJson(response, 409, { error: "This verification code has already been used. Request a new code." });

  const passwordCredential = await hashPassword(String(body.password));
  await db.collection("members").updateOne({ _id: member._id, organisationKey }, {
    $set: { passwordCredential: { ...passwordCredential, updatedAt: now }, accountActivatedAt: member.accountActivatedAt || now, updatedAt: now },
  });
  await Promise.all([
    db.collection("memberSessions").updateMany({ organisationKey, memberId: member._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: "password-reset" } }),
    db.collection("adminSessions").updateMany({ organisationKey, memberId: member._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: "password-reset" } }),
  ]);
  await audit(db, organisationKey, member, "member.password_reset_completed", "member", member._id);
  return sendJson(response, 200, { message: "Your password has been reset. Sign in with your registered email and new password." });
}

async function login(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const address = clientAddress(request);
  if (!loginAllowed(address)) return sendJson(response, 429, { error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
  const body = await readJson(request);
  const identity = normalizeIdentity(body.identity);
  const member = await db.collection("members").findOne({ organisationKey, ...identity, status: "active", livingStatus: { $ne: "deceased" } });
  if (!member?.passwordCredential || !(await verifyPassword(String(body.password || ""), member.passwordCredential))) {
    return sendJson(response, 401, { error: "Mobile/email or password is incorrect. New members must activate their approved Parichay first." });
  }
  const token = await createMemberSession({ request, db, organisationKey, member, clientAddress });
  await audit(db, organisationKey, member, "member.signed_in", "member", member._id);
  return sendJson(response, 200, { member: publicMember(member) }, { "Set-Cookie": memberCookie(token, { secure: requestIsSecure(request) }) });
}

async function logout(request, response, context) {
  const { db, sendJson } = context;
  const token = parseCookies(request.headers.cookie)[MEMBER_COOKIE];
  if (token) await db.collection("memberSessions").updateOne({ tokenHash: hashSessionToken(token) }, { $set: { revokedAt: new Date() } });
  return sendJson(response, 200, { message: "Signed out securely." }, { "Set-Cookie": memberCookie("", { secure: requestIsSecure(request), maxAgeSeconds: 0 }) });
}

function memberSankalp(document) {
  const target = Number(document.estimatedBudgetPaise || document.tentativeBudgetPaise || document.targetAmountPaise || 0);
  const received = Number(document.receivedAmountPaise || 0);
  return {
    ...publicSankalp(document),
    rules: document.rules || "",
    type: document.type || "service",
    completionPercent: Number(document.completionPercent || 0),
    targetAmountRupees: target / 100,
    receivedAmountRupees: received / 100,
    remainingAmountRupees: Math.max(0, target - received) / 100,
    fundingPercent: target ? Math.min(100, Math.round((received / target) * 100)) : 0,
  };
}

function contributionView(document, title = "General Kosh") {
  return {
    id: String(document._id),
    receiptNumber: document.receiptNumber,
    sankalpTitle: title,
    amountRupees: Number(document.amountPaise || 0) / 100,
    status: document.status,
    provider: document.provider,
    contributedAt: document.receivedAt || document.createdAt,
  };
}

async function dashboard(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const now = new Date();
  const [sankalps, contributions, organisation, activeCampaign] = await Promise.all([
    db.collection("sankalps").find({ organisationKey, status: { $in: ["active", "completed"] } }).sort({ featuredOrder: 1, updatedAt: -1 }).toArray(),
    db.collection("contributions").find({ organisationKey, memberId: actor._id, status: { $in: ["verified", "captured", "completed"] } }).sort({ createdAt: -1 }).limit(100).toArray(),
    db.collection("organisations").findOne({ key: organisationKey }),
    db.collection("focusCampaigns").findOne(
      { organisationKey, status: "published", startsAt: { $lte: now }, endsAt: { $gt: now } },
      { sort: { configVersion: -1, publishedAt: -1 } },
    ),
  ]);
  let deliverableCampaign = activeCampaign;
  if (deliverableCampaign) {
    const impression = await db.collection("campaignImpressions").findOne({
      organisationKey,
      campaignId: deliverableCampaign._id,
      memberId: actor._id,
      dayKey: focusCampaignDayKey(now),
    });
    if (Number(impression?.count || 0) >= Number(deliverableCampaign.maxImpressionsPerDay || 1)) deliverableCampaign = null;
  }
  const campaignCreative = deliverableCampaign
    ? await db.collection("campaignCreatives").findOne({ _id: deliverableCampaign.creativeId, organisationKey, status: "approved" })
    : null;
  const titles = new Map(sankalps.map(item => [String(item._id), item.title]));
  return sendJson(response, 200, {
    member: publicMember(actor),
    organisation: { name: organisation?.publicName || "Sri Aurobindo Society", receiptIssuer: organisation?.receiptIssuer || null },
    sankalps: sankalps.map(memberSankalp),
    contributions: contributions.map(item => contributionView(item, titles.get(String(item.sankalpId)) || item.sankalpTitle)),
    totals: { contributedRupees: contributions.reduce((sum, item) => sum + Number(item.amountPaise || 0), 0) / 100 },
    payments: { razorpayEnabled: Boolean(ONLINE_CONTRIBUTIONS_ENABLED && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) },
    focusCampaign: activeMemberCampaignView(deliverableCampaign, campaignCreative),
  });
}

async function recordFocusCampaignImpression(response, context, actor, campaignId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(campaignId);
  if (!id) return sendJson(response, 400, { error: "Invalid campaign reference." });
  const now = new Date();
  const campaign = await db.collection("focusCampaigns").findOne({
    _id: id,
    organisationKey,
    status: "published",
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  });
  if (!campaign) return sendJson(response, 404, { error: "This Focus Campaign is no longer active." });
  const max = Math.max(1, Number(campaign.maxImpressionsPerDay || 1));
  const key = { organisationKey, campaignId: id, memberId: actor._id, dayKey: focusCampaignDayKey(now) };
  try {
    await db.collection("campaignImpressions").updateOne(
      key,
      { $setOnInsert: { count: 0, firstSeenAt: now, createdAt: now }, $set: { updatedAt: now } },
      { upsert: true },
    );
  } catch (error) {
    // Two open member sessions can initialise the same daily counter together.
    // The unique index makes that safe; the losing request can continue to the capped increment.
    if (Number(error?.code) !== 11000) throw error;
  }
  const result = await db.collection("campaignImpressions").updateOne(
    { ...key, count: { $lt: max } },
    { $inc: { count: 1 }, $set: { lastSeenAt: now, updatedAt: now } },
  );
  const current = await db.collection("campaignImpressions").findOne(key);
  return sendJson(response, 200, {
    recorded: Boolean(result.modifiedCount),
    impressionsToday: Number(current?.count || 0),
    remainingToday: Math.max(0, max - Number(current?.count || 0)),
  });
}

async function recordFocusCampaignAction(request, response, context, actor, campaignId) {
  const { db, organisationKey, readJson, sendJson } = context;
  const id = objectId(campaignId);
  if (!id) return sendJson(response, 400, { error: "Invalid campaign reference." });
  const now = new Date();
  const campaign = await db.collection("focusCampaigns").findOne({
    _id: id,
    organisationKey,
    status: "published",
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  });
  if (!campaign) return sendJson(response, 404, { error: "This Focus Campaign is no longer active." });
  const creative = await db.collection("campaignCreatives").findOne({ _id: campaign.creativeId, organisationKey, status: "approved" });
  if (!creative) return sendJson(response, 409, { error: "This campaign creative is no longer available." });
  const body = await readJson(request);
  const locale = body?.locale === "hi" ? "hi" : "en";
  await db.collection("campaignActions").insertOne({
    organisationKey,
    campaignId: id,
    creativeId: creative._id,
    memberId: actor._id,
    action: "cta_opened",
    destination: creative.destination,
    locale,
    createdAt: now,
  });
  return sendJson(response, 200, { recorded: true, destination: creative.destination });
}

async function updateProfile(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const body = await readJson(request);
  const updates = {
    city: cleanText(body.city, 100),
    interests: cleanText(body.interests, 600),
    skills: cleanText(body.skills, 600),
    sevaPreference: cleanText(body.sevaPreference, 300),
    updatedAt: new Date(),
  };
  await db.collection("members").updateOne({ _id: actor._id, organisationKey }, { $set: updates });
  const member = { ...actor, ...updates };
  await audit(db, organisationKey, actor, "member.profile_updated", "member", actor._id);
  return sendJson(response, 200, { member: publicMember(member), message: "Your Parichay has been updated." });
}

function razorpayHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

function providerReceipt(value) {
  return cleanText(value, 40).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
}

async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const providerResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: razorpayHeaders(),
    body: JSON.stringify({ amount: amountPaise, currency: "INR", payment_capture: 1, receipt, notes }),
  });
  const order = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok || !order.id) throw Object.assign(new Error(order.error?.description || "Razorpay could not create the payment order."), { statusCode: 502 });
  return order;
}

async function createOrder(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!ONLINE_CONTRIBUTIONS_ENABLED) return sendJson(response, 503, { error: "Secure online contributions will be enabled soon. No payment has been initiated." });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return sendJson(response, 503, { error: "Online contributions are not enabled yet." });
  const body = await readJson(request);
  const validation = validateContribution({ ...body, donorName: body.donorName || actor.fullName, donorEmail: body.donorEmail || actor.email, donorMobile: body.donorMobile || actor.mobile });
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const sankalpId = objectId(body.sankalpId);
  const sankalp = sankalpId ? await db.collection("sankalps").findOne({ _id: sankalpId, organisationKey, status: "active", acceptsDonations: true }) : null;
  if (!sankalp) return sendJson(response, 404, { error: "Choose a live Sankalp accepting contributions." });
  const target = Number(sankalp.estimatedBudgetPaise || sankalp.tentativeBudgetPaise || sankalp.targetAmountPaise || 0);
  const remaining = target ? Math.max(0, target - Number(sankalp.receivedAmountPaise || 0)) : validation.value.amountPaise;
  if (target && remaining <= 0) return sendJson(response, 409, { error: "This Sankalp is already fully supported." });
  const amountPaise = Math.min(validation.value.amountPaise, remaining);
  const receipt = `sas_${Date.now()}_${String(actor._id).slice(-6)}`;
  const order = await createRazorpayOrder({ amountPaise, receipt, notes: { organisationKey, memberId: String(actor._id), sankalpId: String(sankalp._id), sankalp: sankalp.title } });
  const now = new Date();
  await db.collection("paymentOrders").insertOne({
    organisationKey,
    provider: "razorpay",
    providerOrderId: order.id,
    receipt,
    memberId: actor._id,
    sankalpId: sankalp._id,
    sankalpTitle: sankalp.title,
    amountPaise,
    currency: "INR",
    donor: { ...validation.value, amountPaise: undefined },
    status: "created",
    createdAt: now,
    updatedAt: now,
  });
  return sendJson(response, 201, {
    order: { id: order.id, amountPaise, currency: "INR", razorpayKeyId: process.env.RAZORPAY_KEY_ID, sankalpTitle: sankalp.title },
    message: amountPaise < validation.value.amountPaise ? "Only the remaining Sankalp amount will be accepted." : "Secure payment is ready.",
  });
}

async function publicPaymentConfig(response, context) {
  const { db, organisationKey, sendJson } = context;
  const organisation = await db.collection("organisations").findOne({ key: organisationKey });
  return sendJson(response, 200, {
    enabled: Boolean(ONLINE_CONTRIBUTIONS_ENABLED && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    testMode: String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_"),
    organisation: organisation?.publicName || "Sri Aurobindo Society, Lucknow",
    minimumRupees: 100,
  });
}

async function createPublicOrder(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  if (!ONLINE_CONTRIBUTIONS_ENABLED) return sendJson(response, 503, { error: "Secure online contributions will be enabled soon. No payment has been initiated." });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return sendJson(response, 503, { error: "Online contributions are not enabled yet." });
  if (!publicContributionAllowed(clientAddress(request))) return sendJson(response, 429, { error: "Too many payment attempts. Please wait before trying again." });
  const body = await readJson(request);
  const validation = validateContribution(body);
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  if (!validation.value.donorEmail) return sendJson(response, 422, { error: "Enter an email address so your contribution and member account can be connected." });
  const city = cleanText(body.city || "Lucknow", 100) || "Lucknow";
  const now = new Date();
  const receipt = providerReceipt(`sas_public_${Date.now()}_${validation.value.donorMobile.slice(-4)}`);
  const order = await createRazorpayOrder({
    amountPaise: validation.value.amountPaise,
    receipt,
    notes: { organisationKey, source: "public-website", donorMobile: validation.value.donorMobile, donorEmail: validation.value.donorEmail },
  });
  await db.collection("paymentOrders").insertOne({
    organisationKey,
    provider: "razorpay",
    providerOrderId: order.id,
    receipt,
    memberId: null,
    sankalpId: null,
    sankalpTitle: "Support the Work",
    amountPaise: validation.value.amountPaise,
    currency: "INR",
    donor: { ...validation.value, amountPaise: undefined, city },
    source: "public-website",
    status: "created",
    createdAt: now,
    updatedAt: now,
  });
  return sendJson(response, 201, {
    order: { id: order.id, amountPaise: validation.value.amountPaise, currency: "INR", razorpayKeyId: process.env.RAZORPAY_KEY_ID, title: "Support the Work" },
    message: "Secure payment is ready.",
  });
}

async function ensureContributorMember({ db, organisationKey, order, now }) {
  const donor = order.donor || {};
  const mobile = donor.donorMobile || "";
  const email = donor.donorEmail || "";
  const identityOptions = [
    ...(mobile ? [{ mobile }] : []),
    ...(email ? [{ email }] : []),
  ];
  let member = identityOptions.length ? await db.collection("members").findOne({ organisationKey, $or: identityOptions }) : null;
  let created = false;
  let activationReference = member?.approvedApplicationReference || "";
  if (member && ((mobile && member.mobile && member.mobile !== mobile) || (email && member.email && member.email !== email))) {
    throw Object.assign(new Error("The email or mobile number belongs to an existing account with different details. Please use Member Login or contact the centre."), { statusCode: 409 });
  }
  if (!member) {
    activationReference = `PAR-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const memberNumber = await allocateMemberNumber(db, organisationKey, now);
    const memberDocument = {
      organisationKey,
      fullName: donor.donorName,
      mobile,
      email,
      city: donor.city || "Lucknow",
      interests: "",
      skills: "",
      sevaPreference: "",
      consent: false,
      passwordCredential: null,
      status: "active",
      membershipStatus: "enabled",
      livingStatus: "living",
      role: "member",
      memberNumber,
      approvedApplicationReference: activationReference,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
      source: "public-contribution",
    };
    const memberResult = await db.collection("members").insertOne(memberDocument);
    member = { ...memberDocument, _id: memberResult.insertedId };
    await db.collection("memberApplications").insertOne({
      organisationKey,
      fullName: donor.donorName,
      mobile,
      email,
      city: donor.city || "Lucknow",
      interests: "",
      skills: "",
      sevaPreference: "",
      consent: false,
      reference: activationReference,
      status: "approved",
      memberId: memberResult.insertedId,
      reviewNote: "Account created after a verified public contribution; member must set a password.",
      source: "public-contribution",
      submittedIpHash: "not-stored",
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    created = true;
    await audit(db, organisationKey, null, "member.created_from_public_contribution", "member", member._id, { memberNumber });
  }
  return { member, created, needsActivation: !member.passwordCredential, activationReference };
}

async function recordVerifiedPublicContribution({ db, organisationKey, order, payment }) {
  const existing = await db.collection("contributions").findOne({ provider: "razorpay", providerPaymentId: payment.id });
  if (existing) {
    const member = existing.memberId ? await db.collection("members").findOne({ _id: existing.memberId, organisationKey }) : null;
    return { contribution: existing, member, memberCreated: false, needsActivation: Boolean(member && !member.passwordCredential), activationReference: member?.approvedApplicationReference || "" };
  }
  const now = new Date();
  const { member, created, needsActivation, activationReference } = await ensureContributorMember({ db, organisationKey, order, now });
  const contribution = {
    organisationKey,
    memberId: member._id,
    sankalpId: null,
    sankalpTitle: "Support the Work",
    paymentOrderId: order._id,
    provider: "razorpay",
    providerOrderId: order.providerOrderId,
    providerPaymentId: payment.id,
    amountPaise: order.amountPaise,
    currency: "INR",
    donor: order.donor,
    status: "verified",
    source: "public-website",
    receiptNumber: receiptNumber(payment.id, now),
    receivedAt: now,
    createdAt: now,
  };
  const result = await db.collection("contributions").updateOne(
    { provider: "razorpay", providerPaymentId: payment.id },
    { $setOnInsert: contribution },
    { upsert: true },
  );
  if (!result.upsertedCount) return recordVerifiedPublicContribution({ db, organisationKey, order, payment });
  contribution._id = result.upsertedId;
  await Promise.all([
    db.collection("paymentOrders").updateOne({ _id: order._id }, { $set: { memberId: member._id, status: "verified", providerPaymentId: payment.id, verifiedAt: now, updatedAt: now } }),
    db.collection("koshAccounts").updateOne({ organisationKey, key: "general" }, { $inc: { receivedAmountPaise: order.amountPaise }, $set: { updatedAt: now } }, { upsert: true }),
  ]);
  await audit(db, organisationKey, member, "contribution.public_verified", "contribution", contribution._id, { amountPaise: order.amountPaise, provider: "razorpay", memberCreated: created });
  return { contribution, member, memberCreated: created, needsActivation, activationReference };
}

async function verifyPublicPayment(request, response, context) {
  const { db, organisationKey, readJson, sendJson } = context;
  const body = await readJson(request);
  if (!verifyRazorpaySignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature, process.env.RAZORPAY_KEY_SECRET)) {
    return sendJson(response, 400, { error: "Payment signature could not be verified. No contribution was recorded." });
  }
  const order = await db.collection("paymentOrders").findOne({ organisationKey, providerOrderId: body.razorpayOrderId, provider: "razorpay", source: "public-website" });
  if (!order) return sendJson(response, 404, { error: "Payment order not found." });
  const payment = await fetchPayment(body.razorpayPaymentId);
  if (payment.order_id !== order.providerOrderId || Number(payment.amount) !== order.amountPaise || payment.status !== "captured") {
    return sendJson(response, 409, { error: "Razorpay has not confirmed the expected payment. No contribution was recorded." });
  }
  let result;
  try {
    result = await recordVerifiedPublicContribution({ db, organisationKey, order, payment });
  } catch (error) {
    if (error?.statusCode === 409) {
      const now = new Date();
      const contribution = {
        organisationKey, memberId: null, sankalpId: null, sankalpTitle: "Support the Work", paymentOrderId: order._id,
        provider: "razorpay", providerOrderId: order.providerOrderId, providerPaymentId: payment.id, amountPaise: order.amountPaise,
        currency: "INR", donor: order.donor, status: "verified", source: "public-website", accountConnectionStatus: "manual-review",
        receiptNumber: receiptNumber(payment.id, now), receivedAt: now, createdAt: now,
      };
      const insert = await db.collection("contributions").updateOne({ provider: "razorpay", providerPaymentId: payment.id }, { $setOnInsert: contribution }, { upsert: true });
      contribution._id = insert.upsertedId || (await db.collection("contributions").findOne({ provider: "razorpay", providerPaymentId: payment.id }))?._id;
      await Promise.all([
        db.collection("paymentOrders").updateOne({ _id: order._id }, { $set: { status: "verified-needs-account-review", providerPaymentId: payment.id, verifiedAt: now, updatedAt: now } }),
        db.collection("koshAccounts").updateOne({ organisationKey, key: "general" }, { $inc: { receivedAmountPaise: order.amountPaise }, $set: { updatedAt: now } }, { upsert: true }),
      ]);
      return sendJson(response, 200, { contribution: contributionView(contribution, "Support the Work"), member: null, memberCreated: false, activation: null, message: "Thank you. Your contribution is verified. The centre will connect it to the correct member account after reviewing the matching details." });
    }
    throw error;
  }
  return sendJson(response, 200, {
    contribution: contributionView(result.contribution, "Support the Work"),
    member: result.member ? publicMember(result.member) : null,
    memberCreated: result.memberCreated,
    activation: result.needsActivation ? { mobile: result.member.mobile, reference: result.activationReference } : null,
    message: result.memberCreated
      ? "Thank you. Your contribution is verified and your member account is ready for secure password setup."
      : result.needsActivation
        ? "Thank you. Your contribution is verified. Please finish setting your member password."
        : "Thank you. Your contribution is verified and connected to your member account.",
  });
}

async function fetchPayment(paymentId) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: razorpayHeaders() });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payment.error?.description || "Razorpay payment could not be confirmed."), { statusCode: 502 });
  return payment;
}

async function recordVerifiedContribution({ db, organisationKey, order, payment, actor = null }) {
  const existing = await db.collection("contributions").findOne({ provider: "razorpay", providerPaymentId: payment.id });
  if (existing) return existing;
  const now = new Date();
  const donorResult = await db.collection("sankalpDonors").updateOne(
    { organisationKey, sankalpId: order.sankalpId, memberId: order.memberId },
    { $setOnInsert: { firstContributionAt: now } },
    { upsert: true },
  );
  const firstSupport = donorResult.upsertedCount === 1;
  const contribution = {
    organisationKey,
    memberId: order.memberId,
    sankalpId: order.sankalpId,
    sankalpTitle: order.sankalpTitle,
    paymentOrderId: order._id,
    provider: "razorpay",
    providerOrderId: order.providerOrderId,
    providerPaymentId: payment.id,
    amountPaise: order.amountPaise,
    currency: "INR",
    donor: order.donor,
    status: "verified",
    receiptNumber: receiptNumber(payment.id, now),
    receivedAt: now,
    createdAt: now,
  };
  const result = await db.collection("contributions").updateOne(
    { provider: "razorpay", providerPaymentId: payment.id },
    { $setOnInsert: contribution },
    { upsert: true },
  );
  if (!result.upsertedCount) return db.collection("contributions").findOne({ provider: "razorpay", providerPaymentId: payment.id });
  contribution._id = result.upsertedId;
  await Promise.all([
    db.collection("paymentOrders").updateOne({ _id: order._id }, { $set: { status: "verified", providerPaymentId: payment.id, verifiedAt: now, updatedAt: now } }),
    db.collection("sankalps").updateOne({ _id: order.sankalpId, organisationKey }, { $inc: { receivedAmountPaise: order.amountPaise, ...(firstSupport ? { donorCount: 1 } : {}) }, $set: { updatedAt: now } }),
    db.collection("koshAccounts").updateOne({ organisationKey, key: "general" }, { $inc: { receivedAmountPaise: order.amountPaise, allocatedAmountPaise: order.amountPaise }, $set: { updatedAt: now } }, { upsert: true }),
  ]);
  await audit(db, organisationKey, actor, "contribution.verified", "contribution", contribution._id, { sankalpId: String(order.sankalpId), amountPaise: order.amountPaise, provider: "razorpay" });
  return contribution;
}

async function verifyPayment(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const body = await readJson(request);
  if (!verifyRazorpaySignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature, process.env.RAZORPAY_KEY_SECRET)) {
    return sendJson(response, 400, { error: "Payment signature could not be verified. No contribution was recorded." });
  }
  const order = await db.collection("paymentOrders").findOne({ organisationKey, providerOrderId: body.razorpayOrderId, memberId: actor._id, provider: "razorpay" });
  if (!order) return sendJson(response, 404, { error: "Payment order not found." });
  const payment = await fetchPayment(body.razorpayPaymentId);
  if (payment.order_id !== order.providerOrderId || Number(payment.amount) !== order.amountPaise || payment.status !== "captured") {
    return sendJson(response, 409, { error: "Razorpay has not confirmed the expected payment. No contribution was recorded." });
  }
  const contribution = await recordVerifiedContribution({ db, organisationKey, order, payment, actor });
  return sendJson(response, 200, { contribution: contributionView(contribution, order.sankalpTitle), message: "Thank you. Your contribution has been verified and dedicated to the Sankalp." });
}

async function webhook(request, response, context) {
  const { db, organisationKey, readBuffer, sendJson } = context;
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return sendJson(response, 503, { error: "Webhook verification is not configured." });
  const rawBody = await readBuffer(request, 256 * 1024);
  if (!verifyWebhookSignature(rawBody, request.headers["x-razorpay-signature"], process.env.RAZORPAY_WEBHOOK_SECRET)) return sendJson(response, 401, { error: "Invalid webhook signature." });
  const event = JSON.parse(rawBody.toString("utf8") || "{}");
  const eventId = cleanText(request.headers["x-razorpay-event-id"] || event.id || "", 160) || `${event.event}:${event.payload?.payment?.entity?.id}`;
  if (await db.collection("paymentWebhookEvents").findOne({ provider: "razorpay", eventId })) return sendJson(response, 200, { status: "already_processed" });
  await db.collection("paymentWebhookEvents").insertOne({ provider: "razorpay", eventId, eventType: event.event, createdAt: new Date() });
  const payment = event.payload?.payment?.entity;
  if (["payment.captured", "order.paid"].includes(event.event) && payment?.order_id && payment?.id) {
    const order = await db.collection("paymentOrders").findOne({ organisationKey, providerOrderId: payment.order_id, provider: "razorpay" });
    if (order && Number(payment.amount) === order.amountPaise) {
      if (order.source === "public-website") await recordVerifiedPublicContribution({ db, organisationKey, order, payment });
      else if (order.source === "next-human") await recordNextHumanPayment({ db, organisationKey, order, payment });
      else await recordVerifiedContribution({ db, organisationKey, order, payment });
    }
  }
  return sendJson(response, 200, { status: "ok" });
}

async function receipt(response, context, actor, contributionId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(contributionId);
  const contribution = id ? await db.collection("contributions").findOne({ _id: id, organisationKey, memberId: actor._id, status: "verified" }) : null;
  if (!contribution) return sendJson(response, 404, { error: "Receipt not found." });
  const organisation = await db.collection("organisations").findOne({ key: organisationKey });
  return sendJson(response, 200, {
    receipt: {
      receiptNumber: contribution.receiptNumber,
      issuedAt: contribution.receivedAt,
      amountRupees: Number(contribution.amountPaise || 0) / 100,
      sankalpTitle: contribution.sankalpTitle,
      donor: contribution.donor,
      providerPaymentId: contribution.providerPaymentId,
      organisation: organisation?.publicName || "Sri Aurobindo Society",
      receiptIssuer: organisation?.receiptIssuer || null,
      note: "Payment acknowledgement. An 80G certificate is issued separately only after the authorised branch validates the required legal details.",
    },
  });
}

async function handled(result) { await result; return true; }

export async function handleMemberRequest({ request, response, url, db, organisationKey, readJson, readBuffer, sendJson, clientAddress }) {
  if (!url.pathname.startsWith("/api/participation/member") && !url.pathname.startsWith("/api/participation/payments/razorpay") && url.pathname !== "/api/participation/webhooks/razorpay") return false;
  const context = { request, response, url, db, organisationKey, readJson, readBuffer, sendJson, clientAddress };
  if (url.pathname === "/api/participation/webhooks/razorpay" && request.method === "POST") return handled(webhook(request, response, context));
  if (!["GET", "HEAD"].includes(request.method) && !sameOrigin(request)) {
    sendJson(response, 403, { error: "This request did not come from the SAS Lucknow website." });
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/activate") return handled(activate(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/login") return handled(login(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/password-reset/request") return handled(requestMemberPasswordReset(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/password-reset/complete") return handled(completeMemberPasswordReset(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/logout") return handled(logout(request, response, context));
  if (request.method === "GET" && url.pathname === "/api/participation/payments/razorpay/config") return handled(publicPaymentConfig(response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/payments/razorpay/orders") return handled(createPublicOrder(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/payments/razorpay/verify") return handled(verifyPublicPayment(request, response, context));
  const authenticated = await memberFromRequest(request, db, organisationKey);
  if (!authenticated) { sendJson(response, 401, { error: "Member sign-in is required." }); return true; }
  const actor = authenticated.member;
  if (request.method === "GET" && url.pathname === "/api/participation/member/auth/me") {
    return handled(sendJson(response, 200, {
      member: publicMember(actor),
      membershipDisabled: authenticated.membershipDisabled,
      message: authenticated.membershipDisabled ? MEMBERSHIP_DISABLED_MESSAGE : "",
    }));
  }
  if (authenticated.membershipDisabled) {
    sendJson(response, 403, { error: MEMBERSHIP_DISABLED_MESSAGE, code: "MEMBERSHIP_DISABLED" });
    return true;
  }
  if (await handleNextHumanMemberRequest({ request, response, url, context, actor })) return true;
  if (request.method === "GET" && url.pathname === "/api/participation/member/dashboard") return handled(dashboard(response, context, actor));
  const focusImpressionMatch = url.pathname.match(/^\/api\/participation\/member\/focus-campaigns\/([^/]+)\/impression$/);
  if (request.method === "POST" && focusImpressionMatch) return handled(recordFocusCampaignImpression(response, context, actor, focusImpressionMatch[1]));
  const focusActionMatch = url.pathname.match(/^\/api\/participation\/member\/focus-campaigns\/([^/]+)\/action$/);
  if (request.method === "POST" && focusActionMatch) return handled(recordFocusCampaignAction(request, response, context, actor, focusActionMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/member/sangha/posts") return handled(listSanghaPosts(response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/member/sangha/posts") return handled(createSanghaPost(request, response, context, actor));
  const sanghaMediaMatch = url.pathname.match(/^\/api\/participation\/member\/sangha\/media\/([^/]+)$/);
  if (request.method === "GET" && sanghaMediaMatch) return handled(serveSanghaMedia(request, response, context, actor, sanghaMediaMatch[1]));
  const sanghaVoteMatch = url.pathname.match(/^\/api\/participation\/member\/sangha\/posts\/([^/]+)\/vote$/);
  if (request.method === "POST" && sanghaVoteMatch) return handled(voteOnSanghaPoll(request, response, context, actor, sanghaVoteMatch[1]));
  const sanghaResonateMatch = url.pathname.match(/^\/api\/participation\/member\/sangha\/posts\/([^/]+)\/resonate$/);
  if (request.method === "POST" && sanghaResonateMatch) return handled(toggleSanghaResonance(response, context, actor, sanghaResonateMatch[1]));
  const sanghaSaveMatch = url.pathname.match(/^\/api\/participation\/member\/sangha\/posts\/([^/]+)\/save$/);
  if (request.method === "POST" && sanghaSaveMatch) return handled(toggleSanghaSave(response, context, actor, sanghaSaveMatch[1]));
  const sanghaCommentMatch = url.pathname.match(/^\/api\/participation\/member\/sangha\/posts\/([^/]+)\/comments$/);
  if (request.method === "POST" && sanghaCommentMatch) return handled(addSanghaComment(request, response, context, actor, sanghaCommentMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/member/reflections") return handled(listReflections(response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/member/reflections") return handled(createReflection(request, response, context, actor));
  const reflectionFollowUpMatch = url.pathname.match(/^\/api\/participation\/member\/reflections\/([^/]+)\/follow-ups$/);
  if (request.method === "POST" && reflectionFollowUpMatch) return handled(addReflectionFollowUp(request, response, context, actor, reflectionFollowUpMatch[1]));
  const reflectionMediaMatch = url.pathname.match(/^\/api\/participation\/member\/reflections\/media\/([^/]+)\/([^/]+)$/);
  if (request.method === "GET" && reflectionMediaMatch) return handled(serveReflectionMedia(request, response, context, actor, reflectionMediaMatch[1], decodeURIComponent(reflectionMediaMatch[2])));
  if (request.method === "PATCH" && url.pathname === "/api/participation/member/profile") return handled(updateProfile(request, response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/member/payments/razorpay/orders") return handled(createOrder(request, response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/member/payments/razorpay/verify") return handled(verifyPayment(request, response, context, actor));
  const receiptMatch = url.pathname.match(/^\/api\/participation\/member\/contributions\/([^/]+)\/receipt$/);
  if (request.method === "GET" && receiptMatch) return handled(receipt(response, context, actor, receiptMatch[1]));
  sendJson(response, 404, { error: "Member endpoint not found." });
  return true;
}
