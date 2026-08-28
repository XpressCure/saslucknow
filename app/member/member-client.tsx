"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Member = {
  id: string;
  memberNumber: string;
  fullName: string;
  email: string;
  mobile: string;
  city: string;
  interests: string;
  skills: string;
  sevaPreference: string;
  pushpanjaliCertificateNumber: string;
  role: string;
  membershipStatus: "enabled" | "disabled";
};
type Sankalp = {
  id: string;
  title: string;
  summary: string;
  purpose: string;
  rules: string;
  status: string;
  stage: string;
  acceptsDonations: boolean;
  acceptsSeva: boolean;
  donorCount: number;
  volunteerCount: number;
  completionPercent: number;
  targetAmountRupees: number;
  receivedAmountRupees: number;
  remainingAmountRupees: number;
  fundingPercent: number;
  targetDate: string | null;
};
type Contribution = {
  id: string;
  receiptNumber: string;
  sankalpTitle: string;
  amountRupees: number;
  status: string;
  provider: string;
  contributedAt: string;
};
type FocusCampaign = {
  id: string;
  creativeRevisionId: string;
  templateId: string;
  themePackId: "teal_silence" | "indigo_savitri" | "saffron_sangha" | "rose_guidance" | "electric_uday";
  motionPresetId: string;
  displayMode: "card_only" | "coordinated_dashboard";
  destination: "dashboard" | "inner-room" | "reflections" | "sound" | "sangha" | "watch" | "library" | "sakhi" | "sankalp" | "yogdaan" | "parichay" | "bharat-uday";
  locale: "all" | "en" | "hi";
  maxImpressionsPerDay: number;
  copy: { eyebrow: string; headline: string; body: string; cta: string };
  copies: {
    en: { eyebrow: string; headline: string; body: string; cta: string };
    hi: { eyebrow: string; headline: string; body: string; cta: string };
  };
  startsAt: string;
  endsAt: string;
};
type Dashboard = {
  member: Member;
  organisation: { name: string; receiptIssuer: Record<string, string> | null };
  sankalps: Sankalp[];
  contributions: Contribution[];
  totals: { contributedRupees: number };
  payments: { razorpayEnabled: boolean };
  focusCampaign: FocusCampaign | null;
};
type Receipt = {
  receiptNumber: string;
  issuedAt: string;
  amountRupees: number;
  sankalpTitle: string;
  donor: { donorName: string; donorEmail: string; donorMobile: string; donorPan: string; donorAddress: string };
  providerPaymentId: string;
  organisation: string;
  receiptIssuer: Record<string, string> | null;
  note: string;
};
type WatchItem = {
  id: string;
  title: string;
  collection: "Song of Savitri" | "Gatherings";
  eyebrow: string;
  description: string;
  youtubeId: string;
  duration: string;
  meta: string;
  transcript: string;
  savitriReference?: {
    part: string;
    bookNo: string;
    cantoNo: string;
    cantoName: string;
    lineNos: string;
    pageNo: string;
  };
};
type SavedMoment = { id: string; videoId?: string; title: string; time: string; note: string };
type SanghaMedia = { kind: "image" | "video"; mimeType: string; name: string; url: string };
type SanghaPollOption = { id: string; text: string; votes: number };
type SanghaComment = { id: string; author: string; text: string; createdAt: string; isMine?: boolean };
type SanghaPost = { id: string; author: string; role?: string; type: string; text: string; createdAt: string; createdAtIst?: string; timezone?: string; isMine?: boolean; resonates: number; replies: number; resonated?: boolean; saved?: boolean; comments?: SanghaComment[]; media?: SanghaMedia | null; pollOptions?: SanghaPollOption[]; selectedOptionId?: string };
type ReflectionMedia = { kind: "image"; mimeType: string; name: string; url: string };
type ReflectionFollowUp = { id: string; text: string; createdAt: string; createdAtIst: string; media?: ReflectionMedia | null };
type MemberReflection = { id: string; text: string; sessionMinutes: number; createdAt: string; createdAtIst: string; updatedAt: string; timezone: "Asia/Kolkata"; media?: ReflectionMedia | null; followUps: ReflectionFollowUp[] };
type WeeklySilenceRecord = { week: string; minutes: number };
type InnerRoomMode = "idle" | "setup" | "running" | "resting" | "prompt";
type DarshanPanel = "home" | "inner-room" | "reflections" | "library" | "sakhi";
type MemberSakhiMessage = { role: "user" | "assistant"; content: string };
type InnerSoundTrack = { id: string; title: string; source: string; mood: string; description: string };
type InnerSoundChoice = { title: string; description: string; trackId?: string; minutes?: number };
type InnerSoundCollection = { label: string; number: string; introduction: string; choices: InnerSoundChoice[] };
type MemberApiErrorCode = "MEMBERSHIP_DISABLED" | string;

type MemberLibraryCollection = {
  category: "Books" | "Audio" | "Explore";
  title: string;
  count: string;
  items: string[];
  href: string;
};

const INNER_ROOM_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "Open-ended", minutes: 0 },
];
const INNER_ROOM_MUSIC_SRC = "/quiet-aspiration.wav";
const INNER_ROOM_MUSIC_FALLBACK = "/mothers-organ-joy-1960.mp3";
const SILENCE_STORAGE_KEY = "sas-inner-room-silence-v1";
const WATCH_STORAGE_KEY = "sas-watch-space-v1";
const INNER_SOUND_STORAGE_KEY = "sas-inner-sound-v1";
const SANGHA_STORAGE_KEY = "sas-sangha-v1";
const SANGHA_POST_TYPES = ["Reflection", "Video", "Artwork", "Photo", "Poll"] as const;
const MEMBERSHIP_DISABLED_EVENT = "sas-membership-disabled";

class MemberApiError extends Error {
  code: MemberApiErrorCode;

  constructor(message: string, code = "") {
    super(message);
    this.name = "MemberApiError";
    this.code = code;
  }
}

function isMembershipDisabledError(error: unknown): error is MemberApiError {
  return error instanceof MemberApiError && error.code === "MEMBERSHIP_DISABLED";
}

function countWords(value: string) {
  const text = value.trim();
  return text ? text.split(/\s+/u).length : 0;
}

const WATCH_ITEMS: WatchItem[] = [
  { id: "savitri-dawn", title: "The Symbol Dawn", collection: "Song of Savitri", eyebrow: "BOOK ONE - CANTO ONE", description: "Five luminous lines from Savitri, carried through image, voice and meaning.", youtubeId: "", duration: "5 lines", meta: "Part 1 - Book 1 - Canto 1", transcript: "It was the hour before the Gods awake. Across the path of the divine Event...", savitriReference: { part: "1", bookNo: "1", cantoNo: "1", cantoName: "The Symbol Dawn", lineNos: "1-5", pageNo: "1" } },
  { id: "gathering-quiet", title: "A quiet practice of aspiration", collection: "Gatherings", eyebrow: "COLLECTIVE LEARNINGS", description: "A recorded glimpse from the centre's study and sharing space.", youtubeId: "", duration: "60 min", meta: "Gathering 27 - Study circle", transcript: "Welcome. We begin with a moment of quiet, and then turn to the practice of aspiration..." },
  { id: "savitri-awakening", title: "A thought was sown", collection: "Song of Savitri", eyebrow: "BOOK ONE - CANTO ONE", description: "A visual passage from the opening movement of Savitri.", youtubeId: "", duration: "5 lines", meta: "Part 1 - Book 1 - Lines 70-74", transcript: "A thought was sown in the unsounded Void, A sense was born within the darkness' depths...", savitriReference: { part: "1", bookNo: "1", cantoNo: "1", cantoName: "The Symbol Dawn", lineNos: "70-74", pageNo: "" } },
];

const INNER_SOUND_TRACKS: InnerSoundTrack[] = [
  { id: "silence", title: "Silence", source: "/inner-sound/silence-space.wav", mood: "Silence", description: "A near-silent field with a low, spacious resonance." },
  { id: "peace", title: "Peace", source: "/inner-sound/peace-bowl.wav", mood: "Peace", description: "Warm singing-bowl tones settling into quiet." },
  { id: "aspiration", title: "Aspiration", source: "/quiet-aspiration.wav", mood: "Aspiration", description: "A gentle upward movement for focused aspiration." },
  { id: "nature", title: "Nature", source: "/inner-sound/nature-breeze.wav", mood: "Nature", description: "Soft air, distant birds and a steady contemplative drone." },
  { id: "begin-day", title: "Begin the Day", source: "/inner-sound/dawn-bells.wav", mood: "Morning", description: "Clear dawn bells for a calm beginning." },
  { id: "sunrise", title: "Sunrise Meditation", source: "/inner-sound/sunrise-glow.wav", mood: "Morning", description: "A luminous, slowly opening morning soundscape." },
  { id: "evening", title: "Evening Silence", source: "/inner-sound/evening-stillness.wav", mood: "Evening", description: "Deep, unhurried tones for the close of day." },
  { id: "mothers-music", title: "Mother's Music", source: "/mothers-organ-joy-1960.mp3", mood: "Evening", description: "The Mother's organ music — Joy, 12 March 1960." },
  { id: "sleep", title: "Peace Before Sleep", source: "/inner-sound/peace-before-sleep.wav", mood: "Evening", description: "Low, restful harmonies for releasing the day." },
  { id: "concentration", title: "For Concentration", source: "/inner-sound/concentration-drone.wav", mood: "Concentration", description: "A steady tonal centre for undistracted attention." },
  { id: "gratitude", title: "For Gratitude", source: "/inner-sound/gratitude-chimes.wav", mood: "Gratitude", description: "Light, spacious chimes with a warm undertone." },
  { id: "courage", title: "For Courage", source: "/inner-sound/courage-flame.wav", mood: "Courage", description: "A measured, quietly strengthening pulse." },
];
const INNER_SOUND_COLLECTIONS: InnerSoundCollection[] = [
  { label: "Morning", number: "01", introduction: "Soundscapes for awakening, clarity and a conscious beginning.", choices: [
    { title: "Begin the Day", description: "Clear dawn bells", trackId: "begin-day" },
    { title: "Quiet Aspiration", description: "An inward opening", trackId: "aspiration" },
    { title: "Sunrise Meditation", description: "A luminous arrival", trackId: "sunrise" },
  ] },
  { label: "Evening", number: "02", introduction: "Gentle listening for release, repose and returning within.", choices: [
    { title: "Evening Silence", description: "Release the movement of the day", trackId: "evening" },
    { title: "Mother's Music", description: "Organ music — Joy, 1960", trackId: "mothers-music" },
    { title: "Peace Before Sleep", description: "Rest in a lower, slower field", trackId: "sleep" },
  ] },
  { label: "States", number: "03", introduction: "Choose the inner quality you wish to invite and sustain.", choices: [
    { title: "When I Need Peace", description: "Settle and widen", trackId: "peace" },
    { title: "For Concentration", description: "Gather the attention", trackId: "concentration" },
    { title: "For Gratitude", description: "Open to quiet thankfulness", trackId: "gratitude" },
    { title: "For Aspiration", description: "Turn towards the light", trackId: "aspiration" },
    { title: "For Courage", description: "Strengthen the inner flame", trackId: "courage" },
  ] },
  { label: "Duration", number: "04", introduction: "Set a listening period. The sound will close gently when the time is complete.", choices: [
    { title: "3 minutes", description: "A brief reset", minutes: 3 },
    { title: "5 minutes", description: "A quiet pause", minutes: 5 },
    { title: "10 minutes", description: "A settled practice", minutes: 10 },
    { title: "20 minutes", description: "A deeper interval", minutes: 20 },
    { title: "Open-ended", description: "Remain as long as you wish", minutes: 0 },
  ] },
];

const MEMBER_LIBRARY_COLLECTIONS: MemberLibraryCollection[] = [
  { category: "Books", title: "Works of Sri Aurobindo", count: "170+ books", items: ["Savitri", "The Life Divine", "The Synthesis of Yoga"], href: "https://www.motherandsriaurobindo.in/Sri-Aurobindo/books/" },
  { category: "Books", title: "Works of the Mother", count: "160+ books", items: ["Prayers and Meditations", "Questions and Answers", "Words of the Mother"], href: "https://www.motherandsriaurobindo.in/The-Mother/books/" },
  { category: "Audio", title: "Music, talks and readings", count: "Audio library", items: ["Meditation music", "Recorded talks", "Readings and messages"], href: "https://www.motherandsriaurobindo.in/The-Mother/audio/" },
  { category: "Explore", title: "Explore Savitri", count: "Poem and study", items: ["Search the text", "Meditations on Savitri", "Book and canto index"], href: "https://www.motherandsriaurobindo.in/Sri-Aurobindo/savitri/" },
  { category: "Explore", title: "Spiritual significance of flowers", count: "800+ flowers", items: ["Search by significance", "Browse by colour", "Botanical index"], href: "https://www.motherandsriaurobindo.in/The-Mother/spiritual-significance-of-flowers/" },
  { category: "Explore", title: "Guidance and quotations", count: "Daily inspiration", items: ["Their guidance", "Aphorisms", "Prayers and mantras"], href: "https://www.motherandsriaurobindo.in/guidance/" },
];

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const istDateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(`/api/participation/member${path}`, {
      credentials: "same-origin",
      ...options,
      signal: controller.signal,
      headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The member service is taking too long to respond. Please try again shortly.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new MemberApiError(result.error || "The requested action could not be completed.", String(result.code || ""));
    if (error.code === "MEMBERSHIP_DISABLED") {
      window.dispatchEvent(new CustomEvent(MEMBERSHIP_DISABLED_EVENT, { detail: error.message }));
    }
    throw error;
  }
  return result;
}

async function multipartApi<T>(path: string, body: FormData): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  let response: Response;
  try {
    response = await fetch(`/api/participation/member${path}`, { method: "POST", credentials: "same-origin", body, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The image upload is taking too long. Please try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new MemberApiError(result.error || "The requested action could not be completed.", String(result.code || ""));
    if (error.code === "MEMBERSHIP_DISABLED") window.dispatchEvent(new CustomEvent(MEMBERSHIP_DISABLED_EVENT, { detail: error.message }));
    throw error;
  }
  return result;
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Secure payment window could not load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Secure payment window could not load. Please check your connection."));
    document.head.appendChild(script);
  });
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Date to be announced";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date to be announced" : date.format(parsed);
}

function displayIstDateTime(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : `${istDateTime.format(parsed)} IST`;
}

function weekBucket(date = new Date()) {
  const monday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - day);
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
}

function formatInnerRoomTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getStoredWeekMinutes() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(SILENCE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as WeeklySilenceRecord;
    if (parsed.week !== weekBucket()) return 0;
    return Number(parsed.minutes) || 0;
  } catch {
    return 0;
  }
}

function persistWeekMinutes(minutes: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SILENCE_STORAGE_KEY, JSON.stringify({ week: weekBucket(), minutes }));
}

function pluralizeMinuteLabel(minutes: number) {
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function stageLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }

export function MemberClient() {
  const [member, setMember] = useState<Member | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [checking, setChecking] = useState(true);
  const [membershipDisabledMessage, setMembershipDisabledMessage] = useState("");
  const [tab, setTab] = useState<"darshan" | "watch" | "sound" | "sangha" | "sankalp" | "parichay" | "yogdaan">("darshan");
  const [darshanPanel, setDarshanPanel] = useState<DarshanPanel>("home");
  const [memberNavOpen, setMemberNavOpen] = useState(false);
  const [memberLibraryQuery, setMemberLibraryQuery] = useState("");
  const [memberSakhiInput, setMemberSakhiInput] = useState("");
  const [memberSakhiMessages, setMemberSakhiMessages] = useState<MemberSakhiMessage[]>([]);
  const [memberSakhiThinking, setMemberSakhiThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; title: string; detail: string } | null>(null);
  const [paymentSankalp, setPaymentSankalp] = useState<Sankalp | null>(null);
  const [celebration, setCelebration] = useState<{ contribution: Contribution; next: Sankalp | null } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const [innerRoomMode, setInnerRoomMode] = useState<InnerRoomMode>("idle");
  const [innerRoomMinutes, setInnerRoomMinutes] = useState(10);
  const [innerRoomElapsed, setInnerRoomElapsed] = useState(0);
  const [innerRoomStartedAt, setInnerRoomStartedAt] = useState(0);
  const [innerRoomWeeklyMinutes, setInnerRoomWeeklyMinutes] = useState(0);
  const [innerRoomMusicVolume, setInnerRoomMusicVolume] = useState(35 / 100);
  const [innerRoomThought, setInnerRoomThought] = useState("");
  const [innerRoomThoughtImage, setInnerRoomThoughtImage] = useState<File | null>(null);
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reflections, setReflections] = useState<MemberReflection[]>([]);
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);
  const innerRoomCloseTimer = useRef<number | null>(null);
  const innerRoomAudioRef = useRef<HTMLAudioElement | null>(null);
  const [watchItem, setWatchItem] = useState<WatchItem | null>(null);
  const [watchItems, setWatchItems] = useState<WatchItem[]>(WATCH_ITEMS);
  const [watchFilter, setWatchFilter] = useState<"All" | "Song of Savitri" | "Gatherings">("All");
  const [watchSearch, setWatchSearch] = useState("");
  const [watchLater, setWatchLater] = useState<string[]>([]);
  const [watchFavourites, setWatchFavourites] = useState<string[]>([]);
  const [watchBookmarks, setWatchBookmarks] = useState<string[]>([]);
  const [watchPlaylists, setWatchPlaylists] = useState<string[]>([]);
  const [watchComment, setWatchComment] = useState("");
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [watchNote, setWatchNote] = useState("");
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [watchResonated, setWatchResonated] = useState<string[]>([]);
  const [innerSoundPlaying, setInnerSoundPlaying] = useState(false);
  const [innerSoundVolume, setInnerSoundVolume] = useState(0.35);
  const [innerSoundMood, setInnerSoundMood] = useState("Peace");
  const [sanghaPosts, setSanghaPosts] = useState<SanghaPost[]>([]);
  const [sanghaDraft, setSanghaDraft] = useState("");
  const [sanghaType, setSanghaType] = useState("Reflection");
  const [sanghaPollOptions, setSanghaPollOptions] = useState(["", ""]);
  const [sanghaPublishing, setSanghaPublishing] = useState(false);
  const [activationDetails, setActivationDetails] = useState<{ mobile: string; reference: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "request-reset" | "complete-reset">("login");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [focusCampaignLanguage, setFocusCampaignLanguage] = useState<"en" | "hi">("en");
  const focusImpressionRef = useRef(new Set<string>());

  useEffect(() => {
    const handleDisabled = (event: Event) => {
      const detail = event instanceof CustomEvent ? String(event.detail || "") : "";
      setMembershipDisabledMessage(detail || "Your membership access is currently disabled. Please contact Sri Aurobindo Society, Lucknow for assistance.");
    };
    window.addEventListener(MEMBERSHIP_DISABLED_EVENT, handleDisabled);
    return () => window.removeEventListener(MEMBERSHIP_DISABLED_EVENT, handleDisabled);
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const mobile = parameters.get("mobile") || "";
    const reference = parameters.get("reference") || "";
    if (parameters.get("tab") === "yogdaan") setTab("yogdaan");
    if (parameters.get("activate") === "1" && /^[6-9]\d{9}$/.test(mobile) && /^PAR-\d{4}-[A-Z0-9]{8}$/.test(reference)) {
      setActivationDetails({ mobile, reference });
    }
  }, []);

  const filteredMemberLibrary = useMemo(() => {
    const query = memberLibraryQuery.trim().toLowerCase();
    if (!query) return MEMBER_LIBRARY_COLLECTIONS;
    return MEMBER_LIBRARY_COLLECTIONS.filter(item => `${item.title} ${item.count} ${item.items.join(" ")}`.toLowerCase().includes(query));
  }, [memberLibraryQuery]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCH_STORAGE_KEY) || "{}") as { later?: string[]; favourites?: string[]; bookmarks?: string[]; playlists?: string[]; moments?: SavedMoment[] };
      setWatchLater(saved.later || []); setWatchFavourites(saved.favourites || []); setWatchBookmarks(saved.bookmarks || []); setWatchPlaylists(saved.playlists || []); setSavedMoments(saved.moments || []);
    } catch { /* device storage is optional */ }
  }, []);

  useEffect(() => {
    if (!member || membershipDisabledMessage) return;
    const controller = new AbortController();
    api<{ posts: SanghaPost[] }>("/sangha/posts", { signal: controller.signal })
      .then(result => setSanghaPosts(result.posts))
      .catch(error => { if (error?.name !== "AbortError") console.error("Sangha could not be loaded", error); });
    return () => controller.abort();
  }, [member?.id, membershipDisabledMessage]);

  useEffect(() => {
    if (!member || membershipDisabledMessage) return;
    const controller = new AbortController();
    api<{ reflections: MemberReflection[] }>("/reflections", { signal: controller.signal })
      .then(result => setReflections(result.reflections))
      .catch(error => { if (error?.name !== "AbortError") console.error("Private reflections could not be loaded", error); });
    return () => controller.abort();
  }, [member?.id, membershipDisabledMessage]);

  useEffect(() => {
    try { localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify({ later: watchLater, favourites: watchFavourites, bookmarks: watchBookmarks, playlists: watchPlaylists, moments: savedMoments })); } catch { /* optional */ }
  }, [watchLater, watchFavourites, watchBookmarks, watchPlaylists, savedMoments]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/savitri-videos", { signal: controller.signal }).then(response => response.ok ? response.json() : { items: [] }),
      fetch("/api/gallery-items", { signal: controller.signal }).then(response => response.ok ? response.json() : { items: [] }),
    ]).then(([savitri, gallery]) => {
      const savitriItems: WatchItem[] = Array.isArray(savitri.items) ? savitri.items.filter((item: Record<string, unknown>) => item.youtubeId).map((item: Record<string, unknown>) => ({
        id: String(item.id || `savitri-${item.youtubeId}`), title: String(item.cantoName || "The Song of Savitri"), collection: "Song of Savitri", eyebrow: `PART ${String(item.part || "1")} - BOOK ${String(item.bookNo || "")}`, description: String(item.description || "A visual passage from Savitri with English and Hindi meaning."), youtubeId: String(item.youtubeId || ""), duration: "5 lines", meta: `Canto ${String(item.cantoNo || "")} - Lines ${String(item.lineNos || "")} - Page ${String(item.pageNo || "")}`, transcript: String(item.description || "Transcript will appear with this passage."), savitriReference: { part: String(item.part || "1"), bookNo: String(item.bookNo || ""), cantoNo: String(item.cantoNo || ""), cantoName: String(item.cantoName || "The Song of Savitri"), lineNos: String(item.lineNos || ""), pageNo: String(item.pageNo || "") },
      })) : [];
      const galleryItems: WatchItem[] = Array.isArray(gallery.items) ? gallery.items.filter((item: Record<string, unknown>) => item.youtubeId).map((item: Record<string, unknown>) => ({
        id: String(item.id || `gathering-${item.youtubeId}`), title: String(item.title || "Gathering through the years"), collection: "Gatherings", eyebrow: String(item.category || "COLLECTIVE LEARNINGS"), description: String(item.description || "A recorded gathering from the Society."), youtubeId: String(item.youtubeId || ""), duration: "Gathering", meta: item.eventDate ? String(item.eventDate) : "SAS Lucknow", transcript: String(item.description || "Transcript will be added to this gathering."),
      })) : [];
      setWatchItems([...savitriItems, ...galleryItems]);
    }).catch(error => { if (error?.name !== "AbortError") setWatchItems(WATCH_ITEMS); });
    return () => controller.abort();
  }, []);

  const liveSankalps = useMemo(() => dashboard?.sankalps.filter(item => item.status === "active") || [], [dashboard]);

  const loadDashboard = useCallback(async () => {
    const result = await api<Dashboard>("/dashboard");
    setMember(result.member);
    setDashboard(result);
  }, []);

  useEffect(() => {
    api<{ member: Member; membershipDisabled?: boolean; message?: string }>("/auth/me")
      .then(result => {
        setMember(result.member);
        if (result.membershipDisabled || result.member.membershipStatus === "disabled") {
          setMembershipDisabledMessage(result.message || "Your membership access is currently disabled. Please contact Sri Aurobindo Society, Lucknow for assistance.");
          return;
        }
        return loadDashboard();
      })
      .catch(error => {
        if (isMembershipDisabledError(error)) setMembershipDisabledMessage(error.message);
        else setMember(null);
      })
      .finally(() => setChecking(false));
  }, [loadDashboard]);

  useEffect(() => {
    const campaignId = dashboard?.focusCampaign?.id;
    if (!campaignId || focusImpressionRef.current.has(campaignId)) return;
    focusImpressionRef.current.add(campaignId);
    void api<{ recorded: boolean; remainingToday: number }>(`/focus-campaigns/${campaignId}/impression`, { method: "POST", body: "{}" })
      .then(result => {
        if (!result.recorded && result.remainingToday === 0) {
          setDashboard(current => current ? { ...current, focusCampaign: null } : current);
        }
      })
      .catch(error => {
        focusImpressionRef.current.delete(campaignId);
        console.error("Focus Campaign impression could not be recorded", error);
      });
  }, [dashboard?.focusCampaign?.id]);

  useEffect(() => {
    const campaign = dashboard?.focusCampaign;
    if (!campaign) return;
    if (campaign.locale === "hi") setFocusCampaignLanguage("hi");
    else if (campaign.locale === "en") setFocusCampaignLanguage("en");
    else setFocusCampaignLanguage(navigator.language.toLowerCase().startsWith("hi") ? "hi" : "en");
  }, [dashboard?.focusCampaign?.id, dashboard?.focusCampaign?.locale]);

  useEffect(() => {
    if (!member || membershipDisabledMessage) return;
    const verifyAccess = () => {
      void api<{ member: Member }>("/auth/me").catch(error => {
        if (isMembershipDisabledError(error)) setMembershipDisabledMessage(error.message);
      });
    };
    const timer = window.setInterval(verifyAccess, 30000);
    const handleVisibility = () => { if (document.visibilityState === "visible") verifyAccess(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [member, membershipDisabledMessage]);

  useEffect(() => {
    setInnerRoomWeeklyMinutes(getStoredWeekMinutes());
  }, []);

  useEffect(() => {
    if (innerRoomMode !== "running" || !innerRoomStartedAt) return;
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - innerRoomStartedAt) / 1000);
      setInnerRoomElapsed(elapsed);
      if (innerRoomMinutes > 0 && elapsed >= innerRoomMinutes * 60) {
        finishInnerRoom(elapsed);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [innerRoomMode, innerRoomStartedAt, innerRoomMinutes]);

  useEffect(() => {
    const audio = innerRoomAudioRef.current;
    if (!audio) return;
    audio.volume = innerRoomMusicVolume;
    if (innerRoomMode === "running") {
      void audio.play().catch(() => {
        setNotice({ tone: "info", title: "Audio needs your permission", detail: "Please press Begin again to start meditation music." });
      });
    } else {
      audio.pause();
      if (innerRoomMode !== "prompt") {
        audio.currentTime = 0;
      }
    }
  }, [innerRoomMode, innerRoomMusicVolume]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const result = await api<{ member: Member; message?: string }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ identity: data.get("identity"), password: data.get("password") }) },
      );
      setMember(result.member);
      if (result.member.membershipStatus === "disabled") {
        setMembershipDisabledMessage("Your membership access is currently disabled. Please contact Sri Aurobindo Society, Lucknow for assistance.");
      } else {
        setMembershipDisabledMessage("");
        await loadDashboard();
      }
      form.reset();
      setNotice(null);
    } catch (error) {
      if (isMembershipDisabledError(error)) setMembershipDisabledMessage(error.message);
      setNotice({ tone: "error", title: "Could not continue", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    try {
      const result = await api<{ message: string }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setPasswordResetEmail(email);
      setAuthMode("complete-reset");
      setNotice({ tone: "success", title: "Verification code sent", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Reset email could not be sent", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function completePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ message: string }>("/auth/password-reset/complete", {
        method: "POST",
        body: JSON.stringify({ email: passwordResetEmail, code: data.get("code"), password: data.get("password") }),
      });
      event.currentTarget.reset();
      setAuthMode("login");
      setNotice({ tone: "success", title: "Password changed", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Password could not be changed", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    setMember(null);
    setDashboard(null);
    setMembershipDisabledMessage("");
    setTab("darshan");
    setNotice(null);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ member: Member; message: string }>(
        "/profile",
        { method: "PATCH", body: JSON.stringify({ city: data.get("city"), interests: data.get("interests"), skills: data.get("skills"), sevaPreference: data.get("sevaPreference") }) },
      );
      setMember(result.member);
      setDashboard(current => current ? { ...current, member: result.member } : current);
      setNotice({ tone: "success", title: "Parichay updated", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Profile not saved", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function beginPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentSankalp || !member) return;
    setBusy(true);
    setNotice(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const result = await api<{ order: { id: string; amountPaise: number; currency: string; razorpayKeyId: string; sankalpTitle: string }; message: string }>(
        "/payments/razorpay/orders",
        {
          method: "POST",
          body: JSON.stringify({
            sankalpId: paymentSankalp.id,
            amountRupees: data.get("amountRupees"),
            donorName: data.get("donorName"),
            donorEmail: data.get("donorEmail"),
            donorMobile: data.get("donorMobile"),
            donorPan: data.get("donorPan"),
            donorAddress: data.get("donorAddress"),
          }),
        },
      );
      await loadRazorpay();
      const Razorpay = (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void } }).Razorpay;
      const checkout = new Razorpay({
        key: result.order.razorpayKeyId,
        amount: result.order.amountPaise,
        currency: result.order.currency,
        order_id: result.order.id,
        name: "Sri Aurobindo Society",
        description: result.order.sankalpTitle,
        image: "/society-logo-transparent.png",
        prefill: { name: data.get("donorName"), email: data.get("donorEmail"), contact: data.get("donorMobile") },
        theme: { color: "#173846" },
        modal: { ondismiss: () => setNotice({ tone: "info", title: "Payment window closed", detail: "No contribution was recorded. You can continue whenever you are ready." }) },
        handler: async (payment: Record<string, string>) => {
          setBusy(true);
          try {
            const verified = await api<{ contribution: Contribution; message: string }>(
              "/payments/razorpay/verify",
              { method: "POST", body: JSON.stringify({ razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature }) },
            );
            await loadDashboard();
            const next = liveSankalps.filter(item => item.id !== paymentSankalp.id && item.acceptsDonations)
              .sort((a, b) => a.remainingAmountRupees - b.remainingAmountRupees)[0] || null;
            setPaymentSankalp(null);
            setCelebration({ contribution: verified.contribution, next });
          } catch (error) {
            setNotice({ tone: "error", title: "Payment needs attention", detail: error instanceof Error ? error.message : "The centre will verify the payment status." });
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", response => setNotice({ tone: "error", title: "Payment was not completed", detail: response.error?.description || "No contribution was recorded. Please try again." }));
      checkout.open();
    } catch (error) {
      setNotice({ tone: "error", title: "Payment could not start", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function openReceipt(id: string) {
    try {
      const result = await api<{ receipt: Receipt }>(`/contributions/${id}/receipt`);
      setReceipt(result.receipt);
    } catch (error) {
      setNotice({ tone: "error", title: "Receipt not available", detail: error instanceof Error ? error.message : "Please try again." });
    }
  }

  function openInnerRoom() {
    setInnerRoomMode("setup");
    setInnerRoomThought("");
    setInnerRoomThoughtImage(null);
    setInnerRoomStartedAt(0);
    setInnerRoomElapsed(0);
  }

  function beginInnerRoom() {
    const audio = innerRoomAudioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = innerRoomMusicVolume;
      void audio.play().catch(() => {
        setNotice({ tone: "info", title: "Audio needs your permission", detail: "Press Begin again once permission is granted by your browser." });
      });
    }
    setInnerRoomMode("running");
    setInnerRoomStartedAt(Date.now());
    setInnerRoomElapsed(0);
    setInnerRoomThought("");
  }

  function finishInnerRoom(elapsed: number) {
    if (innerRoomMode !== "running") return;
    if (innerRoomCloseTimer.current) {
      window.clearTimeout(innerRoomCloseTimer.current);
      innerRoomCloseTimer.current = null;
    }
    const sessionMinutes = Math.max(1, Math.round(Math.max(elapsed, 1) / 60));
    const nextWeekTotal = innerRoomWeeklyMinutes + sessionMinutes;
    persistWeekMinutes(nextWeekTotal);
    setInnerRoomWeeklyMinutes(nextWeekTotal);
    setInnerRoomMode("resting");
    innerRoomCloseTimer.current = window.setTimeout(() => {
      setInnerRoomMode("prompt");
      innerRoomCloseTimer.current = null;
    }, 1600);
  }

  function stopInnerRoomManually() {
    if (innerRoomMode !== "running") return;
    finishInnerRoom(innerRoomElapsed);
  }

  function closeInnerRoom() {
    if (innerRoomCloseTimer.current) {
      window.clearTimeout(innerRoomCloseTimer.current);
      innerRoomCloseTimer.current = null;
    }
    const audio = innerRoomAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setInnerRoomMode("idle");
    setInnerRoomThought("");
    setInnerRoomThoughtImage(null);
    setInnerRoomElapsed(0);
    setInnerRoomStartedAt(0);
  }

  function handleInnerRoomVolumeChange(value: number) {
    const normalized = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.45;
    setInnerRoomMusicVolume(normalized);
    const audio = innerRoomAudioRef.current;
    if (audio) audio.volume = normalized;
  }

  async function saveInnerRoomThought() {
    if (!innerRoomThought.trim() || reflectionSaving) return;
    setReflectionSaving(true);
    try {
      const form = new FormData();
      form.set("text", innerRoomThought.trim());
      form.set("sessionMinutes", String(Math.max(1, Math.round(Math.max(innerRoomElapsed, 1) / 60))));
      if (innerRoomThoughtImage) form.set("media", innerRoomThoughtImage);
      const result = await multipartApi<{ reflection: MemberReflection; message: string }>("/reflections", form);
      setReflections(current => [result.reflection, ...current]);
      closeInnerRoom();
      setNotice({ tone: "success", title: "Reflection saved", detail: "Your thought is now in My Reflections, private to your member account." });
    } catch (error) {
      setNotice({ tone: "error", title: "Reflection not saved", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setReflectionSaving(false);
    }
  }

  async function addReflectionFollowUp(reflectionId: string, text: string, image: File | null) {
    const form = new FormData();
    form.set("text", text.trim());
    if (image) form.set("media", image);
    const result = await multipartApi<{ reflection: MemberReflection; message: string }>(`/reflections/${reflectionId}/follow-ups`, form);
    setReflections(current => current.map(item => item.id === reflectionId ? result.reflection : item));
    setNotice({ tone: "success", title: "Thought added", detail: "Your reflection has been extended and remains private." });
    return result.reflection;
  }

  function toggleList(kind: "later" | "favourites" | "bookmarks" | "playlists", id: string) {
    const setter = kind === "later" ? setWatchLater : kind === "favourites" ? setWatchFavourites : kind === "bookmarks" ? setWatchBookmarks : setWatchPlaylists;
    setter(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function saveWatchMoment() {
    if (!watchItem) return;
    const moment: SavedMoment = { id: `${watchItem.id}-${Date.now()}`, videoId: watchItem.id, title: watchItem.title, time: "34:17", note: "Important explanation about surrender." };
    setSavedMoments(current => [moment, ...current]);
    setNotice({ tone: "success", title: "Moment saved", detail: `${watchItem.title} - 34:17 is now in your saved moments.` });
  }

  function shareWatchItem() {
    if (!watchItem) return;
    const share = { title: watchItem.title, text: `${watchItem.title} - ${watchItem.collection} - SAS Lucknow Member Space`, url: window.location.href };
    if (navigator.share) void navigator.share(share).catch(() => null);
    else void navigator.clipboard?.writeText(`${share.text}\n${share.url}`).then(() => setNotice({ tone: "success", title: "Link copied", detail: "You can now share this watch-space item." }));
  }

  function saveWatchNote() {
    if (!watchItem || !watchNote.trim()) return;
    setNotice({ tone: "success", title: "Private note saved", detail: `Your note for ${watchItem.title} is saved on this device.` });
    setWatchNote("");
    setWatchItem(null);
  }

  function resonateWithWatch() {
    if (!watchItem) return;
    setWatchResonated(current => current.includes(watchItem.id) ? current.filter(id => id !== watchItem.id) : [...current, watchItem.id]);
  }

  async function publishSanghaPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const text = sanghaDraft.trim();
    if (!text || countWords(text) > 1000 || sanghaPublishing) return;
    if (sanghaType === "Poll") {
      const choices = sanghaPollOptions.map(value => value.trim()).filter(Boolean);
      if (choices.length < 2 || choices.length > 4 || choices.some(value => countWords(value) > 10)) {
        setNotice({ tone: "error", title: "Complete the poll", detail: "Add two to four options, using no more than 10 words in each option." });
        return;
      }
    }
    setSanghaPublishing(true);
    try {
      const form = new FormData(formElement);
      form.set("type", sanghaType);
      form.set("text", text);
      form.set("pollOptions", JSON.stringify(sanghaType === "Poll" ? sanghaPollOptions : []));
      const response = await fetch("/api/participation/member/sangha/posts", { method: "POST", credentials: "same-origin", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your post could not be shared.");
      setSanghaPosts(current => [result.post, ...current]);
      setSanghaDraft("");
      setSanghaPollOptions(["", ""]);
      formElement.reset();
      setNotice({ tone: "success", title: "Shared with Sangha", detail: result.message || "Your post is now visible to signed-in members." });
    } catch (error) {
      setNotice({ tone: "error", title: "Could not share", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSanghaPublishing(false);
    }
  }

  async function activateContributorAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activationDetails) return;
    setBusy(true);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ member: Member; message: string }>("/auth/activate", {
        method: "POST",
        body: JSON.stringify({ mobile: activationDetails.mobile, reference: activationDetails.reference, password: data.get("password") }),
      });
      setMember(result.member);
      setActivationDetails(null);
      setTab("yogdaan");
      window.history.replaceState({}, "", "/member?tab=yogdaan");
      await loadDashboard();
      setNotice({ tone: "success", title: "Your member space is ready", detail: `${result.message} Your verified contribution appears below in My Yogdaan.` });
    } catch (error) {
      setNotice({ tone: "error", title: "Password could not be set", detail: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function voteOnSanghaPoll(postId: string, optionId: string) {
    try {
      const result = await api<{ post: SanghaPost; message: string }>(`/sangha/posts/${postId}/vote`, { method: "POST", body: JSON.stringify({ optionId }) });
      setSanghaPosts(current => current.map(post => post.id === postId ? result.post : post));
      setNotice({ tone: "success", title: "Response recorded", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Could not record response", detail: error instanceof Error ? error.message : "Please try again." });
    }
  }

  async function resonateWithSanghaPost(postId: string) {
    try {
      const result = await api<{ resonated: boolean; resonates: number; message: string }>(`/sangha/posts/${postId}/resonate`, { method: "POST", body: "{}" });
      setSanghaPosts(current => current.map(post => post.id === postId ? { ...post, resonated: result.resonated, resonates: result.resonates } : post));
      setNotice({ tone: "success", title: result.resonated ? "This resonates" : "Resonance removed", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Could not update resonance", detail: error instanceof Error ? error.message : "Please try again." });
    }
  }

  async function saveSanghaPost(postId: string) {
    try {
      const result = await api<{ saved: boolean; message: string }>(`/sangha/posts/${postId}/save`, { method: "POST", body: "{}" });
      setSanghaPosts(current => current.map(post => post.id === postId ? { ...post, saved: result.saved } : post));
      setNotice({ tone: "success", title: result.saved ? "Post saved" : "Post removed", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Could not update saved posts", detail: error instanceof Error ? error.message : "Please try again." });
    }
  }

  async function commentOnSanghaPost(postId: string, text: string) {
    try {
      const result = await api<{ comment: SanghaComment; replies: number; message: string }>(`/sangha/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ text }) });
      setSanghaPosts(current => current.map(post => post.id === postId ? { ...post, comments: [...(post.comments || []), result.comment], replies: result.replies } : post));
      setNotice({ tone: "success", title: "Reflection added", detail: result.message });
    } catch (error) {
      setNotice({ tone: "error", title: "Could not add reflection", detail: error instanceof Error ? error.message : "Please try again." });
      throw error;
    }
  }

  async function shareSanghaPost(post: SanghaPost) {
    const shareText = `${post.text.slice(0, 180)}${post.text.length > 180 ? "..." : ""}\n\nShared from Sangha - Sri Aurobindo Society, Lucknow`;
    const shareData = { title: `Sangha - ${post.type}`, text: shareText, url: `${window.location.origin}/member?sangha=${encodeURIComponent(post.id)}` };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setNotice({ tone: "success", title: "Post link copied", detail: "You can paste it into WhatsApp, email or another app." });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ tone: "error", title: "Could not share", detail: "Please try again or copy the page link from your browser." });
    }
  }

  async function askMemberSakhi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = memberSakhiInput.trim();
    if (!question || memberSakhiThinking) return;
    const conversation = [...memberSakhiMessages, { role: "user" as const, content: question }].slice(-12);
    setMemberSakhiMessages(conversation);
    setMemberSakhiInput("");
    setMemberSakhiThinking(true);
    try {
      const response = await fetch("/api/savitri-sakhi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: conversation }) });
      const result = await response.json().catch(() => ({})) as { answer?: string; error?: string };
      if (!response.ok || typeof result.answer !== "string") throw new Error(result.error || "Savitri Sakhi could not answer just now.");
      setMemberSakhiMessages([...conversation, { role: "assistant", content: result.answer }]);
    } catch (error) {
      setMemberSakhiMessages([...conversation, { role: "assistant", content: error instanceof Error ? error.message : "Savitri Sakhi is temporarily unavailable. Please try again." }]);
    } finally {
      setMemberSakhiThinking(false);
    }
  }

  const watchSearchTerms = watchSearch.trim().toLocaleLowerCase().normalize("NFKC").split(/\s+/).filter(Boolean);
  const filteredWatchItems = watchItems.filter(item => {
    if (watchFilter !== "All" && item.collection !== watchFilter) return false;
    if (!watchSearchTerms.length) return true;
    const searchableText = [
      item.title,
      item.collection,
      item.eyebrow,
      item.meta,
      item.description,
      item.transcript,
      item.savitriReference?.part,
      item.savitriReference?.bookNo,
      item.savitriReference?.cantoNo,
      item.savitriReference?.cantoName,
      item.savitriReference?.lineNos,
      item.savitriReference?.pageNo,
    ].filter(Boolean).join(" ").toLocaleLowerCase().normalize("NFKC");
    return watchSearchTerms.every(term => searchableText.includes(term));
  });

  const activeInnerRoom = innerRoomMode !== "idle";
  if (checking) return <main className="member-shell member-loading"><Image src="/society-logo-transparent.png" alt="" width={72} height={72} unoptimized /><p>Opening the member space...</p></main>;

  if (!member) return <main className="member-shell member-auth">
    <Link className="member-auth-brand" href="/"><Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={70} height={70} unoptimized /><span>Sri Aurobindo Society<small>Lucknow Centre</small></span></Link>
    <section className="member-auth-panel">
      <div className="member-auth-copy"><p>MEMBER SPACE</p><h1>Welcome to your member space.</h1><span>Follow the Sankalp, offer seva, contribute securely and keep every acknowledgement in one private place.</span></div>
      <div className="member-auth-form">
        {activationDetails ? <>
          <p className="member-eyebrow">CONTRIBUTOR ACCOUNT</p><h2>Choose your member password</h2><p>Your verified contribution has already created member ID access. Set a private password to enter the community.</p>
          <form onSubmit={activateContributorAccount}>
            <label>Mobile number<input readOnly value={activationDetails.mobile} autoComplete="username" /></label>
            <label>Create password<input required type="password" name="password" minLength={10} autoComplete="new-password" /><small>Use at least 10 characters with a letter and number.</small></label>
            <button className="member-primary" disabled={busy}>{busy ? "Preparing your member space..." : "Set Password and Enter"}</button>
          </form>
          <button type="button" className="member-link-button" onClick={() => { setActivationDetails(null); window.history.replaceState({}, "", "/member"); }}>I already have a password</button>
        </> : authMode === "request-reset" ? <>
          <p className="member-eyebrow">SECURE PASSWORD RECOVERY</p>
          <h2>Reset your password</h2>
          <p>Enter the email registered with your member account. We will email you a six-digit verification code.</p>
          <form onSubmit={requestPasswordReset}>
            <label>Registered email address<input required type="email" name="email" autoComplete="email" /></label>
            <button className="member-primary" disabled={busy}>{busy ? "Sending verification code..." : "Send verification code"}</button>
          </form>
          <button type="button" className="member-link-button" onClick={() => { setAuthMode("login"); setNotice(null); }}>Back to Member Login</button>
        </> : authMode === "complete-reset" ? <>
          <p className="member-eyebrow">CHECK YOUR EMAIL</p>
          <h2>Choose a new password</h2>
          <p>Enter the code sent to <strong>{passwordResetEmail}</strong>. It expires in 10 minutes and can be used once.</p>
          <form onSubmit={completePasswordReset}>
            <label>Registered email address<input readOnly value={passwordResetEmail} autoComplete="email" /></label>
            <label>Six-digit verification code<input required name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" /></label>
            <label>New password<input required type="password" name="password" minLength={10} autoComplete="new-password" /><small>Use at least 10 characters with a letter and number.</small></label>
            <button className="member-primary" disabled={busy}>{busy ? "Changing password..." : "Change password"}</button>
          </form>
          <div className="member-auth-actions">
            <button type="button" className="member-link-button" onClick={() => { setAuthMode("request-reset"); setNotice(null); }}>Request a new code</button>
            <button type="button" className="member-link-button" onClick={() => { setAuthMode("login"); setNotice(null); }}>Back to Member Login</button>
          </div>
        </> : <>
          <h2>Member Login</h2><p>Use your registered mobile number or email and password.</p>
          <form onSubmit={authenticate}><label>Mobile or email<input required name="identity" autoComplete="username" /></label><label>Password<input required type="password" name="password" minLength={10} autoComplete="current-password" /></label><button className="member-primary" disabled={busy}>{busy ? "Please wait..." : "Login"}</button></form>
          <button type="button" className="member-link-button member-forgot-password" onClick={() => { setAuthMode("request-reset"); setNotice(null); }}>Forgot password?</button>
          <p className="member-help">New here? <Link href="/joincommunity#parichay">Join the Community</Link>.</p>
        </>}
      </div>
    </section>
    {notice && <Notice notice={notice} close={() => setNotice(null)} />}
  </main>;

  if (activeInnerRoom) {
    return <main className="member-shell member-inner-room-shell">
      <button type="button" className="member-inner-room-close" onClick={closeInnerRoom} aria-label="Exit Inner Room">&times;</button>
      <div className="member-inner-room">
        {innerRoomMode === "setup" && <>
          <div className="member-inner-room-aura" aria-hidden="true"><img src="/auroville-matrimandir.png" alt="The golden Matrimandir in Auroville" /></div>
          <p className="member-eyebrow">INNER CIRCLE · INNER ROOM</p>
          <h2>The Inner Room</h2>
          <p>Silence</p>
          <div className="member-inner-room-options">
            {INNER_ROOM_OPTIONS.map(option => (
              <button
                key={option.label}
                className={innerRoomMinutes === option.minutes ? "member-primary" : ""}
                onClick={() => setInnerRoomMinutes(option.minutes)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="member-inner-room-volume">
            <label>
              <span>Meditation music volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={innerRoomMusicVolume}
                aria-label="Meditation music volume"
                onChange={(event) => handleInnerRoomVolumeChange(Number(event.target.value))}
              />
            </label>
            <small>{Math.round(innerRoomMusicVolume * 100)}%</small>
          </div>
          <button className="member-primary member-inner-room-begin" onClick={beginInnerRoom}>Begin</button>
        </>}
        {innerRoomMode === "running" && <>
          <div className="member-inner-room-aura" aria-hidden="true"><img src="/auroville-matrimandir.png" alt="The golden Matrimandir in Auroville" /></div>
          <p className="member-eyebrow">SILENCE</p>
          <p className="member-inner-room-time">
            {innerRoomMinutes === 0 ? formatInnerRoomTime(innerRoomElapsed) : formatInnerRoomTime(Math.max(0, innerRoomMinutes * 60 - innerRoomElapsed))}
          </p>
          <div className="member-inner-room-volume">
            <label>
              <span>Music volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={innerRoomMusicVolume}
                aria-label="Meditation music volume"
                onChange={(event) => handleInnerRoomVolumeChange(Number(event.target.value))}
              />
            </label>
            <small>{Math.round(innerRoomMusicVolume * 100)}%</small>
          </div>
          <button className="member-primary" onClick={stopInnerRoomManually}>End</button>
        </>}
        {innerRoomMode === "resting" && <>
          <h2>Remain silent for a moment.</h2>
          <p>Gathering your offering inwardly...</p>
        </>}
        {innerRoomMode === "prompt" && <>
          <p className="member-eyebrow">What came through?</p>
          <h2>Would you like to write one thought from your meditation?</h2>
          <textarea value={innerRoomThought} onChange={(event) => setInnerRoomThought(event.target.value)} rows={4} placeholder="Write one short reflection..." />
          <label className="member-reflection-image-field">
            <span>Attach an image <small>optional</small></span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setInnerRoomThoughtImage(event.target.files?.[0] || null)} />
            <small>{innerRoomThoughtImage ? innerRoomThoughtImage.name : "JPG, PNG or WebP up to 12 MB"}</small>
          </label>
          <p className="member-inner-room-week">You spent {pluralizeMinuteLabel(innerRoomWeeklyMinutes)} in silence this week.</p>
          <div className="member-inner-room-actions">
            <button className="member-primary" onClick={() => void saveInnerRoomThought()} disabled={!innerRoomThought.trim() || reflectionSaving}>{reflectionSaving ? "Saving..." : "Save thought"}</button>
            <button className="member-secondary" onClick={closeInnerRoom} disabled={reflectionSaving}>Continue</button>
          </div>
        </>}
      </div>
      <audio ref={innerRoomAudioRef} preload="auto" loop playsInline>
        <source src={INNER_ROOM_MUSIC_SRC} type="audio/wav" />
        <source src={INNER_ROOM_MUSIC_FALLBACK} type="audio/mpeg" />
      </audio>
    </main>;
  }

  const focusCampaign = dashboard?.focusCampaign || null;
  const focusCampaignCopy = focusCampaign?.copies?.[focusCampaignLanguage] || focusCampaign?.copy;
  const coordinatedCampaignClass = focusCampaign?.displayMode === "coordinated_dashboard" ? ` member-campaign-theme-${focusCampaign.themePackId}` : "";
  const openFocusCampaign = () => {
    if (!focusCampaign) return;
    void api<{ recorded: boolean }>(`/focus-campaigns/${focusCampaign.id}/action`, { method: "POST", body: JSON.stringify({ locale: focusCampaignLanguage }) })
      .catch(error => console.error("Focus Campaign action could not be recorded", error));
    switch (focusCampaign.destination) {
      case "inner-room": setTab("darshan"); setDarshanPanel("inner-room"); break;
      case "reflections": setTab("darshan"); setDarshanPanel("reflections"); break;
      case "sound": setTab("sound"); break;
      case "sangha": setTab("sangha"); break;
      case "watch": setTab("watch"); break;
      case "library": setTab("darshan"); setDarshanPanel("library"); break;
      case "sakhi": setTab("darshan"); setDarshanPanel("sakhi"); break;
      case "sankalp": setTab("sankalp"); break;
      case "yogdaan": setTab("yogdaan"); break;
      case "parichay": setTab("parichay"); break;
      case "bharat-uday": window.location.assign("/bharat-uday"); return;
      case "dashboard":
      default: setTab("darshan"); setDarshanPanel("home"); break;
    }
    document.documentElement.scrollTop = 0;
  };

  return <main className={`member-shell member-portal${coordinatedCampaignClass}`}>
    <header className="member-header">
      <Link href="/" className="member-brand">
        <Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={46} height={46} unoptimized />
        <span><strong>Sri Aurobindo Society</strong><small>Lucknow Centre · Member Portal</small></span>
      </Link>
      <div className="member-account"><span>Namaste, {member.fullName.split(" ")[0]}</span>{["administrator", "super_administrator"].includes(member.role) && <Link className="member-admin-link" href="/admin">Administration</Link>}<button className="member-menu-toggle" type="button" aria-expanded={memberNavOpen} aria-controls="member-navigation" onClick={() => setMemberNavOpen(value => !value)}>{memberNavOpen ? "Close" : "Menu"}</button><button onClick={signOut}>Sign out</button></div>
    </header>
    {memberNavOpen && <button className="member-nav-backdrop" type="button" aria-label="Close member menu" onClick={() => setMemberNavOpen(false)} />}
    <nav id="member-navigation" className={`member-nav ${memberNavOpen ? "open" : ""}`} aria-label="Member portal" onClick={() => setMemberNavOpen(false)}>
      <div className="member-nav-group">
        <button className={["darshan", "watch", "sound", "sangha"].includes(tab) ? "active member-nav-parent" : "member-nav-parent"} onClick={() => { setTab("darshan"); setDarshanPanel("home"); }}><span>D</span>Darshan</button>
        <div className="member-nav-subspaces" aria-label="Darshan spaces">
          <button className={tab === "darshan" && darshanPanel === "inner-room" ? "active" : ""} onClick={() => { setTab("darshan"); setDarshanPanel("inner-room"); }}>Inner Room</button>
          <button className={tab === "darshan" && darshanPanel === "reflections" ? "active" : ""} onClick={() => { setTab("darshan"); setDarshanPanel("reflections"); }}>My Reflections</button>
          <button className={tab === "sound" ? "active" : ""} onClick={() => setTab("sound")}>Inner Sound</button>
          <button className={tab === "sangha" ? "active" : ""} onClick={() => setTab("sangha")}>Sangha</button>
          <button className={tab === "watch" ? "active" : ""} onClick={() => setTab("watch")}>Watch Videos</button>
          <button className={tab === "darshan" && darshanPanel === "library" ? "active" : ""} onClick={() => { setTab("darshan"); setDarshanPanel("library"); }}>e-Library</button>
          <button className={tab === "darshan" && darshanPanel === "sakhi" ? "active" : ""} onClick={() => { setTab("darshan"); setDarshanPanel("sakhi"); }}>Savitri Sakhi</button>
        </div>
      </div>
      <button className={tab === "sankalp" ? "active" : ""} onClick={() => setTab("sankalp")}><span>S</span>Sankalp</button>
      <button className={tab === "yogdaan" ? "active" : ""} onClick={() => setTab("yogdaan")}><span>Y</span>Yogdaan</button>
      <button className={tab === "parichay" ? "active" : ""} onClick={() => setTab("parichay")}><span>P</span>Parichay</button>
      <button className="member-mobile-signout" onClick={signOut}><span>O</span>Sign out</button>
    </nav>
    <div className="member-content">
      {membershipDisabledMessage ? <section className="member-disabled-panel" role="alert">
        <p className="member-eyebrow">MEMBERSHIP DISABLED</p>
        <h1>This member space is currently unavailable.</h1>
        <p>{membershipDisabledMessage}</p>
        <p>Your account remains secure and you can sign in, but Darshan, Sankalp, Yogdaan, Sangha and Parichay actions are unavailable until the Lucknow Centre enables membership again.</p>
        <a className="member-primary" href="mailto:info.saslucknow@gmail.com">Contact the concerned centre</a>
      </section> : <>
      {tab === "darshan" && <><PageHeading eyebrow="A SHARED FIELD OF WORK" title={`Namaste, ${member.fullName.split(" ")[0]}`} text="A quiet member space for study, meditation, conversation and inward discovery." />
        {darshanPanel === "library" && <MemberLibrary query={memberLibraryQuery} setQuery={setMemberLibraryQuery} collections={filteredMemberLibrary} />}
        {darshanPanel === "sakhi" && <MemberSakhi messages={memberSakhiMessages} input={memberSakhiInput} setInput={setMemberSakhiInput} thinking={memberSakhiThinking} ask={askMemberSakhi} />}
        {darshanPanel === "reflections" && <MyReflections reflections={reflections} selectedId={selectedReflectionId} setSelectedId={setSelectedReflectionId} addFollowUp={addReflectionFollowUp} />}
        {darshanPanel === "inner-room" && <section className="member-inner-room-launch">
          <p className="member-eyebrow">DARSHAN · MEDITATION</p>
          <h2>The Inner Room</h2>
          <p>A no-clutter space for breath, stillness and brief introspection.</p>
          <p className="member-inner-room-week">You spent {pluralizeMinuteLabel(innerRoomWeeklyMinutes)} in silence this week.</p>
          <div className="member-inner-room-launch-actions"><button className="member-primary" onClick={openInnerRoom}>Open Inner Room</button><button className="member-secondary" onClick={() => setDarshanPanel("reflections")}>Open My Reflections</button></div>
        </section>}
        {darshanPanel === "home" && <>
        {focusCampaign && focusCampaignCopy && <section className={`member-focus-campaign member-focus-${focusCampaign.themePackId} member-focus-motion-${focusCampaign.motionPresetId}`}>
          <div className="member-focus-aureole" aria-hidden="true"><i /><i /><i /></div>
          <div className="member-focus-copy">{focusCampaign.locale === "all" && <div className="member-focus-language" aria-label="Campaign language"><button type="button" className={focusCampaignLanguage === "en" ? "active" : ""} onClick={() => setFocusCampaignLanguage("en")}>English</button><button type="button" className={focusCampaignLanguage === "hi" ? "active" : ""} onClick={() => setFocusCampaignLanguage("hi")}>हिन्दी</button></div>}<p>{focusCampaignCopy.eyebrow}</p><h2>{focusCampaignCopy.headline}</h2><span>{focusCampaignCopy.body}</span><button className="member-focus-action" onClick={openFocusCampaign}>{focusCampaignCopy.cta}<b>→</b></button></div>
        </section>}
        <section className="member-metrics"><div><span>Live Sankalp</span><strong>{liveSankalps.length}</strong></div><div><span>My Yogdaan</span><strong>{money.format(dashboard?.totals.contributedRupees || 0)}</strong></div><div><span>Acknowledgements</span><strong>{dashboard?.contributions.length || 0}</strong></div></section>
        <section className="member-band"><div><p>NEXT MEANINGFUL ACTION</p><h2>{liveSankalps[0]?.title || "New Sankalp are being prepared"}</h2><span>{liveSankalps[0]?.summary || "Return soon to participate in the centre's shared work."}</span></div>{liveSankalps[0] && <button className="member-primary" onClick={() => { setTab("sankalp"); document.documentElement.scrollTop = 0; }}>View Sankalp</button>}</section>
        <section className="member-quiet"><h2>A conscious offering</h2><blockquote>&ldquo;All life is Yoga.&rdquo;</blockquote><p>Participation is most powerful when aspiration, responsibility and transparent action move together.</p></section>
        </>}
      </>}
      {tab === "watch" && <WatchSpace items={filteredWatchItems} allItems={watchItems} filter={watchFilter} setFilter={setWatchFilter} search={watchSearch} setSearch={setWatchSearch} later={watchLater} favourites={watchFavourites} bookmarks={watchBookmarks} playlists={watchPlaylists} toggleList={toggleList} openItem={setWatchItem} savedMoments={savedMoments} />}
      {tab === "sound" && <InnerSound playing={innerSoundPlaying} setPlaying={setInnerSoundPlaying} volume={innerSoundVolume} setVolume={setInnerSoundVolume} mood={innerSoundMood} setMood={setInnerSoundMood} openInnerRoom={openInnerRoom} />}
      {tab === "sangha" && <Sangha posts={sanghaPosts} draft={sanghaDraft} setDraft={setSanghaDraft} type={sanghaType} setType={setSanghaType} pollOptions={sanghaPollOptions} setPollOptions={setSanghaPollOptions} publishing={sanghaPublishing} publish={publishSanghaPost} vote={voteOnSanghaPoll} resonate={resonateWithSanghaPost} savePost={saveSanghaPost} comment={commentOnSanghaPost} share={shareSanghaPost} />}
      {tab === "sankalp" && <><PageHeading eyebrow="COLLECTIVE COMMITMENTS" title="Sankalp" text="Understand the purpose, follow progress and support only the work that speaks to you." />
        <div className="member-sankalp-grid">{liveSankalps.map(item => <article key={item.id} className="member-sankalp-card"><div className="member-card-top"><span>{stageLabel(item.stage)}</span><strong>{item.fundingPercent}% supported</strong></div><h2>{item.title}</h2><p>{item.summary || item.purpose}</p><div className="member-progress"><i style={{ width: `${item.fundingPercent}%` }} /></div><dl><div><dt>Received</dt><dd>{money.format(item.receivedAmountRupees)}</dd></div><div><dt>Still needed</dt><dd>{item.targetAmountRupees ? money.format(item.remainingAmountRupees) : "Open"}</dd></div><div><dt>Participants</dt><dd>{item.donorCount}</dd></div></dl>{item.rules && <details><summary>Purpose and rules</summary><p>{item.purpose}</p><p>{item.rules}</p></details>}<div className="member-card-actions">{item.acceptsDonations && <button className="member-primary" onClick={() => setNotice({ tone: "info", title: "Online Seva offerings are coming soon", detail: "Thank you for your wish to support this Sankalp. Our secure contribution facility has been tested successfully and will open shortly. No payment has been initiated." })}>Offer Seva</button>}</div></article>)}</div>
      </>}
      {tab === "yogdaan" && <><PageHeading eyebrow="PRIVATE CONTRIBUTION RECORD" title="My Yogdaan" text="Only you and authorised administrators can see your amounts and payment references." />
        <section className="member-total"><span>Total verified contribution</span><strong>{money.format(dashboard?.totals.contributedRupees || 0)}</strong><small>Across {dashboard?.contributions.length || 0} verified offering(s)</small></section>
        <div className="member-ledger">{dashboard?.contributions.length ? dashboard.contributions.map(item => <article key={item.id}><div><strong>{item.sankalpTitle}</strong><span>{displayDate(item.contributedAt)} - {item.receiptNumber}</span></div><b>{money.format(item.amountRupees)}</b><button className="member-secondary" onClick={() => openReceipt(item.id)}>Acknowledgement</button></article>) : <Empty title="No contribution yet" text="Choose a live Sankalp when you are ready. Only verified provider payments appear here." />}</div>
      </>}
      {tab === "parichay" && <><PageHeading eyebrow="YOUR MEMBER PROFILE" title="Parichay" text="Keep your interests and abilities current so the centre can invite you into meaningful work." />
        <form className="member-profile" onSubmit={saveProfile}><div className="member-profile-identity"><div className="member-profile-number"><small>MEMBER ID</small><b>{member.memberNumber || "Being assigned"}</b></div><strong>{member.fullName}</strong><span>{member.mobile}</span><span>{member.email || "Email not added"}</span>{member.pushpanjaliCertificateNumber && <span>Pushpanjali - {member.pushpanjaliCertificateNumber}</span>}</div><label>City<input name="city" defaultValue={member.city} /></label><label>Areas of interest<textarea name="interests" rows={4} defaultValue={member.interests} /></label><label>Skills you may offer<textarea name="skills" rows={4} defaultValue={member.skills} /></label><label>Seva you would like to explore<textarea name="sevaPreference" rows={3} defaultValue={member.sevaPreference} /></label><button className="member-primary" disabled={busy}>{busy ? "Saving..." : "Save Parichay"}</button></form>
      </>}
      </>}
    </div>
    {notice && <Notice notice={notice} close={() => setNotice(null)} />}
    {paymentSankalp && <div className="member-modal"><div className="member-modal-panel"><button className="member-modal-close" onClick={() => setPaymentSankalp(null)} aria-label="Close">&times;</button><p className="member-eyebrow">SECURE YOGDAAN</p><h2>{paymentSankalp.title}</h2><p>Your verified payment will be recorded directly against this Sankalp.</p><form onSubmit={beginPayment}><label>Amount (Rs)<input required name="amountRupees" type="number" min="100" max={paymentSankalp.remainingAmountRupees || 1000000} defaultValue={paymentSankalp.remainingAmountRupees ? Math.min(2100, paymentSankalp.remainingAmountRupees) : 2100} /></label><label>Legal name<input required name="donorName" defaultValue={member.fullName} /></label><div className="member-form-row"><label>Mobile<input required name="donorMobile" defaultValue={member.mobile} /></label><label>Email<input name="donorEmail" type="email" defaultValue={member.email} /></label></div><label>PAN <small>optional; required later for eligible 80G processing</small><input name="donorPan" maxLength={10} autoCapitalize="characters" /></label><label>Address <small>optional</small><textarea name="donorAddress" rows={2} /></label><button className="member-primary" disabled={busy}>{busy ? "Preparing secure payment..." : "Continue to Razorpay"}</button><small className="member-payment-note">The amount is recorded only after server verification. An 80G certificate is separate from the instant payment acknowledgement.</small></form></div></div>}
    {celebration && <div className="member-modal member-celebration"><div className="member-modal-panel"><div className="member-ripple"><span>&#2384;</span></div><p className="member-eyebrow">OFFERING RECEIVED</p><h2>Thank you, {member.fullName.split(" ")[0]}.</h2><p>Your verified Yogdaan of <strong>{money.format(celebration.contribution.amountRupees)}</strong> now supports <strong>{celebration.contribution.sankalpTitle}</strong> and has been added to My Yogdaan.</p><div className="member-success-reference">Acknowledgement {celebration.contribution.receiptNumber}</div><button className="member-primary" onClick={() => { setCelebration(null); setTab("yogdaan"); window.history.replaceState({}, "", "/member?tab=yogdaan"); document.documentElement.scrollTop = 0; }}>View in My Yogdaan</button><button className="member-secondary" onClick={() => { openReceipt(celebration.contribution.id); setCelebration(null); }}>View acknowledgement</button>{celebration.next && <button className="member-secondary" onClick={() => { setPaymentSankalp(celebration.next); setCelebration(null); }}>See next Sankalp: {celebration.next.title}</button>}<button className="member-link-button" onClick={() => setCelebration(null)}>Return to portal</button></div></div>}
    {receipt && <div className="member-modal"><div className="member-modal-panel member-receipt"><button className="member-modal-close" onClick={() => setReceipt(null)} aria-label="Close">&times;</button><Image src="/society-logo-transparent.png" alt="" width={58} height={58} unoptimized /><p className="member-eyebrow">PAYMENT ACKNOWLEDGEMENT</p><h2>{receipt.receiptNumber}</h2><dl><div><dt>Received from</dt><dd>{receipt.donor.donorName}</dd></div><div><dt>Amount</dt><dd>{money.format(receipt.amountRupees)}</dd></div><div><dt>For Sankalp</dt><dd>{receipt.sankalpTitle}</dd></div><div><dt>Date</dt><dd>{displayDate(receipt.issuedAt)}</dd></div><div><dt>Payment reference</dt><dd>{receipt.providerPaymentId}</dd></div></dl><p>{receipt.note}</p><button className="member-primary" onClick={() => window.print()}>Print acknowledgement</button></div></div>}
    {watchItem && <div className="member-modal watch-modal"><div className="member-modal-panel watch-modal-panel"><button className="member-modal-close" onClick={() => setWatchItem(null)} aria-label="Close">Close</button><p className="member-eyebrow">{watchItem.collection} - {watchItem.eyebrow}</p><h2>{watchItem.title}</h2><div className="watch-modal-media">{watchItem.youtubeId ? <iframe title={watchItem.title} src={`https://www.youtube-nocookie.com/embed/${watchItem.youtubeId}?rel=0&playsinline=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" /> : <div className="watch-placeholder savitri"><span>Video</span><b>Video space ready</b><small>Connect the SAS_Lko playlist to begin watching here.</small></div>}</div><p className="watch-modal-description">{watchItem.description}</p><div className="watch-modal-actions"><button onClick={saveWatchMoment}>Save this moment - 34:17</button><button onClick={shareWatchItem}>Share</button><button onClick={resonateWithWatch}>{watchResonated.includes(watchItem.id) ? "Resonates" : "Resonates"}</button></div><details open className="watch-transcript"><summary>Transcript and search</summary><input value={transcriptQuery} onChange={event => setTranscriptQuery(event.target.value)} placeholder="Search within transcript" aria-label="Search within transcript" /><p>{transcriptQuery ? watchItem.transcript.toLowerCase().includes(transcriptQuery.toLowerCase()) ? watchItem.transcript : "No matching transcript passage in this item." : watchItem.transcript}</p></details><label className="watch-comment"><span>Reflect on this video</span><textarea rows={3} value={watchNote} onChange={event => setWatchNote(event.target.value)} placeholder="Write a note for yourself" /></label><button className="member-primary" onClick={saveWatchNote} disabled={!watchNote.trim()}>Save note</button></div></div>}
  </main>;
}

type MyReflectionsProps = {
  reflections: MemberReflection[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  addFollowUp: (reflectionId: string, text: string, image: File | null) => Promise<MemberReflection>;
};

function reflectionDateKey(value: string) {
  const direct = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(parsed);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function MyReflections({ reflections, selectedId, setSelectedId, addFollowUp }: MyReflectionsProps) {
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [followUpImage, setFollowUpImage] = useState<File | null>(null);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const selected = reflections.find(item => item.id === selectedId) || null;
  const dateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reflections.forEach(item => {
      const key = reflectionDateKey(item.createdAtIst || item.createdAt);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [reflections]);
  const visibleReflections = useMemo(() => reflections.filter(item => !selectedDate || reflectionDateKey(item.createdAtIst || item.createdAt) === selectedDate), [reflections, selectedDate]);
  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, key, count: dateCounts.get(key) || 0 };
    });
  }, [calendarMonth, dateCounts]);

  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !followUpText.trim() || followUpSaving) return;
    setFollowUpSaving(true);
    setFollowUpError("");
    try {
      await addFollowUp(selected.id, followUpText, followUpImage);
      setFollowUpText("");
      setFollowUpImage(null);
      event.currentTarget.reset();
    } catch (error) {
      setFollowUpError(error instanceof Error ? error.message : "Your thought could not be added.");
    } finally {
      setFollowUpSaving(false);
    }
  }

  if (selected) {
    return <section className="member-reflection-detail">
      <button type="button" className="member-reflection-back" onClick={() => setSelectedId(null)} aria-label="Back to My Reflections">&larr; My Reflections</button>
      <div className="member-reflection-detail-heading"><div><span className="member-eyebrow">PRIVATE MEDITATION JOURNAL</span><h2>{displayIstDateTime(selected.createdAtIst || selected.createdAt)}</h2></div><span>{selected.sessionMinutes ? `${pluralizeMinuteLabel(selected.sessionMinutes)} in silence` : "Reflection"}</span></div>
      <article className="member-reflection-original">
        <p>{selected.text}</p>
        {selected.media && <img src={selected.media.url} alt="Attached to this private reflection" />}
      </article>
      {selected.followUps.length > 0 && <section className="member-reflection-thread"><h3>Further thoughts</h3>{selected.followUps.map(entry => <article key={entry.id}><time dateTime={entry.createdAt}>{displayIstDateTime(entry.createdAtIst || entry.createdAt)}</time><p>{entry.text}</p>{entry.media && <img src={entry.media.url} alt="Attached to this further thought" />}</article>)}</section>}
      <form className="member-reflection-followup" onSubmit={submitFollowUp}>
        <div><span className="member-eyebrow">CONTINUE THIS REFLECTION</span><h3>Add a further thought</h3><p>Return to this moment whenever a new understanding comes.</p></div>
        <label><span>Your thought</span><textarea required rows={5} value={followUpText} onChange={event => setFollowUpText(event.target.value)} placeholder="Write what has become clearer..." /><small>{countWords(followUpText)} / 1,000 words</small></label>
        <label className="member-reflection-upload"><span>Attach an image <small>optional</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFollowUpImage(event.target.files?.[0] || null)} /><small>{followUpImage ? followUpImage.name : "JPG, PNG or WebP up to 12 MB"}</small></label>
        {followUpError && <p className="member-reflection-error" role="alert">{followUpError}</p>}
        <button type="submit" className="member-primary" disabled={!followUpText.trim() || countWords(followUpText) > 1000 || followUpSaving}>{followUpSaving ? "Saving..." : "Add to this reflection"}</button>
      </form>
    </section>;
  }

  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(calendarMonth);
  return <section className="member-reflections-page">
    <div className="member-reflections-hero"><div><span className="member-eyebrow">MY REFLECTIONS</span><h2>A private field for what arose in silence.</h2><p>Every thought is held within your member account, with its date, time and any image you chose to keep.</p></div><div><strong>{reflections.length}</strong><span>{reflections.length === 1 ? "reflection" : "reflections"}</span></div></div>
    <div className="member-reflections-layout">
      <aside className="member-reflection-calendar" aria-label="Reflection calendar">
        <div className="member-reflection-calendar-head"><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Previous month">&larr;</button><strong>{monthLabel}</strong><button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Next month">&rarr;</button></div>
        <div className="member-reflection-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="member-reflection-days">{monthDays.map((item, index) => item ? <button key={item.key} type="button" className={`${item.count ? "has-reflection" : ""} ${selectedDate === item.key ? "selected" : ""}`} onClick={() => setSelectedDate(item.key)} aria-label={`${item.day} ${monthLabel}${item.count ? `, ${item.count} reflection${item.count === 1 ? "" : "s"}` : ""}`}><span>{item.day}</span>{item.count > 0 && <i aria-hidden="true" />}</button> : <span key={`empty-${index}`} />)}</div>
        <button type="button" className="member-reflection-all" onClick={() => setSelectedDate("")} disabled={!selectedDate}>Show all dates</button>
      </aside>
      <div className="member-reflection-list">
        <div className="member-reflection-list-head"><div><span className="member-eyebrow">LATEST FIRST</span><h3>{selectedDate ? `Reflections on ${displayDate(`${selectedDate}T00:00:00+05:30`)}` : "Your meditation journal"}</h3></div>{selectedDate && <button type="button" onClick={() => setSelectedDate("")}>Clear date</button>}</div>
        {visibleReflections.length ? visibleReflections.map(item => <button type="button" className="member-reflection-row" key={item.id} onClick={() => setSelectedId(item.id)}><div className="member-reflection-date"><strong>{new Date(item.createdAtIst || item.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" })}</strong><span>{new Date(item.createdAtIst || item.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", year: "numeric" })}</span></div><div><p>{item.text}</p><small>{displayIstDateTime(item.createdAtIst || item.createdAt)}{item.followUps.length ? ` · ${item.followUps.length} further thought${item.followUps.length === 1 ? "" : "s"}` : ""}{item.media ? " · Image attached" : ""}</small></div><span aria-hidden="true">&rarr;</span></button>) : <div className="member-reflection-empty"><strong>No reflection on this date.</strong><p>Choose another underlined date, or enter the Inner Room to begin a new meditation.</p></div>}
      </div>
    </div>
  </section>;
}

type WatchSpaceProps = {
  items: WatchItem[];
  allItems: WatchItem[];
  filter: "All" | "Song of Savitri" | "Gatherings";
  setFilter: (value: "All" | "Song of Savitri" | "Gatherings") => void;
  search: string;
  setSearch: (value: string) => void;
  later: string[];
  favourites: string[];
  bookmarks: string[];
  playlists: string[];
  toggleList: (kind: "later" | "favourites" | "bookmarks" | "playlists", id: string) => void;
  openItem: (item: WatchItem) => void;
  savedMoments: SavedMoment[];
};

function WatchSpace({ items, allItems, filter, setFilter, search, setSearch, later, favourites, bookmarks, playlists, toggleList, openItem, savedMoments }: WatchSpaceProps) {
  const [myVideosTab, setMyVideosTab] = useState<"later" | "bookmarks">("later");
  const watchLaterVideos = allItems.filter(item => later.includes(item.id));
  const bookmarkedVideos = allItems.filter(item => bookmarks.includes(item.id));
  const myVideos = myVideosTab === "later" ? watchLaterVideos : bookmarkedVideos;

  return <><PageHeading eyebrow="DARSHAN - SAS WATCH SPACE" title="Watch with attention." text="Return to the moving word, the shared gathering and the moments you want to carry with you." />
    <section className="watch-my-videos" aria-labelledby="my-videos-heading">
      <div className="watch-my-videos-heading">
        <div><span className="member-eyebrow">YOUR VIDEO LIBRARY</span><h2 id="my-videos-heading">My Videos</h2></div>
        <div className="watch-my-videos-tabs" role="tablist" aria-label="My Videos">
          <button role="tab" aria-selected={myVideosTab === "later"} className={myVideosTab === "later" ? "active" : ""} onClick={() => setMyVideosTab("later")}>Watch Later <strong>{watchLaterVideos.length}</strong></button>
          <button role="tab" aria-selected={myVideosTab === "bookmarks"} className={myVideosTab === "bookmarks" ? "active" : ""} onClick={() => setMyVideosTab("bookmarks")}>Bookmarked <strong>{bookmarkedVideos.length}</strong></button>
        </div>
      </div>
      <div className="watch-my-videos-list">
        {myVideos.length ? myVideos.map(item => <button type="button" className="watch-my-video-card" key={`${myVideosTab}-${item.id}`} onClick={() => openItem(item)}><span>{item.collection}</span><strong>{item.title}</strong><small>{item.meta}</small><b>Open video &rarr;</b></button>) : <p className="watch-my-videos-empty">{myVideosTab === "later" ? "Videos marked Watch Later will appear here." : "Bookmarked videos will appear here."}</p>}
      </div>
    </section>
    {items[0] && <section className="watch-continue"><div><span className="member-eyebrow">CONTINUE WATCHING</span><h2>{items[0].title}</h2><p>{items[0].meta} - Pick up where your attention last rested.</p></div><button className="member-primary" onClick={() => openItem(items[0])}>Continue &rarr;</button></section>}
    <div className="watch-toolbar"><div className="watch-filters">{(["All", "Song of Savitri", "Gatherings"] as const).map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div><label className="watch-search"><span>Search titles, references and transcripts</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try a line, canto, book or title..." /></label></div>
    <p className="watch-search-status" role="status" aria-live="polite">{search.trim() ? `${items.length} ${items.length === 1 ? "video" : "videos"} found` : `${items.length} ${items.length === 1 ? "video" : "videos"}`}</p>
    {items.length ? <div className="watch-grid">{items.map(item => <article className={`watch-card ${item.collection === "Song of Savitri" ? "watch-card-savitri" : ""}`} key={item.id}><div className="watch-card-media">{item.youtubeId ? <iframe title={item.title} src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?rel=0&playsinline=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className={`watch-placeholder ${item.collection === "Song of Savitri" ? "savitri" : "gathering"}`}><span>{item.collection === "Song of Savitri" ? "\u2726" : "\u25CE"}</span><b>{item.duration}</b><small>Video will appear here when the SAS_Lko collection is connected.</small></div>}</div><div className="watch-card-body"><span className="member-eyebrow">{item.savitriReference ? `Part ${item.savitriReference.part}` : item.eyebrow}</span><h3>{item.savitriReference && <small>Book {item.savitriReference.bookNo} &middot; Canto {item.savitriReference.cantoNo}</small>}{item.title}</h3>{item.savitriReference ? <dl className="watch-savitri-reference"><div><dt>Part</dt><dd>{item.savitriReference.part}</dd></div><div><dt>Book No.</dt><dd>{item.savitriReference.bookNo}</dd></div><div><dt>Canto No.</dt><dd>{item.savitriReference.cantoNo}</dd></div><div><dt>Name of Canto</dt><dd>{item.savitriReference.cantoName}</dd></div><div><dt>Line Nos.</dt><dd>{item.savitriReference.lineNos}</dd></div><div><dt>Page No.</dt><dd>{item.savitriReference.pageNo}</dd></div></dl> : <><p>{item.description}</p><small className="watch-meta">{item.meta} - {item.duration}</small></>}<div className="watch-video-status" aria-label={`Personal activity for ${item.title}`}><div><strong>{bookmarks.includes(item.id) ? 1 : 0}</strong><span>bookmarked</span></div><div><strong>{later.includes(item.id) ? 1 : 0}</strong><span>watch later</span></div></div><div className="watch-actions"><button onClick={() => openItem(item)}>Open</button><button aria-pressed={later.includes(item.id)} onClick={() => toggleList("later", item.id)}>Watch later</button><button aria-pressed={bookmarks.includes(item.id)} onClick={() => toggleList("bookmarks", item.id)}>{bookmarks.includes(item.id) ? "Bookmarked" : "Bookmark"}</button><button aria-pressed={favourites.includes(item.id)} onClick={() => toggleList("favourites", item.id)}>{favourites.includes(item.id) ? "Favourite" : "\u2606 Favourite"}</button><button aria-pressed={playlists.includes(item.id)} onClick={() => toggleList("playlists", item.id)}>{playlists.includes(item.id) ? "In playlist" : "+ Playlist"}</button></div></div></article>)}</div> : <section className="watch-empty-results"><strong>No matching videos</strong><p>Try another title, line, canto, book number or transcript word.</p><button type="button" className="member-secondary" onClick={() => setSearch("")}>Clear search</button></section>}
    {savedMoments.length > 0 && <section className="saved-moments"><div><span className="member-eyebrow">YOUR ANCHORS</span><h2>Saved moments</h2></div>{savedMoments.map(moment => <article key={moment.id}><strong>{moment.title} <span>- {moment.time}</span></strong><p>{moment.note}</p></article>)}</section>}
  </>;
}

function InnerSound({ playing, setPlaying, volume, setVolume, mood, setMood, openInnerRoom }: { playing: boolean; setPlaying: (value: boolean) => void; volume: number; setVolume: (value: number) => void; mood: string; setMood: (value: string) => void; openInnerRoom: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackId, setTrackId] = useState("peace");
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const activeTrack = INNER_SOUND_TRACKS.find(track => track.id === trackId) || INNER_SOUND_TRACKS[1];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.load();
    if (playing) void audio.play().catch(() => setPlaying(false));
  }, [trackId, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (playing) void audio.play().catch(() => setPlaying(false)); else audio.pause();
  }, [playing, volume, setPlaying]);

  useEffect(() => {
    if (!playing || sessionMinutes === 0) return;
    if (secondsRemaining <= 0) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setSecondsRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [playing, sessionMinutes, secondsRemaining, setPlaying]);

  const selectTrack = (nextTrackId: string) => {
    const nextTrack = INNER_SOUND_TRACKS.find(track => track.id === nextTrackId);
    if (!nextTrack) return;
    setTrackId(nextTrack.id);
    setMood(nextTrack.mood);
    if (sessionMinutes > 0) setSecondsRemaining(sessionMinutes * 60);
    setPlaying(true);
  };
  const selectDuration = (minutes: number) => {
    setSessionMinutes(minutes);
    setSecondsRemaining(minutes * 60);
    setPlaying(true);
  };
  const selectMood = (value: string) => {
    const nextTrack = INNER_SOUND_TRACKS.find(track => track.mood === value);
    setMood(value);
    if (nextTrack) setTrackId(nextTrack.id);
    if (sessionMinutes > 0) setSecondsRemaining(sessionMinutes * 60);
    setPlaying(true);
  };
  const formatSoundTime = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

  return <><PageHeading eyebrow="DARSHAN - INNER SOUND" title="A library for listening inward." text="Choose a collection, an inner state or a length. Every selection carries its own sound and purpose." />
    <section className={`inner-sound-hero ${playing ? "is-playing" : ""}`}>
      <div className="inner-sound-visual"><div className="inner-sound-orb" aria-hidden="true"><span>{playing ? "II" : "\u266A"}</span></div><small>{playing ? "SOUND IS FLOWING" : "READY WHEN YOU ARE"}</small></div>
      <div className="inner-sound-player">
        <span className="member-eyebrow">NOW PLAYING</span><h2>{activeTrack.title}</h2><p>{activeTrack.description}</p>
        <div className="inner-sound-moods">{["Silence", "Peace", "Aspiration", "Nature"].map(value => <button key={value} aria-pressed={mood === value} className={mood === value ? "active" : ""} onClick={() => selectMood(value)}>{value}</button>)}</div>
        <div className="inner-sound-session"><span>{sessionMinutes ? `${sessionMinutes} minute session` : "Open-ended listening"}</span>{sessionMinutes > 0 && <strong>{formatSoundTime(secondsRemaining)}</strong>}</div>
        <div className="inner-sound-controls"><button className="member-primary" onClick={() => setPlaying(!playing)}>{playing ? "Pause sound" : "Begin listening"}</button><label><span>Volume <b>{Math.round(volume * 100)}%</b></span><input aria-label="Inner Sound volume" type="range" min="0" max="1" step=".01" value={volume} onChange={event => setVolume(Number(event.target.value))} /></label></div>
        <button className="member-secondary" onClick={openInnerRoom}>Enter The Inner Room</button>
      </div>
      <audio ref={audioRef} preload="metadata" loop playsInline src={activeTrack.source} />
    </section>
    <div className="inner-sound-collections">{INNER_SOUND_COLLECTIONS.map(collection => <section key={collection.label} className={`inner-sound-collection collection-${collection.label.toLowerCase()}`}><header><span>{collection.number}</span><div><p className="member-eyebrow">{collection.label}</p><h2>{collection.label === "States" ? "Listen for what you need." : collection.label === "Duration" ? "Choose the space you have." : `${collection.label} listening.`}</h2><small>{collection.introduction}</small></div></header><div>{collection.choices.map(choice => { const selected = choice.trackId ? choice.trackId === trackId : choice.minutes === sessionMinutes; return <button key={choice.title} className={selected ? "active" : ""} aria-pressed={selected} onClick={() => choice.trackId ? selectTrack(choice.trackId) : selectDuration(choice.minutes ?? 0)}><i aria-hidden="true">{choice.minutes !== undefined ? choice.minutes === 0 ? "∞" : choice.minutes : collection.number}</i><span><strong>{choice.title}</strong><small>{choice.description}</small></span><b>{selected && playing ? "Playing" : "Listen"} &rarr;</b></button>; })}</div></section>)}</div>
  </>;
}

function Sangha({ posts, draft, setDraft, type, setType, pollOptions, setPollOptions, publishing, publish, vote, resonate, savePost, comment, share }: { posts: SanghaPost[]; draft: string; setDraft: (value: string) => void; type: string; setType: (value: string) => void; pollOptions: string[]; setPollOptions: (value: string[]) => void; publishing: boolean; publish: (event: FormEvent<HTMLFormElement>) => void; vote: (postId: string, optionId: string) => void; resonate: (postId: string) => Promise<void>; savePost: (postId: string) => Promise<void>; comment: (postId: string, text: string) => Promise<void>; share: (post: SanghaPost) => Promise<void> }) {
  const words = countWords(draft);
  const [view, setView] = useState<"community" | "mine" | "photos" | "videos">("community");
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const visiblePosts = useMemo(() => posts
    .filter(post => view === "community" || (view === "mine" && post.isMine) || (view === "photos" && post.media?.kind === "image") || (view === "videos" && post.media?.kind === "video"))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [posts, view]);
  const updatePollOption = (index: number, value: string) => {
    if (countWords(value) > 10) return;
    setPollOptions(pollOptions.map((option, optionIndex) => optionIndex === index ? value : option));
  };
  const emptyMessage = view === "mine" ? "You have not shared anything yet." : view === "photos" ? "No photographs have been shared yet." : view === "videos" ? "No videos have been shared yet." : "The Sangha feed is ready for its first post.";
  const submitComment = async (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text || countWords(text) > 300 || commentBusy) return;
    setCommentBusy(true);
    try { await comment(postId, text); setCommentDraft(""); setCommentingOn(null); }
    catch { /* The parent displays a clear error notice. */ }
    finally { setCommentBusy(false); }
  };

  return <div className="sangha-page">
    <PageHeading eyebrow="DARSHAN - SANGHA" title="A gentle community of practice." text="Share a reflection, video, artwork, photograph or poll with the member community." />
    <section className="sangha-compose">
      <span className="member-eyebrow">SHARE WITH SANGHA</span>
      <form onSubmit={publish}>
        <div className="sangha-compose-row">
          <label><span>Post type</span><select name="type" value={type} onChange={event => setType(event.target.value)} aria-label="Post type">{SANGHA_POST_TYPES.map(value => <option key={value}>{value}</option>)}</select></label>
          <label><span>Your post</span><textarea name="text" value={draft} onChange={event => { if (countWords(event.target.value) <= 1000) setDraft(event.target.value); }} rows={5} placeholder="What would you like to share with the community?" required /><small className={words >= 950 ? "near-limit" : ""}>{words} / 1,000 words</small></label>
        </div>
        <label className="sangha-media-field"><span>Add a photo or video <small>optional for every post type</small></span><input name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" /><small>One JPG, PNG or WebP photo up to 12 MB, or one MP4, WebM or MOV video up to 80 MB.</small></label>
        {type === "Poll" && <fieldset className="sangha-poll-builder"><legend>Poll options</legend><p>Add two to four options. Each option may contain up to 10 words.</p>{pollOptions.map((option, index) => <div key={index}><label><span>Option {index + 1}</span><input value={option} onChange={event => updatePollOption(index, event.target.value)} placeholder={`Poll option ${index + 1}`} required={index < 2} /><small>{countWords(option)} / 10 words</small></label>{pollOptions.length > 2 && <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, optionIndex) => optionIndex !== index))} aria-label={`Remove option ${index + 1}`}>Remove</button>}</div>)}{pollOptions.length < 4 && <button className="member-secondary" type="button" onClick={() => setPollOptions([...pollOptions, ""])}>+ Add another option</button>}</fieldset>}
        <div className="sangha-compose-footer"><small>Posts and media are shared only with signed-in members. Date and time are recorded in IST.</small><button className="member-primary" type="submit" disabled={publishing || !draft.trim()}>{publishing ? "Sharing..." : "Share with Sangha"}</button></div>
      </form>
    </section>
    <section className="sangha-feed">
      <div className="sangha-feed-heading"><div><span className="member-eyebrow">SANGHA FEED</span><h2>From the community</h2></div><small>Newest posts appear first</small></div>
      <nav className="sangha-feed-tabs" aria-label="Filter Sangha posts">{([{ id: "community", label: "Community" }, { id: "mine", label: "My Posts" }, { id: "photos", label: "Photos" }, { id: "videos", label: "Videos" }] as const).map(item => <button key={item.id} type="button" className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
      {visiblePosts.length === 0 ? <div className="sangha-empty"><strong>{emptyMessage}</strong><span>New posts will appear here with the latest at the top.</span></div> : visiblePosts.map(post => <article className="sangha-post" key={post.id}>
        <div className="sangha-post-top"><div><strong>{post.author}</strong>{post.role && <small>{post.role}</small>}</div><span>{post.type} - {displayIstDateTime(post.createdAtIst || post.createdAt)}</span></div>
        {post.media && <div className={`sangha-post-media ${post.media.kind}`}>{post.media.kind === "video" ? <video controls preload="metadata" playsInline><source src={post.media.url} type={post.media.mimeType} />Your browser cannot play this video.</video> : <img src={post.media.url} alt={`${post.type} shared by ${post.author}`} loading="lazy" />}</div>}
        <p>{post.text}</p>
        {post.type === "Poll" && post.pollOptions && <div className="sangha-poll" role="group" aria-label={`Poll by ${post.author}`}>{post.pollOptions.map(option => <button key={option.id} type="button" className={post.selectedOptionId === option.id ? "selected" : ""} disabled={Boolean(post.selectedOptionId)} onClick={() => vote(post.id, option.id)}><span>{option.text}</span><strong>{option.votes} {option.votes === 1 ? "response" : "responses"}</strong></button>)}</div>}
        <div className="sangha-post-actions"><button type="button" className={post.resonated ? "active" : ""} aria-pressed={Boolean(post.resonated)} onClick={() => void resonate(post.id)}>{post.resonated ? "Resonates" : "Resonates"} <span>{post.resonates}</span></button><button type="button" aria-expanded={commentingOn === post.id} onClick={() => { setCommentingOn(current => current === post.id ? null : post.id); setCommentDraft(""); }}>Comment <span>{post.replies}</span></button><button type="button" onClick={() => void share(post)}>Share</button><button type="button" className={post.saved ? "active" : ""} aria-pressed={Boolean(post.saved)} onClick={() => void savePost(post.id)}>{post.saved ? "Saved" : "Save"}</button></div>
        {Boolean(post.comments?.length) && <div className="sangha-comments" aria-label={`Comments on ${post.type} by ${post.author}`}>{post.comments?.map(item => <article key={item.id}><div><strong>{item.author}</strong><time dateTime={item.createdAt}>{displayIstDateTime(item.createdAt)}</time></div><p>{item.text}</p></article>)}</div>}
        {commentingOn === post.id && <form className="sangha-comment-form" onSubmit={event => void submitComment(event, post.id)}><label><span>Add your reflection</span><textarea autoFocus rows={3} value={commentDraft} onChange={event => { if (countWords(event.target.value) <= 300) setCommentDraft(event.target.value); }} placeholder="Write a thoughtful response..." required /><small>{countWords(commentDraft)} / 300 words</small></label><div><button type="button" className="member-secondary" onClick={() => { setCommentingOn(null); setCommentDraft(""); }}>Cancel</button><button type="submit" className="member-primary" disabled={!commentDraft.trim() || commentBusy}>{commentBusy ? "Adding..." : "Add reflection"}</button></div></form>}
      </article>)}
    </section>
  </div>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="member-page-heading"><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></header>;
}

function MemberLibrary({ query, setQuery, collections }: { query: string; setQuery: (value: string) => void; collections: MemberLibraryCollection[] }) {
  return <section className="member-library-space">
    <div className="member-space-banner"><div><span className="member-eyebrow">DARSHAN · E-LIBRARY</span><h2>Read, listen and return to what matters.</h2><p>A member doorway into books, Savitri, the Mother’s writings, meditation music and guidance.</p></div><span className="member-space-mark">E</span></div>
    <label className="member-library-search"><span>Search your library doorway</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Savitri, flowers, audio…" /></label>
    <div className="member-library-grid">{collections.map(collection => <a className="member-library-card" key={collection.title} href={collection.href} target="_blank" rel="noreferrer"><small>{collection.category} · {collection.count}</small><h3>{collection.title}</h3><ul>{collection.items.map(item => <li key={item}>{item}</li>)}</ul><b>Open collection →</b></a>)}</div>
    {collections.length === 0 && <Empty title="No collection matches" text="Try Savitri, flowers, books or audio." />}
    <p className="member-library-note">The catalogue is adapted from the Society’s e-Library index. Source reading opens in a new tab so your member space remains available.</p>
  </section>;
}

function MemberSakhi({ messages, input, setInput, thinking, ask }: { messages: MemberSakhiMessage[]; input: string; setInput: (value: string) => void; thinking: boolean; ask: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="member-sakhi-space">
    <div className="member-space-banner member-sakhi-banner"><div><span className="member-eyebrow">DARSHAN · STUDY COMPANION</span><h2>Savitri Sakhi</h2><p>Ask about Savitri, its lines and references, or the vision of Sri Aurobindo and the Mother—in English or Hindi.</p></div><span className="member-sakhi-mark">✦</span></div>
    <div className="member-sakhi-chat" role="log" aria-live="polite">
      {messages.length === 0 && <div className="member-sakhi-welcome"><span>Begin with a line, a question or a passage.</span><p>“Identify this line: All can be done if the god-touch is there.”</p><p>“सावित्री का मुख्य संदेश क्या है?”</p></div>}
      {messages.map((message, index) => <article key={`${message.role}-${index}`} className={`member-sakhi-message ${message.role}`}><small>{message.role === "assistant" ? "Savitri Sakhi" : "You"}</small><p>{message.content}</p></article>)}
      {thinking && <div className="member-sakhi-thinking">Savitri Sakhi is reflecting…</div>}
    </div>
    <form className="member-sakhi-form" onSubmit={ask}><label htmlFor="member-sakhi-question">Ask in English or Hindi</label><div><textarea id="member-sakhi-question" value={input} onChange={event => setInput(event.target.value)} rows={3} maxLength={4000} placeholder="Type your question… / अपना प्रश्न लिखें…" disabled={thinking} /><button className="member-primary" type="submit" disabled={thinking || !input.trim()}>Ask</button></div><small>Exact line references are verified when the passage is found in the local Savitri index.</small></form>
  </section>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="member-empty"><strong>{title}</strong><span>{text}</span></div>;
}

function Notice({ notice, close }: { notice: { tone: string; title: string; detail: string }; close: () => void }) {
  return <div className={`member-notice ${notice.tone}`} role="status"><div><strong>{notice.title}</strong><span>{notice.detail}</span></div><button onClick={close} aria-label="Close">&times;</button></div>;
}
