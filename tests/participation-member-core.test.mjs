import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIdentity,
  receiptNumber,
  validateActivation,
  validateContribution,
  verifyRazorpaySignature,
  razorpaySignature,
} from "../server/participation-member-core.mjs";

test("normalizes member login by mobile or email", () => {
  assert.deepEqual(normalizeIdentity("+91 98765 43210"), { mobile: "9876543210" });
  assert.deepEqual(normalizeIdentity("ASHA@example.com"), { email: "asha@example.com" });
});

test("validates an approved Parichay activation reference", () => {
  const result = validateActivation({ mobile: "9876543210", reference: "par-2026-ab12cd34" });
  assert.equal(result.ok, true);
  assert.equal(result.value.reference, "PAR-2026-AB12CD34");
});

test("validates contribution identity and amount", () => {
  const result = validateContribution({ amountRupees: 2100, donorName: "Asha Verma", donorMobile: "9876543210", donorEmail: "asha@example.com", donorPan: "ABCDE1234F" });
  assert.equal(result.ok, true);
  assert.equal(result.value.amountPaise, 210000);
});

test("rejects contribution outside limits", () => {
  const result = validateContribution({ amountRupees: 10, donorName: "A", donorMobile: "123" });
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3);
});

test("verifies Razorpay signatures without exposing the secret", () => {
  const signature = razorpaySignature("order_123", "pay_456", "test-secret");
  assert.equal(verifyRazorpaySignature("order_123", "pay_456", signature, "test-secret"), true);
  assert.equal(verifyRazorpaySignature("order_123", "pay_999", signature, "test-secret"), false);
});

test("creates stable acknowledgement numbers", () => {
  assert.equal(receiptNumber("pay_abc123456789", new Date("2026-08-10T00:00:00Z")), "SASL-2026-C123456789");
});
