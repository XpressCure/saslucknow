import { MongoClient } from "mongodb";

try { process.loadEnvFile(".env.local"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const needle = String(process.argv[2] || "").trim();
if (needle.length < 3) throw new Error("Enter at least three characters to locate a member account.");
const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(process.env.SAS_DATABASE_NAME || "sas_lucknow");
  const rows = await db.collection("members").find({
    organisationKey: process.env.SAS_ORGANISATION_KEY || "sas-lucknow",
    $or: [{ email: { $regex: escaped, $options: "i" } }, { fullName: { $regex: escaped, $options: "i" } }],
  }).project({ fullName: 1, email: 1, memberNumber: 1, role: 1, passwordCredential: 1 }).limit(20).toArray();
  console.log(JSON.stringify(rows.map(item => ({ fullName: item.fullName, email: item.email, memberNumber: item.memberNumber, role: item.role, passwordReady: Boolean(item.passwordCredential) })), null, 2));
} finally { await client.close(); }
