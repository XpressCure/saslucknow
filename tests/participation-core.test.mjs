import test from "node:test";
import assert from "node:assert/strict";
import { calculateKoshSummary, normalizePhone, publicSankalp, validateParichayApplication } from "../server/participation-core.mjs";

test("normalizes Indian mobile numbers", () => {
  assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
});

test("accepts a complete Parichay application", () => {
  const result = validateParichayApplication({ fullName: "Asha Verma", mobile: "9876543210", email: "ASHA@example.com", consent: true });
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "asha@example.com");
});

test("rejects an invalid mobile and missing consent", () => {
  const result = validateParichayApplication({ fullName: "Asha", mobile: "123", consent: false });
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
});

test("calculates non-negative available Kosh balance", () => {
  assert.deepEqual(calculateKoshSummary([{ status: "active" }, { status: "completed" }], { receivedAmountPaise: 5000, allocatedAmountPaise: 7000 }), {
    receivedAmountPaise: 5000,
    allocatedAmountPaise: 7000,
    availableAmountPaise: 0,
    activeSankalpCount: 1,
  });
});

test("publishes planning stage for a Sankalp without a stage", () => {
  const result = publicSankalp({ _id: "1", slug: "consultations", title: "Consultations", status: "active" });
  assert.equal(result.stage, "planning");
  assert.equal(result.targetAmountPaise, 0);
});
