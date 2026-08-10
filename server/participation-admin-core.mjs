import { cleanText } from "./participation-core.mjs";

export const SANKALP_STAGES = [
  "concept",
  "research",
  "estimate_pending",
  "estimate_received",
  "fundraising",
  "ready_for_implementation",
  "implementation",
  "completed",
  "paused",
  "archived",
];

export const SANKALP_STATUSES = ["draft", "active", "completed", "archived"];

export function slugify(value) {
  return cleanText(value, 140)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function optionalDate(value, field, errors) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} is not a valid date.`);
    return null;
  }
  return date;
}

function rupeesToPaise(value, field, errors) {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push(`${field} must be zero or a positive amount.`);
    return 0;
  }
  return Math.round(number * 100);
}

export function validateSankalp(input, { partial = false } = {}) {
  const errors = [];
  const value = {};
  const text = (key, max) => {
    if (partial && input?.[key] === undefined) return;
    value[key] = cleanText(input?.[key], max);
  };

  text("title", 140);
  text("summary", 360);
  text("purpose", 1600);
  text("rules", 3000);
  text("type", 80);

  if (!partial || input?.title !== undefined) {
    if (value.title?.length < 3) errors.push("Sankalp title must contain at least 3 characters.");
  }
  if (!partial || input?.purpose !== undefined) {
    if (value.purpose?.length < 10) errors.push("Please explain the purpose of this Sankalp.");
  }

  if (!partial || input?.status !== undefined) {
    value.status = cleanText(input?.status || "draft", 30);
    if (!SANKALP_STATUSES.includes(value.status)) errors.push("Choose a valid Sankalp publication status.");
  }
  if (!partial || input?.stage !== undefined) {
    value.stage = cleanText(input?.stage || "concept", 40);
    if (!SANKALP_STAGES.includes(value.stage)) errors.push("Choose a valid Sankalp stage.");
  }

  const booleans = ["acceptsDonations", "acceptsSeva", "budgetRequired"];
  for (const key of booleans) {
    if (!partial || input?.[key] !== undefined) value[key] = Boolean(input?.[key]);
  }
  for (const key of ["projectLeadMemberId", "auditorMemberId", "implementationLeadMemberId"]) {
    if (!partial || input?.[key] !== undefined) value[key] = cleanText(input?.[key], 40) || null;
  }
  if (!partial || input?.tentativeBudgetRupees !== undefined) value.tentativeBudgetPaise = rupeesToPaise(input?.tentativeBudgetRupees, "Tentative budget", errors);
  if (!partial || input?.estimatedBudgetRupees !== undefined) value.estimatedBudgetPaise = rupeesToPaise(input?.estimatedBudgetRupees, "Estimated budget", errors);
  if (!partial || input?.startDate !== undefined) value.startDate = optionalDate(input?.startDate, "Start date", errors);
  if (!partial || input?.targetDate !== undefined) value.targetDate = optionalDate(input?.targetDate, "Target date", errors);
  if (!partial || input?.completionPercent !== undefined) {
    const completion = Number(input?.completionPercent || 0);
    if (!Number.isFinite(completion) || completion < 0 || completion > 100) errors.push("Completion must be between 0 and 100 percent.");
    value.completionPercent = Math.max(0, Math.min(100, Math.round(completion || 0)));
  }
  if (!partial || input?.featuredOrder !== undefined) value.featuredOrder = Math.max(0, Math.round(Number(input?.featuredOrder || 0)));

  return { ok: errors.length === 0, errors, value };
}

export function validateMilestone(input, { partial = false } = {}) {
  const errors = [];
  const value = {};
  if (!partial || input?.title !== undefined) {
    value.title = cleanText(input?.title, 160);
    if (value.title.length < 3) errors.push("Milestone title must contain at least 3 characters.");
  }
  if (!partial || input?.description !== undefined) value.description = cleanText(input?.description, 1200);
  if (!partial || input?.status !== undefined) {
    value.status = cleanText(input?.status || "pending", 30);
    if (!["pending", "in_progress", "completed", "blocked"].includes(value.status)) errors.push("Choose a valid milestone status.");
  }
  if (!partial || input?.dueDate !== undefined) value.dueDate = optionalDate(input?.dueDate, "Milestone due date", errors);
  if (!partial || input?.budgetRupees !== undefined) value.budgetPaise = rupeesToPaise(input?.budgetRupees, "Milestone budget", errors);
  if (!partial || input?.completionNote !== undefined) value.completionNote = cleanText(input?.completionNote, 1200);
  return { ok: errors.length === 0, errors, value };
}

export function paiseToRupees(value) {
  return Number(value || 0) / 100;
}

export function serializeSankalp(document, details = {}) {
  return {
    id: String(document._id),
    slug: document.slug,
    title: document.title,
    summary: document.summary || "",
    purpose: document.purpose || "",
    rules: document.rules || "",
    type: document.type || "service",
    status: document.status || "draft",
    stage: document.stage || "concept",
    acceptsDonations: Boolean(document.acceptsDonations),
    acceptsSeva: Boolean(document.acceptsSeva),
    budgetRequired: document.budgetRequired !== false,
    tentativeBudgetRupees: paiseToRupees(document.tentativeBudgetPaise),
    estimatedBudgetRupees: paiseToRupees(document.estimatedBudgetPaise),
    receivedAmountRupees: paiseToRupees(document.receivedAmountPaise),
    spentAmountRupees: paiseToRupees(document.spentAmountPaise),
    completionPercent: Number(document.completionPercent || 0),
    donorCount: Number(document.donorCount || 0),
    volunteerCount: Number(document.volunteerCount || 0),
    projectLeadMemberId: document.projectLeadMemberId ? String(document.projectLeadMemberId) : "",
    auditorMemberId: document.auditorMemberId ? String(document.auditorMemberId) : "",
    implementationLeadMemberId: document.implementationLeadMemberId ? String(document.implementationLeadMemberId) : "",
    startDate: document.startDate || null,
    targetDate: document.targetDate || null,
    featuredOrder: Number(document.featuredOrder || 0),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    ...details,
  };
}
