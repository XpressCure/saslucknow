export const NEXT_HUMAN_EVENT_KEY = "next-human-2026";
export const NEXT_HUMAN_OPENING_TITLE = "THE HUMAN IS NOT THE CONCLUSION";
export const NEXT_HUMAN_MAX_COMPANIONS = 2;

export const NEXT_HUMAN_DAYS = [
  {
    id: "day-1",
    date: "2026-12-20",
    dayNumber: 1,
    title: "The Unfinished Human",
    question: "What if humanity is not the end of evolution?",
    moments: ["When Matter Woke", "The Mystery Looking Through Our Eyes", "The Species After Us"],
  },
  {
    id: "day-2",
    date: "2026-12-21",
    dayNumber: 2,
    title: "Beyond the Known",
    question: "Can consciousness outgrow time and death?",
    moments: ["The Clock and the Eternal", "After the Last Breath", "Death’s Unfinished Victory"],
  },
  {
    id: "day-3",
    date: "2026-12-22",
    dayNumber: 3,
    title: "India: The Inner Laboratory",
    question: "What has India discovered about the inner life?",
    moments: ["India’s Inner Experiment", "The Kingdom and the Soul", "Vivekananda: The Strength to Become"],
  },
  {
    id: "day-4",
    date: "2026-12-23",
    dayNumber: 4,
    title: "Sri Aurobindo: The Revolution Within",
    question: "What changes when the battlefield moves within?",
    moments: ["The Revolutionary Changes the Battlefield", "The Cell of Infinite Freedom", "The Cosmic March of the Divine"],
  },
  {
    id: "day-5",
    date: "2026-12-24",
    dayNumber: 5,
    title: "The Body Becomes the Laboratory",
    question: "Can matter learn a new law?",
    moments: ["The Mother: Saying Yes to Earth", "When the Cells Begin to Listen", "Can Matter Learn a New Law?"],
  },
  {
    id: "day-6",
    date: "2026-12-25",
    dayNumber: 6,
    title: "Savitri: Love Against Death",
    question: "Can love confront the final negation?",
    moments: ["The Traveller of the Worlds", "Love Chooses the Doomed", "Savitri Enters the Night"],
  },
  {
    id: "day-7",
    date: "2026-12-26",
    dayNumber: 7,
    title: "The Next Human",
    question: "What must we become next?",
    moments: ["Beyond the Mental Human", "Kalki: Prophecy or Symbol?", "Become"],
  },
];

export const NEXT_HUMAN_QUESTIONS = {
  challenge: [
    "What does ‘the next human’ mean to you personally?",
    "Describe one habit or limitation humanity must outgrow.",
    "Which idea of Sri Aurobindo or the Mother has made you question your present way of living?",
    "How would you bring inquiry, discipline and openness into these seven evenings?",
    "What would you create or change after this experience?",
  ],
  fellowship: [
    "What does conscious human evolution mean in the context of your life and work?",
    "Describe an experience that changed your understanding of human possibility.",
    "Which work of Sri Aurobindo or the Mother would you most like to explore with others, and why?",
    "What quality of presence or experience would you contribute to this gathering?",
    "How could this seven-day inquiry continue through your community after the conference?",
  ],
};

const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRST".split("");

function priceForRow(index) {
  if (index < 4) return { category: "Uday", priceRupees: 1500, colour: "#d69b31" };
  if (index < 10) return { category: "Pragati", priceRupees: 1000, colour: "#26777a" };
  return { category: "Sahabhagita", priceRupees: 750, colour: "#8d6b9a" };
}

export function defaultRows() {
  return ROW_LETTERS.map((row, index) => ({
    row,
    seats: 25,
    ...priceForRow(index),
    enabled: true,
  }));
}

export function defaultNextHumanEvent() {
  return {
    eventKey: NEXT_HUMAN_EVENT_KEY,
    title: "NEXT HUMAN 2026",
    openingTitle: NEXT_HUMAN_OPENING_TITLE,
    strapline: "Seven days · 21 Moments · one question",
    dates: { start: "2026-12-20", end: "2026-12-26" },
    time: "5:00–8:00 PM",
    city: "Lucknow",
    venue: "Venue to be announced",
    leadExplorer: "Dr. Ashwinbhai Kapadia",
    totalCapacityPerDay: 500,
    pathwayCapacityPerDay: { challenge: 250, fellowship: 250 },
    maxCompanionsPerDay: NEXT_HUMAN_MAX_COMPANIONS,
    seatHoldMinutes: 8,
    applicationsOpen: true,
    media: { hero: null, introVideo: null, auditorium: null },
    pathways: {
      challenge: { title: "The Next Human Challenge", ageLabel: "18–39 years", questions: [...NEXT_HUMAN_QUESTIONS.challenge] },
      fellowship: { title: "The Next Human Fellowship", ageLabel: "40 years and above", questions: [...NEXT_HUMAN_QUESTIONS.fellowship] },
    },
    days: NEXT_HUMAN_DAYS.map(day => ({ ...day, bookingOpen: false, rows: defaultRows() })),
  };
}

export function mergeEventConfig(document = {}) {
  const defaults = defaultNextHumanEvent();
  const suppliedDays = new Map((Array.isArray(document.days) ? document.days : []).map(day => [day.id, day]));
  const days = defaults.days.map(day => {
    const supplied = suppliedDays.get(day.id) || {};
    const suppliedRows = new Map((Array.isArray(supplied.rows) ? supplied.rows : []).map(row => [String(row.row || "").toUpperCase(), row]));
    return {
      ...day,
      ...supplied,
      moments: Array.isArray(supplied.moments) && supplied.moments.length === 3 ? supplied.moments : day.moments,
      rows: day.rows.map(row => ({ ...row, ...(suppliedRows.get(row.row) || {}) })),
    };
  });
  return {
    ...defaults,
    ...document,
    dates: { ...defaults.dates, ...(document.dates || {}) },
    pathwayCapacityPerDay: { ...defaults.pathwayCapacityPerDay, ...(document.pathwayCapacityPerDay || {}) },
    media: { ...defaults.media, ...(document.media || {}) },
    pathways: {
      challenge: { ...defaults.pathways.challenge, ...(document.pathways?.challenge || {}) },
      fellowship: { ...defaults.pathways.fellowship, ...(document.pathways?.fellowship || {}) },
    },
    days,
  };
}

export function ageOnDate(dateOfBirth, eventDate = "2026-12-20") {
  const birth = new Date(`${String(dateOfBirth || "").slice(0, 10)}T00:00:00Z`);
  const event = new Date(`${String(eventDate || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime()) || birth >= event) return null;
  let age = event.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = event.getUTCMonth() < birth.getUTCMonth()
    || (event.getUTCMonth() === birth.getUTCMonth() && event.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function pathwayForDateOfBirth(dateOfBirth) {
  const age = ageOnDate(dateOfBirth);
  if (age === null || age < 18 || age > 110) return null;
  return age < 40 ? "challenge" : "fellowship";
}

function cleanedAnswer(value) {
  return String(value || "").replace(/\r\n?/g, "\n").replace(/\0/g, "").trim().slice(0, 4000);
}

export function validateNextHumanApplication(input, event = defaultNextHumanEvent(), { submit = true } = {}) {
  const dateOfBirth = String(input?.dateOfBirth || "").slice(0, 10);
  const pathway = pathwayForDateOfBirth(dateOfBirth);
  const questions = event.pathways?.[pathway]?.questions || [];
  const answers = questions.map((_, index) => cleanedAnswer(input?.answers?.[index]));
  const errors = [];
  if (!pathway) errors.push("Participants must be at least 18 years old on 20 December 2026.");
  if (submit && answers.some(answer => answer.split(/\s+/u).filter(Boolean).length < 12)) errors.push("Answer every question thoughtfully in at least 12 words.");
  return { ok: errors.length === 0, errors, value: { dateOfBirth, pathway, answers } };
}

export function seatId(row, number) {
  return `${String(row || "").toUpperCase()}${String(number).padStart(2, "0")}`;
}

export function seatsForDay(day) {
  return (day?.rows || []).flatMap(row => row.enabled === false ? [] : Array.from({ length: Number(row.seats || 0) }, (_, index) => ({
    id: seatId(row.row, index + 1),
    row: row.row,
    number: index + 1,
    category: row.category,
    priceRupees: Number(row.priceRupees || 0),
    colour: row.colour,
  })));
}

export function bookingAmount(day, selectedSeatIds) {
  const byId = new Map(seatsForDay(day).map(seat => [seat.id, seat]));
  const selected = [...new Set((selectedSeatIds || []).map(value => String(value || "").toUpperCase()))];
  const seats = selected.map(id => byId.get(id)).filter(Boolean);
  if (!selected.length || seats.length !== selected.length) return { ok: false, error: "Choose only seats available for this day." };
  if (seats.length > NEXT_HUMAN_MAX_COMPANIONS + 1) return { ok: false, error: "A participant may book one seat and bring no more than two companions per day." };
  return { ok: true, seats, amountRupees: seats.reduce((sum, seat) => sum + seat.priceRupees, 0) };
}

export function validateDayPricing(inputRows) {
  if (!Array.isArray(inputRows) || inputRows.length !== 20) return { ok: false, error: "All 20 auditorium rows must be configured." };
  const seen = new Set();
  const rows = [];
  for (const input of inputRows) {
    const row = String(input?.row || "").toUpperCase();
    const priceRupees = Math.round(Number(input?.priceRupees || 0));
    if (!ROW_LETTERS.includes(row) || seen.has(row)) return { ok: false, error: "Auditorium row configuration is invalid." };
    if (!Number.isFinite(priceRupees) || priceRupees < 0 || priceRupees > 100000) return { ok: false, error: `Enter a valid price for Row ${row}.` };
    seen.add(row);
    rows.push({
      row,
      seats: 25,
      category: String(input?.category || "General").trim().slice(0, 50) || "General",
      priceRupees,
      colour: /^#[0-9a-f]{6}$/i.test(String(input?.colour || "")) ? input.colour : "#26777a",
      enabled: input?.enabled !== false,
    });
  }
  return { ok: true, rows: rows.sort((a, b) => a.row.localeCompare(b.row)) };
}
