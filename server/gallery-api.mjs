import http from "node:http";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import Busboy from "busboy";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const PORT = Number(process.env.PORT || 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("work/gallery-submissions");
const TEMP_DIR = path.join(UPLOAD_DIR, ".tmp");
const MANIFEST_DIR = path.join(UPLOAD_DIR, "manifests");
const PUSHPANJALI_DIR = process.env.PUSHPANJALI_DIR || path.resolve("work/pushpanjali-offerings");
const PUSHPANJALI_COUNTER_FILE = path.join(PUSHPANJALI_DIR, ".certificate-counter");
const PUSHPANJALI_COUNTER_LOCK = path.join(PUSHPANJALI_DIR, ".certificate-counter.lock");
const MAX_REQUEST_BYTES = 130 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 8;
const allowedTypes = new Map([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["video/webm", "video"], ["video/quicktime", "video"],
]);
const rateLimits = new Map();
const pushpanjaliRateLimits = new Map();
let mongoClientPromise;

const pushpanjaliFlowers = new Map([
  ["divine-love", {
    name: "Divine Love",
    meaning: "A flower that is said to blossom even in the desert.",
    botanical: "Punica granatum · orange-red, double",
    image: "https://www.saslucknow.in/pushpanjali-divine-love.jpg",
    cutout: "https://www.saslucknow.in/pushpanjali-divine-love-cutout.png",
  }],
  ["integral-love", {
    name: "Integral Love for the Divine",
    meaning: "Pure, complete, irrevocable, a love that gives itself for ever.",
    botanical: "Rosa · white",
    image: "https://www.saslucknow.in/pushpanjali-integral-love.jpg",
    cutout: "https://www.saslucknow.in/pushpanjali-integral-love-cutout.png",
  }],
  ["supramental-power", {
    name: "Power of the Supramental Consciousness",
    meaning: "Organising and active, irresistible in its influence.",
    botanical: "Hibiscus rosa-sinensis ‘Rukmini’ · deep gold, double",
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
      .filter(media => media.storage === "local" && allowedTypes.has(media.mimeType))
      .map((media, index) => ({
        id: `${document.submissionId}-${index}`,
        submissionId: document.submissionId,
        title: cleanText(document.title, 160),
        eventDate: cleanText(document.eventDate, 20),
        category: cleanText(document.category, 80),
        description: cleanText(document.description, 2500),
        kind: media.kind,
        mimeType: media.mimeType,
        mediaUrl: `/api/gallery-media/${encodeURIComponent(document.submissionId)}/${encodeURIComponent(path.basename(media.key))}`,
      })))
    .sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate)));
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

function cleanText(value, max = 1000) {
  return String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
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

async function currentPushpanjaliCount() {
  let storedCounter = 0;
  let fileCount = 0;
  try {
    storedCounter = Number.parseInt(await readFile(PUSHPANJALI_COUNTER_FILE, "utf8"), 10) || 0;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    const files = await readdir(PUSHPANJALI_DIR);
    fileCount = files.filter(name => name.endsWith(".json")).length;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return Math.max(storedCounter, fileCount);
}

async function saveLocalPushpanjaliOffering(document) {
  await mkdir(PUSHPANJALI_DIR, { recursive: true });
  let lockHandle;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      lockHandle = await open(PUSHPANJALI_COUNTER_LOCK, "wx");
      break;
    } catch (error) {
      if (error?.code !== "EEXIST" || attempt === 119) throw error;
      if (attempt > 40) {
        try {
          const details = await stat(PUSHPANJALI_COUNTER_LOCK);
          if (Date.now() - details.mtimeMs > 30_000) await unlink(PUSHPANJALI_COUNTER_LOCK);
        } catch (cleanupError) {
          if (cleanupError?.code !== "ENOENT") throw cleanupError;
        }
      }
      await delay(25);
    }
  }
  if (!lockHandle) throw new Error("Certificate counter lock could not be acquired");
  try {
    const offeringNumber = (await currentPushpanjaliCount()) + 1;
    const certificateNumber = `UC02-${String(offeringNumber).padStart(6, "0")}`;
    const storedDocument = { ...document, reference: certificateNumber, certificateNumber, offeringNumber };
    await writeFile(path.join(PUSHPANJALI_DIR, `${document.offeringId}.json`), JSON.stringify(storedDocument, null, 2), { flag: "wx" });
    await writeFile(PUSHPANJALI_COUNTER_FILE, String(offeringNumber), "utf8");
    return { storedDocument, offeringNumber, reference: certificateNumber };
  } finally {
    await lockHandle.close().catch(() => {});
    await unlink(PUSHPANJALI_COUNTER_LOCK).catch(() => {});
  }
}

async function savePushpanjaliOffering(document) {
  const local = await saveLocalPushpanjaliOffering(document);
  if (!process.env.MONGODB_URI) {
    return { mongo: false, offeringNumber: local.offeringNumber, reference: local.reference };
  }
  try {
    mongoClientPromise ||= new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).connect();
    const client = await mongoClientPromise;
    const database = client.db(process.env.MONGODB_DB || "saslucknow");
    await database.collection("pushpanjaliOfferings").insertOne(local.storedDocument);
    return { mongo: true, offeringNumber: local.offeringNumber, reference: local.reference };
  } catch (error) {
    console.error("Pushpanjali MongoDB save failed; local record retained", error instanceof Error ? error.message : error);
    mongoClientPromise = undefined;
    return { mongo: false, offeringNumber: local.offeringNumber, reference: local.reference };
  }
}

async function countPushpanjaliOfferings() {
  try {
    return await currentPushpanjaliCount();
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }
}

async function emailPushpanjaliCertificate({ name, email, flower, reference }) {
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
  const escapedName = safeHtml(name);
  const escapedFlower = safeHtml(flower.name);
  const escapedMeaning = safeHtml(flower.meaning);
  const escapedReference = safeHtml(reference);
  const certificateHtml = `
    <div style="margin:0;padding:28px;background:#efe6d5;font-family:Arial,sans-serif;color:#173846">
      <div style="max-width:900px;margin:auto;border:2px solid #c58b27;background:#fffdf8 url('https://www.saslucknow.in/pushpanjali-certificate-ornamental-bg.png') center/100% 100% no-repeat;padding:52px 58px">
        <table role="presentation" width="100%" style="border-collapse:collapse"><tr>
          <td width="90"><img src="https://www.saslucknow.in/society-logo.jpg" alt="Sri Aurobindo Society" width="82" style="display:block;width:82px;height:auto"></td>
          <td style="text-align:center"><div style="font-size:16px;font-weight:700;letter-spacing:2px">SRI AUROBINDO SOCIETY · LUCKNOW</div><div style="margin-top:6px;color:#9b6428;font-size:12px;letter-spacing:1.5px">GOMTI NAGAR CENTRE (UC-02)</div></td>
          <td width="90">&nbsp;</td>
        </tr></table>
        <table role="presentation" width="100%" style="margin-top:28px;border-collapse:collapse"><tr>
          <td width="34%" valign="top" style="padding-right:28px">
            <img src="https://www.saslucknow.in/pushpanjali-sri-aurobindo.jpg" alt="Sri Aurobindo" style="display:block;width:100%;max-width:280px;height:420px;object-fit:cover;border:2px solid #c49345;border-radius:12px">
          </td>
          <td valign="top">
            <h1 style="margin:0 0 26px;padding-bottom:10px;border-bottom:1px solid #c89c56;text-align:center;font:700 42px Georgia,serif;color:#173846">Certificate of Pushpanjali</h1>
            <p style="margin:0;text-align:center;color:#59686c;font-size:17px">This certifies that</p>
            <h2 style="display:block;margin:10px 0 18px;padding-bottom:7px;border-bottom:1px solid #9b6428;text-align:center;font:italic 38px Georgia,serif;color:#a66a16">${escapedName}</h2>
            <p style="margin:0 0 24px;text-align:center;color:#455b63;font:19px/1.55 Georgia,serif">has lovingly offered Pushpanjali to Sri Aurobindo<br><strong style="white-space:nowrap;color:#9b6428">on his 154th Birthday</strong></p>
            <table role="presentation" width="100%" style="border-collapse:collapse"><tr>
              <td valign="middle" style="padding-right:18px;text-align:left">
                <div style="color:#9b6428;font:26px Georgia,serif">${escapedFlower}</div>
                <div style="margin-top:9px;color:#78643f;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Spiritual significance given by the Mother</div>
                <div style="margin-top:7px;color:#526269;font:italic 18px/1.5 Georgia,serif">“${escapedMeaning}”</div>
              </td>
              <td width="145" valign="middle"><img src="${flower.cutout}" alt="${escapedFlower}" width="145" height="145" style="display:block;object-fit:contain"></td>
            </tr></table>
          </td>
        </tr></table>
        <div style="margin-top:25px;padding-top:18px;border-top:1px solid #d5b879;text-align:center;font-weight:700;letter-spacing:1.2px">15 AUGUST 2026&nbsp;&nbsp;|&nbsp;&nbsp;DARSHAN DIVAS</div>
        <div style="margin-top:10px;text-align:center;color:#8a6b3d;font-size:13px">CERTIFICATE NUMBER: <strong>${escapedReference}</strong></div>
      </div>
      <p style="max-width:900px;margin:18px auto 0;text-align:center;font-size:13px;color:#58666b">Your virtual Pushpanjali has been recorded by SAS Lucknow. <a href="https://www.facebook.com/saslucknow" style="color:#8e5c22">Follow SAS Lucknow on Facebook</a>.</p>
    </div>`;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || `SAS Lucknow <${process.env.SMTP_USER}>`,
    to: email,
    replyTo: process.env.EMAIL_REPLY_TO || "info.saslucknow@gmail.com",
    subject: `Your Pushpanjali Certificate ${reference} · 15 August 2026`,
    text: `Dear ${name},\n\nThis certifies that you have lovingly offered Pushpanjali to Sri Aurobindo on his 154th Birthday.\n\nSelected pushpa: ${flower.name}\n“${flower.meaning}” — Spiritual significance given by the Mother\n\n15 August 2026 | Darshan Divas\nCertificate Number: ${reference}\n\nFollow SAS Lucknow: https://www.facebook.com/saslucknow`,
    html: certificateHtml,
  });
  return true;
}

async function handlePushpanjali(request, response) {
  const headers = pushpanjaliCors(request);
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
    if (payload.website) return json(response, 201, { ok: true, reference: "received", offeringNumber: 1, emailed: false }, headers);
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
    let emailed = false;
    try {
      emailed = await emailPushpanjaliCertificate({ name, email, flower, reference });
    } catch (error) {
      console.error(`Pushpanjali ${reference}: certificate email failed`, error instanceof Error ? error.message : error);
    }
    return json(response, 201, {
      ok: true,
      reference,
      offeringNumber: persistence.offeringNumber,
      emailed,
      metadataStoredInMongo: persistence.mongo,
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
  if (!files.length) problems.push("Please select at least one photograph or video.");
  return { fields, files, problems };
}

async function storeFiles(submissionId, files, publicationStatus) {
  const now = new Date();
  const prefix = `gallery-submissions/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${submissionId}`;
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

async function removeTemporaryFiles(files = []) {
  await Promise.all(files.map(file => rm(file.tempPath, { force: true }).catch(() => {})));
}

export async function handleSubmission(request, response) {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  if (request.method === "GET" && pathname === "/health") return json(response, 200, { ok: true });
  if (pathname === "/api/pushpanjali-offerings") return handlePushpanjali(request, response);
  if (request.method === "GET" && pathname === "/api/gallery-items") return json(response, 200, { items: await approvedGalleryItems() });
  if (request.method === "GET" && pathname.startsWith("/api/gallery-media/")) return serveApprovedMedia(pathname, request, response);
  if (request.method !== "POST" || pathname !== "/api/gallery-submissions") return json(response, 404, { error: "Not found" });
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("multipart/form-data")) {
    return json(response, 400, { error: "Please submit the event form with photographs or videos." });
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
    if (problems.length) {
      await removeTemporaryFiles(files);
      return json(response, 400, { error: [...new Set(problems)].join(" ") });
    }

    const submissionId = randomUUID();
    const publicationStatus = files.some(file => file.kind === "video") ? "approved" : "pending";
    const media = await storeFiles(submissionId, files, publicationStatus);
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
