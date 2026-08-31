import { createHmac, timingSafeEqual } from "node:crypto";
import { cleanText, normalizePhone } from "./participation-core.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizeIdentity(value) {
  const text = cleanText(value, 180).toLowerCase();
  const phone = normalizePhone(text);
  return phone.length === 10 ? { mobile: phone } : { email: text };
}

export function validateActivation(input) {
  const mobile = normalizePhone(input?.mobile);
  const reference = cleanText(input?.reference, 40).toUpperCase();
  const errors = [];
  if (!/^[6-9]\d{9}$/.test(mobile)) errors.push("Enter the mobile number used in your approved Parichay.");
  if (!/^PAR-\d{4}-[A-Z0-9]{8}$/.test(reference)) errors.push("Enter the complete Parichay reference shared after submission.");
  return { ok: errors.length === 0, errors, value: { mobile, reference } };
}

export function validateContribution(input) {
  const amountRupees = Number(input?.amountRupees);
  const donorName = cleanText(input?.donorName, 120);
  const donorEmail = cleanText(input?.donorEmail, 180).toLowerCase();
  const donorMobile = normalizePhone(input?.donorMobile);
  const donorPan = cleanText(input?.donorPan, 10).toUpperCase();
  const donorAddress = cleanText(input?.donorAddress, 500);
  const errors = [];
  if (!Number.isFinite(amountRupees) || amountRupees < 100 || amountRupees > 1000000) errors.push("Contribution must be between Rs 100 and Rs 10,00,000.");
  if (donorName.length < 2) errors.push("Enter the contributor's legal name.");
  if (donorEmail && !emailPattern.test(donorEmail)) errors.push("Enter a valid email address.");
  if (!/^[6-9]\d{9}$/.test(donorMobile)) errors.push("Enter a valid 10-digit Indian mobile number.");
  if (donorPan && !panPattern.test(donorPan)) errors.push("Enter a valid PAN or leave it blank.");
  return {
    ok: errors.length === 0,
    errors,
    value: {
      amountPaise: Math.round((amountRupees || 0) * 100),
      donorName,
      donorEmail,
      donorMobile,
      donorPan,
      donorAddress,
    },
  };
}
export function razorpaySignature(orderId, paymentId, secret) {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = Buffer.from(razorpaySignature(orderId, paymentId, secret), "utf8");
  const received = Buffer.from(String(signature), "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(String(signature), "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function receiptNumber(paymentId, date = new Date()) {
  return `SASL-${date.getUTCFullYear()}-${String(paymentId || "PAYMENT").replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase()}`;
}

export function formatMemberNumber(year, sequence) {
  return `UC02-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function allocateMemberNumber(db, organisationKey, now = new Date()) {
  const year = now.getUTCFullYear();
  const key = `${organisationKey}:member-number:${year}`;
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: key },
    { $inc: { value: 3 }, $setOnInsert: { organisationKey, kind: "member-number", year, createdAt: now }, $set: { updatedAt: now } },
    { upsert: true, returnDocument: "after", includeResultMetadata: false },
  );
  return formatMemberNumber(year, Number(result?.value || 3));
}

export function publicMember(member) {
  return {
    id: String(member._id),
    memberNumber: member.memberNumber || "",
    fullName: member.fullName,
    email: member.email || "",
    mobile: member.mobile || "",
    city: member.city || "",
    interests: member.interests || "",
    skills: member.skills || "",
    sevaPreference: member.sevaPreference || "",
    pushpanjaliCertificateNumber: member.pushpanjaliCertificateNumber || "",
    role: member.role || "member",
    membershipStatus: member.membershipStatus === "disabled" ? "disabled" : "enabled",
    joinedAt: member.joinedAt || member.createdAt,
  };
}
