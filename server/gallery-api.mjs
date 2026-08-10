import http from "node:http";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import Busboy from "busboy";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const PORT = Number(process.env.PORT || 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("work/gallery-submissions");
const PUSHPANJALI_DIR = process.env.PUSHPANJALI_DIR || path.resolve("work/pushpanjali-offerings");
const PUSHPANJALI_COUNTER_FILE = path.join(PUSHPANJALI_DIR, ".certificate-counter");
const TEMP_DIR = path.join(UPLOAD_DIR, ".tmp");
const MANIFEST_DIR = path.join(UPLOAD_DIR, "manifests");
const SAVITRI_MANIFEST_DIR = path.join(UPLOAD_DIR, "savitri-manifests");
const MAX_REQUEST_BYTES = 130 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 8;
const allowedTypes = new Map([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["video/webm", "video"], ["video/quicktime", "video"],
]);
const rateLimits = new Map();
const pushpanjaliRateLimits = new Map();
const pendingPushpanjaliEmails = new Map();
let mongoClientPromise;
let pushpanjaliCounterQueue = Promise.resolve();

const pushpanjaliFlowers = new Map([
  ["divine-love", {
    name: "Divine Love",
    meaning: "A flower that is said to blossom even in the desert.",
    botanical: "Punica granatum - orange-red, double",
    image: "https://www.saslucknow.in/pushpanjali-divine-love.jpg",
    cutout: "https://www.saslucknow.in/pushpanjali-divine-love-cutout.png",
  }],
  ["integral-love", {
    name: "Integral Love for the Divine",
    meaning: "Pure, complete, irrevocable, a love that gives itself for ever.",
    botanical: "Rosa - white",
    image: "https://www.saslucknow.in/pushpanjali-integral-love.jpg",
    cutout: "https://www.saslucknow.in/pushpanjali-integral-love-cutout.png",
  }],
  ["supramental-power", {
    name: "Power of the Supramental Consciousness",
    meaning: "Organising and active, irresistible in its influence.",
    botanical: "Hibiscus rosa-sinensis 'Rukmini' - deep gold, double",
    image: "https://www.saslucknow.in/pushpanjali-supramental-power.jpg",
    cutout: "https://www.saslucknow.in/pushpanjali-supramental-power-cutout.png",
  }],
]);

function json(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", ...extraHeaders });
  response.end(JSON.stringify(body));
}

function pushpanjaliCors(request) {
  const origin = String(request.headers.origin || "");
  if (!origin) return {};
  const allowed = origin === "https://www.saslucknow.in"
    || origin === "https://saslucknow.in"
    || origin === "https://aurobindo-mission-lucknow.xpresscure.chatgpt.site";
  return allowed ? {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  } : {};
}

async function approvedGalleryItems() {
  let names;
  try {
    names = await readdir(MANIFEST_DIR);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const documents = await Promise.all(names.filter(name => name.endsWith(".json")).map(async name => {
    try {
      return JSON.parse(await readFile(path.join(MANIFEST_DIR, name), "utf8"));
    } catch {
      return null;
    }
  }));
  return documents
    .filter(document => document?.status === "approved")
    .flatMap(document => (document.media || [])
      .filter(media => (media.storage === "local" && allowedTypes.has(media.mimeType)) || (media.storage === "youtube" && media.youtubeId))
      .map((media, index) => ({
        id: `${document.submissionId}-${index}`,
        submissionId: document.submissionId,
        title: cleanText(document.title, 160),
        eventDate: cleanText(document.eventDate, 20),
        category: cleanText(document.category, 80),
        description: cleanText(document.description, 2500),
        kind: media.kind,
        mimeType: media.mimeType,
        mediaUrl: media.storage === "local" ? `/api/gallery-media/${encodeURIComponent(document.submissionId)}/${encodeURIComponent(path.basename(media.key))}` : "",
        youtubeId: media.storage === "youtube" ? media.youtubeId : "",
        youtubeUrl: media.storage === "youtube" ? media.youtubeUrl : "",
        thumbnailUrl: media.storage === "youtube" ? media.thumbnailUrl : "",
      })))
    .sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate)));
}

async function savitriVideoItems() {
  let names;
  try {
    names = await readdir(SAVITRI_MANIFEST_DIR);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const documents = await Promise.all(names.filter(name => name.endsWith(".json")).map(async name => {
    try {
      return JSON.parse(await readFile(path.join(SAVITRI_MANIFEST_DIR, name), "utf8"));
    } catch {
      return null;
    }
  }));
  return documents
    .filter(document => document?.status === "approved" && document?.media?.storage === "youtube" && document.media.youtubeId)
    .map(document => ({
      id: document.submissionId,
      part: cleanText(document.part, 80),
      bookNo: cleanText(document.bookNo, 40),
      cantoNo: cleanText(document.cantoNo, 40),
      cantoName: cleanText(document.cantoName, 180),
      lineNos: cleanText(document.lineNos, 120),
      pageNo: cleanText(document.pageNo, 80),
      description: cleanText(document.description, 2500),
      mimeType: "text/html",
      mediaUrl: "",
      youtubeId: document.media.youtubeId,
      youtubeUrl: document.media.youtubeUrl,
      thumbnailUrl: document.media.thumbnailUrl,
      createdAt: document.createdAt,
    }))
    .sort((a, b) => String(a.bookNo).localeCompare(String(b.bookNo), undefined, { numeric: true })
      || String(a.cantoNo).localeCompare(String(b.cantoNo), undefined, { numeric: true })
      || String(a.lineNos).localeCompare(String(b.lineNos), undefined, { numeric: true }));
}

async function serveApprovedMedia(pathname, request, response) {
  const match = pathname.match(/^\/api\/gallery-media\/([0-9a-f-]{36})\/([^/]+)$/i);
  if (!match) return json(response, 404, { error: "Not found" });
  const submissionId = match[1];
  const requestedName = path.basename(decodeURIComponent(match[2]));
  try {
    const document = JSON.parse(await readFile(path.join(MANIFEST_DIR, `${submissionId}.json`), "utf8"));
    if (document.status !== "approved") return json(response, 404, { error: "Not found" });
    const media = (document.media || []).find(item => item.storage === "local" && path.basename(item.key) === requestedName && allowedTypes.has(item.mimeType));
    if (!media) return json(response, 404, { error: "Not found" });
    const root = path.resolve(UPLOAD_DIR);
    const filePath = path.resolve(UPLOAD_DIR, media.key);
    if (!filePath.startsWith(`${root}${path.sep}`)) return json(response, 404, { error: "Not found" });
    const details = await stat(filePath);
    const range = String(request.headers.range || "");
    const rangeMatch = range.match(/^bytes=(\d*)-(\d*)$/);
    let start = 0;
    let end = details.size - 1;
    let status = 200;
    if (rangeMatch) {
      start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
      end = rangeMatch[2] ? Math.min(Number(rangeMatch[2]), details.size - 1) : details.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= details.size) {
        response.writeHead(416, { "Content-Range": `bytes */${details.size}` });
        return response.end();
      }
      status = 206;
    }
    const headers = {
      "Content-Type": media.mimeType,
      "Content-Length": end - start + 1,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    if (status === 206) headers["Content-Range"] = `bytes ${start}-${end}/${details.size}`;
    response.writeHead(status, headers);
    createReadStream(filePath, { start, end }).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return json(response, 404, { error: "Not found" });
    throw error;
  }
}

async function serveSavitriVideoMedia(pathname, request, response) {
  const match = pathname.match(/^\/api\/savitri-video-media\/([0-9a-f-]{36})\/([^/]+)$/i);
  if (!match) return json(response, 404, { error: "Not found" });
  const submissionId = match[1];
  const requestedName = path.basename(decodeURIComponent(match[2]));
  try {
    const document = JSON.parse(await readFile(path.join(SAVITRI_MANIFEST_DIR, `${submissionId}.json`), "utf8"));
    const media = document?.media;
    if (document.status !== "approved" || media?.storage !== "local" || media.kind !== "video" || path.basename(media.key) !== requestedName) {
      return json(response, 404, { error: "Not found" });
    }
    const root = path.resolve(UPLOAD_DIR);
    const filePath = path.resolve(UPLOAD_DIR, media.key);
    if (!filePath.startsWith(`${root}${path.sep}`)) return json(response, 404, { error: "Not found" });
    const details = await stat(filePath);
    const range = String(request.headers.range || "");
    const rangeMatch = range.match(/^bytes=(\d*)-(\d*)$/);
    let start = 0;
    let end = details.size - 1;
    let status = 200;
    if (rangeMatch) {
      start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
      end = rangeMatch[2] ? Math.min(Number(rangeMatch[2]), details.size - 1) : details.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= details.size) {
        response.writeHead(416, { "Content-Range": `bytes */${details.size}` });
        return response.end();
      }
      status = 206;
    }
    const headers = {
      "Content-Type": media.mimeType,
      "Content-Length": end - start + 1,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    if (status === 206) headers["Content-Range"] = `bytes ${start}-${end}/${details.size}`;
    response.writeHead(status, headers);
    createReadStream(filePath, { start, end }).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return json(response, 404, { error: "Not found" });
    throw error;
  }
}

function cleanText(value, max = 1000) {
  return String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseYouTubeUrl(value) {
  const input = cleanText(value, 500);
  if (!input) return null;
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let videoId = "";
  if (hostname === "youtu.be") videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
  if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)) {
    if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v") || "";
    else {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0])) videoId = parts[1] || "";
    }
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return {
    storage: "youtube",
    kind: "video",
    mimeType: "text/html",
    youtubeId: videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

function safeFilename(name) {
  const extension = path.extname(name || "").toLowerCase().slice(0, 10);
  const base = path.basename(name || "media", extension).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "media";
  return `${base}${extension}`;
}

function clientAddress(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function isRateLimited(address) {
  const now = Date.now();
  const recent = (rateLimits.get(address) || []).filter(time => now - time < 60 * 60 * 1000);
  if (recent.length >= 5) return true;
  recent.push(now);
  rateLimits.set(address, recent);
  return false;
}

function isPushpanjaliRateLimited(address) {
  const now = Date.now();
  const recent = (pushpanjaliRateLimits.get(address) || []).filter(time => now - time < 60 * 60 * 1000);
  if (recent.length >= 8) return true;
  recent.push(now);
  pushpanjaliRateLimits.set(address, recent);
  return false;
}

function prunePendingPushpanjaliEmails(now = Date.now()) {
  for (const [token, pending] of pendingPushpanjaliEmails) {
    if (now - pending.createdAt > 15 * 60 * 1000) pendingPushpanjaliEmails.delete(token);
  }
}

function safeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;",
  })[character]);
}

async function readJsonBody(request, maxBytes = 12_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("Request too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { statusCode: 400 });
  }
}

async function readBinaryBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("Request too large"), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readPushpanjaliCounter() {
  try {
    const value = Number((await readFile(PUSHPANJALI_COUNTER_FILE, "utf8")).trim());
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("The Pushpanjali certificate counter is invalid.");
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }
}

function withPushpanjaliCounterLock(operation) {
  const pending = pushpanjaliCounterQueue.then(operation, operation);
  pushpanjaliCounterQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

async function savePushpanjaliOffering(document) {
  void document;
  return withPushpanjaliCounterLock(async () => {
    await mkdir(PUSHPANJALI_DIR, { recursive: true });
    const offeringNumber = (await readPushpanjaliCounter()) + 1;
    const temporaryFile = `${PUSHPANJALI_COUNTER_FILE}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, String(offeringNumber), { encoding: "utf8", flag: "wx" });
    await rename(temporaryFile, PUSHPANJALI_COUNTER_FILE);
    return {
      mongo: false,
      mongoQueued: false,
      offeringNumber,
      reference: `UC02-${String(offeringNumber).padStart(6, "0")}`,
    };
  });
}

async function countPushpanjaliOfferings() {
  return readPushpanjaliCounter();
}

async function emailPushpanjaliCertificate({ email, reference, certificateImage }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn(`Pushpanjali ${reference}: SMTP is not configured; certificate email was not sent.`);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  const escapedReference = safeHtml(reference);
  const emailText = `YOUR PUSHPA HAS BEEN OFFERED\n\nThank you for offering your Pushpanjali to Sri Aurobindo on his 154th Birthday. May this gesture of aspiration remain with you.\n\nRegards,\nSri Aurobindo Society, Lucknow.\nGomti Nagar Centre (UC-02)\nhttps://www.saslucknow.in/`;
  const emailHtml = `<!DOCTYPE html>
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta charSet="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f4efe4;font-family:Arial,sans-serif;color:#173846;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background:#f4efe4;">
          <tr><td align="center" style="padding:24px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:760px;border-collapse:collapse;background:#fffdf8;border:1px solid #ddc493;border-radius:12px;">
              <tr><td style="padding:28px 24px 16px;text-align:left;">
                <div style="font-size:19px;line-height:1.35;font-weight:800;letter-spacing:1.5px;color:#9a621b;">YOUR PUSHPA HAS BEEN OFFERED</div>
                <p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:#344d56;">Thank you for offering your Pushpanjali to Sri Aurobindo on his 154th Birthday. May this gesture of aspiration remain with you.</p>
                <p style="margin:18px 0 0;font-size:15px;line-height:1.6;color:#344d56;">Regards,<br><strong>Sri Aurobindo Society, Lucknow.</strong><br>Gomti Nagar Centre (UC-02)<br><a href="https://www.saslucknow.in/" style="color:#9a621b;">https://www.saslucknow.in/</a></p>
              </td></tr>
              <tr><td style="padding:8px 12px 20px;">
                <img src="cid:pushpanjali-certificate-${escapedReference}" alt="Pushpanjali e-Certificate ${escapedReference}" width="736" style="display:block;width:100%;max-width:736px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `SAS Lucknow <${process.env.SMTP_USER}>`,
    to: email,
    replyTo: process.env.EMAIL_REPLY_TO || "info.saslucknow@gmail.com",
    subject: `Your Pushpanjali Certificate | ${reference} | 15 August 2026`,
    text: emailText,
    html: emailHtml,
    attachments: [{
      filename: `SAS-Lucknow-Pushpanjali-${reference}.png`,
      content: certificateImage,
      contentType: "image/png",
      contentDisposition: "inline",
      cid: `pushpanjali-certificate-${reference}`,
    }],
  });
  return true;
}

async function handlePushpanjaliCertificateEmail(request, response, headers, requestUrl) {
  if (request.method === "OPTIONS") return json(response, 204, {}, headers);
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" }, headers);
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("image/png")) {
    return json(response, 400, { error: "Please submit the certificate image." }, headers);
  }
  const token = String(requestUrl.searchParams.get("token") || "");
  prunePendingPushpanjaliEmails();
  const pending = pendingPushpanjaliEmails.get(token);
  if (!pending) return json(response, 404, { error: "The email request has expired." }, headers);
  try {
    const certificateImage = await readBinaryBody(request, MAX_CERTIFICATE_BYTES);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (certificateImage.length < 1000 || !certificateImage.subarray(0, 8).equals(pngSignature)) {
      return json(response, 400, { error: "The certificate image is invalid." }, headers);
    }
    await emailPushpanjaliCertificate({ ...pending, certificateImage });
    pendingPushpanjaliEmails.delete(token);
    return json(response, 200, { ok: true, emailed: true }, headers);
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    console.error(`Pushpanjali ${pending.reference}: certificate email failed`, error instanceof Error ? error.message : error);
    return json(response, status, { error: status === 413 ? "The certificate image was too large." : "The certificate email could not be sent." }, headers);
  }
}

async function handlePushpanjali(request, response) {
  const headers = pushpanjaliCors(request);
  const requestUrl = new URL(request.url || "/", "http://localhost");
  if (requestUrl.pathname === "/api/pushpanjali-offerings/certificate-email") {
    return handlePushpanjaliCertificateEmail(request, response, headers, requestUrl);
  }
  if (request.method === "OPTIONS") return json(response, 204, {}, headers);
  if (request.method === "GET") {
    try {
      return json(response, 200, { ok: true, count: await countPushpanjaliOfferings() }, headers);
    } catch (error) {
      console.error("Pushpanjali count failed", error);
      return json(response, 500, { error: "The certificate count is temporarily unavailable." }, headers);
    }
  }
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" }, headers);
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return json(response, 400, { error: "Please submit the Pushpanjali form." }, headers);
  }
  const address = clientAddress(request);
  if (isPushpanjaliRateLimited(address)) return json(response, 429, { error: "Too many offerings from this connection. Please try again later." }, headers);

  try {
    const payload = await readJsonBody(request);
    if (payload.website) return json(response, 201, { ok: true, reference: "received", offeringNumber: 0, emailed: false }, headers);
    const name = cleanText(payload.name, 100);
    const email = String(payload.email || "").trim().toLowerCase().slice(0, 180);
    const flowerId = cleanText(payload.flowerId, 60);
    const flower = pushpanjaliFlowers.get(flowerId);
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !flower) {
      return json(response, 400, { error: "Please enter your name, a valid email address and select one flower." }, headers);
    }

    const offeringId = randomUUID();
    const document = {
      offeringId,
      participant: { name, email },
      flowerId,
      flower,
      ceremonyDate: "2026-08-15",
      submittedFrom: address,
      createdAt: new Date(),
    };
    const persistence = await savePushpanjaliOffering(document);
    const reference = persistence.reference;
    const emailQueued = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    const emailToken = emailQueued ? randomUUID() : "";
    if (emailQueued) {
      prunePendingPushpanjaliEmails();
      pendingPushpanjaliEmails.set(emailToken, { email, reference, createdAt: Date.now() });
    }
    return json(response, 201, {
      ok: true,
      reference,
      offeringNumber: persistence.offeringNumber,
      emailed: false,
      emailQueued,
      emailToken,
    }, headers);
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    console.error("Pushpanjali submission failed", error);
    return json(response, status, { error: status === 413 ? "The request was too large." : status === 400 ? "Please submit a valid Pushpanjali form." : "Your Pushpanjali could not be recorded. Please try again." }, headers);
  }
}

async function parseMultipart(request) {
  await mkdir(TEMP_DIR, { recursive: true });
  const fields = {};
  const files = [];
  const problems = [];
  const writes = [];
  const parser = Busboy({ headers: request.headers, limits: { files: MAX_FILES, fileSize: MAX_VIDEO_BYTES, fields: 20, fieldSize: 12_000 } });

  parser.on("field", (name, value) => { fields[name] = cleanText(value, name === "description" ? 2500 : 300); });
  parser.on("file", (field, stream, info) => {
    if (field === "media" && !info.filename) {
      stream.resume();
      return;
    }
    if (field !== "media" || !allowedTypes.has(info.mimeType)) {
      problems.push("Only JPG, PNG, WebP, MP4, WebM and MOV files are accepted.");
      stream.resume();
      return;
    }
    const tempPath = path.join(TEMP_DIR, `${randomUUID()}-${safeFilename(info.filename)}`);
    const record = { tempPath, originalName: safeFilename(info.filename), mimeType: info.mimeType, kind: allowedTypes.get(info.mimeType), size: 0, limited: false };
    stream.on("data", chunk => { record.size += chunk.length; });
    stream.on("limit", () => { record.limited = true; });
    files.push(record);
    writes.push(pipeline(stream, createWriteStream(tempPath, { flags: "wx" })));
  });
  parser.on("filesLimit", () => problems.push(`A maximum of ${MAX_FILES} files can be submitted at once.`));

  await new Promise((resolve, reject) => {
    parser.once("close", resolve);
    parser.once("error", reject);
    request.pipe(parser);
  });
  await Promise.all(writes);

  for (const file of files) {
    if (file.limited || file.size > MAX_VIDEO_BYTES || (file.kind === "image" && file.size > MAX_IMAGE_BYTES)) {
      problems.push(file.kind === "image" ? "Each photograph must be 12 MB or smaller." : "Each video must be 80 MB or smaller.");
    }
  }
  return { fields, files, problems };
}

async function storeFiles(submissionId, files, publicationStatus, collectionPrefix = "gallery-submissions") {
  const now = new Date();
  const prefix = `${collectionPrefix}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${submissionId}`;
  if (process.env.STORAGE_PROVIDER === "s3" && process.env.S3_BUCKET) {
    const client = new S3Client({ region: process.env.S3_REGION || "ap-south-1" });
    const stored = [];
    for (const file of files) {
      const key = `${prefix}/${randomUUID()}-${file.originalName}`;
      await new Upload({ client, params: { Bucket: process.env.S3_BUCKET, Key: key, Body: createReadStream(file.tempPath), ContentType: file.mimeType, Metadata: { submission: submissionId, moderation: publicationStatus } } }).done();
      await rm(file.tempPath, { force: true });
      stored.push({ storage: "s3", key, name: file.originalName, mimeType: file.mimeType, kind: file.kind, size: file.size });
    }
    return stored;
  }

  const destination = path.join(UPLOAD_DIR, prefix);
  await mkdir(destination, { recursive: true });
  const stored = [];
  for (const file of files) {
    const name = `${randomUUID()}-${file.originalName}`;
    await rename(file.tempPath, path.join(destination, name));
    stored.push({ storage: "local", key: `${prefix}/${name}`, name: file.originalName, mimeType: file.mimeType, kind: file.kind, size: file.size });
  }
  return stored;
}

async function saveMetadata(document) {
  await mkdir(MANIFEST_DIR, { recursive: true });
  await writeFile(path.join(MANIFEST_DIR, `${document.submissionId}.json`), JSON.stringify(document, null, 2), { flag: "wx" });
  if (!process.env.MONGODB_URI) return { mongo: false };
  try {
    mongoClientPromise ||= new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
    const client = await mongoClientPromise;
    await client.db(process.env.MONGODB_DB || "saslucknow").collection("gallerySubmissions").insertOne(document);
    return { mongo: true };
  } catch (error) {
    console.error("MongoDB metadata save failed; local manifest retained", error instanceof Error ? error.message : error);
    mongoClientPromise = undefined;
    return { mongo: false };
  }
}

async function saveSavitriMetadata(document) {
  await mkdir(SAVITRI_MANIFEST_DIR, { recursive: true });
  await writeFile(path.join(SAVITRI_MANIFEST_DIR, `${document.submissionId}.json`), JSON.stringify(document, null, 2), { flag: "wx" });
  if (!process.env.MONGODB_URI) return { mongo: false };
  try {
    mongoClientPromise ||= new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
    const client = await mongoClientPromise;
    await client.db(process.env.MONGODB_DB || "saslucknow").collection("savitriVideos").insertOne(document);
    return { mongo: true };
  } catch (error) {
    console.error("MongoDB Savitri video metadata save failed; local manifest retained", error instanceof Error ? error.message : error);
    mongoClientPromise = undefined;
    return { mongo: false };
  }
}

async function removeTemporaryFiles(files = []) {
  await Promise.all(files.map(file => rm(file.tempPath, { force: true }).catch(() => {})));
}

async function handleSavitriVideoSubmission(request, response) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) {
    return json(response, 400, { error: "Please submit the Savitri video form." });
  }
  const length = Number(request.headers["content-length"] || 0);
  if (length > MAX_REQUEST_BYTES) return json(response, 413, { error: "The complete upload must be 130 MB or smaller." });
  const address = clientAddress(request);
  if (isRateLimited(address)) return json(response, 429, { error: "Too many submissions. Please try again later." });

  let parsed;
  try {
    parsed = await parseMultipart(request);
    const { fields, files, problems } = parsed;
    if (fields.website) {
      await removeTemporaryFiles(files);
      return json(response, 201, { ok: true, reference: "received", status: "approved" });
    }
    if (!fields.part || !fields.bookNo || !fields.cantoNo || !fields.cantoName || !fields.lineNos || !fields.pageNo || !fields.description) {
      problems.push("Please complete every Savitri reference and description field.");
    }
    const media = parseYouTubeUrl(fields.youtubeUrl);
    if (!media) problems.push("Please enter a valid public YouTube video link.");
    if (files.length) problems.push("Video files are no longer uploaded here. Please use a YouTube link.");
    if (problems.length) {
      await removeTemporaryFiles(files);
      return json(response, 400, { error: [...new Set(problems)].join(" ") });
    }

    const submissionId = randomUUID();
    const document = {
      submissionId,
      status: "approved",
      part: cleanText(fields.part, 80),
      bookNo: cleanText(fields.bookNo, 40),
      cantoNo: cleanText(fields.cantoNo, 40),
      cantoName: cleanText(fields.cantoName, 180),
      lineNos: cleanText(fields.lineNos, 120),
      pageNo: cleanText(fields.pageNo, 80),
      description: cleanText(fields.description, 2500),
      media,
      submittedFrom: address,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const persistence = await saveSavitriMetadata(document);
    return json(response, 201, { ok: true, reference: submissionId.slice(0, 8).toUpperCase(), status: "approved", metadataStoredInMongo: persistence.mongo });
  } catch (error) {
    await removeTemporaryFiles(parsed?.files);
    console.error("Savitri video submission failed", error);
    return json(response, 500, { error: "The Savitri video could not be saved. Please try again." });
  }
}

export async function handleSubmission(request, response) {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  if (request.method === "GET" && pathname === "/health") return json(response, 200, { ok: true });
  if (pathname === "/api/pushpanjali-offerings" || pathname === "/api/pushpanjali-offerings/certificate-email") return handlePushpanjali(request, response);
  if (request.method === "GET" && pathname === "/api/savitri-videos") return json(response, 200, { items: await savitriVideoItems() });
  if (request.method === "GET" && pathname.startsWith("/api/savitri-video-media/")) return serveSavitriVideoMedia(pathname, request, response);
  if (request.method === "POST" && pathname === "/api/savitri-video-submissions") return handleSavitriVideoSubmission(request, response);
  if (request.method === "GET" && pathname === "/api/gallery-items") return json(response, 200, { items: await approvedGalleryItems() });
  if (request.method === "GET" && pathname.startsWith("/api/gallery-media/")) return serveApprovedMedia(pathname, request, response);
  if (request.method !== "POST" || pathname !== "/api/gallery-submissions") return json(response, 404, { error: "Not found" });
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) {
    return json(response, 400, { error: "Please submit the event form with photographs or a YouTube link." });
  }
  const length = Number(request.headers["content-length"] || 0);
  if (length > MAX_REQUEST_BYTES) return json(response, 413, { error: "The complete upload must be 130 MB or smaller." });
  const address = clientAddress(request);
  if (isRateLimited(address)) return json(response, 429, { error: "Too many submissions. Please try again later." });

  let parsed;
  try {
    parsed = await parseMultipart(request);
    const { fields, files, problems } = parsed;
    if (fields.website) {
      await removeTemporaryFiles(files);
      return json(response, 201, { ok: true, reference: "received" });
    }
    if (!fields.title || !fields.date || !fields.category || !fields.description || fields.permission !== "yes") problems.push("Please complete all required event details and confirm permission to publish.");
    const youtubeMedia = fields.youtubeUrl ? parseYouTubeUrl(fields.youtubeUrl) : null;
    if (fields.youtubeUrl && !youtubeMedia) problems.push("Please enter a valid public YouTube video link.");
    if (files.some(file => file.kind === "video")) problems.push("Video files are no longer uploaded here. Add the YouTube link instead.");
    if (!files.length && !youtubeMedia) problems.push("Please select at least one photograph or add a YouTube video link.");
    if (problems.length) {
      await removeTemporaryFiles(files);
      return json(response, 400, { error: [...new Set(problems)].join(" ") });
    }

    const submissionId = randomUUID();
    const publicationStatus = youtubeMedia ? "approved" : "pending";
    const imageFiles = files.filter(file => file.kind === "image");
    const media = imageFiles.length ? await storeFiles(submissionId, imageFiles, publicationStatus) : [];
    if (youtubeMedia) media.push(youtubeMedia);
    const document = {
      submissionId,
      status: publicationStatus,
      title: cleanText(fields.title, 160),
      eventDate: cleanText(fields.date, 20),
      category: cleanText(fields.category, 80),
      description: cleanText(fields.description, 2500),
      contributor: { name: cleanText(fields.name, 120), email: cleanText(fields.email, 180) },
      permissionConfirmed: true,
      media,
      submittedFrom: address,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const persistence = await saveMetadata(document);
    return json(response, 201, { ok: true, reference: submissionId.slice(0, 8).toUpperCase(), status: publicationStatus, metadataStoredInMongo: persistence.mongo });
  } catch (error) {
    await removeTemporaryFiles(parsed?.files);
    console.error("Gallery submission failed", error);
    return json(response, 500, { error: "The upload could not be saved. Please try again." });
  }
}

export function createGalleryServer() {
  return http.createServer((request, response) => {
    void handleSubmission(request, response).catch(error => {
      console.error("Gallery service request failed", error);
      if (!response.headersSent) json(response, 500, { error: "The gallery is temporarily unavailable." });
      else response.destroy();
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  createGalleryServer().listen(PORT, "127.0.0.1", () => console.log(`Gallery submission service listening on 127.0.0.1:${PORT}`));
}




