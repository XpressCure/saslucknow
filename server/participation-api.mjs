import http from "node:http";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { handleAdminRequest } from "./participation-admin-api.mjs";
import { handleMemberRequest } from "./participation-member-api.mjs";
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
  const validation = validateParichayApplication(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });

  const now = new Date();
  const duplicate = await db.collection("memberApplications").findOne({
    organisationKey: ORGANISATION_KEY,
    status: "pending",
    $or: [
      { mobile: validation.value.mobile },
      ...(validation.value.email ? [{ email: validation.value.email }] : []),
      ...(validation.value.pushpanjaliCertificateNumber ? [{ pushpanjaliCertificateNumber: validation.value.pushpanjaliCertificateNumber }] : []),
    ],
  });
  if (duplicate) return sendJson(response, 409, { error: "A Parichay request with these details is already awaiting review." });

  const reference = `PAR-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const document = {
    ...validation.value,
    organisationKey: ORGANISATION_KEY,
    reference,
    status: "pending",
    source: validation.value.pushpanjaliCertificateNumber ? "pushpanjali" : "website",
    submittedIpHash: "not-stored",
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection("memberApplications").insertOne(document);
  await db.collection("auditLogs").insertOne({
    organisationKey: ORGANISATION_KEY,
    actorType: "public",
    action: "parichay.application.created",
    entityType: "memberApplication",
    entityId: String(result.insertedId),
    reference,
    pushpanjaliCertificateNumber: validation.value.pushpanjaliCertificateNumber || "",
    createdAt: now,
  });
  sendJson(response, 201, { status: "pending", reference, message: "Your Parichay has been received for review." });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
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
      return submitParichay(request, response, db);
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
