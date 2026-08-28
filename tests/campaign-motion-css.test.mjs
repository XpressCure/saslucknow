import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SAS_CAMPAIGN_TEMPLATES } from "../server/participation-campaign-core.mjs";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("every approved campaign motion is implemented in all three member-facing previews", async () => {
  const [studio, adminPhone, adminFixes, member, memberFixes] = await Promise.all([
    read("../app/admin/campaign-studio.css"),
    read("../app/admin/campaign-mobile-preview.css"),
    read("../app/admin/campaign-motion-fixes.css"),
    read("../app/member/member.css"),
    read("../app/member/member-campaign-motion-fixes.css"),
  ]);

  const approvedMotions = new Set(
    Object.values(SAS_CAMPAIGN_TEMPLATES).flatMap(template => template.allowedMotionPresets).filter(motion => motion !== "none"),
  );

  for (const motion of approvedMotions) {
    assert.match(`${studio}\n${adminFixes}`, new RegExp(`motion-${motion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `Creative Studio is missing ${motion}`);
    assert.match(`${adminPhone}\n${adminFixes}`, new RegExp(`motion-${motion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `Full-phone preview is missing ${motion}`);
    assert.match(`${member}\n${memberFixes}`, new RegExp(`member-focus-motion-${motion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `Member dashboard is missing ${motion}`);
  }
});

test("Gentle Fade has a calm repeating animation and reduced-motion fallback", async () => {
  const [adminFixes, memberFixes] = await Promise.all([
    read("../app/admin/campaign-motion-fixes.css"),
    read("../app/member/member-campaign-motion-fixes.css"),
  ]);

  assert.match(adminFixes, /campaign-gentle-fade 4\.8s ease-in-out infinite/);
  assert.match(memberFixes, /member-focus-gentle-fade 4\.8s ease-in-out infinite/);
  assert.match(adminFixes, /prefers-reduced-motion: reduce/);
  assert.match(memberFixes, /prefers-reduced-motion: reduce/);
});
