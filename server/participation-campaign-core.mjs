const COPY_LIMITS = Object.freeze({ eyebrow: 48, headline: 92, body: 220, cta: 36 });
const CAMPAIGN_LIMITS = Object.freeze({ name: 80, note: 180 });

export const SAS_CAMPAIGN_TEMPLATES = Object.freeze({
  inner_silence: Object.freeze({
    id: "inner_silence",
    label: "Inner Silence",
    spiritualTheme: "The Inner Room",
    objective: "meditation",
    destination: "inner-room",
    themePackId: "teal_silence",
    allowedMotionPresets: ["none", "gentle_fade", "breathing_aura"],
    defaultMotionPreset: "breathing_aura",
    copy: {
      en: {
        eyebrow: "A QUIET PLACE OF OFFERING",
        headline: "Return to the silence within.",
        body: "Enter the Inner Room for a few unhurried minutes of stillness, music and inward attention.",
        cta: "Enter the Inner Room",
      },
      hi: {
        eyebrow: "अंतर्मुखी समर्पण का एक शांत स्थान",
        headline: "अपने भीतर की नीरवता में लौटें।",
        body: "कुछ शांत क्षणों के लिए अंतःकक्ष में प्रवेश करें—संगीत, स्थिरता और अंतर्मुखी ध्यान के साथ।",
        cta: "अंतःकक्ष में जाएँ",
      },
    },
  }),
  song_of_savitri: Object.freeze({
    id: "song_of_savitri",
    label: "The Song of Savitri",
    spiritualTheme: "Savitri in image, verse and meaning",
    objective: "study",
    destination: "watch",
    themePackId: "indigo_savitri",
    allowedMotionPresets: ["none", "gentle_fade", "luminous_rise"],
    defaultMotionPreset: "luminous_rise",
    copy: {
      en: {
        eyebrow: "SAVITRI · IN VISION, VERSE & MEANING",
        headline: "Five luminous lines at a time.",
        body: "Let Savitri unfold through image, spoken verse and clear meaning in English and Hindi.",
        cta: "Watch The Song of Savitri",
      },
      hi: {
        eyebrow: "सावित्री · दृश्य, काव्य और अर्थ",
        headline: "एक बार में पाँच प्रकाशमय पंक्तियाँ।",
        body: "दृश्य, वाणी और सहज अंग्रेज़ी-हिन्दी अर्थ के माध्यम से सावित्री की यात्रा में प्रवेश करें।",
        cta: "सावित्री का गीत देखें",
      },
    },
  }),
  collective_sadhana: Object.freeze({
    id: "collective_sadhana",
    label: "Collective Sadhana",
    spiritualTheme: "Sangha and shared practice",
    objective: "community",
    destination: "sangha",
    themePackId: "saffron_sangha",
    allowedMotionPresets: ["none", "gentle_fade", "gathering_glow"],
    defaultMotionPreset: "gathering_glow",
    copy: {
      en: {
        eyebrow: "THE COMMON FIRE",
        headline: "Share what is quietly becoming.",
        body: "Offer a reflection, image, artwork or question to the Sangha and receive the community's thoughtful response.",
        cta: "Open Sangha",
      },
      hi: {
        eyebrow: "सामूहिक अग्नि",
        headline: "जो भीतर आकार ले रहा है, उसे साझा करें।",
        body: "संग के साथ अपना चिंतन, चित्र, कला या प्रश्न साझा करें और समुदाय की संवेदनशील प्रतिक्रिया पाएँ।",
        cta: "संग में जाएँ",
      },
    },
  }),
  mothers_guidance: Object.freeze({
    id: "mothers_guidance",
    label: "The Mother’s Guidance",
    spiritualTheme: "A question, a passage, a living guidance",
    objective: "guidance",
    destination: "sakhi",
    themePackId: "rose_guidance",
    allowedMotionPresets: ["none", "gentle_fade", "petal_bloom"],
    defaultMotionPreset: "petal_bloom",
    copy: {
      en: {
        eyebrow: "A LIVING GUIDANCE",
        headline: "Bring one sincere question.",
        body: "Ask Savitri Sakhi about Savitri, Sri Aurobindo or the Mother and continue your inquiry with care.",
        cta: "Ask Savitri Sakhi",
      },
      hi: {
        eyebrow: "एक जीवंत मार्गदर्शन",
        headline: "एक सच्चा प्रश्न लेकर आएँ।",
        body: "सावित्री, श्री अरविन्द या श्री माँ के विषय में सावित्री सखी से पूछें और अपनी जिज्ञासा को आगे बढ़ाएँ।",
        cta: "सावित्री सखी से पूछें",
      },
    },
  }),
  bharat_uday: Object.freeze({
    id: "bharat_uday",
    label: "The Next Human Challenge",
    spiritualTheme: "Culture, science and consciousness for the next human",
    objective: "discovery",
    destination: "bharat-uday",
    themePackId: "electric_uday",
    allowedMotionPresets: ["none", "gentle_fade", "discovery_surge"],
    defaultMotionPreset: "discovery_surge",
    copy: {
      en: {
        eyebrow: "30 LEVELS · CULTURE · SCIENCE · CONSCIOUSNESS",
        headline: "The Next Human Challenge",
        body: "Five fast questions, one discovery and one personal reflection—across 30 vivid levels.",
        cta: "Continue my challenge",
      },
      hi: {
        eyebrow: "३० स्तर · संस्कृति · विज्ञान · चेतना",
        headline: "द नेक्स्ट ह्यूमन चैलेंज",
        body: "३० जीवंत स्तरों की यात्रा—जहाँ भारतीय संस्कृति, विज्ञान और चेतना नई खोज बनकर एक साथ आते हैं।",
        cta: "अपनी चुनौती जारी रखें",
      },
    },
  }),
});

export const SAS_CAMPAIGN_DESTINATIONS = Object.freeze([
  Object.freeze({ id: "dashboard", label: "Account Dashboard", description: "Returns the member to their main account overview." }),
  Object.freeze({ id: "inner-room", label: "Inner Room", description: "Opens the private meditation timer and reflection experience." }),
  Object.freeze({ id: "reflections", label: "My Reflections", description: "Opens the member's private meditation thoughts and journal." }),
  Object.freeze({ id: "sound", label: "Inner Sound", description: "Opens the curated audio and meditation listening space." }),
  Object.freeze({ id: "sangha", label: "Sangha", description: "Opens the members-only community feed." }),
  Object.freeze({ id: "watch", label: "Watch Videos", description: "Opens The Song of Savitri and Gatherings video library." }),
  Object.freeze({ id: "library", label: "e-Library", description: "Opens the digital books and reading library." }),
  Object.freeze({ id: "sakhi", label: "Savitri Sakhi", description: "Opens the bilingual AI guidance and inquiry page." }),
  Object.freeze({ id: "sankalp", label: "Sankalp", description: "Opens active collective commitments and their progress." }),
  Object.freeze({ id: "yogdaan", label: "Yogdaan", description: "Opens the member's contribution and acknowledgement area." }),
  Object.freeze({ id: "parichay", label: "Parichay", description: "Opens the member's profile and Society identity details." }),
  Object.freeze({ id: "bharat-uday", label: "The Next Human Challenge", description: "Resumes the member's 30-level culture, science and consciousness journey." }),
]);

const CAMPAIGN_DESTINATION_IDS = new Set(SAS_CAMPAIGN_DESTINATIONS.map(destination => destination.id));

const DISPLAY_MODES = new Set(["card_only", "coordinated_dashboard"]);
const LOCALES = new Set(["all", "en", "hi"]);

function clean(value, max) {
  if (typeof value !== "string") return "";
  const result = value.trim();
  return result.length <= max ? result : "";
}

function normalizeCopy(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized = {};
  for (const language of ["en", "hi"]) {
    const source = value[language];
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    normalized[language] = {};
    for (const [field, limit] of Object.entries(COPY_LIMITS)) {
      const text = clean(source[field], limit);
      if (!text) return null;
      normalized[language][field] = text;
    }
  }
  return normalized;
}

export function campaignCatalog() {
  return Object.values(SAS_CAMPAIGN_TEMPLATES).map(template => ({
    id: template.id,
    label: template.label,
    spiritualTheme: template.spiritualTheme,
    objective: template.objective,
    destination: template.destination,
    themePackId: template.themePackId,
    allowedMotionPresets: [...template.allowedMotionPresets],
    defaultMotionPreset: template.defaultMotionPreset,
    copy: structuredClone(template.copy),
  }));
}

export function campaignDestinationCatalog() {
  return SAS_CAMPAIGN_DESTINATIONS.map(destination => ({ ...destination }));
}

export function validateCreativeInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Creative details are required." };
  const template = SAS_CAMPAIGN_TEMPLATES[body.templateId];
  if (!template) return { ok: false, error: "Choose one of the approved SAS templates." };
  const name = clean(body.name, 80);
  if (name.length < 3) return { ok: false, error: "Creative name must contain 3 to 80 characters." };
  if (!template.allowedMotionPresets.includes(body.motionPresetId)) return { ok: false, error: "Choose an approved motion for this template." };
  if (!DISPLAY_MODES.has(body.displayMode)) return { ok: false, error: "Choose card only or coordinated dashboard presentation." };
  const copy = normalizeCopy(body.copy);
  if (!copy) return { ok: false, error: "Complete the English and Hindi text within the permitted lengths." };
  return {
    ok: true,
    value: {
      name,
      templateId: template.id,
      objective: template.objective,
      destination: CAMPAIGN_DESTINATION_IDS.has(body.destination) ? body.destination : template.destination,
      themePackId: template.themePackId,
      motionPresetId: body.motionPresetId,
      displayMode: body.displayMode,
      copy,
    },
  };
}

export function validateFocusCampaignInput(body, now = Date.now()) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Campaign details are required." };
  const name = clean(body.name, CAMPAIGN_LIMITS.name);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const creativeId = clean(body.creativeId, 64);
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  const maxImpressionsPerDay = Number(body.maxImpressionsPerDay);
  if (name.length < 3) return { ok: false, error: "Campaign name must contain 3 to 80 characters." };
  if (note.length > CAMPAIGN_LIMITS.note) return { ok: false, error: "Campaign note must not exceed 180 characters." };
  if (!creativeId) return { ok: false, error: "Choose an approved Creative Studio design." };
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { ok: false, error: "Choose a valid start and end time." };
  if (endsAt <= startsAt) return { ok: false, error: "Campaign end time must be after its start time." };
  if (endsAt.getTime() <= now) return { ok: false, error: "Campaign end time must be in the future." };
  if (!LOCALES.has(body.locale)) return { ok: false, error: "Choose English, Hindi or both languages." };
  if (!Number.isInteger(maxImpressionsPerDay) || maxImpressionsPerDay < 1 || maxImpressionsPerDay > 100) {
    return { ok: false, error: "Daily impression cap must be between 1 and 100." };
  }
  return {
    ok: true,
    value: {
      name,
      note,
      creativeId,
      locale: body.locale,
      startsAt,
      endsAt,
      maxImpressionsPerDay,
    },
  };
}

export function nextCampaignVersion(previous = 0, now = Date.now()) {
  return Math.max(Number(previous || 0) + 1, Math.floor(now / 1000));
}

export function campaignPhase(document, now = Date.now()) {
  if (!document) return "draft";
  if (document.status === "draft" || document.status === "paused") return document.status;
  const startsAt = new Date(document.startsAt).getTime();
  const endsAt = new Date(document.endsAt).getTime();
  if (Number.isFinite(endsAt) && endsAt <= now) return "completed";
  if (Number.isFinite(startsAt) && startsAt > now) return "scheduled";
  return "live";
}

export function creativeView(document) {
  if (!document) return null;
  return {
    id: String(document._id),
    name: document.name,
    templateId: document.templateId,
    objective: document.objective,
    destination: document.destination,
    themePackId: document.themePackId,
    motionPresetId: document.motionPresetId,
    displayMode: document.displayMode,
    copy: document.copy,
    status: document.status,
    revision: Number(document.revision || 1),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    approvedAt: document.approvedAt || null,
  };
}

export function focusCampaignView(document, creative = null) {
  if (!document) return null;
  const metrics = {
    impressions: Number(document.metrics?.impressions || 0),
    membersReached: Number(document.metrics?.membersReached || 0),
    callsToAction: Number(document.metrics?.callsToAction || 0),
    membersEngaged: Number(document.metrics?.membersEngaged || 0),
  };
  metrics.engagementRate = metrics.impressions ? Number(((metrics.callsToAction / metrics.impressions) * 100).toFixed(1)) : 0;
  return {
    id: String(document._id),
    name: document.name || creative?.name || "Focus Campaign",
    note: document.note || "",
    creativeId: String(document.creativeId),
    creative: creativeView(creative),
    locale: document.locale,
    startsAt: document.startsAt,
    endsAt: document.endsAt,
    maxImpressionsPerDay: Number(document.maxImpressionsPerDay || 1),
    status: document.status,
    phase: campaignPhase(document),
    configVersion: Number(document.configVersion || 1),
    metrics,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function activeMemberCampaignView(campaign, creative) {
  if (!campaign || !creative) return null;
  const locale = campaign.locale === "hi" ? "hi" : "en";
  return {
    id: String(campaign._id),
    creativeRevisionId: `${String(creative._id)}:${Number(creative.revision || 1)}`,
    templateId: creative.templateId,
    themePackId: creative.themePackId,
    motionPresetId: creative.motionPresetId,
    displayMode: creative.displayMode,
    destination: creative.destination,
    locale: campaign.locale,
    maxImpressionsPerDay: Number(campaign.maxImpressionsPerDay || 1),
    copy: creative.copy?.[locale] || creative.copy?.en,
    copies: {
      en: creative.copy?.en,
      hi: creative.copy?.hi,
    },
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
  };
}

export { CAMPAIGN_LIMITS, COPY_LIMITS };
