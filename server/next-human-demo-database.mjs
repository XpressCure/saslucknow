import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { validateNextHumanVolunteerInquiry } from "./next-human-core.mjs";

const dataDirectory = join(process.cwd(), "var");
mkdirSync(dataDirectory, { recursive: true });
export const demoDatabasePath = join(dataDirectory, "next-human-preview.sqlite");
const database = new DatabaseSync(demoDatabasePath);

database.exec(`
  CREATE TABLE IF NOT EXISTS next_human_volunteer_inquiries (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    payload TEXT NOT NULL,
    internal_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    latest_submitted_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const administrator = {
  id: "demo-admin",
  fullName: "SAS Lucknow Preview",
  email: "preview@saslucknow.in",
  role: "administrator",
  permissions: ["members.review", "reports.view"],
};
const validStatuses = new Set(["new", "reviewing", "orientation_invited", "foundation_circle", "hold", "declined", "withdrawn"]);

function listInquiries() {
  return database.prepare("SELECT * FROM next_human_volunteer_inquiries ORDER BY latest_submitted_at DESC").all().map(row => ({
    ...JSON.parse(row.payload),
    id: row.id,
    reference: row.reference,
    status: row.status,
    internalNote: row.internal_note,
    createdAt: row.created_at,
    latestSubmittedAt: row.latest_submitted_at,
  }));
}

function listAudit() {
  return database.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 150").all().map(row => ({
    id: row.id,
    action: row.action,
    actorName: "SAS Lucknow Preview",
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: {},
    createdAt: row.created_at,
  }));
}

function recordAudit(action, entityId, createdAt) {
  database.prepare("INSERT INTO audit_log (id, action, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), action, "nextHumanVolunteerInquiry", entityId, createdAt);
}

async function createInquiry(request, response, readJson, sendJson) {
  const validation = validateNextHumanVolunteerInquiry(await readJson(request));
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const now = new Date().toISOString();
  const id = randomUUID();
  const reference = `NHV-${new Date(now).getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  database.prepare("INSERT INTO next_human_volunteer_inquiries (id, reference, status, payload, created_at, latest_submitted_at) VALUES (?, ?, 'new', ?, ?, ?)")
    .run(id, reference, JSON.stringify(validation.value), now, now);
  recordAudit("next_human.inquiry_received", id, now);
  return sendJson(response, 201, { status: "received", reference, nextStep: "await_review", message: "Your Founding Circle inquiry has been received." });
}

async function updateInquiry(request, response, id, readJson, sendJson) {
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!validStatuses.has(status)) return sendJson(response, 422, { error: "Choose a valid review status." });
  const now = new Date().toISOString();
  const result = database.prepare("UPDATE next_human_volunteer_inquiries SET status = ?, internal_note = ?, latest_submitted_at = ? WHERE id = ?")
    .run(status, String(body.internalNote || "").slice(0, 1200), now, id);
  if (!result.changes) return sendJson(response, 404, { error: "This volunteer inquiry could not be found." });
  recordAudit("next_human.inquiry_reviewed", id, now);
  return sendJson(response, 200, { message: `Inquiry moved to ${status.replaceAll("_", " ")}.` });
}

export async function handleNextHumanDemoRequest({ request, response, url, readJson, sendJson }) {
  const path = url.pathname;
  if (request.method === "GET" && path === "/api/participation/health") {
    return sendJson(response, 200, { status: "ok", service: "sas-participation", database: "local-demo" }), true;
  }
  if (request.method === "POST" && path === "/api/participation/next-human/volunteer-inquiries") {
    await createInquiry(request, response, readJson, sendJson);
    return true;
  }
  if (request.method === "GET" && path === "/api/participation/auth/me") {
    sendJson(response, 200, { administrator });
    return true;
  }
  if (request.method === "POST" && path === "/api/participation/auth/logout") {
    sendJson(response, 200, { message: "Preview session closed." });
    return true;
  }
  if (request.method === "GET" && path === "/api/participation/admin/overview") {
    const inquiries = listInquiries();
    sendJson(response, 200, { administrator, metrics: { pendingApplications: 0, newNextHumanInquiries: inquiries.filter(item => item.status === "new").length, activeMembers: 0, draftSankalps: 0, liveSankalps: 0, completedSankalps: 0 }, stageCounts: {}, recentActivity: listAudit().slice(0, 8) });
    return true;
  }
  if (request.method === "GET" && path === "/api/participation/admin/next-human-inquiries") {
    sendJson(response, 200, { inquiries: listInquiries() });
    return true;
  }
  const inquiryMatch = path.match(/^\/api\/participation\/admin\/next-human-inquiries\/([^/]+)$/);
  if (request.method === "PATCH" && inquiryMatch) {
    await updateInquiry(request, response, inquiryMatch[1], readJson, sendJson);
    return true;
  }
  if (request.method === "GET" && path === "/api/participation/admin/applications") return sendJson(response, 200, { applications: [] }), true;
  if (request.method === "GET" && path === "/api/participation/admin/members") return sendJson(response, 200, { members: [] }), true;
  if (request.method === "GET" && path === "/api/participation/admin/sankalps") return sendJson(response, 200, { sankalps: [] }), true;
  if (request.method === "GET" && path === "/api/participation/admin/audit") return sendJson(response, 200, { entries: listAudit() }), true;
  if (path.startsWith("/api/participation/admin") || path.startsWith("/api/participation/auth")) {
    sendJson(response, 404, { error: "This operation is not available in the local NEXT HUMAN preview." });
    return true;
  }
  return false;
}
