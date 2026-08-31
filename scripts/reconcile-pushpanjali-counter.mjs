import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const uri = String(process.env.MONGODB_URI || "").trim();
if (!uri) throw new Error("MONGODB_URI is required");

const databaseName = String(process.env.SAS_DATABASE_NAME || "sas_lucknow").trim();
const organisationKey = String(process.env.SAS_ORGANISATION_KEY || "sas-lucknow").trim();
const directory = process.env.PUSHPANJALI_DIR || path.resolve("work/pushpanjali-offerings");
const counterFile = path.join(directory, ".certificate-counter");
const apply = process.argv.includes("--apply");

await mkdir(directory, { recursive: true });
let fileCount = 0;
try {
  fileCount = Number((await readFile(counterFile, "utf8")).trim());
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
if (!Number.isSafeInteger(fileCount) || fileCount < 0) throw new Error("The certificate counter file is invalid");

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
try {
  const latest = await client.db(databaseName).collection("pushpanjaliCertificates")
    .find({ organisationKey, offeringNumber: { $type: "number", $gt: 0 } })
    .sort({ offeringNumber: -1 })
    .limit(1)
    .next();
  const databaseCount = Number(latest?.offeringNumber || 0);
  if (!Number.isSafeInteger(databaseCount) || databaseCount < 0) throw new Error("The database certificate counter is invalid");

  if (apply && fileCount !== databaseCount) {
    const temporaryFile = `${counterFile}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporaryFile, String(databaseCount), { encoding: "utf8", flag: "wx" });
    await rename(temporaryFile, counterFile);
  }
  console.log(JSON.stringify({ fileCount, databaseCount, applied: apply && fileCount !== databaseCount }));
} finally {
  await client.close();
}
