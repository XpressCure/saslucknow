const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[6-9]\d{9}$/;

export function cleanText(value, maxLength = 160) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function validateParichayApplication(input) {
  const fullName = cleanText(input?.fullName, 120);
  const mobile = normalizePhone(input?.mobile);
  const email = cleanText(input?.email, 180).toLowerCase();
  const city = cleanText(input?.city, 100);
  const interests = cleanText(input?.interests, 600);
  const skills = cleanText(input?.skills, 600);
  const sevaPreference = cleanText(input?.sevaPreference, 300);
  const consent = input?.consent === true;

  const errors = [];
  if (fullName.length < 2) errors.push("Please enter your full name.");
  if (!phonePattern.test(mobile)) errors.push("Please enter a valid 10-digit Indian mobile number.");
  if (email && !emailPattern.test(email)) errors.push("Please enter a valid email address.");
  if (!consent) errors.push("Consent is required to submit your Parichay.");

  return {
    ok: errors.length === 0,
    errors,
    value: { fullName, mobile, email, city, interests, skills, sevaPreference, consent },
  };
}

export function publicSankalp(document) {
  return {
    id: String(document._id),
    slug: document.slug,
    title: document.title,
    summary: document.summary,
    purpose: document.purpose,
    status: document.status,
    stage: document.stage || "planning",
    acceptsDonations: Boolean(document.acceptsDonations),
    acceptsSeva: Boolean(document.acceptsSeva),
    donorCount: Number(document.donorCount || 0),
    volunteerCount: Number(document.volunteerCount || 0),
    coverImageUrl: document.coverImageUrl || "",
    targetDate: document.targetDate || null,
  };
}

export function publicParticipationSummary(sankalps) {
  const active = sankalps.filter(item => item.status === "active" || item.status === "funding");
  return {
    activeSankalpCount: active.length,
    contributorCount: active.reduce((total, item) => total + Number(item.donorCount || 0), 0),
    sevaParticipantCount: active.reduce((total, item) => total + Number(item.volunteerCount || 0), 0),
  };
}

export function publicRecentContribution(document, sankalpTitle = "General Kosh") {
  const contributedAt = document.receivedAt || document.capturedAt || document.createdAt || null;
  const date = contributedAt ? new Date(contributedAt) : null;
  return {
    id: String(document._id),
    sankalpTitle: cleanText(sankalpTitle, 140) || "General Kosh",
    contributedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : "",
  };
}

export function calculateKoshSummary(sankalps, kosh) {
  const receivedAmountPaise = Number(kosh?.receivedAmountPaise || 0);
  const allocatedAmountPaise = Number(kosh?.allocatedAmountPaise || 0);
  return {
    receivedAmountPaise,
    allocatedAmountPaise,
    availableAmountPaise: Math.max(0, receivedAmountPaise - allocatedAmountPaise),
    activeSankalpCount: sankalps.filter(item => item.status === "active").length,
  };
}
