import { MongoClient } from "mongodb";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required.");
  process.exit(1);
}

const databaseName = process.env.SAS_DATABASE_NAME || "sas_lucknow";
const organisationKey = process.env.SAS_ORGANISATION_KEY || "sas-lucknow";
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const db = client.db(databaseName);
  const now = new Date();

  await Promise.all([
    db.collection("organisations").createIndex({ key: 1 }, { unique: true }),
    db.collection("members").createIndex({ organisationKey: 1, mobile: 1 }, { unique: true, sparse: true }),
    db.collection("members").createIndex({ organisationKey: 1, email: 1 }, { unique: true, sparse: true }),
    db.collection("memberApplications").createIndex({ organisationKey: 1, mobile: 1, status: 1 }),
    db.collection("memberApplications").createIndex({ organisationKey: 1, email: 1, status: 1 }, { sparse: true }),
    db.collection("sankalps").createIndex({ organisationKey: 1, slug: 1 }, { unique: true }),
    db.collection("koshAccounts").createIndex({ organisationKey: 1, key: 1 }, { unique: true }),
    db.collection("contributions").createIndex({ provider: 1, providerPaymentId: 1 }, { unique: true, sparse: true }),
    db.collection("contributions").createIndex({ organisationKey: 1, status: 1, createdAt: -1 }),
    db.collection("paymentWebhookEvents").createIndex({ provider: 1, eventId: 1 }, { unique: true }),
    db.collection("auditLogs").createIndex({ organisationKey: 1, createdAt: -1 }),
    db.collection("adminSessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("adminSessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("adminSessions").createIndex({ organisationKey: 1, memberId: 1, revokedAt: 1 }),
    db.collection("memberSessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("memberSessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("memberSessions").createIndex({ organisationKey: 1, memberId: 1, revokedAt: 1 }),
    db.collection("paymentOrders").createIndex({ provider: 1, providerOrderId: 1 }, { unique: true }),
    db.collection("paymentOrders").createIndex({ organisationKey: 1, memberId: 1, createdAt: -1 }),
    db.collection("sankalpDonors").createIndex({ organisationKey: 1, sankalpId: 1, memberId: 1 }, { unique: true }),
    db.collection("sankalpMilestones").createIndex({ organisationKey: 1, sankalpId: 1, dueDate: 1 }),
    db.collection("sankalpProgressReports").createIndex({ organisationKey: 1, sankalpId: 1, createdAt: -1 }),
    db.collection("sankalpDocuments").createIndex({ organisationKey: 1, sankalpId: 1, createdAt: -1 }),
  ]);

  await db.collection("organisations").updateOne(
    { key: organisationKey },
    {
      $set: {
        publicName: "Sri Aurobindo Society",
        centreName: "Lucknow · Gomti Nagar Centre (UC-02)",
        location: "Lucknow, Uttar Pradesh",
        supportEmail: "info.saslucknow@gmail.com",
        supportPhone: "+91 73888 99001",
        websiteUrl: "https://saslucknow.in",
        receiptIssuer: {
          branchName: "Sri Aurobindo Society, Sultanpur Branch",
          legalName: "To be confirmed",
          registeredAddress: "To be confirmed",
          pan: "To be confirmed",
          eightyGApprovalNumber: "To be confirmed",
          eightyGValidity: "To be confirmed",
          authorisedSignatory: "To be confirmed",
          status: "details_pending",
        },
        status: "active",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  await db.collection("koshAccounts").updateOne(
    { organisationKey, key: "general" },
    {
      $set: { name: "General Kosh", currency: "INR", status: "active", updatedAt: now },
      $setOnInsert: { receivedAmountPaise: 0, allocatedAmountPaise: 0, spentAmountPaise: 0, createdAt: now },
    },
    { upsert: true },
  );

  const adminEmail = "rksingh.668@gmail.com";
  const adminResult = await db.collection("members").findOneAndUpdate(
    { organisationKey, email: adminEmail },
    {
      $set: {
        fullName: "Rajendra Kumar Singh",
        email: adminEmail,
        role: "administrator",
        permissions: ["members.review", "sankalps.manage", "kosh.review", "reports.view"],
        status: "active",
        livingStatus: "living",
        updatedAt: now,
      },
      $setOnInsert: { joinedAt: now, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );

  const sankalps = [
    {
      slug: "patient-consultation-support",
      title: "Support for Patient Consultations",
      summary: "Help make necessary medical consultations accessible to patients who need financial support.",
      purpose: "Coordinate verified patient consultation support through a transparent, case-sensitive process under the Society's guidance.",
      stage: "planning",
      status: "active",
      acceptsDonations: true,
      acceptsSeva: true,
      targetAmountPaise: 0,
      targetDate: null,
      featuredOrder: 1,
    },
    {
      slug: "winter-blanket-distribution-december",
      title: "Winter Blanket Distribution",
      summary: "Prepare and distribute blankets to people in need during December.",
      purpose: "Identify genuine need, procure suitable blankets responsibly, and organise a dignified winter distribution drive.",
      stage: "planning",
      status: "active",
      acceptsDonations: true,
      acceptsSeva: true,
      targetAmountPaise: 0,
      targetDate: new Date("2026-12-31T00:00:00.000Z"),
      featuredOrder: 2,
    },
  ];

  for (const sankalp of sankalps) {
    await db.collection("sankalps").updateOne(
      { organisationKey, slug: sankalp.slug },
      {
        $set: { ...sankalp, organisationKey, updatedAt: now },
        $setOnInsert: {
          receivedAmountPaise: 0,
          allocatedAmountPaise: 0,
          spentAmountPaise: 0,
          donorCount: 0,
          volunteerCount: 0,
          createdByMemberId: adminResult._id,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  console.log(JSON.stringify({
    status: "ready",
    databaseName,
    organisationKey,
    administrator: adminEmail,
    sankalps: sankalps.map(({ slug, title }) => ({ slug, title })),
  }, null, 2));
} finally {
  await client.close();
}
