import http from "node:http";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import Busboy from "busboy";
import { MongoClient } from "mongodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const PORT = Number(process.env.PORT || 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("work/gallery-submissions");
const TEMP_DIR = path.join(UPLOAD_DIR, ".tmp");
const MANIFEST_DIR = path.join(UPLOAD_DIR, "manifests");
const MAX_REQUEST_BYTES = 130 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 8;
const allowedTypes = new Map([
  ["image/jpeg", "image"], ["image/png", "image"], ["image/webp", "image"],
  ["video/mp4", "video"], ["video/webm", "video"], ["video/quicktime", "video"],
]);
const rateLimits = new Map();
let mongoClientPromise;

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
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

async function storeFiles(submissionId, files) {
  const now = new Date();
  const prefix = `gallery-submissions/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${submissionId}`;
  if (process.env.STORAGE_PROVIDER === "s3" && process.env.S3_BUCKET) {
    const client = new S3Client({ region: process.env.S3_REGION || "ap-south-1" });
    const stored = [];
    for (const file of files) {
      const key = `${prefix}/${randomUUID()}-${file.originalName}`;
      await new Upload({ client, params: { Bucket: process.env.S3_BUCKET, Key: key, Body: createReadStream(file.tempPath), ContentType: file.mimeType, Metadata: { submission: submissionId, moderation: "pending" } } }).done();
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
  if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
  if (request.method !== "POST" || request.url !== "/api/gallery-submissions") return json(response, 404, { error: "Not found" });
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
    const media = await storeFiles(submissionId, files);
    const document = {
      submissionId,
      status: "pending",
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
    return json(response, 201, { ok: true, reference: submissionId.slice(0, 8).toUpperCase(), status: "pending", metadataStoredInMongo: persistence.mongo });
  } catch (error) {
    await removeTemporaryFiles(parsed?.files);
    console.error("Gallery submission failed", error);
    return json(response, 500, { error: "The upload could not be saved. Please try again." });
  }
}

export function createGalleryServer() {
  return http.createServer((request, response) => { void handleSubmission(request, response); });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  createGalleryServer().listen(PORT, "127.0.0.1", () => console.log(`Gallery submission service listening on 127.0.0.1:${PORT}`));
}
