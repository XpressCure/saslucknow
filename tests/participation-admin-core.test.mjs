import test from "node:test";
import assert from "node:assert/strict";
import { serializeSankalp, slugify, validateMilestone, validateSankalp } from "../server/participation-admin-core.mjs";

test("validates and converts a complete Sankalp draft", () => {
  const result = validateSankalp({
    title: "Winter Seva",
    purpose: "Provide useful winter support through a reviewed process.",
    status: "draft",
    stage: "concept",
    tentativeBudgetRupees: 25000,
    acceptsDonations: true,
    acceptsSeva: true,
    budgetRequired: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.tentativeBudgetPaise, 2500000);
  assert.equal(slugify("Winter Seva 2026"), "winter-seva-2026");
});

test("rejects an invalid lifecycle stage and completion percentage", () => {
  const result = validateSankalp({ title: "Valid title", purpose: "A sufficiently clear purpose.", status: "active", stage: "unknown", completionPercent: 120 });
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
});

test("validates milestones and serializes private financial fields for administrators", () => {
  assert.equal(validateMilestone({ title: "Receive estimate", status: "pending", budgetRupees: 1000 }).ok, true);
  const result = serializeSankalp({ _id: "1", title: "Research", slug: "research", status: "draft", tentativeBudgetPaise: 500000, estimatedBudgetPaise: 450000 });
  assert.equal(result.tentativeBudgetRupees, 5000);
  assert.equal(result.estimatedBudgetRupees, 4500);
});
