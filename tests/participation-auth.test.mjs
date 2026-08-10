import test from "node:test";
import assert from "node:assert/strict";
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  parseCookies,
  sessionCookie,
  validatePassword,
  verifyPassword,
} from "../server/participation-auth.mjs";

test("hashes and verifies an administrator password", async () => {
  const credential = await hashPassword("SasAdmin2026");
  assert.equal(await verifyPassword("SasAdmin2026", credential), true);
  assert.equal(await verifyPassword("WrongPassword1", credential), false);
  assert.equal(credential.algorithm, "scrypt");
  assert.notEqual(credential.hash, "SasAdmin2026");
});

test("validates password strength and normalizes email", () => {
  assert.equal(validatePassword("short"), "Use at least 10 characters for the password.");
  assert.equal(validatePassword("lettersletters"), "Include at least one letter and one number.");
  assert.equal(validatePassword("Secure2026"), "");
  assert.equal(normalizeEmail(" RKSINGH.668@GMAIL.COM "), "rksingh.668@gmail.com");
});

test("creates opaque session tokens and secure cookies", () => {
  const token = createSessionToken();
  assert.ok(token.length >= 40);
  assert.equal(hashSessionToken(token).length, 64);
  const cookie = sessionCookie(token, { secure: true });
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.equal(parseCookies(cookie)["sas_admin_session"], token);
  assert.match(clearSessionCookie(), /Max-Age=0/);
});
