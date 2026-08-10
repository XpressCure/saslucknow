import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateKoshSummary,
  normalizePhone,
  normalizePushpanjaliCertificateNumber,
  publicParticipationSummary,
  publicRecentContribution,
  publicSankalp,
  validateParichayApplication,
} from "../server/participation-core.mjs";

test("normalizes Indian mobile numbers", () => {
  assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
});

test("accepts a complete Parichay application", () => {
  const result = validateParichayApplication({ fullName: "Asha Verma", mobile: "9876543210", email: "ASHA@example.com", pushpanjaliCertificateNumber: "uc02-000014", consent: true });
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "asha@example.com");
  assert.equal(result.value.pushpanjaliCertificateNumber, "UC02-000014");
});

test("normalizes and validates an optional Pushpanjali journey reference", () => {
  assert.equal(normalizePushpanjaliCertificateNumber(" uc02-000009 "), "UC02-000009");
  const result = validateParichayApplication({ fullName: "Asha Verma", mobile: "9876543210", pushpanjaliCertificateNumber: "public-certificate", consent: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /Pushpanjali certificate/);
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
  assert.equal(result.donorCount, 0);
  assert.equal("targetAmountPaise" in result, false);
  assert.equal("receivedAmountPaise" in result, false);
});

test("summarizes public participation without exposing financial totals", () => {
  const result = publicParticipationSummary([
    { status: "active", donorCount: 3, volunteerCount: 2 },
    { status: "funding", donorCount: 4, volunteerCount: 1 },
    { status: "completed", donorCount: 8, volunteerCount: 5 },
  ]);
  assert.deepEqual(result, { activeSankalpCount: 2, contributorCount: 7, sevaParticipantCount: 3 });
});

test("anonymizes recent contribution activity", () => {
  const result = publicRecentContribution({
    _id: "contribution-1",
    donorName: "Private person",
    amountPaise: 500000,
    createdAt: new Date("2026-08-10T08:30:00.000Z"),
  }, "Winter Blanket Distribution");
  assert.deepEqual(result, {
    id: "contribution-1",
    sankalpTitle: "Winter Blanket Distribution",
    contributedAt: "2026-08-10T08:30:00.000Z",
  });
  assert.equal("donorName" in result, false);
  assert.equal("amountPaise" in result, false);
});
