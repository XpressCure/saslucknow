import { ObjectId } from "mongodb";
import Busboy from "busboy";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

const loginWindows = new Map();
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_STORAGE_DIR = process.env.SAS_DOCUMENT_STORAGE_DIR || path.resolve("var", "participation-documents");
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
    fullName: member.fullName,
    email: member.email || "",
    mobile: member.mobile || "",
    city: member.city || "",
    role: member.role || "member",
    status: member.status,
    joinedAt: member.joinedAt || member.createdAt,
  };
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

async function login(request, response, context) {
  const { db, organisationKey, readJson, sendJson, clientAddress } = context;
  const address = clientAddress(request);
  if (!loginAllowed(address)) return sendJson(response, 429, { error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
  const body = await readJson(request);
  const member = await db.collection("members").findOne({
    organisationKey,
    email: normalizeEmail(body.email),
    status: "active",
    role: { $in: ["administrator", "super_administrator"] },
  });
  if (!member?.passwordCredential || !(await verifyPassword(String(body.password || ""), member.passwordCredential))) {
    return sendJson(response, 401, { error: "Email or password is incorrect." });
  }
  const token = await createSession({ request, db, organisationKey, member, clientAddress });
  await audit(db, organisationKey, member, "administrator.signed_in", "member", member._id);
  return sendJson(response, 200, { administrator: publicAdministrator(member) }, { "Set-Cookie": sessionCookie(token, { secure: requestIsSecure(request) }) });
}

async function logout(request, response, context) {
  const { db, sendJson } = context;
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (token) await db.collection("adminSessions").updateOne({ tokenHash: hashSessionToken(token) }, { $set: { revokedAt: new Date() } });
  return sendJson(response, 200, { message: "Signed out securely." }, { "Set-Cookie": clearSessionCookie({ secure: requestIsSecure(request) }) });
}

async function overview(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const [pendingApplications, newNextHumanInquiries, activeMembers, sankalps, recentAudits] = await Promise.all([
    db.collection("memberApplications").countDocuments({ organisationKey, status: "pending" }),
    db.collection("nextHumanVolunteerInquiries").countDocuments({ organisationKey, status: "new" }),
    db.collection("members").countDocuments({ organisationKey, status: "active" }),
    db.collection("sankalps").find({ organisationKey }).sort({ updatedAt: -1 }).toArray(),
    db.collection("auditLogs").find({ organisationKey }).sort({ createdAt: -1 }).limit(8).toArray(),
  ]);
  return sendJson(response, 200, {
    administrator: publicAdministrator(actor),
    metrics: {
      pendingApplications,
      newNextHumanInquiries,
      activeMembers,
      draftSankalps: sankalps.filter(item => item.status === "draft").length,
      liveSankalps: sankalps.filter(item => item.status === "active").length,
      completedSankalps: sankalps.filter(item => item.status === "completed").length,
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
  return sendJson(response, 200, { inquiry: nextHumanInquiryView(result), message: `Inquiry moved to ${status.replaceAll("_", " ")}.` });
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
  if (!hasPermission(actor, "sankalps.manage")) return sendJson(response, 403, { error: "Sankalp management permission is required." });
  const rows = await db.collection("members").find({ organisationKey, status: "active", livingStatus: { $ne: "deceased" } }).sort({ fullName: 1 }).toArray();
  return sendJson(response, 200, { members: rows.map(memberView) });
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
  if (request.method === "POST" && url.pathname === "/api/participation/auth/login") return handled(login(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/auth/logout") return handled(logout(request, response, context));

  const authenticated = await administratorFromRequest(request, db, organisationKey);
  if (!authenticated) {
    sendJson(response, 401, { error: "Administrator sign-in is required." });
    return true;
  }
  const actor = authenticated.member;
  if (request.method === "GET" && url.pathname === "/api/participation/auth/me") return handled(sendJson(response, 200, { administrator: publicAdministrator(actor) }));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/overview") return handled(overview(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/members") return handled(listMembers(response, context, actor));
  if (request.method === "GET" && url.pathname === "/api/participation/admin/audit") return handled(auditLog(response, context, actor));
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
