import http from "node:http";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import { hashPassword, validatePassword } from "./participation-auth.mjs";
import { handleAdminRequest } from "./participation-admin-api.mjs";
import { handleMemberRequest } from "./participation-member-api.mjs";
import { allocateMemberNumber } from "./participation-member-core.mjs";
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
let indexPromise;

function nextHumanMailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

function safeMailText(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

async function notifyNextHumanAdministrators(db, inquiry, submissionKind) {
  const transport = nextHumanMailTransport();
  if (!transport) return;
  const configuredRecipients = String(process.env.NEXT_HUMAN_ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const administratorRows = await db.collection("members").find({
    organisationKey: ORGANISATION_KEY,
    role: { $in: ["administrator", "super_administrator"] },
    membershipStatus: { $ne: "disabled" },
    email: { $type: "string", $ne: "" },
  }).project({ email: 1 }).toArray();
  const recipients = [...new Set([...configuredRecipients, ...administratorRows.map(item => String(item.email || "").trim().toLowerCase()).filter(Boolean)])];
  if (!recipients.length) return;
  const adminUrl = `${String(process.env.PUBLIC_SITE_URL || "https://www.saslucknow.in").replace(/\/$/, "")}/admin`;
  const refreshed = submissionKind === "refreshed";
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `SAS Lucknow <${process.env.SMTP_USER}>`,
    to: recipients.join(", "),
    replyTo: inquiry.email || process.env.EMAIL_REPLY_TO || "info.saslucknow@gmail.com",
    subject: `${refreshed ? "Updated" : "New"} NEXT HUMAN inquiry · ${inquiry.reference}`,
    text: `${inquiry.fullName} has ${refreshed ? "updated" : "submitted"} a NEXT HUMAN Founding Circle inquiry.\n\nMobile: ${inquiry.mobile}\nEmail: ${inquiry.email}\nCity: ${inquiry.city}\nReference: ${inquiry.reference}\n\nReview it in Administration: ${adminUrl}`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5ead4;color:#163846;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px;border:1px solid #decba8;border-radius:18px;background:#fffaf0"><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#a66f1e">NEXT HUMAN · ADMINISTRATOR ALERT</div><h1 style="margin:14px 0 10px;font-family:Georgia,serif;font-size:30px">${refreshed ? "An inquiry was updated" : "A new inquiry has arrived"}</h1><p style="line-height:1.65;color:#526a72"><strong>${safeMailText(inquiry.fullName)}</strong> has ${refreshed ? "updated" : "submitted"} a Founding Circle inquiry.</p><p style="line-height:1.7;color:#526a72">Reference: <strong>${safeMailText(inquiry.reference)}</strong><br>Mobile: ${safeMailText(inquiry.mobile)}<br>Email: ${safeMailText(inquiry.email)}<br>City: ${safeMailText(inquiry.city)}</p><a href="${adminUrl}" style="display:inline-block;margin-top:12px;padding:14px 22px;border-radius:999px;background:#163846;color:#fff;text-decoration:none;font-weight:700">Review in Administration</a></div></body></html>`,
  });
}

function queueNextHumanAdministratorEmail(db, inquiry, submissionKind) {
  void notifyNextHumanAdministrators(db, inquiry, submissionKind).catch(error => {
    console.error(`NEXT HUMAN ${inquiry.reference}: administrator email alert failed`, error);
  });
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
  clientPromise ||= new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
  const db = (await clientPromise).db(DATABASE_NAME);
  indexPromise ||= Promise.all([
    db.collection("campaignImpressions").createIndex(
      { organisationKey: 1, campaignId: 1, memberId: 1, dayKey: 1 },
      { unique: true, name: "campaign_member_daily_impression" },
    ),
    db.collection("campaignImpressions").createIndex(
      { organisationKey: 1, campaignId: 1, lastSeenAt: -1 },
      { name: "campaign_impression_reporting" },
    ),
    db.collection("campaignActions").createIndex(
      { organisationKey: 1, campaignId: 1, action: 1, createdAt: -1 },
      { name: "campaign_action_reporting" },
    ),
    db.collection("campaignActions").createIndex(
      { organisationKey: 1, memberId: 1, createdAt: -1 },
      { name: "campaign_member_actions" },
    ),
    db.collection("adminPasswordResets").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "admin_password_reset_expiry" },
    ),
    db.collection("adminPasswordResets").createIndex(
      { organisationKey: 1, memberId: 1, createdAt: -1 },
      { name: "admin_password_reset_member" },
    ),
    db.collection("memberPasswordResets").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "member_password_reset_expiry" },
    ),
    db.collection("memberPasswordResets").createIndex(
      { organisationKey: 1, memberId: 1, createdAt: -1 },
      { name: "member_password_reset_member" },
    ),
    db.collection("nextHumanVolunteerInquiries").createIndex(
      { organisationKey: 1, reference: 1 },
      { unique: true, name: "next_human_reference" },
    ),
    db.collection("nextHumanVolunteerInquiries").createIndex(
      { organisationKey: 1, status: 1, createdAt: -1 },
      { name: "next_human_status_created" },
    ),
    db.collection("nextHumanVolunteerInquiries").createIndex(
      { organisationKey: 1, normalisedMobile: 1 },
      { name: "next_human_mobile" },
    ),
    db.collection("nextHumanVolunteerInquiries").createIndex(
      { organisationKey: 1, normalisedEmail: 1 },
      { sparse: true, name: "next_human_email" },
    ),
    db.collection("nextHumanVolunteerInquiries").createIndex(
      { organisationKey: 1, source: 1, createdAt: -1 },
      { name: "next_human_source_created" },
    ),
    db.collection("nextHumanEvents").createIndex(
      { organisationKey: 1, eventKey: 1 },
      { unique: true, name: "next_human_event" },
    ),
    db.collection("nextHumanApplications").createIndex(
      { organisationKey: 1, eventKey: 1, memberId: 1 },
      { unique: true, name: "next_human_member_application" },
    ),
    db.collection("nextHumanApplications").createIndex(
      { organisationKey: 1, eventKey: 1, pathway: 1, status: 1, submittedAt: -1 },
      { name: "next_human_application_review" },
    ),
    db.collection("nextHumanSeatReservations").createIndex(
      { organisationKey: 1, eventKey: 1, dayId: 1, seatId: 1 },
      { unique: true, name: "next_human_day_seat" },
    ),
    db.collection("nextHumanSeatReservations").createIndex(
      { organisationKey: 1, eventKey: 1, dayId: 1, pathway: 1, status: 1 },
      { name: "next_human_day_pathway_capacity" },
    ),
    db.collection("nextHumanBookings").createIndex(
      { organisationKey: 1, eventKey: 1, memberId: 1, dayId: 1, status: 1 },
      { name: "next_human_member_day_booking" },
    ),
    db.collection("nextHumanBookings").createIndex(
      { organisationKey: 1, eventKey: 1, providerPaymentId: 1 },
      { unique: true, sparse: true, name: "next_human_payment" },
    ),
  ]).catch(error => {
    indexPromise = undefined;
    throw error;
  });
  await indexPromise;
  return db;
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
  const memberNumber = await allocateMemberNumber(db, ORGANISATION_KEY, now);
  const passwordCredential = await hashPassword(String(body.password));
  const memberDocument = {
    ...validation.value,
    organisationKey: ORGANISATION_KEY,
    passwordCredential: { ...passwordCredential, updatedAt: now },
    accountActivatedAt: now,
    status: "active",
    membershipStatus: "enabled",
    livingStatus: "living",
    role: "member",
    memberNumber,
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
  sendJson(response, 201, { status: "active", reference, memberNumber, message: `Your member account ${memberNumber} is ready. Sign in with your mobile number and password.` });
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
    queueNextHumanAdministratorEmail(db, { ...existing, ...validation.value, reference: existing.reference }, "refreshed");
    return sendJson(response, 200, { status: "refreshed", reference: existing.reference, nextStep: "await_review", message: "Your existing Founding Circle inquiry has been refreshed." });
  }
  const reference = `NHV-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const document = { ...validation.value, organisationKey: ORGANISATION_KEY, reference, status: "new", submittedIpHash: "not-stored", submissionEvents: [{ source: validation.value.source, submittedAt: now }], createdAt: now, updatedAt: now, latestSubmittedAt: now };
  const result = await collection.insertOne(document);
  await db.collection("auditLogs").insertOne({ organisationKey: ORGANISATION_KEY, actorType: "public", action: "next_human.inquiry_received", entityType: "nextHumanVolunteerInquiry", entityId: String(result.insertedId), reference, createdAt: now });
  queueNextHumanAdministratorEmail(db, document, "received");
  return sendJson(response, 201, { status: "received", reference, nextStep: "await_review", message: "Your Founding Circle inquiry has been received." });
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
