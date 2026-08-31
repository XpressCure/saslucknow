import { MongoClient } from "mongodb";

try { process.loadEnvFile(".env.local"); } catch (error) { if (error?.code !== "ENOENT") throw error; }

const databaseName = process.env.SAS_DATABASE_NAME || "sas_lucknow";
const organisationKey = process.env.SAS_ORGANISATION_KEY || "sas-lucknow";
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
try {
  const db = client.db(databaseName);
  const members = await db.collection("members").find({ organisationKey, status: "active" }).sort({ createdAt: 1, _id: 1 }).toArray();
  let sequence = 0;
  let assigned = 0;
  for (const member of members) {
    const year = new Date(member.joinedAt || member.createdAt || Date.now()).getUTCFullYear() || 2026;
    sequence += 3;
    if (member.memberNumber) continue;
    const memberNumber = `UC02-${year}-${String(sequence).padStart(6, "0")}`;
    await db.collection("members").updateOne({ _id: member._id, memberNumber: { $exists: false } }, { $set: { memberNumber, updatedAt: new Date() } });
    assigned += 1;
  }
  await db.collection("members").createIndex({ organisationKey: 1, memberNumber: 1 }, { unique: true, sparse: true, name: "member_number_unique" });
  await db.collection("counters").updateOne(
    { _id: `${organisationKey}:member-number:2026` },
    { $max: { value: Math.max(0, sequence) }, $set: { organisationKey, kind: "member-number", year: 2026, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  console.log(JSON.stringify({ activeMembers: members.length, assigned, nextMemberNumber: `UC02-2026-${String(sequence + 3).padStart(6, "0")}` }));
} finally {
  await client.close();
}
