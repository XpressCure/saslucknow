import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "sas_admin_session";
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase().slice(0, 180);
}

export function validatePassword(value) {
  const password = String(value ?? "");
  if (password.length < 10) return "Use at least 10 characters for the password.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
  return "";
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return {
    algorithm: "scrypt",
    salt: salt.toString("hex"),
    hash: Buffer.from(derivedKey).toString("hex"),
  };
}

export async function verifyPassword(password, credential) {
  if (!credential?.salt || !credential?.hash || credential.algorithm !== "scrypt") return false;
  const expected = Buffer.from(credential.hash, "hex");
  const derivedKey = Buffer.from(await scrypt(password, Buffer.from(credential.salt, "hex"), expected.length));
  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function parseCookies(header = "") {
  return String(header).split(";").reduce((cookies, pair) => {
    const index = pair.indexOf("=");
    if (index < 1) return cookies;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

export function sessionCookie(token, { secure = false, maxAgeSeconds = SESSION_DURATION_MS / 1000 } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie({ secure = false } = {}) {
  return sessionCookie("", { secure, maxAgeSeconds: 0 });
}

export function publicAdministrator(member) {
  return {
    id: String(member._id),
    fullName: member.fullName,
    email: member.email,
    role: member.role,
    permissions: Array.isArray(member.permissions) ? member.permissions : [],
  };
}
