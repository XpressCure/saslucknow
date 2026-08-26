import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

type InquiryPayload = Record<string, unknown>;

const clean = (value: unknown, limit = 500) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
const list = (value: unknown, limit = 6) => Array.isArray(value) ? value.map(item => clean(item, 80)).filter(Boolean).slice(0, limit) : [];

async function prepareDatabase() {
  if (!env.DB) throw new Error("The NEXT HUMAN inquiry database is not connected.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS next_human_volunteer_inquiries (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      reference text NOT NULL UNIQUE,
      status text DEFAULT 'new' NOT NULL,
      full_name text NOT NULL,
      age_range text NOT NULL,
      city text NOT NULL,
      mobile text NOT NULL,
      email text NOT NULL,
      profession_or_institution text NOT NULL,
      primary_contribution_area text NOT NULL,
      source text DEFAULT 'website' NOT NULL,
      payload text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS next_human_volunteer_inquiries_reference_unique
      ON next_human_volunteer_inquiries (reference)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_next_human_inquiries_status_created
      ON next_human_volunteer_inquiries (status, created_at)`),
  ]);
}

function validate(body: InquiryPayload) {
  const value = {
    ...body,
    fullName: clean(body.fullName, 100),
    ageRange: clean(body.ageRange, 40),
    city: clean(body.city, 120),
    mobile: clean(body.mobile, 20).replace(/\D/g, "").slice(-10),
    email: clean(body.email, 180).toLowerCase(),
    professionOrInstitution: clean(body.professionOrInstitution, 150),
    filmResponse: clean(body.filmResponse, 600),
    whyNextHuman: clean(body.whyNextHuman, 800),
    nextQuality: clean(body.nextQuality, 500),
    explorationInterests: list(body.explorationInterests, 3),
    contributionAreas: list(body.contributionAreas, 3),
    primaryContributionArea: clean(body.primaryContributionArea, 80),
    relevantContribution: clean(body.relevantContribution, 800),
    source: clean(body.source, 80) || "website",
  };
  const invalid = !value.fullName || !value.ageRange || !value.city || !/^[6-9]\d{9}$/.test(value.mobile)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || !value.professionOrInstitution
    || value.filmResponse.length < 40 || value.whyNextHuman.length < 40 || value.nextQuality.length < 30
    || !value.explorationInterests.length || !value.contributionAreas.length || !value.primaryContributionArea
    || value.relevantContribution.length < 40 || body.foundationStageAcknowledged !== true || body.privacyConsent !== true
    || clean(body.website, 100).length > 0;
  return invalid ? null : value;
}

export async function POST(request: NextRequest) {
  let body: InquiryPayload;
  try {
    body = await request.json() as InquiryPayload;
  } catch {
    return NextResponse.json({ error: "Please complete the inquiry form and try again." }, { status: 400 });
  }
  const value = validate(body);
  if (!value) return NextResponse.json({ error: "Please review the required answers before submitting." }, { status: 422 });

  try {
    await prepareDatabase();
    const now = new Date().toISOString();
    const reference = `NHV-${new Date(now).getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await env.DB.prepare(`INSERT INTO next_human_volunteer_inquiries
      (reference, status, full_name, age_range, city, mobile, email, profession_or_institution, primary_contribution_area, source, payload, created_at, updated_at)
      VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(reference, value.fullName, value.ageRange, value.city, value.mobile, value.email, value.professionOrInstitution, value.primaryContributionArea, value.source, JSON.stringify(value), now, now)
      .run();
    return NextResponse.json({ status: "received", reference, nextStep: "await_review", message: "Your Founding Circle inquiry has been received." }, { status: 201 });
  } catch (error) {
    console.error("NEXT HUMAN inquiry storage failed", error);
    return NextResponse.json({ error: "The inquiry service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
