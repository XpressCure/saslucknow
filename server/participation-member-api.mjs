import { ObjectId } from "mongodb";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookies,
  SESSION_DURATION_MS,
  validatePassword,
  verifyPassword,
} from "./participation-auth.mjs";
import {
  normalizeIdentity,
  publicMember,
  receiptNumber,
  validateActivation,
  validateContribution,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "./participation-member-core.mjs";
import { cleanText, publicSankalp } from "./participation-core.mjs";

const MEMBER_COOKIE = "sas_member_session";
const loginWindows = new Map();

function objectId(value) {
  return ObjectId.isValid(String(value || "")) ? new ObjectId(String(value)) : null;
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
  return { member, session };
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
  const passwordCredential = await hashPassword(String(body.password));
  const now = new Date();
  await db.collection("members").updateOne({ _id: member._id }, { $set: { passwordCredential: { ...passwordCredential, updatedAt: now }, accountActivatedAt: now, updatedAt: now } });
  const activated = { ...member, passwordCredential };
  const token = await createMemberSession({ request, db, organisationKey, member: activated, clientAddress });
  await audit(db, organisationKey, activated, "member.account_activated", "member", activated._id);
  return sendJson(response, 200, { member: publicMember(activated), message: "Your member account is ready." }, { "Set-Cookie": memberCookie(token, { secure: requestIsSecure(request) }) });
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
  const [sankalps, contributions, organisation] = await Promise.all([
    db.collection("sankalps").find({ organisationKey, status: { $in: ["active", "completed"] } }).sort({ featuredOrder: 1, updatedAt: -1 }).toArray(),
    db.collection("contributions").find({ organisationKey, memberId: actor._id, status: { $in: ["verified", "captured", "completed"] } }).sort({ createdAt: -1 }).limit(100).toArray(),
    db.collection("organisations").findOne({ key: organisationKey }),
  ]);
  const titles = new Map(sankalps.map(item => [String(item._id), item.title]));
  return sendJson(response, 200, {
    member: publicMember(actor),
    organisation: { name: organisation?.publicName || "Sri Aurobindo Society", receiptIssuer: organisation?.receiptIssuer || null },
    sankalps: sankalps.map(memberSankalp),
    contributions: contributions.map(item => contributionView(item, titles.get(String(item.sankalpId)) || item.sankalpTitle)),
    totals: { contributedRupees: contributions.reduce((sum, item) => sum + Number(item.amountPaise || 0), 0) / 100 },
    payments: { razorpayEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) },
  });
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

async function createOrder(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
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
  const providerResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: razorpayHeaders(),
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      payment_capture: 1,
      receipt,
      notes: { organisationKey, memberId: String(actor._id), sankalpId: String(sankalp._id), sankalp: sankalp.title },
    }),
  });
  const order = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok || !order.id) throw Object.assign(new Error(order.error?.description || "Razorpay could not create the payment order."), { statusCode: 502 });
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
    if (order && Number(payment.amount) === order.amountPaise) await recordVerifiedContribution({ db, organisationKey, order, payment });
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
  if (!url.pathname.startsWith("/api/participation/member") && url.pathname !== "/api/participation/webhooks/razorpay") return false;
  const context = { request, response, url, db, organisationKey, readJson, readBuffer, sendJson, clientAddress };
  if (url.pathname === "/api/participation/webhooks/razorpay" && request.method === "POST") return handled(webhook(request, response, context));
  if (!["GET", "HEAD"].includes(request.method) && !sameOrigin(request)) {
    sendJson(response, 403, { error: "This request did not come from the SAS Lucknow website." });
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/activate") return handled(activate(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/login") return handled(login(request, response, context));
  if (request.method === "POST" && url.pathname === "/api/participation/member/auth/logout") return handled(logout(request, response, context));
  const authenticated = await memberFromRequest(request, db, organisationKey);
  if (!authenticated) { sendJson(response, 401, { error: "Member sign-in is required." }); return true; }
  const actor = authenticated.member;
  if (request.method === "GET" && url.pathname === "/api/participation/member/auth/me") return handled(sendJson(response, 200, { member: publicMember(actor) }));
  if (request.method === "GET" && url.pathname === "/api/participation/member/dashboard") return handled(dashboard(response, context, actor));
  if (request.method === "PATCH" && url.pathname === "/api/participation/member/profile") return handled(updateProfile(request, response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/member/payments/razorpay/orders") return handled(createOrder(request, response, context, actor));
  if (request.method === "POST" && url.pathname === "/api/participation/member/payments/razorpay/verify") return handled(verifyPayment(request, response, context, actor));
  const receiptMatch = url.pathname.match(/^\/api\/participation\/member\/contributions\/([^/]+)\/receipt$/);
  if (request.method === "GET" && receiptMatch) return handled(receipt(response, context, actor, receiptMatch[1]));
  sendJson(response, 404, { error: "Member endpoint not found." });
  return true;
}
