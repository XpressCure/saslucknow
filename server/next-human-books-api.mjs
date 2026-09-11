import { verifyRazorpaySignature } from "./participation-member-core.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BOOK_ONE_PRICE_PAISE = 29900;
const BOOK_ONE_ID = "next-human-book-one";

function razorpayHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

function paymentsEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function bookStorageDirectory() {
  return process.env.NEXT_HUMAN_BOOK_STORAGE_DIR || path.join(process.env.SAS_DOCUMENT_STORAGE_DIR || "/var/lib/saslucknow-participation/documents", "next-human-books");
}

async function serveEdition(request, response, context, actor, bookId, language) {
  const allowedBook = ["next-human-book-zero", BOOK_ONE_ID].includes(bookId);
  const allowedLanguage = ["en", "hi"].includes(language);
  if (!allowedBook || !allowedLanguage) return context.sendJson(response, 404, { error: "Book edition not found." });
  if (bookId === BOOK_ONE_ID) {
    const entitlement = await context.db.collection("nextHumanBookEntitlements").findOne({ organisationKey: context.organisationKey, memberId: actor._id, bookId: BOOK_ONE_ID, status: "active" });
    if (!entitlement) return context.sendJson(response, 403, { error: "Purchase Book One to open this edition." });
  }
  const filePath = path.join(bookStorageDirectory(), `${bookId}-${language}.pdf`);
  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": file.length,
      "Content-Disposition": `inline; filename="${bookId}-${language}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end(); else response.end(file);
  } catch (error) {
    if (error?.code === "ENOENT") return context.sendJson(response, 404, { error: "This edition is being prepared and will appear here soon." });
    throw error;
  }
}

async function entitlementView(db, organisationKey, actor) {
  const entitlement = await db.collection("nextHumanBookEntitlements").findOne({
    organisationKey,
    memberId: actor._id,
    bookId: BOOK_ONE_ID,
    status: "active",
  });
  return {
    books: [
      { id: "next-human-book-zero", title: "Book Zero", priceRupees: 0, languages: ["en", "hi"], unlocked: true },
      { id: BOOK_ONE_ID, title: "Book One", priceRupees: 299, languages: ["en", "hi"], unlocked: Boolean(entitlement) },
    ],
    payments: { enabled: paymentsEnabled(), testMode: String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_") },
  };
}

async function createOrder(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  if (!paymentsEnabled()) return sendJson(response, 503, { error: "Book payments are not configured yet." });
  const body = await readJson(request);
  if (body.bookId !== BOOK_ONE_ID) return sendJson(response, 422, { error: "This book is not available for purchase." });
  const existing = await db.collection("nextHumanBookEntitlements").findOne({ organisationKey, memberId: actor._id, bookId: BOOK_ONE_ID, status: "active" });
  if (existing) return sendJson(response, 409, { error: "Book One is already unlocked in your account." });
  const receipt = `nh_book_${Date.now()}_${String(actor._id).slice(-6)}`.slice(0, 40);
  const providerResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: razorpayHeaders(),
    body: JSON.stringify({
      amount: BOOK_ONE_PRICE_PAISE,
      currency: "INR",
      payment_capture: 1,
      receipt,
      notes: { organisationKey, memberId: String(actor._id), product: BOOK_ONE_ID },
    }),
  });
  const providerOrder = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok || !providerOrder.id) return sendJson(response, 502, { error: providerOrder.error?.description || "Razorpay could not create the book order." });
  const now = new Date();
  await db.collection("nextHumanBookOrders").insertOne({
    organisationKey, memberId: actor._id, bookId: BOOK_ONE_ID, provider: "razorpay",
    providerOrderId: providerOrder.id, amountPaise: BOOK_ONE_PRICE_PAISE, currency: "INR",
    status: "created", createdAt: now, updatedAt: now,
  });
  return sendJson(response, 201, { order: { id: providerOrder.id, amountPaise: BOOK_ONE_PRICE_PAISE, currency: "INR", razorpayKeyId: process.env.RAZORPAY_KEY_ID, title: "NEXT HUMAN · Book One" } });
}

async function verifyOrder(request, response, context, actor) {
  const { db, organisationKey, readJson, sendJson } = context;
  const body = await readJson(request);
  if (!verifyRazorpaySignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature, process.env.RAZORPAY_KEY_SECRET)) {
    return sendJson(response, 400, { error: "Payment signature could not be verified." });
  }
  const order = await db.collection("nextHumanBookOrders").findOne({ organisationKey, memberId: actor._id, bookId: BOOK_ONE_ID, providerOrderId: body.razorpayOrderId });
  if (!order) return sendJson(response, 404, { error: "Book order not found." });
  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(body.razorpayPaymentId)}`, { headers: razorpayHeaders() });
  const payment = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok || payment.order_id !== order.providerOrderId || Number(payment.amount) !== BOOK_ONE_PRICE_PAISE || payment.status !== "captured") {
    return sendJson(response, 409, { error: "Razorpay has not confirmed the expected ₹299 payment." });
  }
  const now = new Date();
  await Promise.all([
    db.collection("nextHumanBookOrders").updateOne({ _id: order._id }, { $set: { status: "verified", providerPaymentId: payment.id, verifiedAt: now, updatedAt: now } }),
    db.collection("nextHumanBookEntitlements").updateOne(
      { organisationKey, memberId: actor._id, bookId: BOOK_ONE_ID },
      { $set: { status: "active", languages: ["en", "hi"], provider: "razorpay", providerPaymentId: payment.id, unlockedAt: now, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    ),
  ]);
  return sendJson(response, 200, { unlocked: true, languages: ["en", "hi"], message: "Book One is now available in your private account." });
}

export async function handleNextHumanBooksRequest({ request, response, url, context, actor }) {
  if (!url.pathname.startsWith("/api/participation/member/next-human-books")) return false;
  const editionMatch = url.pathname.match(/^\/api\/participation\/member\/next-human-books\/(next-human-book-(?:zero|one))\/(en|hi)$/);
  if (["GET", "HEAD"].includes(request.method) && editionMatch) {
    await serveEdition(request, response, context, actor, editionMatch[1], editionMatch[2]); return true;
  }
  if (request.method === "GET" && url.pathname === "/api/participation/member/next-human-books") {
    context.sendJson(response, 200, await entitlementView(context.db, context.organisationKey, actor)); return true;
  }
  if (request.method === "POST" && url.pathname === "/api/participation/member/next-human-books/orders") {
    await createOrder(request, response, context, actor); return true;
  }
  if (request.method === "POST" && url.pathname === "/api/participation/member/next-human-books/verify") {
    await verifyOrder(request, response, context, actor); return true;
  }
  context.sendJson(response, 404, { error: "Book endpoint not found." }); return true;
}
