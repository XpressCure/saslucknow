import { MongoClient } from "mongodb";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const loginEmail = String(process.argv[2] || "").trim().toLowerCase();
const existingReference = String(process.argv[3] || "").trim();
if (!loginEmail || !loginEmail.includes("@")) {
  console.error("Usage: node scripts/promote-master-administrator.mjs administrator@example.com [existing-email-or-member-id]");
  process.exit(2);
}
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");

const databaseName = process.env.SAS_DATABASE_NAME || "sas_lucknow";
const organisationKey = process.env.SAS_ORGANISATION_KEY || "sas-lucknow";
const permissions = [
  "members.review",
  "members.manage",
  "sangha.moderate",
  "sankalps.manage",
  "contributions.view",
  "reports.view",
];

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(databaseName);
  const member = await db.collection("members").findOne({
    organisationKey,
    $or: [
      { email: loginEmail },
      { administratorLoginAliases: loginEmail },
      ...(existingReference.includes("@") ? [{ email: existingReference.toLowerCase() }] : []),
      ...(existingReference ? [{ memberNumber: existingReference.toUpperCase() }] : []),
    ],
  });
  if (!member) throw new Error("No existing member account was found for the supplied administrator identity.");
  if (!member.passwordCredential) throw new Error("The member account does not have an active password credential.");

  const now = new Date();
  await db.collection("members").updateOne({ _id: member._id, organisationKey }, {
    $set: {
      role: "super_administrator",
      permissions,
      membershipStatus: "enabled",
      administratorPromotedAt: member.administratorPromotedAt || now,
      administratorNotificationsReadAt: member.administratorNotificationsReadAt || now,
      updatedAt: now,
    },
    $addToSet: { administratorLoginAliases: loginEmail },
    $unset: { membershipDisabledAt: "", membershipDisabledByMemberId: "" },
  });
  await db.collection("auditLogs").insertOne({
    organisationKey,
    actorType: "system",
    actorMemberId: member._id,
    actorName: member.fullName || loginEmail,
    action: "administrator.master_promoted",
    entityType: "member",
    entityId: String(member._id),
    details: { loginEmail, memberNumber: member.memberNumber || "", permissions },
    createdAt: now,
  });
  console.log(`Master administrator enabled for ${loginEmail}. Existing password credential was preserved.`);
} finally {
  await client.close();
}
