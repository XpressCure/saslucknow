import test from "node:test";
import assert from "node:assert/strict";
import {
  SAS_CAMPAIGN_TEMPLATES,
  activeMemberCampaignView,
  campaignPhase,
  campaignCatalog,
  campaignDestinationCatalog,
  focusCampaignView,
  nextCampaignVersion,
  validateCreativeInput,
  validateFocusCampaignInput,
} from "../server/participation-campaign-core.mjs";

test("SAS Creative Studio exposes the approved spiritual and discovery templates", () => {
  const catalog = campaignCatalog();
  assert.equal(catalog.length, 5);
  assert.deepEqual(catalog.map(item => item.id), ["inner_silence", "song_of_savitri", "collective_sadhana", "mothers_guidance", "bharat_uday"]);
  assert.equal(new Set(catalog.map(item => item.destination)).size, 5);
});

test("creative validation fixes its theme and destination to the approved template", () => {
  const template = SAS_CAMPAIGN_TEMPLATES.song_of_savitri;
  const result = validateCreativeInput({
    name: "Savitri December invitation",
    templateId: template.id,
    motionPresetId: template.defaultMotionPreset,
    displayMode: "coordinated_dashboard",
    destination: "https://unsafe.example",
    themePackId: "unapproved",
    copy: template.copy,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.destination, "watch");
  assert.equal(result.value.themePackId, "indigo_savitri");
});

test("Creative Studio exposes only approved member-app destinations", () => {
  const destinations = campaignDestinationCatalog();
  assert.equal(destinations.length, 12);
  assert.equal(new Set(destinations.map(item => item.id)).size, destinations.length);
  assert.deepEqual(destinations.map(item => item.id), ["dashboard", "inner-room", "reflections", "sound", "sangha", "watch", "library", "sakhi", "sankalp", "yogdaan", "parichay", "bharat-uday"]);
});

test("creative validation retains a selected approved member-app destination", () => {
  const template = SAS_CAMPAIGN_TEMPLATES.mothers_guidance;
  const result = validateCreativeInput({
    name: "Guidance into the library",
    templateId: template.id,
    motionPresetId: template.defaultMotionPreset,
    displayMode: "coordinated_dashboard",
    destination: "library",
    copy: template.copy,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.destination, "library");
});

test("creative validation rejects unapproved motion and incomplete bilingual copy", () => {
  const template = SAS_CAMPAIGN_TEMPLATES.inner_silence;
  assert.equal(validateCreativeInput({ name: "Quiet", templateId: template.id, motionPresetId: "spin", displayMode: "card_only", copy: template.copy }).ok, false);
  assert.equal(validateCreativeInput({ name: "Quiet", templateId: template.id, motionPresetId: template.defaultMotionPreset, displayMode: "card_only", copy: { en: template.copy.en } }).ok, false);
});

test("focus campaign validation requires a future, bounded schedule", () => {
  const now = Date.parse("2026-08-26T00:00:00.000Z");
  const valid = validateFocusCampaignInput({ name: "Savitri week", note: "A measured seven-day invitation.", creativeId: "507f1f77bcf86cd799439011", locale: "all", startsAt: "2026-08-27T00:00:00.000Z", endsAt: "2026-08-28T00:00:00.000Z", maxImpressionsPerDay: 3 }, now);
  assert.equal(valid.ok, true);
  assert.equal(valid.value.name, "Savitri week");
  assert.equal(valid.value.maxImpressionsPerDay, 3);
  assert.equal(validateFocusCampaignInput({ name: "Reverse", creativeId: "x", locale: "all", startsAt: "2026-08-28T00:00:00.000Z", endsAt: "2026-08-27T00:00:00.000Z", maxImpressionsPerDay: 3 }, now).ok, false);
  assert.equal(validateFocusCampaignInput({ name: "Too many views", creativeId: "x", locale: "all", startsAt: "2026-08-27T00:00:00.000Z", endsAt: "2026-08-28T00:00:00.000Z", maxImpressionsPerDay: 101 }, now).ok, false);
  assert.equal(validateFocusCampaignInput({ creativeId: "x", locale: "all", startsAt: "2026-08-27T00:00:00.000Z", endsAt: "2026-08-28T00:00:00.000Z", maxImpressionsPerDay: 3 }, now).ok, false);
});

test("campaign phase distinguishes draft, scheduled, live, completed and paused states", () => {
  const now = Date.parse("2026-08-27T12:00:00.000Z");
  assert.equal(campaignPhase({ status: "draft" }, now), "draft");
  assert.equal(campaignPhase({ status: "paused" }, now), "paused");
  assert.equal(campaignPhase({ status: "published", startsAt: "2026-08-28T00:00:00.000Z", endsAt: "2026-08-29T00:00:00.000Z" }, now), "scheduled");
  assert.equal(campaignPhase({ status: "published", startsAt: "2026-08-27T00:00:00.000Z", endsAt: "2026-08-28T00:00:00.000Z" }, now), "live");
  assert.equal(campaignPhase({ status: "published", startsAt: "2026-08-25T00:00:00.000Z", endsAt: "2026-08-26T00:00:00.000Z" }, now), "completed");
});

test("member campaign view contains display fields but not administrator audit data", () => {
  const template = SAS_CAMPAIGN_TEMPLATES.collective_sadhana;
  const creative = { _id: "creative-1", ...template, motionPresetId: template.defaultMotionPreset, displayMode: "coordinated_dashboard", copy: template.copy, revision: 2, auditHistory: [{ secret: true }] };
  const campaign = { _id: "campaign-1", locale: "all", startsAt: new Date(), endsAt: new Date(Date.now() + 1000), auditHistory: [{ secret: true }] };
  const view = activeMemberCampaignView(campaign, creative);
  assert.equal(view.destination, "sangha");
  assert.equal(view.copy.headline, template.copy.en.headline);
  assert.equal(view.copies.hi.headline, template.copy.hi.headline);
  assert.equal("auditHistory" in view, false);
  assert.equal(view.maxImpressionsPerDay, 1);
});

test("administrator campaign view exposes reach metrics without member-level records", () => {
  const view = focusCampaignView({
    _id: "campaign-1",
    creativeId: "creative-1",
    locale: "all",
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 1000),
    maxImpressionsPerDay: 3,
    status: "published",
    configVersion: 2,
    metrics: { impressions: 12, membersReached: 5, callsToAction: 3, membersEngaged: 2 },
  });
  assert.deepEqual(view.metrics, { impressions: 12, membersReached: 5, callsToAction: 3, membersEngaged: 2, engagementRate: 25 });
  assert.equal("memberIds" in view, false);
});

test("campaign versions are monotonically increasing", () => {
  assert.ok(nextCampaignVersion(45, 1000) > 45);
  assert.ok(nextCampaignVersion(9999, 1000) > 9999);
});
