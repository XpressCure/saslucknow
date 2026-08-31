const COPY_LIMITS = Object.freeze({ eyebrow: 48, headline: 92, body: 220, cta: 36 });
const CAMPAIGN_LIMITS = Object.freeze({ name: 80, note: 180 });
const DEFAULT_DASHBOARD_CARDS = Object.freeze({ primaryFeature: true, nextHumanChallenge: true, latestSangha: true, meaningfulAction: true, consciousOffering: true });
const DEFAULT_DASHBOARD_SHORTCUTS = Object.freeze({ sangha: true, innerRoom: true, sankalp: true, yogdaan: true, reflections: true });
const DEFAULT_APP_PAGE_VISIBILITY = Object.freeze({ nextHuman2026: true, nextHumanChallenge: true });

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
        body: "Ten inviting questions and a certificate at every step—across 30 vivid levels.",
        cta: "Continue my challenge",
      },
      hi: {
        eyebrow: "३० स्तर · संस्कृति · विज्ञान · चेतना",
        headline: "द नेक्स्ट ह्यूमन चैलेंज",
        body: "३० जीवंत स्तरों की यात्रा—हर स्तर पर दस प्रश्न और एक प्रेरक प्रमाणपत्र।",
        cta: "अपनी चुनौती जारी रखें",
      },
    },
  }),
  golden_aspiration: Object.freeze({
    id: "golden_aspiration", label: "Golden Aspiration", spiritualTheme: "A luminous movement towards the future", objective: "inspiration", destination: "next-human", themePackId: "golden_aspiration", allowedMotionPresets: ["none", "gentle_fade", "luminous_rise"], defaultMotionPreset: "gentle_fade",
    copy: { en: { eyebrow: "THE FUTURE CALLS", headline: "Prepare for what humanity can become.", body: "Enter NEXT HUMAN 2026—an inquiry into consciousness, evolution and the future human.", cta: "Discover NEXT HUMAN" }, hi: { eyebrow: "भविष्य का आह्वान", headline: "मनुष्य की अगली संभावना के लिए तैयार हों।", body: "चेतना, विकास और भविष्य के मनुष्य की खोज—नेक्स्ट ह्यूमन 2026।", cta: "नेक्स्ट ह्यूमन जानें" } },
  }),
  vedic_dawn: Object.freeze({
    id: "vedic_dawn", label: "Vedic Dawn", spiritualTheme: "Dawn, discovery and a widening mind", objective: "study", destination: "library", themePackId: "vedic_dawn", allowedMotionPresets: ["none", "gentle_fade", "luminous_rise"], defaultMotionPreset: "luminous_rise",
    copy: { en: { eyebrow: "A DAWN OF KNOWLEDGE", headline: "Let one passage widen the day.", body: "Open the e-Library and continue a living study of Sri Aurobindo and the Mother.", cta: "Begin reading" }, hi: { eyebrow: "ज्ञान की उषा", headline: "एक अंश आपके दिन को विस्तृत करे।", body: "ई-लाइब्रेरी में श्री अरविन्द और श्री माँ के साहित्य का जीवंत अध्ययन करें।", cta: "पढ़ना शुरू करें" } },
  }),
  lotus_path: Object.freeze({
    id: "lotus_path", label: "Lotus Path", spiritualTheme: "Growth through beauty and inward attention", objective: "reflection", destination: "reflections", themePackId: "lotus_path", allowedMotionPresets: ["none", "gentle_fade", "petal_bloom"], defaultMotionPreset: "petal_bloom",
    copy: { en: { eyebrow: "A PRIVATE FIELD", headline: "Keep the thought that changed you.", body: "Return to your private reflections and continue the thread of an inward discovery.", cta: "Open my reflections" }, hi: { eyebrow: "एक निजी क्षेत्र", headline: "उस विचार को सँजोएँ जिसने आपको बदला।", body: "अपने निजी चिंतन में लौटें और अंतर्मुखी खोज की कड़ी आगे बढ़ाएँ।", cta: "मेरे चिंतन खोलें" } },
  }),
  evolutionary_fire: Object.freeze({
    id: "evolutionary_fire", label: "Evolutionary Fire", spiritualTheme: "Courage, progress and conscious action", objective: "action", destination: "sankalp", themePackId: "evolutionary_fire", allowedMotionPresets: ["none", "gentle_fade", "discovery_surge"], defaultMotionPreset: "discovery_surge",
    copy: { en: { eyebrow: "CONSCIOUS ACTION", headline: "Turn aspiration into a shared work.", body: "Choose a Sankalp that speaks to you and support it through attention, seva or Yogdaan.", cta: "Explore Sankalp" }, hi: { eyebrow: "सचेत कर्म", headline: "आकांक्षा को सामूहिक कर्म बनाएँ।", body: "उस संकल्प को चुनें जो आपको पुकारे और ध्यान, सेवा या योगदान से साथ दें।", cta: "संकल्प देखें" } },
  }),
  matrimandir_light: Object.freeze({
    id: "matrimandir_light", label: "Matrimandir Light", spiritualTheme: "A quiet centre and a field of peace", objective: "meditation", destination: "inner-room", themePackId: "matrimandir_light", allowedMotionPresets: ["none", "gentle_fade", "breathing_aura"], defaultMotionPreset: "breathing_aura",
    copy: { en: { eyebrow: "THE QUIET CENTRE", headline: "Come back to one clear minute.", body: "Enter the Inner Room, choose your time and let stillness restore proportion to the day.", cta: "Enter silence" }, hi: { eyebrow: "शांत केन्द्र", headline: "एक निर्मल क्षण में लौटें।", body: "अंतःकक्ष में प्रवेश करें, समय चुनें और नीरवता को दिन में संतुलन लौटाने दें।", cta: "नीरवता में जाएँ" } },
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
  Object.freeze({ id: "next-human", label: "NEXT HUMAN 2026", description: "Opens the seven-day conference overview, programme and participation pathways." }),
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

function normalizeDashboardCards(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    primaryFeature: source.primaryFeature !== false && source.nextHuman2026 !== false,
    nextHumanChallenge: source.nextHumanChallenge !== false,
    latestSangha: source.latestSangha !== false,
    meaningfulAction: source.meaningfulAction !== false,
    consciousOffering: source.consciousOffering !== false,
  };
}

function normalizeDashboardShortcuts(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    sangha: source.sangha !== false,
    innerRoom: source.innerRoom !== false,
    sankalp: source.sankalp !== false,
    yogdaan: source.yogdaan !== false,
    reflections: source.reflections !== false,
  };
}

function normalizeAppPageVisibility(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    nextHuman2026: source.nextHuman2026 !== false,
    nextHumanChallenge: source.nextHumanChallenge !== false,
  };
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
      dashboardCards: normalizeDashboardCards(body.dashboardCards),
      dashboardShortcuts: normalizeDashboardShortcuts(body.dashboardShortcuts),
      pageVisibility: normalizeAppPageVisibility(body.pageVisibility),
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
    dashboardCards: normalizeDashboardCards(document.dashboardCards || DEFAULT_DASHBOARD_CARDS),
    dashboardShortcuts: normalizeDashboardShortcuts(document.dashboardShortcuts || DEFAULT_DASHBOARD_SHORTCUTS),
    pageVisibility: normalizeAppPageVisibility(document.pageVisibility || DEFAULT_APP_PAGE_VISIBILITY),
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
    dashboardCards: normalizeDashboardCards(creative.dashboardCards || DEFAULT_DASHBOARD_CARDS),
    dashboardShortcuts: normalizeDashboardShortcuts(creative.dashboardShortcuts || DEFAULT_DASHBOARD_SHORTCUTS),
    pageVisibility: normalizeAppPageVisibility(creative.pageVisibility || DEFAULT_APP_PAGE_VISIBILITY),
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
