import { cleanText, normalizePhone } from "./participation-core.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ageRanges = new Set(["under_18", "18_24", "25_34", "35_44", "45_59", "60_plus", "prefer_not_to_say"]);
const explorationOptions = new Set(["consciousness", "human_evolution", "savitri", "science_and_evidence", "art_and_creativity", "youth_and_education", "society_and_civilisation", "technology_and_future", "inner_development", "community_and_service", "not_sure"]);
export const contributionOptions = new Set(["content_research", "colleges_youth", "doctors_professionals", "art_culture", "technology", "social_media_film", "event_production", "hospitality", "partnerships_funding", "next_human_junior", "general_volunteer"]);
const contributionStyles = new Set(["lead_workstream", "own_assignments", "consistent_team_support", "specialist_guidance", "peak_period_support", "discovering_fit"]);
const contributionLocations = new Set(["lucknow", "delhi_ncr", "remote", "travel_to_lucknow", "other"]);
const weeklyOptions = new Set(["under_2", "2_4", "5_8", "9_12", "over_12", "project_based"]);
const usualOptions = new Set(["weekday_mornings", "weekday_afternoons", "weekday_evenings", "saturdays", "sundays", "flexible"]);
const connectionOptions = new Set(["yes", "no", "possibly"]);
const orientationOptions = new Set(["online", "lucknow", "delhi_ncr", "possibly", "not_at_present"]);
const sourceOptions = new Set(["website", "android", "meta", "whatsapp", "delhi_network", "lucknow_network", "referral", "other"]);

function choice(value, options) {
  const normalized = cleanText(value, 80);
  return options.has(normalized) ? normalized : "";
}

function choices(value, options, limit) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item, 80)).filter(item => options.has(item)))].slice(0, limit);
}

function longText(value, maxLength) {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxLength);
}

function safeUrl(value) {
  const text = cleanText(value, 300);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
}

export function validateNextHumanVolunteerInquiry(input) {
  const fullName = cleanText(input?.fullName, 100);
  const ageRange = choice(input?.ageRange, ageRanges);
  const city = cleanText(input?.city, 120);
  const mobile = normalizePhone(input?.mobile);
  const email = cleanText(input?.email, 180).toLowerCase();
  const professionOrInstitution = cleanText(input?.professionOrInstitution, 150);
  const profileUrl = safeUrl(input?.profileUrl);
  const filmResponse = longText(input?.filmResponse, 600);
  const whyNextHuman = longText(input?.whyNextHuman, 800);
  const nextQuality = longText(input?.nextQuality, 500);
  const explorationInterests = choices(input?.explorationInterests, explorationOptions, 3);
  const contributionAreas = choices(input?.contributionAreas, contributionOptions, 3);
  const primaryContributionArea = choice(input?.primaryContributionArea, contributionOptions);
  const relevantContribution = longText(input?.relevantContribution, 800);
  const exampleOfWork = longText(input?.exampleOfWork, 700);
  const contributionStyle = choice(input?.contributionStyle, contributionStyles);
  const contributionLocation = choices(input?.contributionLocation, contributionLocations, 5);
  const weeklyAvailability = choice(input?.weeklyAvailability, weeklyOptions);
  const usualAvailability = choices(input?.usualAvailability, usualOptions, 6);
  const organisationConnection = choice(input?.organisationConnection, connectionOptions);
  const organisationConnectionDetails = longText(input?.organisationConnectionDetails, 500);
  const orientationPreference = choice(input?.orientationPreference, orientationOptions);
  const additionalContext = longText(input?.additionalContext, 600);
  const sourceInput = cleanText(input?.source, 100).toLowerCase();
  const source = sourceOptions.has(sourceInput) ? sourceInput : "website";
  const sourceDetail = sourceInput && sourceInput !== source ? sourceInput : "";
  const updatesConsent = input?.updatesConsent === true;
  const foundationStageAcknowledged = input?.foundationStageAcknowledged === true;
  const privacyConsent = input?.privacyConsent === true;
  const privacyNoticeVersion = cleanText(input?.privacyNoticeVersion, 30);
  const website = cleanText(input?.website, 100);
  const utm = Object.fromEntries(["source", "medium", "campaign", "content", "term"].map(key => [key, cleanText(input?.utm?.[key], 100)]));
  const errors = [];
  if (website) errors.push("Your inquiry could not be verified.");
  if (fullName.length < 2) errors.push("Please enter your full name.");
  if (!ageRange) errors.push("Please choose an age range.");
  if (city.length < 2) errors.push("Please enter your city.");
  if (!/^[6-9]\d{9}$/.test(mobile)) errors.push("Please enter a valid 10-digit Indian mobile number.");
  if (!emailPattern.test(email)) errors.push("Please enter a valid email address.");
  if (professionOrInstitution.length < 2) errors.push("Please enter your profession, role or institution.");
  if (input?.profileUrl && !profileUrl) errors.push("Please enter a valid profile or portfolio URL.");
  if (filmResponse.length < 40) errors.push("Please tell us what stayed with you after the film.");
  if (whyNextHuman.length < 40) errors.push("Please tell us why NEXT HUMAN interests you now.");
  if (nextQuality.length < 30) errors.push("Please tell us which quality humanity should evolve next and why.");
  if (!explorationInterests.length) errors.push("Please choose at least one exploration interest.");
  if (!contributionAreas.length) errors.push("Please choose at least one contribution area.");
  if (!primaryContributionArea || !contributionAreas.includes(primaryContributionArea)) errors.push("Please choose a primary contribution from your selected areas.");
  if (relevantContribution.length < 40) errors.push("Please explain the contribution you could bring.");
  if (!contributionStyle) errors.push("Please choose how you would prefer to contribute.");
  if (!contributionLocation.length) errors.push("Please choose where you can contribute.");
  if (!weeklyAvailability || !usualAvailability.length) errors.push("Please tell us your realistic availability.");
  if (!organisationConnection) errors.push("Please answer the organisation connection question.");
  if (["yes", "possibly"].includes(organisationConnection) && organisationConnectionDetails.length < 5) errors.push("Please describe your organisation connection.");
  if (!orientationPreference) errors.push("Please choose an orientation preference.");
  if (!foundationStageAcknowledged) errors.push("Please confirm that you understand the foundation-team stage.");
  if (!privacyConsent) errors.push("Privacy and contact consent is required.");
  return { ok: errors.length === 0, errors, value: { fullName, ageRange, city, mobile, normalisedMobile: mobile, email, normalisedEmail: email, professionOrInstitution, profileUrl, filmResponse, whyNextHuman, nextQuality, explorationInterests, contributionAreas, primaryContributionArea, relevantContribution, exampleOfWork, contributionStyle, contributionLocation, weeklyAvailability, usualAvailability, organisationConnection, organisationConnectionDetails, orientationPreference, additionalContext, foundationStageAcknowledged, privacyConsent, updatesConsent, privacyNoticeVersion, source, sourceDetail, utm } };
}

