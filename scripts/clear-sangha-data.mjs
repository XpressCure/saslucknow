import { rm } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { MongoClient } from "mongodb";

const confirmed = process.argv.includes("--confirm-delete-sangha");
const databaseName = process.env.SAS_DATABASE_NAME || "sas_lucknow";
const organisationKey = process.env.SAS_ORGANISATION_KEY || "sas-lucknow";
const storageRoot = process.env.SAS_DOCUMENT_STORAGE_DIR || "/var/lib/saslucknow-participation/documents";
const localMediaRoot = path.resolve(storageRoot, "sangha-media");
const region = process.env.SAS_SANGHA_S3_REGION || process.env.S3_REGION || "ap-south-1";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8_000 });
await client.connect();

try {
  const db = client.db(databaseName);
  const filter = { organisationKey };
  const collections = ["sanghaPosts", "sanghaPollVotes", "sanghaResonances", "sanghaSaves", "sanghaComments"];
  const posts = await db.collection("sanghaPosts").find(filter, { projection: { media: 1 } }).toArray();
  const counts = Object.fromEntries(await Promise.all(collections.map(async name => [name, await db.collection(name).countDocuments(filter)])));
  const s3ByBucket = new Map();
  const localPaths = [];

  for (const post of posts) {
    const media = post.media;
    if (!media?.key) continue;
    if (media.storage === "s3") {
      const bucket = String(media.bucket || process.env.SAS_SANGHA_S3_BUCKET || process.env.S3_BUCKET || "xpresscure");
      const keys = s3ByBucket.get(bucket) || [];
      keys.push(String(media.key));
      s3ByBucket.set(bucket, keys);
    } else if (media.storage === "local") {
      const candidate = path.resolve(localMediaRoot, String(media.key));
      if (!candidate.startsWith(`${localMediaRoot}${path.sep}`)) throw new Error(`Unsafe Sangha media path: ${candidate}`);
      localPaths.push(candidate);
    }
  }

  const auditCount = await db.collection("auditLogs").countDocuments({ organisationKey, $or: [{ action: /^sangha\./ }, { targetType: "sanghaPost" }] });
  const preview = {
    mode: confirmed ? "delete" : "dry-run",
    databaseName,
    organisationKey,
    counts,
    auditLogs: auditCount,
    s3Objects: [...s3ByBucket.values()].reduce((sum, keys) => sum + keys.length, 0),
    localFiles: localPaths.length,
  };
  console.log(JSON.stringify(preview));

  if (!confirmed) process.exitCode = 2;
  else {
    const s3 = new S3Client({ region });
    for (const [bucket, keys] of s3ByBucket) {
      for (let index = 0; index < keys.length; index += 1_000) {
        await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.slice(index, index + 1_000).map(Key => ({ Key })), Quiet: true } }));
      }
    }
    for (const filePath of localPaths) await rm(filePath, { force: true });

    const deleted = {};
    for (const name of collections) deleted[name] = (await db.collection(name).deleteMany(filter)).deletedCount;
    deleted.auditLogs = (await db.collection("auditLogs").deleteMany({ organisationKey, $or: [{ action: /^sangha\./ }, { targetType: "sanghaPost" }] })).deletedCount;

    const remaining = Object.fromEntries(await Promise.all(collections.map(async name => [name, await db.collection(name).countDocuments(filter)])));
    console.log(JSON.stringify({ deleted, remaining }));
    if (Object.values(remaining).some(Number)) throw new Error("Sangha cleanup verification failed: records remain.");
  }
} finally {
  await client.close();
}
