import { ObjectId } from "mongodb";
import Busboy from "busboy";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomInt, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  publicAdministrator,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  sessionCookie,
  validatePassword,
  verifyPassword,
} from "./participation-auth.mjs";
import {
  serializeSankalp,
  slugify,
  validateMilestone,
  validateSankalp,
} from "./participation-admin-core.mjs";
import { cleanText } from "./participation-core.mjs";
import {
  campaignCatalog,
  campaignDestinationCatalog,
  creativeView,
  focusCampaignView,
  nextCampaignVersion,
  validateCreativeInput,
  validateFocusCampaignInput,
} from "./participation-campaign-core.mjs";
import { handleNextHumanAdminRequest } from "./next-human-event-api.mjs";
import { NEXT_HUMAN_EVENT_KEY } from "./next-human-event-core.mjs";

const loginWindows = new Map();
const passwordResetRequestWindows = new Map();
const passwordResetVerificationWindows = new Map();
const PASSWORD_RESET_DURATION_MS = 10 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_STORAGE_DIR = process.env.SAS_DOCUMENT_STORAGE_DIR || path.resolve("var", "participation-documents");
const MEMBER_SESSION_COOKIE = "sas_member_session";
const DEFAULT_ADMIN_PERMISSIONS = [
  "members.review",
  "members.manage",
  "sangha.moderate",
  "sankalps.manage",
  "contributions.view",
  "reports.view",
];
const SUCCESSFUL_CONTRIBUTION_STATUSES = ["verified", "captured", "completed", "received", "successful"];
const NOTIFICATION_ACTIONS = ["sangha.post_published", "contribution.public_verified", "contribution.verified", "member.self_registered", "pushpanjali.certificate_created", "next_human.inquiry_received", "next_human.inquiry_refreshed", "next_human.application_submitted"];
const allowedDocumentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function objectId(value) {
  return ObjectId.isValid(String(value || "")) ? new ObjectId(String(value)) : null;
}

function requestIsSecure(request) {
  return process.env.NODE_ENV === "production" || String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

function memberSessionCookie(token, { secure = false, maxAgeSeconds = SESSION_DURATION_MS / 1000 } = {}) {
  const parts = [
    `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function loginAllowed(key) {
  const now = Date.now();
  const attempts = (loginWindows.get(key) || []).filter(value => now - value < 15 * 60 * 1000);
  if (attempts.length >= 8) return false;
  attempts.push(now);
  loginWindows.set(key, attempts);
  return true;
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

async function sendAdministratorPasswordResetCode({ email, code }) {
  const transport = passwordResetTransport();
  if (!transport) throw Object.assign(new Error("Administrator password recovery email is not configured."), { statusCode: 503 });
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `SAS Lucknow <${process.env.SMTP_USER}>`,
    to: email,
    replyTo: process.env.EMAIL_REPLY_TO || "info.saslucknow@gmail.com",
    subject: "Your SAS Lucknow administrator password reset code",
    text: `Your SAS Lucknow administrator password reset code is ${code}.\n\nThis code expires in 10 minutes and can be used only once. If you did not request it, you can safely ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5ead4;color:#163846;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #decba8;border-radius:18px;background:#fffaf0"><div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#a66f1e">SRI AUROBINDO SOCIETY · LUCKNOW</div><h1 style="margin:14px 0 10px;font-family:Georgia,serif;font-size:30px">Reset your administrator password</h1><p style="line-height:1.65;color:#526a72">Enter this verification code on the administrator sign-in page:</p><div style="margin:24px 0;padding:18px;border-radius:12px;background:#163846;color:#fff;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px">${code}</div><p style="line-height:1.65;color:#526a72">The code expires in 10 minutes and works once. If you did not request it, no action is required.</p></div></body></html>`,
  });
}

const nextHumanStatusMail = {
  orientation_invited: {
    subject: "NEXT HUMAN · Invitation to orientation",
    heading: "You are invited to the NEXT HUMAN orientation",
    message: "The Sri Aurobindo Society, Lucknow team has reviewed your inquiry and would like to invite you to the orientation. The team will share the practical details with you shortly.",
  },
  foundation_circle: {
    subject: "NEXT HUMAN · Founding Circle",
    heading: "Welcome to the NEXT HUMAN Founding Circle",
    message: "Your inquiry has been reviewed and you have been added to the NEXT HUMAN Founding Circle. The team will contact you with the next steps.",
  },
  hold: {
    subject: "NEXT HUMAN · Inquiry update",
    heading: "Your inquiry remains under consideration",
    message: "Thank you for the care with which you responded. Your NEXT HUMAN inquiry remains under consideration and the team will contact you when the next suitable step is available.",
  },
  declined: {
    subject: "NEXT HUMAN · Inquiry update",
    heading: "Your inquiry has been reviewed",
    message: "Thank you for your interest in NEXT HUMAN. The present review cycle is complete. We hope you will continue to remain connected with Sri Aurobindo Society, Lucknow and its future initiatives.",
  },
};

async function sendNextHumanInquiryStatusEmail(inquiry, status) {
  const copy = nextHumanStatusMail[status];
  if (!copy || !inquiry.email) return "not_required";
  const transport = passwordResetTransport();
  if (!transport) return "not_configured";
  const publicUrl = `${String(process.env.PUBLIC_SITE_URL || "https://www.saslucknow.in").replace(/\/$/, "")}/next-human`;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `SAS Lucknow <${process.env.SMTP_USER}>`,
    to: inquiry.email,
    replyTo: process.env.EMAIL_REPLY_TO || "info.saslucknow@gmail.com",
    subject: copy.subject,
    text: `${copy.heading}\n\nDear ${inquiry.fullName},\n\n${copy.message}\n\nReference: ${inquiry.reference}\n\nNEXT HUMAN: ${publicUrl}\n\nRegards,\nSri Aurobindo Society, Lucknow\nGomti Nagar Centre (UC-02)`,
  });
  return "sent";
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

async function administratorFromRequest(request, db, organisationKey) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const session = await db.collection("adminSessions").findOne({
    organisationKey,
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
    revokedAt: null,
  });
  if (!session) return null;
  const member = await db.collection("members").findOne({
    _id: session.memberId,
    organisationKey,
    status: "active",
    membershipStatus: { $ne: "disabled" },
    role: { $in: ["administrator", "super_administrator"] },
  });
  if (!member) return null;
  await db.collection("adminSessions").updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  return { member, session };
}

function hasPermission(member, permission) {
  return member.role === "super_administrator" || member.permissions?.includes(permission);
}

function memberView(member) {
  return {
    id: String(member._id),
    memberNumber: member.memberNumber || "",
    fullName: member.fullName,
    email: member.email || "",
    mobile: member.mobile || "",
    city: member.city || "",
    role: member.role || "member",
    status: member.status,
    membershipStatus: member.membershipStatus === "disabled" ? "disabled" : "enabled",
    interests: member.interests || "",
    skills: member.skills || "",
    sevaPreference: member.sevaPreference || "",
    pushpanjaliCertificateNumber: member.pushpanjaliCertificateNumber || "",
    joinedAt: member.joinedAt || member.createdAt,
  };
}

function canManageMembers(member) {
  return ["administrator", "super_administrator"].includes(member.role);
}

async function resolveTeamMemberIds(db, organisationKey, value) {
  for (const key of ["projectLeadMemberId", "auditorMemberId", "implementationLeadMemberId"]) {
    if (value[key] === undefined) continue;
    if (!value[key]) {
      value[key] = null;
      continue;
    }
    const id = objectId(value[key]);
    const member = id ? await db.collection("members").findOne({ _id: id, organisationKey, status: "active", livingStatus: { $ne: "deceased" } }) : null;
    if (!member) throw Object.assign(new Error("Choose an active member for every assigned Sankalp role."), { statusCode: 422 });
    value[key] = id;
  }
}

function safeDownloadName(value) {
  return cleanText(value, 160).replace(/[^a-zA-Z0-9._ -]/g, "_") || "sankalp-document";
}

async function readDocumentInput(request, readJson) {
  if (!String(request.headers["content-type"] || "").startsWith("multipart/form-data")) {
    return { fields: await readJson(request), file: null };
  }
  return new Promise((resolve, reject) => {
    const fields = {};
    let file = null;
    let fileError = null;
    const parser = Busboy({ headers: request.headers, limits: { files: 1, fileSize: MAX_DOCUMENT_BYTES, fields: 12 } });
    parser.on("field", (name, value) => { fields[name] = value; });
    parser.on("file", (_name, stream, info) => {
      const chunks = [];
      let size = 0;
      stream.on("data", chunk => { chunks.push(chunk); size += chunk.length; });
      stream.on("limit", () => { fileError = "Document must be 10 MB or smaller."; });
      stream.on("end", () => {
        if (!fileError && size) file = { buffer: Buffer.concat(chunks), size, originalName: safeDownloadName(info.filename), mimeType: info.mimeType };
      });
    });
    parser.once("error", reject);
    parser.once("finish", () => fileError ? reject(Object.assign(new Error(fileError), { statusCode: 413 })) : resolve({ fields, file }));
    request.pipe(parser);
  });
}

async function createSession({ request, db, organisationKey, member, clientAddress }) {
  const token = createSessionToken();
  const now = new Date();
  await db.collection("adminSessions").insertOne({
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

async function createMemberSessionForAdministrator({ request, db, organisationKey, member, clientAddress }) {
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
    source: "administrator-login",
  });
  return token;
}

async function activate(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const passwordError = validatePassword(body.password);
  if (passwordError) return sendJson(response, 422, { error: passwordError });
  if (!process.env.SAS_ADMIN_ACTIVATION_CODE) return sendJson(response, 503, { error: "Administrator activation has not been enabled on the server." });
  if (String(body.activationCode || "") !== process.env.SAS_ADMIN_ACTIVATION_CODE) return sendJson(response, 401, { error: "The activation details could not be verified." });

  const member = await db.collection("members").findOne({ organisationKey, email, status: "active", role: { $in: ["administrator", "super_administrator"] } });
  if (!member || member.passwordCredential) return sendJson(response, 409, { error: "This administrator account cannot be activated here. Use Sign in or contact the system owner." });
  const passwordCredential = await hashPassword(String(body.password));
  await db.collection("members").updateOne({ _id: member._id }, { $set: { passwordCredential: { ...passwordCredential, updatedAt: new Date() }, updatedAt: new Date() } });
  const activated = { ...member, passwordCredential };
  const token = await createSession({ request, db, organisationKey, member: activated, clientAddress });
  await audit(db, organisationKey, activated, "administrator.account_activated", "member", activated._id);
  return sendJson(response, 200, { administrator: publicAdministrator(activated) }, { "Set-Cookie": sessionCookie(token, { secure: requestIsSecure(request) }) });
}

async function requestAdministratorPasswordReset(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  if (!email || !email.includes("@")) return sendJson(response, 422, { error: "Enter a valid administrator email address." });
  const address = clientAddress(request);
  if (!rateAllowed(passwordResetRequestWindows, `${address}:${email}`, 3, 15 * 60 * 1000)) {
    return sendJson(response, 429, { error: "Too many password reset requests. Please wait 15 minutes and try again." });
  }
  if (!passwordResetTransport()) {
    return sendJson(response, 503, { error: "Administrator password recovery email is temporarily unavailable. Please contact the system owner." });
  }

  const message = "If this is an active administrator email, a six-digit verification code has been sent. The code expires in 10 minutes.";
  const member = await db.collection("members").findOne({
    organisationKey,
    $or: [{ email }, { administratorLoginAliases: email }],
    status: "active",
    membershipStatus: { $ne: "disabled" },
    role: { $in: ["administrator", "super_administrator"] },
  });
  if (!member) return sendJson(response, 200, { message });

  const now = new Date();
  const resetId = new ObjectId();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.collection("adminPasswordResets").updateMany(
    { organisationKey, memberId: member._id, usedAt: null, revokedAt: null },
    { $set: { revokedAt: now, revokeReason: "superseded" } },
  );
  await db.collection("adminPasswordResets").insertOne({
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
    await sendAdministratorPasswordResetCode({ email, code });
    await db.collection("adminPasswordResets").updateOne({ _id: resetId }, { $set: { deliveryStatus: "sent", deliveredAt: new Date() } });
    await audit(db, organisationKey, member, "administrator.password_reset_requested", "member", member._id);
  } catch (error) {
    await db.collection("adminPasswordResets").updateOne({ _id: resetId }, { $set: { deliveryStatus: "failed", revokedAt: new Date(), failureMessage: cleanText(error instanceof Error ? error.message : "Email delivery failed", 180) } });
    console.error("Administrator password reset email could not be sent", error instanceof Error ? error.message : error);
    return sendJson(response, 503, { error: "The verification email could not be sent. Please try again shortly." });
  }
  return sendJson(response, 200, { message });
}

async function completeAdministratorPasswordReset(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  const passwordError = validatePassword(body.password);
  if (!email || !email.includes("@")) return sendJson(response, 422, { error: "Enter a valid administrator email address." });
  if (!/^\d{6}$/.test(code)) return sendJson(response, 422, { error: "Enter the six-digit verification code sent to your email." });
  if (passwordError) return sendJson(response, 422, { error: passwordError });
  const address = clientAddress(request);
  if (!rateAllowed(passwordResetVerificationWindows, `${address}:${email}`, 8, 15 * 60 * 1000)) {
    return sendJson(response, 429, { error: "Too many verification attempts. Please wait 15 minutes and request a new code." });
  }

  const member = await db.collection("members").findOne({
    organisationKey,
    $or: [{ email }, { administratorLoginAliases: email }],
    status: "active",
    membershipStatus: { $ne: "disabled" },
    role: { $in: ["administrator", "super_administrator"] },
  });
  const reset = member ? await db.collection("adminPasswordResets").findOne({
    organisationKey,
    memberId: member._id,
    email,
    usedAt: null,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: PASSWORD_RESET_MAX_ATTEMPTS },
  }, { sort: { createdAt: -1 } }) : null;
  if (!member || !reset || passwordResetCodeHash(reset._id, code) !== reset.codeHash) {
    if (reset) await db.collection("adminPasswordResets").updateOne({ _id: reset._id }, { $inc: { attempts: 1 } });
    return sendJson(response, 401, { error: "The verification code is incorrect or has expired. Request a new code and try again." });
  }

  const now = new Date();
  const claimed = await db.collection("adminPasswordResets").updateOne(
    { _id: reset._id, usedAt: null, revokedAt: null, expiresAt: { $gt: now }, codeHash: reset.codeHash },
    { $set: { usedAt: now }, $inc: { attempts: 1 } },
  );
  if (!claimed.modifiedCount) return sendJson(response, 409, { error: "This verification code has already been used. Request a new code." });

  const passwordCredential = await hashPassword(String(body.password));
  await db.collection("members").updateOne({ _id: member._id, organisationKey }, {
    $set: { passwordCredential: { ...passwordCredential, updatedAt: now }, accountActivatedAt: member.accountActivatedAt || now, updatedAt: now },
    $unset: { masterPasswordSetup: "" },
  });
  await Promise.all([
    db.collection("adminSessions").updateMany({ organisationKey, memberId: member._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: "password-reset" } }),
    db.collection("memberSessions").updateMany({ organisationKey, memberId: member._id, revokedAt: null }, { $set: { revokedAt: now, revokeReason: "password-reset" } }),
  ]);
  await audit(db, organisationKey, member, "administrator.password_reset_completed", "member", member._id);
  return sendJson(response, 200, { message: "Your administrator password has been reset. Sign in with the new password." });
}

async function login(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const address = clientAddress(request);
  if (!loginAllowed(address)) return sendJson(response, 429, { error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const member = await db.collection("members").findOne({
    organisationKey,
    $or: [{ email }, { administratorLoginAliases: email }],
    status: "active",
    membershipStatus: { $ne: "disabled" },
    role: { $in: ["administrator", "super_administrator"] },
  });
  if (!member?.passwordCredential || !(await verifyPassword(String(body.password || ""), member.passwordCredential))) {
    return sendJson(response, 401, { error: "Email or password is incorrect." });
  }
  const token = await createSession({ request, db, organisationKey, member, clientAddress });
  const memberToken = await createMemberSessionForAdministrator({ request, db, organisationKey, member, clientAddress });
  await audit(db, organisationKey, member, "administrator.signed_in", "member", member._id);
  const secure = requestIsSecure(request);
  return sendJson(response, 200, { administrator: publicAdministrator(member) }, {
    "Set-Cookie": [sessionCookie(token, { secure }), memberSessionCookie(memberToken, { secure })],
  });
}

async function logout(request, response, context) {
  const { db, sendJson } = context;
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  const memberToken = cookies[MEMBER_SESSION_COOKIE];
  if (token) await db.collection("adminSessions").updateOne({ tokenHash: hashSessionToken(token) }, { $set: { revokedAt: new Date() } });
  if (memberToken) await db.collection("memberSessions").updateOne({ tokenHash: hashSessionToken(memberToken) }, { $set: { revokedAt: new Date() } });
  const secure = requestIsSecure(request);
  return sendJson(response, 200, { message: "Signed out securely." }, {
    "Set-Cookie": [clearSessionCookie({ secure }), memberSessionCookie("", { secure, maxAgeSeconds: 0 })],
  });
}

async function overview(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const [pendingApplications, newNextHumanInquiries, submittedNextHumanApplications, activeMembers, sankalps, recentAudits, visiblePosts, contributions, certificates] = await Promise.all([
    db.collection("memberApplications").countDocuments({ organisationKey, status: "pending" }),
    db.collection("nextHumanVolunteerInquiries").countDocuments({ organisationKey, status: "new" }),
    db.collection("nextHumanApplications").countDocuments({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, status: "submitted" }),
    db.collection("members").countDocuments({ organisationKey, status: "active" }),
    db.collection("sankalps").find({ organisationKey }).sort({ updatedAt: -1 }).toArray(),
    db.collection("auditLogs").find({ organisationKey }).sort({ createdAt: -1 }).limit(8).toArray(),
    db.collection("sanghaPosts").countDocuments({ organisationKey, status: "published" }),
    db.collection("contributions").find({
      organisationKey,
      $or: [{ status: { $in: SUCCESSFUL_CONTRIBUTION_STATUSES } }, { status: { $exists: false } }],
    }).project({ amountPaise: 1, memberId: 1 }).toArray(),
    db.collection("pushpanjaliCertificates").countDocuments({ organisationKey }),
  ]);
  return sendJson(response, 200, {
    administrator: publicAdministrator(actor),
    metrics: {
      pendingApplications,
      newNextHumanInquiries: newNextHumanInquiries + submittedNextHumanApplications,
      activeMembers,
      draftSankalps: sankalps.filter(item => item.status === "draft").length,
      liveSankalps: sankalps.filter(item => item.status === "active").length,
      completedSankalps: sankalps.filter(item => item.status === "completed").length,
      visiblePosts,
      totalYogdaanRupees: contributions.reduce((sum, item) => sum + Number(item.amountPaise || 0), 0) / 100,
      contributingMembers: new Set(contributions.map(item => String(item.memberId || "")).filter(Boolean)).size,
      certificates,
    },
    stageCounts: sankalps.reduce((counts, item) => ({ ...counts, [item.stage || "concept"]: (counts[item.stage || "concept"] || 0) + 1 }), {}),
    recentActivity: recentAudits.map(item => ({ id: String(item._id), action: item.action, actorName: item.actorName, entityType: item.entityType, createdAt: item.createdAt })),
  });
}

const nextHumanInquiryStatuses = new Set(["new", "reviewing", "orientation_invited", "foundation_circle", "hold", "declined", "withdrawn"]);

function nextHumanInquiryView(item) {
  return { ...item, id: String(item._id), _id: undefined, reviewedByMemberId: item.reviewedByMemberId ? String(item.reviewedByMemberId) : "" };
}

async function nextHumanInquiries(request, response, url, context, actor, id = "") {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "members.review")) return sendJson(response, 403, { error: "Member review permission is required." });
  const collection = db.collection("nextHumanVolunteerInquiries");
  if (request.method === "GET") {
    const requestedStatus = cleanText(url.searchParams.get("status"), 40);
    const query = { organisationKey };
    if (nextHumanInquiryStatuses.has(requestedStatus)) query.status = requestedStatus;
    const rows = await collection.find(query).sort({ latestSubmittedAt: -1, createdAt: -1 }).limit(300).toArray();
    return sendJson(response, 200, { inquiries: rows.map(nextHumanInquiryView) });
  }
  const inquiryId = objectId(id);
  if (!inquiryId) return sendJson(response, 400, { error: "Invalid NEXT HUMAN inquiry reference." });
  const body = await readJson(request);
  const status = cleanText(body.status, 40);
  if (!nextHumanInquiryStatuses.has(status)) return sendJson(response, 422, { error: "Choose a valid review status." });
  const now = new Date();
  const result = await collection.findOneAndUpdate({ _id: inquiryId, organisationKey }, { $set: { status, internalNote: cleanText(body.internalNote, 1200), reviewedByMemberId: actor._id, reviewedByName: actor.fullName, reviewedAt: now, updatedAt: now } }, { returnDocument: "after" });
  if (!result) return sendJson(response, 404, { error: "This volunteer inquiry could not be found." });
  await audit(db, organisationKey, actor, "next_human.inquiry_reviewed", "nextHumanVolunteerInquiry", inquiryId, { reference: result.reference, status });
  let emailStatus = "not_required";
  try {
    emailStatus = await sendNextHumanInquiryStatusEmail(result, status);
  } catch (error) {
    emailStatus = "failed";
    console.error(`NEXT HUMAN ${result.reference}: applicant status email failed`, error);
  }
  await audit(db, organisationKey, actor, "next_human.inquiry_status_notified", "nextHumanVolunteerInquiry", inquiryId, { reference: result.reference, status, emailStatus });
  const emailMessage = emailStatus === "sent" ? " The applicant has been informed by email." : emailStatus === "failed" ? " The status was saved, but the applicant email could not be sent." : "";
  return sendJson(response, 200, { inquiry: nextHumanInquiryView(result), emailStatus, message: `Inquiry moved to ${status.replaceAll("_", " ")}.${emailMessage}` });
}

async function pushpanjaliCertificates(response, url, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!hasPermission(actor, "reports.view")) return sendJson(response, 403, { error: "Reports permission is required." });
  const query = { organisationKey };
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from || to) {
    query.generatedAt = {};
    if (from) query.generatedAt.$gte = new Date(`${from}T00:00:00+05:30`);
    if (to) query.generatedAt.$lte = new Date(`${to}T23:59:59.999+05:30`);
  }
  const rows = await db.collection("pushpanjaliCertificates").find(query).sort({ generatedAt: -1 }).limit(2000).toArray();
  const references = rows.map(item => item.certificateNumber).filter(Boolean);
  const linkedMembers = references.length ? await db.collection("members").find({
    organisationKey,
    pushpanjaliCertificateNumber: { $in: references },
  }).project({ fullName: 1, memberNumber: 1, pushpanjaliCertificateNumber: 1 }).toArray() : [];
  const memberByCertificate = new Map(linkedMembers.map(item => [item.pushpanjaliCertificateNumber, item]));
  const uniqueEmails = new Set(rows.map(item => String(item.email || "").toLowerCase()).filter(Boolean));
  return sendJson(response, 200, {
    summary: {
      recordedCertificates: rows.length,
      uniqueDevotees: uniqueEmails.size,
      emailedCertificates: rows.filter(item => item.emailStatus === "sent").length,
      linkedMembers: rows.filter(item => memberByCertificate.has(item.certificateNumber)).length,
      latestAt: rows[0]?.generatedAt || null,
    },
    certificates: rows.map(item => {
      const linked = memberByCertificate.get(item.certificateNumber);
      return {
        id: String(item._id),
        certificateNumber: item.certificateNumber || "",
        offeringNumber: Number(item.offeringNumber || 0),
        name: item.name || item.participant?.name || "",
        email: item.email || item.participant?.email || "",
        flowerId: item.flowerId || "",
        flowerName: item.flowerName || item.flower?.name || "",
        flowerBotanical: item.flowerBotanical || item.flower?.botanical || "",
        flowerMeaning: item.flowerMeaning || item.flower?.meaning || "",
        ceremonyDate: item.ceremonyDate || "",
        generatedAt: item.generatedAt || item.createdAt || null,
        emailStatus: item.emailStatus || "unknown",
        emailedAt: item.emailedAt || null,
        memberNumber: linked?.memberNumber || "",
        memberName: linked?.fullName || "",
      };
    }),
  });
}

async function applications(request, response, url, context, actor, id = "") {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "members.review")) return sendJson(response, 403, { error: "Member review permission is required." });
  if (request.method === "GET") {
    const status = ["pending", "approved", "rejected"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : "pending";
    const rows = await db.collection("memberApplications").find({ organisationKey, status }).sort({ createdAt: -1 }).limit(200).toArray();
    return sendJson(response, 200, { applications: rows.map(item => ({ ...item, id: String(item._id), _id: undefined })) });
  }
  const applicationId = objectId(id);
  if (!applicationId) return sendJson(response, 400, { error: "Invalid application reference." });
  const body = await readJson(request);
  if (!["approve", "reject"].includes(body.decision)) return sendJson(response, 422, { error: "Choose approve or reject." });
  const application = await db.collection("memberApplications").findOne({ _id: applicationId, organisationKey, status: "pending" });
  if (!application) return sendJson(response, 404, { error: "This pending Parichay could not be found." });
  const now = new Date();
  let member = null;
  if (body.decision === "approve") {
    member = await db.collection("members").findOne({ organisationKey, $or: [{ mobile: application.mobile }, ...(application.email ? [{ email: application.email }] : [])] });
    const memberFields = {
      fullName: application.fullName,
      mobile: application.mobile,
      city: application.city || "",
      interests: application.interests || "",
      skills: application.skills || "",
      sevaPreference: application.sevaPreference || "",
      pushpanjaliCertificateNumber: application.pushpanjaliCertificateNumber || "",
      status: "active",
      membershipStatus: member?.membershipStatus || "enabled",
      livingStatus: "living",
      role: member?.role || "member",
      approvedApplicationReference: application.reference,
      updatedAt: now,
    };
    if (application.email) memberFields.email = application.email;
    if (member) {
      await db.collection("members").updateOne({ _id: member._id }, { $set: memberFields });
    } else {
      const result = await db.collection("members").insertOne({ organisationKey, ...memberFields, joinedAt: now, createdAt: now });
      member = { _id: result.insertedId, ...memberFields };
    }
  }
  await db.collection("memberApplications").updateOne({ _id: applicationId }, { $set: { status: body.decision === "approve" ? "approved" : "rejected", reviewNote: cleanText(body.note, 600), reviewedByMemberId: actor._id, reviewedAt: now, updatedAt: now, memberId: member?._id || null } });
  await audit(db, organisationKey, actor, `parichay.application_${body.decision}d`, "memberApplication", applicationId, { reference: application.reference });
  return sendJson(response, 200, { message: body.decision === "approve" ? "Parichay approved and member activated." : "Parichay application rejected." });
}

async function listMembers(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageMembers(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const [rows, sankalps] = await Promise.all([
    db.collection("members").find({ organisationKey, status: "active", livingStatus: { $ne: "deceased" } }).sort({ fullName: 1 }).toArray(),
    db.collection("sankalps").find({ organisationKey, status: { $nin: ["draft", "archived"] } }).sort({ featuredOrder: 1, createdAt: 1 }).toArray(),
  ]);
  const memberIds = rows.map(item => item._id);
  const contributions = memberIds.length ? await db.collection("contributions").find({
    organisationKey,
    memberId: { $in: memberIds },
    $or: [
      { status: { $in: ["verified", "captured", "completed", "received", "successful"] } },
      { status: { $exists: false } },
    ],
  }).toArray() : [];
  const sankalpTitles = new Map(sankalps.map(item => [String(item._id), item.title]));
  const contributionsByMember = new Map();
  for (const contribution of contributions) {
    const memberId = String(contribution.memberId || "");
    const sankalpId = String(contribution.sankalpId || "support-the-work");
    const title = sankalpTitles.get(sankalpId) || contribution.sankalpTitle || "Support the Work";
    if (!contributionsByMember.has(memberId)) contributionsByMember.set(memberId, new Map());
    const memberContributions = contributionsByMember.get(memberId);
    const current = memberContributions.get(sankalpId) || { sankalpId, title, amountPaise: 0, contributionCount: 0, lastContributedAt: null };
    current.amountPaise += Number(contribution.amountPaise || 0);
    current.contributionCount += 1;
    if (!current.lastContributedAt || new Date(contribution.createdAt || contribution.receivedAt || 0) > new Date(current.lastContributedAt)) {
      current.lastContributedAt = contribution.createdAt || contribution.receivedAt || null;
    }
    memberContributions.set(sankalpId, current);
  }
  const members = rows.map(member => {
    const base = memberView(member);
    const recorded = contributionsByMember.get(String(member._id)) || new Map();
    const yogdaan = sankalps.map(sankalp => recorded.get(String(sankalp._id)) || {
      sankalpId: String(sankalp._id),
      title: sankalp.title,
      amountPaise: 0,
      contributionCount: 0,
      lastContributedAt: null,
    });
    const additional = [...recorded.values()].filter(item => item.sankalpId === "support-the-work" || !sankalpTitles.has(item.sankalpId));
    const allYogdaan = [...yogdaan, ...additional];
    return {
      ...base,
      canManageAccess: base.role !== "super_administrator" && String(member._id) !== String(actor._id),
      certificateCreated: Boolean(base.pushpanjaliCertificateNumber),
      parichay: {
        city: base.city,
        interests: base.interests,
        skills: base.skills,
        sevaPreference: base.sevaPreference,
        pushpanjaliCertificateNumber: base.pushpanjaliCertificateNumber,
      },
      yogdaan: {
        totalAmountRupees: allYogdaan.reduce((sum, item) => sum + Number(item.amountPaise || 0), 0) / 100,
        contributionCount: allYogdaan.reduce((sum, item) => sum + Number(item.contributionCount || 0), 0),
        lastContributedAt: allYogdaan.reduce((latest, item) => {
          if (!item.lastContributedAt) return latest;
          return !latest || new Date(item.lastContributedAt) > new Date(latest) ? item.lastContributedAt : latest;
        }, null),
        sankalps: allYogdaan.map(item => ({ ...item, amountRupees: Number(item.amountPaise || 0) / 100, amountPaise: undefined })),
      },
    };
  });
  return sendJson(response, 200, { members });
}

async function updateMemberAccess(request, response, context, actor, memberId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageMembers(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(memberId);
  if (!id) return sendJson(response, 400, { error: "Invalid member reference." });
  const body = await readJson(request);
  const action = cleanText(body.action, 40);
  if (!["enabled", "disabled", "administrator"].includes(action)) {
    return sendJson(response, 422, { error: "Choose Membership Enabled, Membership Disabled or Make Administrator." });
  }
  const member = await db.collection("members").findOne({ _id: id, organisationKey, status: "active" });
  if (!member) return sendJson(response, 404, { error: "Member not found." });
  if (String(member._id) === String(actor._id)) return sendJson(response, 403, { error: "Use another master administrator to change your own access." });
  if (member.role === "super_administrator") return sendJson(response, 403, { error: "The master administrator account cannot be changed here." });

  const now = new Date();
  let update;
  if (action === "administrator") {
    update = {
      $set: {
        role: "administrator",
        membershipStatus: "enabled",
        permissions: DEFAULT_ADMIN_PERMISSIONS,
        administratorPromotedAt: now,
        administratorPromotedByMemberId: actor._id,
        updatedAt: now,
      },
      $unset: { membershipDisabledAt: "", membershipDisabledByMemberId: "" },
    };
  } else if (action === "disabled") {
    update = { $set: { membershipStatus: "disabled", membershipDisabledAt: now, membershipDisabledByMemberId: actor._id, updatedAt: now } };
  } else {
    update = {
      $set: { membershipStatus: "enabled", membershipEnabledAt: now, membershipEnabledByMemberId: actor._id, updatedAt: now },
      $unset: { membershipDisabledAt: "", membershipDisabledByMemberId: "" },
    };
  }
  await db.collection("members").updateOne({ _id: id, organisationKey }, update);
  await audit(db, organisationKey, actor, action === "administrator" ? "member.promoted_to_administrator" : `member.membership_${action}`, "member", id, { memberNumber: member.memberNumber || "" });
  return sendJson(response, 200, {
    role: action === "administrator" ? "administrator" : member.role || "member",
    membershipStatus: action === "disabled" ? "disabled" : "enabled",
    message: action === "administrator" ? `${member.fullName} is now an administrator.` : `Membership access has been ${action}.`,
  });
}

async function updateMembership(request, response, context, actor, memberId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageMembers(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(memberId);
  if (!id) return sendJson(response, 400, { error: "Invalid member reference." });
  const body = await readJson(request);
  if (typeof body.enabled !== "boolean") return sendJson(response, 422, { error: "Choose whether membership access is enabled or disabled." });
  const member = await db.collection("members").findOne({ _id: id, organisationKey, status: "active" });
  if (!member) return sendJson(response, 404, { error: "Member not found." });
  if (["administrator", "super_administrator"].includes(member.role)) return sendJson(response, 403, { error: "Administrator membership cannot be changed from this screen." });
  const now = new Date();
  const membershipStatus = body.enabled ? "enabled" : "disabled";
  const update = body.enabled
    ? { $set: { membershipStatus, membershipEnabledAt: now, membershipEnabledByMemberId: actor._id, updatedAt: now }, $unset: { membershipDisabledAt: "", membershipDisabledByMemberId: "" } }
    : { $set: { membershipStatus, membershipDisabledAt: now, membershipDisabledByMemberId: actor._id, updatedAt: now } };
  await db.collection("members").updateOne({ _id: id, organisationKey }, update);
  await audit(db, organisationKey, actor, body.enabled ? "member.membership_enabled" : "member.membership_disabled", "member", id, { memberNumber: member.memberNumber || "" });
  return sendJson(response, 200, { membershipStatus, message: body.enabled ? "Membership access has been enabled." : "Membership access has been disabled." });
}

async function listSanghaPosts(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageMembers(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const posts = await db.collection("sanghaPosts").find({ organisationKey, status: { $in: ["published", "hidden"] } }).sort({ createdAt: -1 }).limit(250).toArray();
  return sendJson(response, 200, { posts: posts.map(item => ({
    id: String(item._id),
    author: item.authorName || "Member",
    authorRole: item.authorRole || "Member",
    type: item.type || "Reflection",
    text: item.text || "",
    status: item.status,
    createdAt: item.createdAt,
    createdAtIst: item.createdAtIst || "",
    media: item.media ? { kind: item.media.kind, name: item.media.originalName || item.media.name || "Attached media" } : null,
  })) });
}

async function updateSanghaVisibility(request, response, context, actor, postId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageMembers(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(postId);
  if (!id) return sendJson(response, 400, { error: "Invalid Sangha post reference." });
  const body = await readJson(request);
  if (typeof body.hidden !== "boolean") return sendJson(response, 422, { error: "Choose whether the post should be hidden." });
  const post = await db.collection("sanghaPosts").findOne({ _id: id, organisationKey, status: { $in: ["published", "hidden"] } });
  if (!post) return sendJson(response, 404, { error: "Sangha post not found." });
  const now = new Date();
  const status = body.hidden ? "hidden" : "published";
  const update = body.hidden
    ? { $set: { status, hiddenAt: now, hiddenByMemberId: actor._id, updatedAt: now } }
    : { $set: { status, updatedAt: now }, $unset: { hiddenAt: "", hiddenByMemberId: "" } };
  await db.collection("sanghaPosts").updateOne({ _id: id, organisationKey }, update);
  await audit(db, organisationKey, actor, body.hidden ? "sangha.post_hidden" : "sangha.post_restored", "sanghaPost", id, { author: post.authorName || "Member" });
  return sendJson(response, 200, { status, message: body.hidden ? "The Sangha post is now hidden from members." : "The Sangha post is visible again." });
}

function validDate(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function communityYogdaan(response, context, actor) {
  const { db, organisationKey, sendJson, url } = context;
  if (!hasPermission(actor, "contributions.view")) return sendJson(response, 403, { error: "Community Yogdaan permission is required." });
  const from = validDate(url.searchParams.get("from"));
  const to = validDate(url.searchParams.get("to"), true);
  const receivedAt = {};
  if (from) receivedAt.$gte = from;
  if (to) receivedAt.$lte = to;
  const query = {
    organisationKey,
    $or: [{ status: { $in: SUCCESSFUL_CONTRIBUTION_STATUSES } }, { status: { $exists: false } }],
    ...(Object.keys(receivedAt).length ? { $and: [{ $or: [{ receivedAt }, { createdAt: receivedAt }] }] } : {}),
  };
  const contributions = await db.collection("contributions").find(query).sort({ receivedAt: -1, createdAt: -1 }).limit(2500).toArray();
  const memberIds = [...new Set(contributions.map(item => String(item.memberId || "")).filter(Boolean))].map(value => objectId(value)).filter(Boolean);
  const sankalpIds = [...new Set(contributions.map(item => String(item.sankalpId || "")).filter(Boolean))].map(value => objectId(value)).filter(Boolean);
  const [members, sankalps] = await Promise.all([
    memberIds.length ? db.collection("members").find({ _id: { $in: memberIds }, organisationKey }).toArray() : [],
    sankalpIds.length ? db.collection("sankalps").find({ _id: { $in: sankalpIds }, organisationKey }).toArray() : [],
  ]);
  const memberById = new Map(members.map(item => [String(item._id), item]));
  const sankalpById = new Map(sankalps.map(item => [String(item._id), item.title]));
  const transactions = contributions.map(item => {
    const member = memberById.get(String(item.memberId || ""));
    const donor = item.donor || {};
    return {
      id: String(item._id),
      transactionId: item.providerPaymentId || item.providerOrderId || item.receiptNumber || String(item._id),
      orderId: item.providerOrderId || "",
      receiptNumber: item.receiptNumber || "",
      memberId: member ? String(member._id) : "",
      memberNumber: member?.memberNumber || "",
      memberName: member?.fullName || donor.donorName || "Unlinked contributor",
      email: member?.email || donor.donorEmail || "",
      mobile: member?.mobile || donor.donorMobile || "",
      amountRupees: Number(item.amountPaise || 0) / 100,
      sankalpTitle: sankalpById.get(String(item.sankalpId || "")) || item.sankalpTitle || "Support the Work",
      status: item.status || "recorded",
      provider: item.provider || "manual",
      receivedAt: item.receivedAt || item.createdAt || null,
    };
  });
  const contributorIds = new Set(transactions.map(item => item.memberId || `${item.email}:${item.mobile}`).filter(Boolean));
  const totalRupees = transactions.reduce((sum, item) => sum + item.amountRupees, 0);
  return sendJson(response, 200, {
    summary: {
      totalRupees,
      contributingMembers: contributorIds.size,
      transactionCount: transactions.length,
      averageRupees: transactions.length ? totalRupees / transactions.length : 0,
      latestAt: transactions[0]?.receivedAt || null,
    },
    transactions,
  });
}

function notificationView(item) {
  const isPost = item.action === "sangha.post_published";
  const isContribution = item.action.startsWith("contribution.");
  const isCertificate = item.action === "pushpanjali.certificate_created";
  const isNextHumanApplication = item.action === "next_human.application_submitted";
  const isNextHuman = item.action.startsWith("next_human.inquiry_") || isNextHumanApplication;
  const amount = Number(item.details?.amountPaise || 0) / 100;
  return {
    id: String(item._id),
    type: isPost ? "sangha" : isContribution ? "yogdaan" : isCertificate ? "certificate" : isNextHuman ? "next_human" : "member",
    title: isPost ? "New Sangha post" : isContribution ? "New Yogdaan received" : isCertificate ? "Pushpanjali certificate created" : isNextHumanApplication ? "New NEXT HUMAN application" : isNextHuman ? (item.action.endsWith("refreshed") ? "NEXT HUMAN inquiry updated" : "New NEXT HUMAN inquiry") : "New member account",
    message: isPost
      ? `${item.actorName || "A member"} shared a ${item.details?.type || "post"}.`
      : isContribution
        ? `${item.actorName || "A member"} offered Rs ${amount.toLocaleString("en-IN")}.`
        : isCertificate
          ? `${item.actorName || "A devotee"} received ${item.details?.certificateNumber || "a Pushpanjali certificate"}.`
          : isNextHumanApplication
            ? `${item.actorName || "A member"} submitted a NEXT HUMAN ${item.details?.pathway === "fellowship" ? "Fellowship" : "Challenge"} application for review.`
          : isNextHuman
            ? `Founding Circle inquiry ${item.reference || item.details?.reference || "received"} is ready for review.`
          : "A new member account has been created.",
    entityId: item.entityId || "",
    createdAt: item.createdAt,
  };
}

async function notifications(request, response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageMembers(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  if (request.method === "POST") {
    const now = new Date();
    await db.collection("members").updateOne({ _id: actor._id, organisationKey }, { $set: { administratorNotificationsReadAt: now, updatedAt: now } });
    return sendJson(response, 200, { unreadCount: 0, readAt: now, message: "Notifications marked as reviewed." });
  }
  const rows = await db.collection("auditLogs").find({ organisationKey, action: { $in: NOTIFICATION_ACTIONS } }).sort({ createdAt: -1 }).limit(100).toArray();
  const readAt = actor.administratorNotificationsReadAt ? new Date(actor.administratorNotificationsReadAt) : new Date(0);
  return sendJson(response, 200, {
    unreadCount: rows.filter(item => new Date(item.createdAt) > readAt).length,
    readAt,
    notifications: rows.map(notificationView),
  });
}

async function sankalpList(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const rows = await db.collection("sankalps").find({ organisationKey }).sort({ status: 1, featuredOrder: 1, updatedAt: -1 }).toArray();
  return sendJson(response, 200, { sankalps: rows.map(item => serializeSankalp(item)) });
}

async function createSankalp(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const validation = validateSankalp(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  await resolveTeamMemberIds(db, organisationKey, validation.value);
  const now = new Date();
  const baseSlug = slugify(validation.value.title) || `sankalp-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;
  while (await db.collection("sankalps").findOne({ organisationKey, slug })) slug = `${baseSlug}-${suffix++}`;
  const document = {
    organisationKey,
    slug,
    ...validation.value,
    receivedAmountPaise: 0,
    allocatedAmountPaise: 0,
    spentAmountPaise: 0,
    donorCount: 0,
    volunteerCount: 0,
    createdByMemberId: actor._id,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection("sankalps").insertOne(document);
  await audit(db, organisationKey, actor, "sankalp.created", "sankalp", result.insertedId, { title: document.title, status: document.status });
  return sendJson(response, 201, { sankalp: serializeSankalp({ _id: result.insertedId, ...document }), message: document.status === "draft" ? "Draft Sankalp saved privately." : "Sankalp created and published." });
}

async function sankalpDetails(response, context, actor, sankalpId) {
  const { db, organisationKey, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const id = objectId(sankalpId);
  if (!id) return sendJson(response, 400, { error: "Invalid Sankalp reference." });
  const [sankalp, milestones, reports, documents] = await Promise.all([
    db.collection("sankalps").findOne({ _id: id, organisationKey }),
    db.collection("sankalpMilestones").find({ organisationKey, sankalpId: id }).sort({ dueDate: 1, createdAt: 1 }).toArray(),
    db.collection("sankalpProgressReports").find({ organisationKey, sankalpId: id }).sort({ createdAt: -1 }).toArray(),
    db.collection("sankalpDocuments").find({ organisationKey, sankalpId: id }).sort({ createdAt: -1 }).toArray(),
  ]);
  if (!sankalp) return sendJson(response, 404, { error: "Sankalp not found." });
  const roleIds = [sankalp.projectLeadMemberId, sankalp.auditorMemberId, sankalp.implementationLeadMemberId].filter(Boolean);
  const roleMembers = roleIds.length ? await db.collection("members").find({ _id: { $in: roleIds } }).toArray() : [];
  const names = Object.fromEntries(roleMembers.map(item => [String(item._id), item.fullName]));
  return sendJson(response, 200, { sankalp: serializeSankalp(sankalp, {
    team: {
      projectLead: names[String(sankalp.projectLeadMemberId)] || "",
      auditor: names[String(sankalp.auditorMemberId)] || "",
      implementationLead: names[String(sankalp.implementationLeadMemberId)] || "",
    },
    milestones: milestones.map(item => ({ ...item, id: String(item._id), _id: undefined, budgetRupees: Number(item.budgetPaise || 0) / 100 })),
    progressReports: reports.map(item => ({ ...item, id: String(item._id), _id: undefined })),
    documents: documents.map(item => ({ ...item, id: String(item._id), _id: undefined, downloadUrl: item.storage ? `/api/participation/admin/documents/${item._id}/download` : "" })),
  }) });
}

async function updateSankalp(request, response, context, actor, sankalpId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const id = objectId(sankalpId);
  if (!id) return sendJson(response, 400, { error: "Invalid Sankalp reference." });
  const body = await readJson(request);
  const validation = validateSankalp(body, { partial: true });
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  await resolveTeamMemberIds(db, organisationKey, validation.value);
  if (validation.value.stage === "completed") {
    validation.value.status = "completed";
    validation.value.completionPercent = 100;
    validation.value.completedAt = new Date();
  }
  const result = await db.collection("sankalps").findOneAndUpdate({ _id: id, organisationKey }, { $set: { ...validation.value, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!result) return sendJson(response, 404, { error: "Sankalp not found." });
  await audit(db, organisationKey, actor, "sankalp.updated", "sankalp", id, { changedFields: Object.keys(validation.value), title: result.title });
  return sendJson(response, 200, { sankalp: serializeSankalp(result), message: result.status === "draft" ? "Draft Sankalp updated." : "Sankalp workspace updated." });
}

async function milestones(request, response, context, actor, sankalpId, milestoneId = "") {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const projectId = objectId(sankalpId);
  if (!projectId || !(await db.collection("sankalps").findOne({ _id: projectId, organisationKey }))) return sendJson(response, 404, { error: "Sankalp not found." });
  const validation = validateMilestone(await readJson(request), { partial: request.method === "PATCH" });
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const now = new Date();
  if (request.method === "POST") {
    const document = { organisationKey, sankalpId: projectId, ...validation.value, createdByMemberId: actor._id, createdAt: now, updatedAt: now };
    const result = await db.collection("sankalpMilestones").insertOne(document);
    await audit(db, organisationKey, actor, "sankalp.milestone_created", "sankalpMilestone", result.insertedId, { sankalpId });
    return sendJson(response, 201, { message: "Milestone added." });
  }
  const id = objectId(milestoneId);
  if (!id) return sendJson(response, 400, { error: "Invalid milestone reference." });
  if (validation.value.status === "completed") validation.value.completedAt = now;
  const result = await db.collection("sankalpMilestones").updateOne({ _id: id, organisationKey, sankalpId: projectId }, { $set: { ...validation.value, updatedAt: now, updatedByMemberId: actor._id } });
  if (!result.matchedCount) return sendJson(response, 404, { error: "Milestone not found." });
  await audit(db, organisationKey, actor, "sankalp.milestone_updated", "sankalpMilestone", id, { sankalpId });
  return sendJson(response, 200, { message: "Milestone updated." });
}

async function addProgressReport(request, response, context, actor, sankalpId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const projectId = objectId(sankalpId);
  if (!projectId) return sendJson(response, 400, { error: "Invalid Sankalp reference." });
  const body = await readJson(request);
  const title = cleanText(body.title, 160);
  const report = cleanText(body.report, 3000);
  if (title.length < 3 || report.length < 10) return sendJson(response, 422, { error: "Add a clear report title and progress details." });
  const now = new Date();
  const document = { organisationKey, sankalpId: projectId, title, report, completionPercent: Math.max(0, Math.min(100, Math.round(Number(body.completionPercent || 0)))), createdByMemberId: actor._id, createdByName: actor.fullName, createdAt: now };
  const result = await db.collection("sankalpProgressReports").insertOne(document);
  await db.collection("sankalps").updateOne({ _id: projectId, organisationKey }, { $set: { completionPercent: document.completionPercent, updatedAt: now } });
  await audit(db, organisationKey, actor, "sankalp.progress_report_added", "sankalpProgressReport", result.insertedId, { sankalpId });
  return sendJson(response, 201, { message: "Progress report published." });
}

async function addDocument(request, response, context, actor, sankalpId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const projectId = objectId(sankalpId);
  if (!projectId) return sendJson(response, 400, { error: "Invalid Sankalp reference." });
  const { fields: body, file } = await readDocumentInput(request, readJson);
  const title = cleanText(body.title, 180);
  const documentUrl = cleanText(body.url, 1000);
  if (title.length < 3) return sendJson(response, 422, { error: "Enter a clear document title." });
  if (!file && !/^https?:\/\//i.test(documentUrl)) return sendJson(response, 422, { error: "Choose a document file or enter a complete https:// link." });
  if (file && !allowedDocumentTypes.has(file.mimeType)) return sendJson(response, 422, { error: "Use a PDF, image, Word document or spreadsheet." });
  const now = new Date();
  let storage = null;
  if (file) {
    await mkdir(DOCUMENT_STORAGE_DIR, { recursive: true });
    const extension = path.extname(file.originalName).slice(0, 12).toLowerCase();
    const storageName = `${randomUUID()}${extension}`;
    await writeFile(path.join(DOCUMENT_STORAGE_DIR, storageName), file.buffer, { flag: "wx", mode: 0o600 });
    storage = { driver: "local_private", key: storageName, originalName: file.originalName, mimeType: file.mimeType, size: file.size };
  }
  const document = { organisationKey, sankalpId: projectId, title, url: documentUrl, storage, documentType: cleanText(body.documentType || "supporting_document", 60), note: cleanText(body.note, 800), createdByMemberId: actor._id, createdByName: actor.fullName, createdAt: now };
  const result = await db.collection("sankalpDocuments").insertOne(document);
  await audit(db, organisationKey, actor, "sankalp.document_added", "sankalpDocument", result.insertedId, { sankalpId, title });
  return sendJson(response, 201, { message: "Document linked to Sankalp." });
}

async function downloadDocument(response, context, actor, documentId) {
  const { db, organisationKey, sendJson } = context;
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const id = objectId(documentId);
  if (!id) return sendJson(response, 400, { error: "Invalid document reference." });
  const document = await db.collection("sankalpDocuments").findOne({ _id: id, organisationKey });
  if (!document?.storage?.key || document.storage.driver !== "local_private") return sendJson(response, 404, { error: "Uploaded document not found." });
  const storagePath = path.join(DOCUMENT_STORAGE_DIR, path.basename(document.storage.key));
  try {
    const buffer = await readFile(storagePath);
    response.writeHead(200, {
      "Content-Type": document.storage.mimeType || "application/octet-stream",
      "Content-Length": buffer.length,
      "Content-Disposition": `attachment; filename="${safeDownloadName(document.storage.originalName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(buffer);
  } catch (error) {
    if (error?.code === "ENOENT") return sendJson(response, 404, { error: "Uploaded document not found." });
    throw error;
  }
}

function canManageCampaigns(actor) {
  return ["administrator", "super_administrator"].includes(actor?.role);
}

function campaignAuditEntry(action, actor, details = {}) {
  return {
    action,
    actorMemberId: actor?._id || null,
    actorName: actor?.fullName || "System",
    details,
    createdAt: new Date(),
  };
}

async function creativeCatalogEndpoint(response, context, actor) {
  const { sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  return sendJson(response, 200, { templates: campaignCatalog(), destinations: campaignDestinationCatalog() });
}

async function listCampaignCreatives(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const rows = await db.collection("campaignCreatives").find({ organisationKey }).sort({ updatedAt: -1 }).limit(200).toArray();
  return sendJson(response, 200, { creatives: rows.map(creativeView) });
}

async function createCampaignCreative(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const validation = validateCreativeInput(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.error });
  const now = new Date();
  const document = {
    organisationKey,
    ...validation.value,
    status: "draft",
    revision: 1,
    createdByMemberId: actor._id,
    updatedByMemberId: actor._id,
    createdAt: now,
    updatedAt: now,
    auditHistory: [campaignAuditEntry("creative.created", actor)],
  };
  const result = await db.collection("campaignCreatives").insertOne(document);
  document._id = result.insertedId;
  await audit(db, organisationKey, actor, "creative.created", "campaignCreative", result.insertedId, { templateId: document.templateId });
  return sendJson(response, 201, { message: "Creative draft created.", creative: creativeView(document) });
}

async function updateCampaignCreative(request, response, context, actor, creativeId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(creativeId);
  if (!id) return sendJson(response, 400, { error: "Invalid creative reference." });
  const current = await db.collection("campaignCreatives").findOne({ _id: id, organisationKey });
  if (!current) return sendJson(response, 404, { error: "Creative not found." });
  if (current.status !== "draft") return sendJson(response, 409, { error: "Approved or archived creatives are immutable. Create a new draft revision instead." });
  const validation = validateCreativeInput(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.error });
  const now = new Date();
  const nextRevision = Number(current.revision || 1) + 1;
  await db.collection("campaignCreatives").updateOne(
    { _id: id, organisationKey, status: "draft" },
    {
      $set: { ...validation.value, revision: nextRevision, updatedAt: now, updatedByMemberId: actor._id },
      $push: { auditHistory: { $each: [campaignAuditEntry("creative.updated", actor, { revision: nextRevision })], $slice: -100 } },
    },
  );
  const updated = await db.collection("campaignCreatives").findOne({ _id: id, organisationKey });
  await audit(db, organisationKey, actor, "creative.updated", "campaignCreative", id, { revision: nextRevision });
  return sendJson(response, 200, { message: "Creative draft updated.", creative: creativeView(updated) });
}

async function changeCreativeState(request, response, context, actor, creativeId, action) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(creativeId);
  if (!id) return sendJson(response, 400, { error: "Invalid creative reference." });
  const current = await db.collection("campaignCreatives").findOne({ _id: id, organisationKey });
  if (!current) return sendJson(response, 404, { error: "Creative not found." });
  const target = action === "approve" ? "approved" : action === "archive" ? "archived" : "";
  if (!target) return sendJson(response, 400, { error: "Unsupported creative action." });
  if (target === "approved" && current.status !== "draft") return sendJson(response, 409, { error: "Only a draft can be approved." });
  if (target === "archived" && current.status === "archived") return sendJson(response, 409, { error: "This creative is already archived." });
  const now = new Date();
  const set = { status: target, updatedAt: now, updatedByMemberId: actor._id };
  if (target === "approved") Object.assign(set, { approvedAt: now, approvedByMemberId: actor._id });
  await db.collection("campaignCreatives").updateOne(
    { _id: id, organisationKey },
    {
      $set: set,
      $push: { auditHistory: { $each: [campaignAuditEntry(`creative.${target}`, actor)], $slice: -100 } },
    },
  );
  const updated = await db.collection("campaignCreatives").findOne({ _id: id, organisationKey });
  await audit(db, organisationKey, actor, `creative.${target}`, "campaignCreative", id);
  return sendJson(response, 200, { message: target === "approved" ? "Creative approved and locked." : "Creative archived.", creative: creativeView(updated) });
}

async function listFocusCampaigns(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const campaigns = await db.collection("focusCampaigns").find({ organisationKey }).sort({ startsAt: -1 }).limit(200).toArray();
  const creativeIds = [...new Set(campaigns.map(item => String(item.creativeId)))].map(objectId).filter(Boolean);
  const creatives = creativeIds.length ? await db.collection("campaignCreatives").find({ _id: { $in: creativeIds }, organisationKey }).toArray() : [];
  const creativeMap = new Map(creatives.map(item => [String(item._id), item]));
  const campaignIds = campaigns.map(item => item._id);
  const [impressionRows, actionRows] = campaignIds.length ? await Promise.all([
    db.collection("campaignImpressions").aggregate([
      { $match: { organisationKey, campaignId: { $in: campaignIds } } },
      { $group: { _id: "$campaignId", impressions: { $sum: "$count" }, members: { $addToSet: "$memberId" } } },
      { $project: { impressions: 1, membersReached: { $size: "$members" } } },
    ]).toArray(),
    db.collection("campaignActions").aggregate([
      { $match: { organisationKey, campaignId: { $in: campaignIds }, action: "cta_opened" } },
      { $group: { _id: "$campaignId", callsToAction: { $sum: 1 }, members: { $addToSet: "$memberId" } } },
      { $project: { callsToAction: 1, membersEngaged: { $size: "$members" } } },
    ]).toArray(),
  ]) : [[], []];
  const metrics = new Map();
  for (const item of impressionRows) metrics.set(String(item._id), {
    impressions: Number(item.impressions || 0),
    membersReached: Number(item.membersReached || 0),
    callsToAction: 0,
    membersEngaged: 0,
  });
  for (const item of actionRows) metrics.set(String(item._id), {
    ...(metrics.get(String(item._id)) || { impressions: 0, membersReached: 0 }),
    callsToAction: Number(item.callsToAction || 0),
    membersEngaged: Number(item.membersEngaged || 0),
  });
  return sendJson(response, 200, {
    campaigns: campaigns.map(item => focusCampaignView({ ...item, metrics: metrics.get(String(item._id)) }, creativeMap.get(String(item.creativeId)))),
  });
}

async function createFocusCampaign(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const validation = validateFocusCampaignInput(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.error });
  const creativeId = objectId(validation.value.creativeId);
  const creative = creativeId && await db.collection("campaignCreatives").findOne({ _id: creativeId, organisationKey, status: "approved" });
  if (!creative) return sendJson(response, 422, { error: "Choose an approved Creative Studio design." });
  const now = new Date();
  const document = {
    organisationKey,
    ...validation.value,
    creativeId,
    status: "draft",
    configVersion: nextCampaignVersion(0),
    createdByMemberId: actor._id,
    updatedByMemberId: actor._id,
    createdAt: now,
    updatedAt: now,
    auditHistory: [campaignAuditEntry("campaign.created", actor)],
  };
  const result = await db.collection("focusCampaigns").insertOne(document);
  document._id = result.insertedId;
  await audit(db, organisationKey, actor, "campaign.created", "focusCampaign", result.insertedId, { creativeId: String(creativeId) });
  return sendJson(response, 201, { message: "Focus Campaign draft created.", campaign: focusCampaignView(document, creative) });
}

async function updateFocusCampaign(request, response, context, actor, campaignId) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(campaignId);
  if (!id) return sendJson(response, 400, { error: "Invalid campaign reference." });
  const current = await db.collection("focusCampaigns").findOne({ _id: id, organisationKey });
  if (!current) return sendJson(response, 404, { error: "Campaign not found." });
  if (current.status !== "draft") return sendJson(response, 409, { error: "Only draft campaigns can be edited." });
  const validation = validateFocusCampaignInput(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.error });
  const creativeId = objectId(validation.value.creativeId);
  const creative = creativeId && await db.collection("campaignCreatives").findOne({ _id: creativeId, organisationKey, status: "approved" });
  if (!creative) return sendJson(response, 422, { error: "Choose an approved Creative Studio design." });
  const now = new Date();
  const configVersion = nextCampaignVersion(current.configVersion);
  await db.collection("focusCampaigns").updateOne(
    { _id: id, organisationKey, status: "draft" },
    {
      $set: { ...validation.value, creativeId, configVersion, updatedAt: now, updatedByMemberId: actor._id },
      $push: { auditHistory: { $each: [campaignAuditEntry("campaign.updated", actor, { configVersion })], $slice: -100 } },
    },
  );
  const updated = await db.collection("focusCampaigns").findOne({ _id: id, organisationKey });
  await audit(db, organisationKey, actor, "campaign.updated", "focusCampaign", id, { configVersion });
  return sendJson(response, 200, { message: "Focus Campaign draft updated.", campaign: focusCampaignView(updated, creative) });
}

async function previewFocusCampaign(response, context, actor, campaignId) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(campaignId);
  if (!id) return sendJson(response, 400, { error: "Invalid campaign reference." });
  const campaign = await db.collection("focusCampaigns").findOne({ _id: id, organisationKey });
  if (!campaign) return sendJson(response, 404, { error: "Campaign not found." });
  const creative = await db.collection("campaignCreatives").findOne({ _id: campaign.creativeId, organisationKey });
  return sendJson(response, 200, { campaign: focusCampaignView(campaign, creative) });
}

async function publishFocusCampaign(response, context, actor, campaignId) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(campaignId);
  if (!id) return sendJson(response, 400, { error: "Invalid campaign reference." });
  const current = await db.collection("focusCampaigns").findOne({ _id: id, organisationKey });
  if (!current) return sendJson(response, 404, { error: "Campaign not found." });
  if (current.status !== "draft") return sendJson(response, 409, { error: "Only a draft campaign can be published." });
  if (new Date(current.endsAt).getTime() <= Date.now()) return sendJson(response, 409, { error: "Campaign end time must be in the future." });
  const creative = await db.collection("campaignCreatives").findOne({ _id: current.creativeId, organisationKey, status: "approved" });
  if (!creative) return sendJson(response, 409, { error: "The linked creative must be approved before publishing." });
  const overlapping = await db.collection("focusCampaigns").findOne({
    _id: { $ne: id }, organisationKey, status: "published",
    startsAt: { $lt: current.endsAt }, endsAt: { $gt: current.startsAt },
  });
  if (overlapping) return sendJson(response, 409, { error: "Another published campaign overlaps this schedule." });
  const now = new Date();
  const configVersion = nextCampaignVersion(current.configVersion);
  await db.collection("focusCampaigns").updateOne(
    { _id: id, organisationKey, status: "draft" },
    {
      $set: { status: "published", publishedAt: now, publishedByMemberId: actor._id, updatedAt: now, configVersion },
      $push: { auditHistory: { $each: [campaignAuditEntry("campaign.published", actor, { configVersion })], $slice: -100 } },
    },
  );
  const updated = await db.collection("focusCampaigns").findOne({ _id: id, organisationKey });
  await audit(db, organisationKey, actor, "campaign.published", "focusCampaign", id, { configVersion });
  return sendJson(response, 200, { message: "Focus Campaign published.", campaign: focusCampaignView(updated, creative) });
}

async function pauseFocusCampaign(response, context, actor, campaignId) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const id = objectId(campaignId);
  if (!id) return sendJson(response, 400, { error: "Invalid campaign reference." });
  const now = new Date();
  const result = await db.collection("focusCampaigns").updateOne(
    { _id: id, organisationKey, status: "published" },
    {
      $set: { status: "paused", pausedAt: now, pausedByMemberId: actor._id, updatedAt: now },
      $push: { auditHistory: { $each: [campaignAuditEntry("campaign.paused", actor)], $slice: -100 } },
    },
  );
  if (!result.matchedCount) return sendJson(response, 409, { error: "Only a published campaign can be paused." });
  await audit(db, organisationKey, actor, "campaign.paused", "focusCampaign", id);
  return sendJson(response, 200, { message: "Focus Campaign paused." });
}

async function disableFocusCampaigns(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const now = new Date();
  const result = await db.collection("focusCampaigns").updateMany(
    { organisationKey, status: "published" },
    {
      $set: { status: "paused", pausedAt: now, pausedByMemberId: actor._id, updatedAt: now, emergencyDisabled: true },
      $push: { auditHistory: campaignAuditEntry("campaign.emergency_disabled", actor) },
    },
  );
  await audit(db, organisationKey, actor, "campaign.emergency_disabled", "focusCampaign", "all", { pausedCount: result.modifiedCount });
  return sendJson(response, 200, { message: `${result.modifiedCount} active campaign${result.modifiedCount === 1 ? "" : "s"} paused.`, pausedCount: result.modifiedCount });
}

async function campaignAuditLog(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!canManageCampaigns(actor)) return sendJson(response, 403, { error: "Administrator access is required." });
  const entries = await db.collection("auditLogs").find({ organisationKey, entityType: { $in: ["campaignCreative", "focusCampaign"] } }).sort({ createdAt: -1 }).limit(200).toArray();
  return sendJson(response, 200, { entries: entries.map(item => ({ id: String(item._id), action: item.action, actorName: item.actorName, entityType: item.entityType, entityId: item.entityId, details: item.details || {}, createdAt: item.createdAt })) });
}

async function auditLog(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  if (!hasPermission(actor, "reports.view")) return sendJson(response, 403, { error: "Reports permission is required." });
  const rows = await db.collection("auditLogs").find({ organisationKey }).sort({ createdAt: -1 }).limit(150).toArray();
  return sendJson(response, 200, { entries: rows.map(item => ({ id: String(item._id), action: item.action, actorName: item.actorName || item.actorType, entityType: item.entityType, entityId: item.entityId, details: item.details || {}, createdAt: item.createdAt })) });
}

async function handled(result) {
  await result;
  return true;
}

export async function handleAdminRequest({ request, response, url, db, organisationKey, readJson, sendJson, clientAddress }) {
  const context = { request, response, url, db, organisationKey, readJson, sendJson, clientAddress };
  if (!url.pathname.startsWith("/api/participation/admin") && !url.pathname.startsWith("/api/participation/auth")) return false;
  if (!["GET", "HEAD"].includes(request.method) && !sameOrigin(request)) {
    sendJson(response, 403, { error: "This request did not come from the SAS Lucknow website." });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/participation/auth/activate") return handled(activate(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/auth/password-reset/request") return handled(requestAdministratorPasswordReset(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/auth/password-reset/complete") return handled(completeAdministratorPasswordReset(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/auth/login") return handled(login(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/auth/logout") return handled(logout(request, response, context));

  const authenticated = await administratorFromRequest(request, db, organisationKey);
  if (!authenticated) {
    sendJson(response, 401, { error: "Administrator sign-in is required." });
    return true;
  }
  const actor = authenticated.member;
  if (request.method === "GET" && url.pathname === "/api/participation/auth/me") return handled(sendJson(response, 200, { administrator: publicAdministrator(actor) }));
  if (await handleNextHumanAdminRequest({ request, response, url, context, actor })) return true;
  if (request.method === "GET" && url.pathname === "/api/participation/admin/overview") return handled(overview(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/members") return handled(listMembers(response, context, actor));
  const memberAccessMatch = url.pathname.match(/^\/api\/participation\/admin\/members\/([^/]+)\/access$/);
  if (request.method === "PATCH" && memberAccessMatch) return handled(updateMemberAccess(request, response, context, actor, memberAccessMatch[1]));
  const membershipMatch = url.pathname.match(/^\/api\/participation\/admin\/members\/([^/]+)\/membership$/);
  if (request.method === "PATCH" && membershipMatch) return handled(updateMembership(request, response, context, actor, membershipMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/yogdaan") return handled(communityYogdaan(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/pushpanjali-certificates") return handled(pushpanjaliCertificates(response, url, context, actor));
  if (["GET", "POST"].includes(request.method) && url.pathname === "/api/participation/admin/notifications") return handled(notifications(request, response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/sangha/posts") return handled(listSanghaPosts(response, context, actor));
  const sanghaVisibilityMatch = url.pathname.match(/^\/api\/participation\/admin\/sangha\/posts\/([^/]+)\/visibility$/);
  if (request.method === "PATCH" && sanghaVisibilityMatch) return handled(updateSanghaVisibility(request, response, context, actor, sanghaVisibilityMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/audit") return handled(auditLog(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/campaign-studio/catalog") return handled(creativeCatalogEndpoint(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/campaign-studio/creatives") return handled(listCampaignCreatives(response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/admin/campaign-studio/creatives") return handled(createCampaignCreative(request, response, context, actor));
  const creativeMatch = url.pathname.match(/^\/api\/participation\/admin\/campaign-studio\/creatives\/([^/]+)$/);
  if (request.method === "PATCH" && creativeMatch) return handled(updateCampaignCreative(request, response, context, actor, creativeMatch[1]));
  const creativeActionMatch = url.pathname.match(/^\/api\/participation\/admin\/campaign-studio\/creatives\/([^/]+)\/(approve|archive)$/);
  if (request.method === "POST" && creativeActionMatch) return handled(changeCreativeState(request, response, context, actor, creativeActionMatch[1], creativeActionMatch[2]));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/focus-campaigns") return handled(listFocusCampaigns(response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/admin/focus-campaigns") return handled(createFocusCampaign(request, response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/admin/focus-campaigns/emergency-disable") return handled(disableFocusCampaigns(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/focus-campaigns/audit") return handled(campaignAuditLog(response, context, actor));
  const focusMatch = url.pathname.match(/^\/api\/participation\/admin\/focus-campaigns\/([^/]+)$/);
  if (request.method === "PATCH" && focusMatch) return handled(updateFocusCampaign(request, response, context, actor, focusMatch[1]));
  const focusActionMatch = url.pathname.match(/^\/api\/participation\/admin\/focus-campaigns\/([^/]+)\/(preview|publish|pause)$/);
  if (focusActionMatch && request.method === "GET" && focusActionMatch[2] === "preview") return handled(previewFocusCampaign(response, context, actor, focusActionMatch[1]));
  if (focusActionMatch && request.method === "POST" && focusActionMatch[2] === "publish") return handled(publishFocusCampaign(response, context, actor, focusActionMatch[1]));
  if (focusActionMatch && request.method === "POST" && focusActionMatch[2] === "pause") return handled(pauseFocusCampaign(response, context, actor, focusActionMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/applications") return handled(applications(request, response, url, context, actor));
  const applicationMatch = url.pathname.match(/^\/api\/participation\/admin\/applications\/([^/]+)\/decision$/);
  if (request.method === "POST" && applicationMatch) return handled(applications(request, response, url, context, actor, applicationMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/next-human-inquiries") return handled(nextHumanInquiries(request, response, url, context, actor));
  const nextHumanInquiryMatch = url.pathname.match(/^\/api\/participation\/admin\/next-human-inquiries\/([^/]+)$/);
  if (request.method === "PATCH" && nextHumanInquiryMatch) return handled(nextHumanInquiries(request, response, url, context, actor, nextHumanInquiryMatch[1]));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/sankalps") return handled(sankalpList(response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/admin/sankalps") return handled(createSankalp(request, response, context, actor));
  const milestoneMatch = url.pathname.match(/^\/api\/participation\/admin\/sankalps\/([^/]+)\/milestones(?:\/([^/]+))?$/);
  if (milestoneMatch && ["POST", "PATCH"].includes(request.method)) return handled(milestones(request, response, context, actor, milestoneMatch[1], milestoneMatch[2]));
  const reportMatch = url.pathname.match(/^\/api\/participation\/admin\/sankalps\/([^/]+)\/progress-reports$/);
  if (request.method === "POST" && reportMatch) return handled(addProgressReport(request, response, context, actor, reportMatch[1]));
  const documentMatch = url.pathname.match(/^\/api\/participation\/admin\/sankalps\/([^/]+)\/documents$/);
  if (request.method === "POST" && documentMatch) return handled(addDocument(request, response, context, actor, documentMatch[1]));
  const documentDownloadMatch = url.pathname.match(/^\/api\/participation\/admin\/documents\/([^/]+)\/download$/);
  if (request.method === "GET" && documentDownloadMatch) return handled(downloadDocument(response, context, actor, documentDownloadMatch[1]));
  const sankalpMatch = url.pathname.match(/^\/api\/participation\/admin\/sankalps\/([^/]+)$/);
  if (request.method === "GET" && sankalpMatch) return handled(sankalpDetails(response, context, actor, sankalpMatch[1]));
  if (request.method === "PATCH" && sankalpMatch) return handled(updateSankalp(request, response, context, actor, sankalpMatch[1]));

  sendJson(response, 404, { error: "Administrator endpoint not found." });
  return true;
}
