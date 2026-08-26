import http from "node:http";
import { randomUUID } from "node:crypto";
import { hashPassword, validatePassword } from "./participation-auth.mjs";
import { validateNextHumanVolunteerInquiry } from "./next-human-core.mjs";
import {
  publicParticipationSummary,
  publicRecentContribution,
  publicSankalp,
  validateParichayApplication,
} from "./participation-core.mjs";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const PORT = Number(process.env.PARTICIPATION_PORT || 3002);
const DATABASE_NAME = process.env.SAS_DATABASE_NAME || "sas_lucknow";
const ORGANISATION_KEY = process.env.SAS_ORGANISATION_KEY || "sas-lucknow";
const MAX_JSON_BYTES = 64 * 1024;
const requestWindows = new Map();
let clientPromise;
let localDemoModulePromise;

function localDemoModule() {
  return localDemoModulePromise ||= import("./next-human-demo-database.mjs");
}

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function clientAddress(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function allowSubmission(request) {
  const key = clientAddress(request);
  const now = Date.now();
  const recent = (requestWindows.get(key) || []).filter(value => now - value < 60 * 60 * 1000);
  if (recent.length >= 5) return false;
  recent.push(now);
  requestWindows.set(key, recent);
  return true;
}

async function readBuffer(request, limit = MAX_JSON_BYTES) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Request too large."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  try {
    return JSON.parse((await readBuffer(request)).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { statusCode: 400 });
  }
}

async function database() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  const { MongoClient } = await import("mongodb");
  clientPromise ||= new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
  return (await clientPromise).db(DATABASE_NAME);
}

async function overview(db) {
  const [organisation, sankalps, approvedMembers, recentContributionDocuments] = await Promise.all([
    db.collection("organisations").findOne({ key: ORGANISATION_KEY }),
    db.collection("sankalps").find({ organisationKey: ORGANISATION_KEY, status: { $in: ["funding", "active", "completed"] } }).sort({ featuredOrder: 1, createdAt: -1 }).toArray(),
    db.collection("members").countDocuments({ organisationKey: ORGANISATION_KEY, status: "active", livingStatus: { $ne: "deceased" } }),
    db.collection("contributions").find({
      organisationKey: ORGANISATION_KEY,
      $or: [
        { status: { $in: ["captured", "verified", "completed", "received", "successful"] } },
        { status: { $exists: false } },
      ],
    }).sort({ createdAt: -1 }).limit(5).toArray(),
  ]);
  const publicSankalps = sankalps.map(publicSankalp);
  const titleById = new Map(sankalps.map(item => [String(item._id), item.title]));
  const titleBySlug = new Map(sankalps.map(item => [item.slug, item.title]));
  const recentContributions = recentContributionDocuments.map(item => publicRecentContribution(
    item,
    titleById.get(String(item.sankalpId || "")) || titleBySlug.get(item.sankalpSlug) || item.sankalpTitle || "General Kosh",
  ));
  return {
    organisation: organisation ? {
      name: organisation.publicName,
      centreName: organisation.centreName,
      location: organisation.location,
      supportEmail: organisation.supportEmail,
      supportPhone: organisation.supportPhone,
    } : null,
    memberCount: approvedMembers,
    summary: publicParticipationSummary(publicSankalps),
    sankalps: publicSankalps,
    recentContributions,
  };
}

async function submitParichay(request, response, db) {
  if (!allowSubmission(request)) return sendJson(response, 429, { error: "Too many submissions. Please try again later." });
  const body = await readJson(request);
  const validation = validateParichayApplication(body);
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const passwordError = validatePassword(body.password);
  if (passwordError) return sendJson(response, 422, { error: passwordError });

  const now = new Date();
  const identityOptions = [
    { mobile: validation.value.mobile },
    ...(validation.value.email ? [{ email: validation.value.email }] : []),
  ];
  const existingMember = await db.collection("members").findOne({
    organisationKey: ORGANISATION_KEY,
    $or: identityOptions,
  });
  if (existingMember) return sendJson(response, 409, { error: "A member account already exists for this mobile number or email. Please sign in or contact the centre for account recovery." });

  const reference = `PAR-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const passwordCredential = await hashPassword(String(body.password));
  const memberDocument = {
    ...validation.value,
    organisationKey: ORGANISATION_KEY,
    passwordCredential: { ...passwordCredential, updatedAt: now },
    accountActivatedAt: now,
    status: "active",
    livingStatus: "living",
    role: "member",
    approvedApplicationReference: reference,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const memberResult = await db.collection("members").insertOne(memberDocument);
  const document = {
    ...validation.value,
    organisationKey: ORGANISATION_KEY,
    reference,
    status: "approved",
    memberId: memberResult.insertedId,
    reviewNote: "Self-registered member account",
    reviewedAt: now,
    source: validation.value.pushpanjaliCertificateNumber ? "pushpanjali" : "website",
    submittedIpHash: "not-stored",
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection("memberApplications").insertOne(document);
  await db.collection("auditLogs").insertOne({
    organisationKey: ORGANISATION_KEY,
    actorType: "public",
    action: "member.self_registered",
    entityType: "memberApplication",
    entityId: String(result.insertedId),
    reference,
    pushpanjaliCertificateNumber: validation.value.pushpanjaliCertificateNumber || "",
    createdAt: now,
  });
  sendJson(response, 201, { status: "active", reference, message: "Your member account is ready. Sign in with your mobile number and password." });
}

async function submitNextHumanInquiry(request, response, db) {
  if (!allowSubmission(request)) return sendJson(response, 429, { error: "Too many submissions. Please wait before trying again." });
  const body = await readJson(request);
  const validation = validateNextHumanVolunteerInquiry(body);
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const collection = db.collection("nextHumanVolunteerInquiries");
  const now = new Date();
  const existing = await collection.findOne({
    organisationKey: ORGANISATION_KEY,
    $or: [{ normalisedMobile: validation.value.normalisedMobile }, { normalisedEmail: validation.value.normalisedEmail }],
    status: { $nin: ["declined", "withdrawn"] },
  });
  if (existing) {
    await collection.updateOne({ _id: existing._id }, {
      $set: { ...validation.value, updatedAt: now, latestSubmittedAt: now },
      $push: { submissionEvents: { source: validation.value.source, submittedAt: now } },
    });
    await db.collection("auditLogs").insertOne({ organisationKey: ORGANISATION_KEY, actorType: "public", action: "next_human.inquiry_refreshed", entityType: "nextHumanVolunteerInquiry", entityId: String(existing._id), reference: existing.reference, createdAt: now });
    return sendJson(response, 200, { status: "refreshed", reference: existing.reference, nextStep: "await_review", message: "Your existing Founding Circle inquiry has been refreshed." });
  }
  const reference = `NHV-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const document = { ...validation.value, organisationKey: ORGANISATION_KEY, reference, status: "new", submittedIpHash: "not-stored", submissionEvents: [{ source: validation.value.source, submittedAt: now }], createdAt: now, updatedAt: now, latestSubmittedAt: now };
  const result = await collection.insertOne(document);
  await db.collection("auditLogs").insertOne({ organisationKey: ORGANISATION_KEY, actorType: "public", action: "next_human.inquiry_received", entityType: "nextHumanVolunteerInquiry", entityId: String(result.insertedId), reference, createdAt: now });
  return sendJson(response, 201, { status: "received", reference, nextStep: "await_review", message: "Your Founding Circle inquiry has been received." });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (process.env.SAS_LOCAL_DEMO_DB === "true") {
      const { handleNextHumanDemoRequest } = await localDemoModule();
      if (await handleNextHumanDemoRequest({ request, response, url, readJson, sendJson })) return;
    }
    const [{ handleAdminRequest }, { handleMemberRequest }] = await Promise.all([
      import("./participation-admin-api.mjs"),
      import("./participation-member-api.mjs"),
    ]);
    const db = await database();
    if (await handleAdminRequest({
      request,
      response,
      url,
      db,
      organisationKey: ORGANISATION_KEY,
      readJson,
      sendJson,
      clientAddress,
    })) return;
    if (await handleMemberRequest({
      request,
      response,
      url,
      db,
      organisationKey: ORGANISATION_KEY,
      readJson,
      readBuffer,
      sendJson,
      clientAddress,
    })) return;
    if (request.method === "GET" && url.pathname === "/api/participation/health") {
      await db.command({ ping: 1 });
      return sendJson(response, 200, { status: "ok", service: "sas-participation" });
    }
    if (request.method === "GET" && url.pathname === "/api/participation/overview") {
      return sendJson(response, 200, await overview(db));
    }
    if (request.method === "POST" && url.pathname === "/api/participation/parichay/applications") {
      return await submitParichay(request, response, db);
    }
    if (request.method === "POST" && url.pathname === "/api/participation/next-human/volunteer-inquiries") {
      return await submitNextHumanInquiry(request, response, db);
    }
    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    console.error("Participation API error", error);
    sendJson(response, Number(error?.statusCode || 500), { error: error?.statusCode ? error.message : "The participation service is temporarily unavailable." });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SAS participation API listening on http://127.0.0.1:${PORT}`);
});

async function shutdown() {
  server.close();
  if (clientPromise) await (await clientPromise).close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
