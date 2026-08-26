import test from "node:test";
import assert from "node:assert/strict";
import { validateNextHumanVolunteerInquiry } from "../server/next-human-core.mjs";

const valid = {
  fullName: "Aditi Sharma", ageRange: "25_34", city: "Delhi", mobile: "+91 98765 43210", email: "aditi@example.com", professionOrInstitution: "Designer",
  filmResponse: "The movement from inquiry to responsibility stayed with me most strongly.", whyNextHuman: "I want to help translate a deep idea into a rigorous and welcoming public experience.", nextQuality: "Discernment, because aspiration without clarity can easily lose its direction.",
  explorationInterests: ["consciousness"], contributionAreas: ["art_culture", "social_media_film"], primaryContributionArea: "art_culture", relevantContribution: "I have designed and delivered exhibitions with multidisciplinary teams and public audiences.", contributionStyle: "own_assignments", contributionLocation: ["delhi_ncr", "remote"], weeklyAvailability: "5_8", usualAvailability: ["weekday_evenings"], organisationConnection: "no", orientationPreference: "online", foundationStageAcknowledged: true, privacyConsent: true, source: "website",
};

test("accepts a grounded Founding Circle inquiry", () => {
  const result = validateNextHumanVolunteerInquiry(valid);
  assert.equal(result.ok, true);
  assert.equal(result.value.mobile, "9876543210");
});

test("requires the foundation-stage acknowledgement", () => {
  const result = validateNextHumanVolunteerInquiry({ ...valid, foundationStageAcknowledged: false });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /foundation-team stage/i);
});

test("rejects a filled honeypot", () => {
  const result = validateNextHumanVolunteerInquiry({ ...valid, website: "spam" });
  assert.equal(result.ok, false);
});

