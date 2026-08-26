import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("member login exposes secure email password recovery", async () => {
  const source = await readFile(new URL("../app/member/member-client.tsx", import.meta.url), "utf8");
  assert.match(source, /Forgot password\?/);
  assert.match(source, /\/auth\/password-reset\/request/);
  assert.match(source, /\/auth\/password-reset\/complete/);
  assert.match(source, /Six-digit verification code/);
  assert.match(source, /Change password/);
});

test("member password reset is rate-limited, expiring and single-use", async () => {
  const source = await readFile(new URL("../server/participation-member-api.mjs", import.meta.url), "utf8");
  assert.match(source, /PASSWORD_RESET_DURATION_MS = 10 \* 60 \* 1000/);
  assert.match(source, /PASSWORD_RESET_MAX_ATTEMPTS = 5/);
  assert.match(source, /If this is a registered member email/);
  assert.match(source, /usedAt: null/);
  assert.match(source, /revokeReason: "password-reset"/);
  assert.match(source, /memberPasswordResets/);
});

test("member reset records receive TTL and member indexes", async () => {
  const source = await readFile(new URL("../server/participation-api.mjs", import.meta.url), "utf8");
  assert.match(source, /member_password_reset_expiry/);
  assert.match(source, /member_password_reset_member/);
});
