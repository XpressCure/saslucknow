import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import Busboy from "busboy";
import { ObjectId } from "mongodb";
import { verifyRazorpaySignature } from "./participation-member-core.mjs";
import {
  NEXT_HUMAN_EVENT_KEY,
  bookingAmount,
  defaultNextHumanEvent,
  mergeEventConfig,
  seatsForDay,
  validateDayPricing,
  validateNextHumanApplication,
} from "./next-human-event-core.mjs";

const EVENT_MEDIA_ROOT = process.env.SAS_DOCUMENT_STORAGE_DIR || "/var/lib/saslucknow-participation/documents";
const EVENT_MEDIA_DIR = path.join(EVENT_MEDIA_ROOT, "next-human-media");
const EVENT_TEMP_DIR = path.join(EVENT_MEDIA_ROOT, "next-human-temp");
const MAX_EVENT_MEDIA_BYTES = 100 * 1024 * 1024;
const ALLOWED_EVENT_MEDIA = new Map([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["video/webm", "video"], ["video/quicktime", "video"],
]);

function objectId(value) {
  return ObjectId.isValid(String(value || "")) ? new ObjectId(String(value)) : null;
}

function paymentsEnabled() {
  return String(process.env.NEXT_HUMAN_PAYMENTS_ENABLED || "true").toLowerCase() !== "false"
    && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function eventDay(event, dayId) {
  return event.days.find(day => day.id === dayId);
}

async function loadEvent(db, organisationKey) {
  const stored = await db.collection("nextHumanEvents").findOne({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY });
  return mergeEventConfig(stored || {});
}

function publicEvent(event) {
  const { organisationKey, _id, createdAt, updatedAt, updatedBy, ...safe } = event;
  return safe;
}

function applicationView(document) {
  if (!document) return null;
  return {
    id: String(document._id),
    memberId: String(document.memberId),
    memberNumber: document.memberNumber || "",
    fullName: document.fullName || "",
    email: document.email || "",
    mobile: document.mobile || "",
    dateOfBirth: document.dateOfBirth,
    pathway: document.pathway,
    answers: document.answers || [],
    status: document.status,
    score: Number(document.score || 0),
    internalNote: document.internalNote || "",
    submittedAt: document.submittedAt || null,
    decidedAt: document.decidedAt || null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function bookingView(document) {
  return {
    id: String(document._id),
    memberId: String(document.memberId),
    memberNumber: document.memberNumber || "",
    memberName: document.memberName || "",
    pathway: document.pathway,
    dayId: document.dayId,
    dayNumber: document.dayNumber,
    dayTitle: document.dayTitle,
    dayDate: document.dayDate,
    seats: document.seats || [],
    companions: document.companions || [],
    amountRupees: Number(document.amountPaise || 0) / 100,
    status: document.status,
    providerOrderId: document.providerOrderId || "",
    providerPaymentId: document.providerPaymentId || "",
    passNumber: document.passNumber || "",
    holdExpiresAt: document.holdExpiresAt || null,
    confirmedAt: document.confirmedAt || null,
    createdAt: document.createdAt,
  };
}

async function audit(db, organisationKey, actor, action, entityType, entityId, details = {}) {
  await db.collection("auditLogs").insertOne({
    organisationKey,
    actorType: actor?.role || "member",
    actorId: actor?._id || null,
    actorName: actor?.fullName || "System",
    action,
    entityType,
    entityId: String(entityId || ""),
    details,
    createdAt: new Date(),
  });
}

async function removeExpiredHolds(db, organisationKey, now = new Date()) {
  await db.collection("nextHumanSeatReservations").deleteMany({
    organisationKey,
    eventKey: NEXT_HUMAN_EVENT_KEY,
    status: { $in: ["held", "payment_pending"] },
    expiresAt: { $lte: now },
  });
  await db.collection("nextHumanBookings").updateMany({
    organisationKey,
    eventKey: NEXT_HUMAN_EVENT_KEY,
    status: { $in: ["held", "payment_pending"] },
    holdExpiresAt: { $lte: now },
  }, { $set: { status: "expired", updatedAt: now } });
}

async function eventStats(db, organisationKey) {
  await removeExpiredHolds(db, organisationKey);
  const [applications, reservations, bookings] = await Promise.all([
    db.collection("nextHumanApplications").aggregate([
      { $match: { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY } },
      { $group: { _id: { pathway: "$pathway", status: "$status" }, count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("nextHumanSeatReservations").aggregate([
      { $match: { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, status: { $in: ["held", "payment_pending", "booked"] } } },
      { $group: { _id: { dayId: "$dayId", status: "$status" }, count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("nextHumanBookings").countDocuments({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, status: "confirmed" }),
  ]);
  return {
    applications: Object.fromEntries(applications.map(item => [`${item._id.pathway}:${item._id.status}`, item.count])),
    daySeats: Object.fromEntries(reservations.map(item => [`${item._id.dayId}:${item._id.status}`, item.count])),
    confirmedDayBookings: bookings,
  };
}

function sanitizedGeneralPatch(body, current) {
  const result = {};
  for (const key of ["title", "openingTitle", "strapline", "time", "city", "venue", "leadExplorer"]) {
    if (body[key] !== undefined) result[key] = String(body[key] || "").trim().slice(0, 180);
  }
  for (const key of ["totalCapacityPerDay", "seatHoldMinutes"]) {
    if (body[key] !== undefined) result[key] = Math.max(1, Math.round(Number(body[key]) || Number(current[key]) || 1));
  }
  if (body.maxCompanionsPerDay !== undefined) {
    result.maxCompanionsPerDay = Math.min(2, Math.max(0, Math.round(Number(body.maxCompanionsPerDay) || 0)));
  }
  if (body.applicationsOpen !== undefined) result.applicationsOpen = Boolean(body.applicationsOpen);
  if (body.pathwayCapacityPerDay) result.pathwayCapacityPerDay = {
    challenge: Math.max(1, Math.round(Number(body.pathwayCapacityPerDay.challenge) || current.pathwayCapacityPerDay.challenge)),
    fellowship: Math.max(1, Math.round(Number(body.pathwayCapacityPerDay.fellowship) || current.pathwayCapacityPerDay.fellowship)),
  };
  if (body.pathways) result.pathways = {
    challenge: {
      ...current.pathways.challenge,
      ...(Array.isArray(body.pathways.challenge?.questions) ? { questions: body.pathways.challenge.questions.slice(0, 5).map(value => String(value || "").trim().slice(0, 500)) } : {}),
    },
    fellowship: {
      ...current.pathways.fellowship,
      ...(Array.isArray(body.pathways.fellowship?.questions) ? { questions: body.pathways.fellowship.questions.slice(0, 5).map(value => String(value || "").trim().slice(0, 500)) } : {}),
    },
  };
  return result;
}

async function adminEvent(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const current = await loadEvent(db, organisationKey);
  if (request.method === "GET") return sendJson(response, 200, { event: publicEvent(current), stats: await eventStats(db, organisationKey), payments: { enabled: paymentsEnabled(), testMode: String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_") } });
  const body = await readJson(request);
  const patch = sanitizedGeneralPatch(body, current);
  const now = new Date();
  await db.collection("nextHumanEvents").updateOne(
    { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY },
    { $set: { ...patch, updatedAt: now, updatedBy: actor._id }, $setOnInsert: { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, createdAt: now } },
    { upsert: true },
  );
  await audit(db, organisationKey, actor, "next_human.event_updated", "nextHumanEvent", NEXT_HUMAN_EVENT_KEY, { fields: Object.keys(patch) });
  return sendJson(response, 200, { event: publicEvent(await loadEvent(db, organisationKey)), message: "NEXT HUMAN event settings have been saved." });
}

async function adminDay(request, response, context, actor, dayId) {
  const { db, organisationKey, readJson, sendJson } = context;
  const current = await loadEvent(db, organisationKey);
  const day = eventDay(current, dayId);
  if (!day) return sendJson(response, 404, { error: "Conference day not found." });
  const body = await readJson(request);
  const pricing = body.rows ? validateDayPricing(body.rows) : { ok: true, rows: day.rows };
  if (!pricing.ok) return sendJson(response, 422, { error: pricing.error });
  const updatedDay = {
    ...day,
    bookingOpen: body.bookingOpen === undefined ? day.bookingOpen : Boolean(body.bookingOpen),
    title: body.title === undefined ? day.title : String(body.title || "").trim().slice(0, 140),
    question: body.question === undefined ? day.question : String(body.question || "").trim().slice(0, 240),
    rows: pricing.rows,
  };
  const nextDays = current.days.map(item => item.id === dayId ? updatedDay : item);
  const now = new Date();
  await db.collection("nextHumanEvents").updateOne(
    { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY },
    { $set: { days: nextDays, updatedAt: now, updatedBy: actor._id }, $setOnInsert: { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, createdAt: now } },
    { upsert: true },
  );
  await audit(db, organisationKey, actor, "next_human.day_updated", "nextHumanDay", dayId, { bookingOpen: updatedDay.bookingOpen });
  return sendJson(response, 200, { day: updatedDay, message: `Day ${day.dayNumber} seating and pricing have been saved.` });
}

async function adminApplications(request, response, url, context, actor, applicationId = "") {
  const { db, organisationKey, readJson, sendJson } = context;
  if (request.method === "GET") {
    const filter = { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY };
    const status = String(url.searchParams.get("status") || "");
    if (status) filter.status = status;
    const rows = await db.collection("nextHumanApplications").find(filter).sort({ submittedAt: -1, updatedAt: -1 }).limit(1000).toArray();
    return sendJson(response, 200, { applications: rows.map(applicationView) });
  }
  const id = objectId(applicationId);
  if (!id) return sendJson(response, 404, { error: "Application not found." });
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!["under_review", "approved", "waitlisted", "declined"].includes(status)) return sendJson(response, 422, { error: "Choose a valid application decision." });
  const now = new Date();
  const result = await db.collection("nextHumanApplications").findOneAndUpdate(
    { _id: id, organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY },
    { $set: { status, score: Math.max(0, Math.min(100, Number(body.score || 0))), internalNote: String(body.internalNote || "").trim().slice(0, 2000), decidedAt: ["approved", "waitlisted", "declined"].includes(status) ? now : null, decidedBy: actor._id, updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!result) return sendJson(response, 404, { error: "Application not found." });
  await audit(db, organisationKey, actor, `next_human.application_${status}`, "nextHumanApplication", id, { score: body.score });
  return sendJson(response, 200, { application: applicationView(result), message: `Application marked ${status.replaceAll("_", " ")}.` });
}

async function adminBookings(response, url, context) {
  const { db, organisationKey, sendJson } = context;
  const filter = { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY };
  const dayId = String(url.searchParams.get("day") || "");
  if (dayId) filter.dayId = dayId;
  const bookings = await db.collection("nextHumanBookings").find(filter).sort({ createdAt: -1 }).limit(2000).toArray();
  return sendJson(response, 200, { bookings: bookings.map(bookingView) });
}

function safeMediaName(value) {
  return path.basename(String(value || "media")).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "media";
}

async function parseMediaUpload(request) {
  await Promise.all([mkdir(EVENT_MEDIA_DIR, { recursive: true }), mkdir(EVENT_TEMP_DIR, { recursive: true })]);
  const tempPath = path.join(EVENT_TEMP_DIR, randomUUID());
  let filePromise = null;
  let fields = {};
  let media = null;
  await new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: request.headers, limits: { files: 1, fileSize: MAX_EVENT_MEDIA_BYTES, fields: 10 } });
    busboy.on("field", (name, value) => { fields[name] = String(value || "").slice(0, 200); });
    busboy.on("file", (_name, stream, info) => {
      const kind = ALLOWED_EVENT_MEDIA.get(info.mimeType);
      if (!kind) { stream.resume(); reject(Object.assign(new Error("Upload a JPG, PNG, WebP, MP4, WebM or MOV file."), { statusCode: 422 })); return; }
      media = { kind, mimeType: info.mimeType, originalName: safeMediaName(info.filename), tempPath };
      filePromise = pipeline(stream, createWriteStream(tempPath));
    });
    busboy.on("error", reject);
    busboy.on("finish", resolve);
    request.pipe(busboy);
  });
  if (filePromise) await filePromise;
  if (!media) throw Object.assign(new Error("Choose an image or video to upload."), { statusCode: 422 });
  return { media, fields };
}

async function adminMedia(request, response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const { media, fields } = await parseMediaUpload(request);
  const slot = ["hero", "introVideo", "auditorium"].includes(fields.slot) ? fields.slot : media.kind === "video" ? "introVideo" : "hero";
  const id = new ObjectId();
  const extension = path.extname(media.originalName).slice(0, 10) || (media.kind === "video" ? ".mp4" : ".jpg");
  const storagePath = path.join(EVENT_MEDIA_DIR, `${String(id)}${extension}`);
  try {
    await rename(media.tempPath, storagePath);
  } catch (error) {
    await rm(media.tempPath, { force: true });
    throw error;
  }
  const now = new Date();
  const document = { _id: id, organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, slot, ...media, tempPath: undefined, storagePath, uploadedBy: actor._id, createdAt: now };
  await db.collection("nextHumanMedia").insertOne(document);
  const reference = { id: String(id), kind: media.kind, mimeType: media.mimeType, name: media.originalName, url: `/api/participation/member/next-human/media/${String(id)}` };
  const current = await loadEvent(db, organisationKey);
  await db.collection("nextHumanEvents").updateOne(
    { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY },
    { $set: { media: { ...current.media, [slot]: reference }, updatedAt: now, updatedBy: actor._id }, $setOnInsert: { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, createdAt: now } },
    { upsert: true },
  );
  await audit(db, organisationKey, actor, "next_human.media_uploaded", "nextHumanMedia", id, { slot, kind: media.kind });
  return sendJson(response, 201, { media: reference, slot, message: `${slot === "introVideo" ? "Video" : "Image"} added to NEXT HUMAN.` });
}

async function serveMedia(request, response, context, mediaId) {
  const { db, organisationKey, sendJson } = context;
  const id = objectId(mediaId);
  const media = id ? await db.collection("nextHumanMedia").findOne({ _id: id, organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY }) : null;
  if (!media) return sendJson(response, 404, { error: "Media not found." });
  const file = await stat(media.storagePath).catch(() => null);
  if (!file) return sendJson(response, 404, { error: "Media file is unavailable." });
  response.writeHead(200, { "Content-Type": media.mimeType, "Content-Length": file.size, "Cache-Control": "private, max-age=3600", "Content-Disposition": `inline; filename="${safeMediaName(media.originalName)}"` });
  if (request.method === "HEAD") return response.end();
  await pipeline(createReadStream(media.storagePath), response);
}

async function memberOverview(response, context, actor) {
  const { db, organisationKey, sendJson } = context;
  await removeExpiredHolds(db, organisationKey);
  const [event, application, bookings, reservations] = await Promise.all([
    loadEvent(db, organisationKey),
    db.collection("nextHumanApplications").findOne({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id }),
    db.collection("nextHumanBookings").find({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id }).sort({ dayNumber: 1, createdAt: -1 }).toArray(),
    db.collection("nextHumanSeatReservations").find({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, status: { $in: ["held", "payment_pending", "booked"] } }, { projection: { dayId: 1, seatId: 1, status: 1, expiresAt: 1 } }).toArray(),
  ]);
  const availability = Object.fromEntries(event.days.map(day => {
    const used = reservations.filter(item => item.dayId === day.id).length;
    return [day.id, { available: Math.max(0, seatsForDay(day).length - used), total: seatsForDay(day).length }];
  }));
  return sendJson(response, 200, { event: publicEvent(event), application: applicationView(application), bookings: bookings.map(bookingView), availability, payments: { enabled: paymentsEnabled(), testMode: String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_") } });
}

async function memberApplication(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const event = await loadEvent(db, organisationKey);
  if (!event.applicationsOpen) return sendJson(response, 409, { error: "Applications are currently closed." });
  const body = await readJson(request);
  const submit = body.intent !== "draft";
  const validation = validateNextHumanApplication(body, event, { submit });
  if (!validation.ok) return sendJson(response, 422, { error: validation.errors[0], errors: validation.errors });
  const now = new Date();
  const status = submit ? "submitted" : "draft";
  const update = {
    ...validation.value,
    status,
    fullName: actor.fullName,
    email: actor.email || "",
    mobile: actor.mobile || "",
    memberNumber: actor.memberNumber || "",
    updatedAt: now,
    ...(submit ? { submittedAt: now } : {}),
  };
  const document = await db.collection("nextHumanApplications").findOneAndUpdate(
    { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id },
    { $set: update, $setOnInsert: { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id, createdAt: now } },
    { upsert: true, returnDocument: "after" },
  );
  await audit(db, organisationKey, actor, `next_human.application_${status}`, "nextHumanApplication", document._id, { pathway: validation.value.pathway });
  return sendJson(response, submit ? 201 : 200, { application: applicationView(document), message: submit ? "Your NEXT HUMAN application has been submitted for review." : "Your answers have been saved privately as a draft." });
}

async function memberSeats(response, url, context, actor) {
  const { db, organisationKey, sendJson } = context;
  const event = await loadEvent(db, organisationKey);
  const dayId = String(url.searchParams.get("day") || "");
  const day = eventDay(event, dayId);
  if (!day) return sendJson(response, 404, { error: "Conference day not found." });
  const application = await db.collection("nextHumanApplications").findOne({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id, status: "approved" });
  if (!application) return sendJson(response, 403, { error: "Seat booking opens after your NEXT HUMAN application is approved." });
  await removeExpiredHolds(db, organisationKey);
  const reservations = await db.collection("nextHumanSeatReservations").find({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId, status: { $in: ["held", "payment_pending", "booked"] } }).toArray();
  const statusBySeat = new Map(reservations.map(item => [item.seatId, { status: item.status, mine: String(item.memberId) === String(actor._id), expiresAt: item.expiresAt || null }]));
  return sendJson(response, 200, { day: { ...day, seats: seatsForDay(day).map(seat => ({ ...seat, ...(statusBySeat.get(seat.id) || { status: "available", mine: false }) })) }, maxCompanions: event.maxCompanionsPerDay });
}

async function memberHold(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const body = await readJson(request);
  const event = await loadEvent(db, organisationKey);
  const day = eventDay(event, String(body.dayId || ""));
  if (!day || !day.bookingOpen) return sendJson(response, 409, { error: "Booking is not open for this conference day." });
  const application = await db.collection("nextHumanApplications").findOne({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id, status: "approved" });
  if (!application) return sendJson(response, 403, { error: "Your application must be approved before you select seats." });
  const pricing = bookingAmount(day, body.seatIds);
  if (!pricing.ok) return sendJson(response, 422, { error: pricing.error });
  const companions = Array.isArray(body.companions) ? body.companions.slice(0, 2).map(value => String(value || "").trim().slice(0, 100)).filter(Boolean) : [];
  if (pricing.seats.length - 1 !== companions.length) return sendJson(response, 422, { error: "Add one companion name for every additional seat." });
  const now = new Date();
  await removeExpiredHolds(db, organisationKey, now);
  const pathwayUsed = await db.collection("nextHumanSeatReservations").countDocuments({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: day.id, pathway: application.pathway, status: { $in: ["held", "payment_pending", "booked"] } });
  if (pathwayUsed + pricing.seats.length > Number(event.pathwayCapacityPerDay[application.pathway] || 250)) return sendJson(response, 409, { error: `The ${event.pathways[application.pathway].title} allocation for this day is full.` });
  await db.collection("nextHumanSeatReservations").deleteMany({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: day.id, memberId: actor._id, status: "held" });
  const token = randomUUID();
  const expiresAt = new Date(now.getTime() + Number(event.seatHoldMinutes || 8) * 60 * 1000);
  const inserted = [];
  try {
    for (const seat of pricing.seats) {
      const document = { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: day.id, dayNumber: day.dayNumber, seatId: seat.id, row: seat.row, number: seat.number, category: seat.category, priceRupees: seat.priceRupees, memberId: actor._id, pathway: application.pathway, holdToken: token, status: "held", expiresAt, createdAt: now, updatedAt: now };
      const result = await db.collection("nextHumanSeatReservations").insertOne(document);
      inserted.push(result.insertedId);
    }
  } catch (error) {
    if (inserted.length) await db.collection("nextHumanSeatReservations").deleteMany({ _id: { $in: inserted } });
    if (error?.code === 11000) return sendJson(response, 409, { error: "One of these seats was just selected by another participant. Please choose again." });
    throw error;
  }
  await db.collection("nextHumanBookings").updateMany({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: day.id, memberId: actor._id, status: { $in: ["held", "payment_pending"] } }, { $set: { status: "replaced", updatedAt: now } });
  const booking = {
    organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id, memberNumber: actor.memberNumber || "", memberName: actor.fullName, pathway: application.pathway,
    dayId: day.id, dayNumber: day.dayNumber, dayTitle: day.title, dayDate: day.date,
    seats: pricing.seats, companions, amountPaise: pricing.amountRupees * 100, holdToken: token, holdExpiresAt: expiresAt, status: "held", createdAt: now, updatedAt: now,
  };
  const result = await db.collection("nextHumanBookings").insertOne(booking);
  booking._id = result.insertedId;
  await audit(db, organisationKey, actor, "next_human.seats_held", "nextHumanBooking", booking._id, { dayId: day.id, seats: pricing.seats.map(seat => seat.id) });
  return sendJson(response, 201, { booking: bookingView(booking), holdToken: token, message: `Seats held for ${event.seatHoldMinutes} minutes. Payment is only for Day ${day.dayNumber}.` });
}

function razorpayHeaders() {
  return { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`, "Content-Type": "application/json" };
}

async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const providerResponse = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: razorpayHeaders(), body: JSON.stringify({ amount: amountPaise, currency: "INR", payment_capture: 1, receipt, notes }) });
  const order = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok || !order.id) throw Object.assign(new Error(order.error?.description || "Razorpay could not create the day-booking payment."), { statusCode: 502 });
  return order;
}

async function memberOrder(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!paymentsEnabled()) return sendJson(response, 503, { error: "NEXT HUMAN online booking payments are not enabled yet." });
  const body = await readJson(request);
  const bookingId = objectId(body.bookingId);
  const now = new Date();
  const booking = bookingId ? await db.collection("nextHumanBookings").findOne({ _id: bookingId, organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, memberId: actor._id, status: "held", holdExpiresAt: { $gt: now } }) : null;
  if (!booking) return sendJson(response, 409, { error: "Your seat hold has expired. Please select the seats again." });
  const receipt = `nh_${booking.dayNumber}_${Date.now()}_${String(actor._id).slice(-5)}`.slice(0, 40);
  const order = await createRazorpayOrder({ amountPaise: booking.amountPaise, receipt, notes: { organisationKey, source: "next-human", eventKey: NEXT_HUMAN_EVENT_KEY, bookingId: String(booking._id), dayId: booking.dayId, seats: booking.seats.map(seat => seat.id).join(",") } });
  const paymentOrder = { organisationKey, provider: "razorpay", providerOrderId: order.id, receipt, memberId: actor._id, source: "next-human", nextHumanBookingId: booking._id, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: booking.dayId, amountPaise: booking.amountPaise, currency: "INR", status: "created", createdAt: now, updatedAt: now };
  await db.collection("paymentOrders").insertOne(paymentOrder);
  // Razorpay can remain open beyond the short seat-selection timer. Once an
  // order exists, protect those seats for a separate payment window so another
  // member cannot acquire them while the first member is completing payment.
  const paymentExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  await Promise.all([
    db.collection("nextHumanBookings").updateOne({ _id: booking._id }, { $set: { status: "payment_pending", providerOrderId: order.id, holdExpiresAt: paymentExpiresAt, updatedAt: now } }),
    db.collection("nextHumanSeatReservations").updateMany(
      { organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: booking.dayId, memberId: booking.memberId, holdToken: booking.holdToken, status: "held" },
      { $set: { status: "payment_pending", providerOrderId: order.id, expiresAt: paymentExpiresAt, updatedAt: now } },
    ),
  ]);
  return sendJson(response, 201, { order: { id: order.id, amountPaise: booking.amountPaise, currency: "INR", razorpayKeyId: process.env.RAZORPAY_KEY_ID, title: `NEXT HUMAN · Day ${booking.dayNumber}`, description: `${booking.dayTitle} · ${booking.seats.map(seat => seat.id).join(", ")}` }, message: `Complete payment for Day ${booking.dayNumber}. Other days remain unbooked.` });
}

async function fetchPayment(paymentId) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: razorpayHeaders() });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payment.error?.description || "Razorpay payment could not be confirmed."), { statusCode: 502 });
  return payment;
}

export async function recordNextHumanPayment({ db, organisationKey, order, payment, actor = null }) {
  const bookingId = order.nextHumanBookingId || objectId(payment?.notes?.bookingId);
  const booking = bookingId ? await db.collection("nextHumanBookings").findOne({ _id: bookingId, organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY }) : null;
  if (!booking) throw Object.assign(new Error("NEXT HUMAN booking record not found."), { statusCode: 404 });
  if (booking.status === "confirmed") return booking;
  const now = new Date();
  const passNumber = `NH26-D${booking.dayNumber}-${String(booking._id).slice(-6).toUpperCase()}`;
  await Promise.all([
    db.collection("nextHumanBookings").updateOne({ _id: booking._id }, { $set: { status: "confirmed", providerOrderId: order.providerOrderId, providerPaymentId: payment.id, passNumber, confirmedAt: now, updatedAt: now } }),
    db.collection("nextHumanSeatReservations").updateMany({ organisationKey, eventKey: NEXT_HUMAN_EVENT_KEY, dayId: booking.dayId, memberId: booking.memberId, holdToken: booking.holdToken, status: { $in: ["held", "payment_pending"] } }, { $set: { status: "booked", providerPaymentId: payment.id, bookedAt: now, expiresAt: null, updatedAt: now } }),
    db.collection("paymentOrders").updateOne({ _id: order._id }, { $set: { status: "verified", providerPaymentId: payment.id, verifiedAt: now, updatedAt: now } }),
  ]);
  await audit(db, organisationKey, actor, "next_human.day_booking_confirmed", "nextHumanBooking", booking._id, { dayId: booking.dayId, amountPaise: booking.amountPaise, seats: booking.seats.map(seat => seat.id) });
  return db.collection("nextHumanBookings").findOne({ _id: booking._id });
}

async function memberVerify(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const body = await readJson(request);
  if (!verifyRazorpaySignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature, process.env.RAZORPAY_KEY_SECRET)) return sendJson(response, 400, { error: "Payment signature could not be verified. The seat booking was not confirmed." });
  const order = await db.collection("paymentOrders").findOne({ organisationKey, providerOrderId: body.razorpayOrderId, memberId: actor._id, provider: "razorpay", source: "next-human" });
  if (!order) return sendJson(response, 404, { error: "Day-booking payment order not found." });
  const payment = await fetchPayment(body.razorpayPaymentId);
  if (payment.order_id !== order.providerOrderId || Number(payment.amount) !== order.amountPaise || payment.status !== "captured") return sendJson(response, 409, { error: "Razorpay has not confirmed the expected payment." });
  const booking = await recordNextHumanPayment({ db, organisationKey, order, payment, actor });
  return sendJson(response, 200, { booking: bookingView(booking), message: `Day ${booking.dayNumber} is booked. Your pass is ready.` });
}

export async function handleNextHumanAdminRequest({ request, response, url, context, actor }) {
  if (!url.pathname.startsWith("/api/participation/admin/next-human-event")) return false;
  if (["GET", "PATCH"].includes(request.method) && url.pathname === "/api/participation/admin/next-human-event") { await adminEvent(request, response, context, actor); return true; }
  const dayMatch = url.pathname.match(/^\/api\/participation\/admin\/next-human-event\/days\/([^/]+)$/);
  if (request.method === "PATCH" && dayMatch) { await adminDay(request, response, context, actor, dayMatch[1]); return true; }
  if (["GET", "PATCH"].includes(request.method) && url.pathname === "/api/participation/admin/next-human-event/applications") { await adminApplications(request, response, url, context, actor); return true; }
  const applicationMatch = url.pathname.match(/^\/api\/participation\/admin\/next-human-event\/applications\/([^/]+)$/);
  if (request.method === "PATCH" && applicationMatch) { await adminApplications(request, response, url, context, actor, applicationMatch[1]); return true; }
  if (request.method === "GET" && url.pathname === "/api/participation/admin/next-human-event/bookings") { await adminBookings(response, url, context); return true; }
  if (request.method === "POST" && url.pathname === "/api/participation/admin/next-human-event/media") { await adminMedia(request, response, context, actor); return true; }
  const mediaMatch = url.pathname.match(/^\/api\/participation\/admin\/next-human-event\/media\/([^/]+)$/);
  if (["GET", "HEAD"].includes(request.method) && mediaMatch) { await serveMedia(request, response, context, mediaMatch[1]); return true; }
  return false;
}

export async function handleNextHumanMemberRequest({ request, response, url, context, actor }) {
  if (!url.pathname.startsWith("/api/participation/member/next-human")) return false;
  if (request.method === "GET" && url.pathname === "/api/participation/member/next-human") { await memberOverview(response, context, actor); return true; }
  if (request.method === "POST" && url.pathname === "/api/participation/member/next-human/application") { await memberApplication(request, response, context, actor); return true; }
  if (request.method === "GET" && url.pathname === "/api/participation/member/next-human/seats") { await memberSeats(response, url, context, actor); return true; }
  if (request.method === "POST" && url.pathname === "/api/participation/member/next-human/holds") { await memberHold(request, response, context, actor); return true; }
  if (request.method === "POST" && url.pathname === "/api/participation/member/next-human/bookings/order") { await memberOrder(request, response, context, actor); return true; }
  if (request.method === "POST" && url.pathname === "/api/participation/member/next-human/bookings/verify") { await memberVerify(request, response, context, actor); return true; }
  const mediaMatch = url.pathname.match(/^\/api\/participation\/member\/next-human\/media\/([^/]+)$/);
  if (["GET", "HEAD"].includes(request.method) && mediaMatch) { await serveMedia(request, response, context, mediaMatch[1]); return true; }
  return false;
}
