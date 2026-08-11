"use client";

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PushpanjaliCampaign } from "./pushpanjali-campaign";

type Language = "en" | "hi";
type GalleryItem = {
  id: string;
  title: string;
  eventDate: string;
  category: string;
  description: string;
  kind: "image" | "video";
  mimeType: string;
  mediaUrl: string;
  youtubeId?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
};
type SavitriVideoItem = {
  id: string;
  part: string;
  bookNo: string;
  cantoNo: string;
  cantoName: string;
  lineNos: string;
  pageNo: string;
  description: string;
  mimeType: string;
  mediaUrl: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
};
type SakhiMessage = {
  role: "user" | "assistant";
  content: string;
};

type LibraryCollection = {
  category: string;
  title: string;
  count: string;
  items: string[];
  href: string;
};

type LibrarySearchResult = {
  title: string;
  snippet: string;
  category: string;
  source: string;
  href: string;
};

function renderSakhiInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*.+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+)/g).filter(Boolean);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1].replace(/\*+/g, "")}</strong>;
    const italic = part.match(/^\*([^*]+)\*$/);
    if (italic) return <em key={index}>{italic[1]}</em>;
    const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (markdownLink) return <a key={index} href={markdownLink[2]} target="_blank" rel="noreferrer">{markdownLink[1]}</a>;
    if (/^https?:\/\//.test(part)) {
      const trailing = part.match(/([.,;:!?]+)$/)?.[1] || "";
      const href = trailing ? part.slice(0, -trailing.length) : part;
      return <span key={index}><a href={href} target="_blank" rel="noreferrer">{href}</a>{trailing}</span>;
    }
    return part.replace(/\*+/g, "");
  });
}

function SakhiFormattedAnswer({ content }: { content: string }) {
  return <div className="sakhi-answer">{content.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div className="sakhi-answer-space" aria-hidden="true" key={index}/>;
    const heading = trimmed.match(/^#{1,4}\s+(.+)$/);
    const numberedHeading = trimmed.match(/^\d+\.\s+(Identification|Passage context|Meaning|Reference|References)(.*)$/i);
    if (heading || numberedHeading) {
      const title = heading?.[1] || `${numberedHeading?.[1]}${numberedHeading?.[2] || ""}`;
      return <h4 className="sakhi-answer-heading" key={index}>{renderSakhiInline(title)}</h4>;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) return <div className="sakhi-answer-list" key={index}><span aria-hidden="true">•</span><p>{renderSakhiInline(bullet[1])}</p></div>;
    const quotation = trimmed.match(/^>\s*(.+)$/);
    if (quotation) return <blockquote className="sakhi-answer-quote" key={index}>{renderSakhiInline(quotation[1])}</blockquote>;
    return <p className="sakhi-answer-line" key={index}>{renderSakhiInline(trimmed)}</p>;
  })}</div>;
}

type YouTubePlayerStateEvent = { data: number };
type YouTubePlayerInstance = { destroy?: () => void };
type YouTubeApi = {
  Player: new (element: HTMLIFrameElement, options: { events: { onStateChange: (event: YouTubePlayerStateEvent) => void } }) => YouTubePlayerInstance;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) {
      existing.addEventListener("error", () => reject(new Error("YouTube player API unavailable")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.addEventListener("error", () => reject(new Error("YouTube player API unavailable")), { once: true });
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

function reportYouTubePlayback(videoId: string, playing: boolean) {
  window.dispatchEvent(new CustomEvent("sas:youtube-playback", { detail: { videoId, playing } }));
}

function YouTubeEmbed({ videoId, title, onPlaybackChange = reportYouTubePlayback }: { videoId: string; title: string; onPlaybackChange?: (videoId: string, playing: boolean) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playbackCallback = useRef(onPlaybackChange);
  useEffect(() => { playbackCallback.current = onPlaybackChange; }, [onPlaybackChange]);
  useEffect(() => {
    let disposed = false;
    let player: YouTubePlayerInstance | undefined;
    void loadYouTubeIframeApi().then(() => {
      if (disposed || !iframeRef.current || !window.YT?.Player) return;
      player = new window.YT.Player(iframeRef.current, {
        events: {
          onStateChange: event => {
            if (event.data === 1) playbackCallback.current(videoId, true);
            if ([0, 2, 5].includes(event.data)) playbackCallback.current(videoId, false);
          },
        },
      });
    }).catch(() => {});
    return () => {
      disposed = true;
      playbackCallback.current(videoId, false);
      player?.destroy?.();
    };
  }, [videoId]);
  return <iframe
    ref={iframeRef}
    className="youtube-embed"
    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&playsinline=1&rel=0`}
    title={title}
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
  />;
}

const copy = {
  en: {
    nav: ["e-Library", "Events", "Community"],
    eyebrow: "Sri Aurobindo Society · Lucknow Centre",
    cards: ["Inner growth", "Conscious living", "Human unity", "Spiritual evolution"],
    cardNotes: [
      "Discover the deeper self and bring greater awareness into daily life.",
      "Let thought, work and relationships become expressions of inner purpose.",
      "Recognise one spirit in all and build harmony across every difference.",
      "Participate consciously in humanity’s movement towards a higher life.",
    ],
    learn: "Begin with what speaks to you",
    learnText: "Simple entry points into a vast and many-sided vision.",
    pathways: ["Sri Aurobindo", "The Mother", "Integral Yoga", "Savitri"],
    library: "From the wisdom library", all: "All", articles: "Articles", talks: "Talks", reflections: "Reflections",
    upcoming: "Upcoming gatherings", register: "Register", shrine: "The Sultanpur shrine",
    shrineText: "A sacred place holding the relics of Sri Aurobindo, and a living centre for remembrance, study and quiet collective aspiration.",
    community: "Join the Community", join: "Join the Community", volunteer: "Explore participation",
    support: "Support the work", supportText: "Voluntary contributions help sustain programmes, publications, shrine care and digital outreach.",
    contribute: "Contribute thoughtfully", footer: "Towards a Life Divine",
    more: "More",
    sultanpur: "Sultanpur Shrine",
    darshan: "Darshan Divas",
    disclaimer: "Sri Aurobindo Society, Lucknow · Gomti Nagar Centre (UC-02). The Society was founded by the Mother in 1960 and is headquartered in Puducherry.",
  },
  hi: {
    nav: ["ई-पुस्तकालय", "कार्यक्रम", "समुदाय"],
    eyebrow: "श्री अरविंद–श्री माँ मिशन, लखनऊ", title: "आंतरिक विकास के लिए एक शांत स्थान।",
    intro: "श्री अरविंद और श्री माँ के दर्शन को जानें। अध्ययन करें, मनन करें, सहभागी बनें और साथ बढ़ें।",
    explore: "यात्रा आरंभ करें", event: "अगला कार्यक्रम देखें", today: "आज का विचार",
    quote: "Man is a transitional being, he is not final.",
    vision: "अधिक सचेत जीवन की ओर", visionText: "पूर्ण योग जीवन के प्रत्येक अंग—विचार, कर्म, संबंध और आकांक्षा—को आंतरिक विकास में सहभागी बनाता है।",
    cards: ["आंतरिक विकास", "सचेत जीवन", "मानव एकता", "आध्यात्मिक विकास"],
    cardNotes: [
      "अपने गहरे स्वरूप को जानें और दैनिक जीवन में अधिक जागरूकता लाएँ।",
      "विचार, कर्म और संबंधों को आंतरिक उद्देश्य की अभिव्यक्ति बनाएँ।",
      "सबमें एक ही आत्मा को पहचानें और भिन्नताओं के बीच सामंजस्य बनाएँ।",
      "मानवता की उच्चतर जीवन की ओर यात्रा में सचेत रूप से सहभागी बनें।",
    ],
    learn: "जहाँ से मन जुड़े, वहीं से आरंभ करें", learnText: "एक विशाल और बहुआयामी दर्शन के सरल प्रवेश-द्वार।",
    pathways: ["श्री अरविंद", "श्री माँ", "पूर्ण योग", "सावित्री"],
    library: "ज्ञान संग्रह से", all: "सभी", articles: "लेख", talks: "व्याख्यान", reflections: "मनन",
    upcoming: "आगामी आयोजन", register: "पंजीकरण", shrine: "सुल्तानपुर पवित्र स्थल",
    shrineText: "श्री अरविंद के पवित्र अवशेषों का स्थल—स्मरण, अध्ययन और सामूहिक आकांक्षा का जीवंत केंद्र।",
    community: "एसएएस लखनऊ से जुड़ें", join: "एसएएस लखनऊ से जुड़ें", volunteer: "सहभागिता के अवसर देखें",
    support: "कार्य में सहयोग", supportText: "स्वैच्छिक योगदान कार्यक्रमों, प्रकाशनों, स्थल की देखभाल और डिजिटल प्रसार में सहायक है।",
    contribute: "ससम्मान योगदान", footer: "दिव्य जीवन की ओर",
    more: "और", darshan: "दर्शन दिवस",
    disclaimer: "श्री अरविंद और श्री माँ की शिक्षाओं से प्रेरित एक स्वतंत्र आध्यात्मिक एवं शैक्षिक पहल। औपचारिक संबद्धता उचित प्राधिकरण के बाद ही बताई जाएगी।",
  },
};

const libraryCollections: LibraryCollection[] = [
  { category: "Books", title: "Works of Sri Aurobindo", count: "170+ books", items: ["Savitri", "The Life Divine", "The Synthesis of Yoga"], href: "https://www.motherandsriaurobindo.in/Sri-Aurobindo/books/" },
  { category: "Books", title: "Works of the Mother", count: "160+ books", items: ["Prayers and Meditations", "Questions and Answers", "Words of the Mother"], href: "https://www.motherandsriaurobindo.in/The-Mother/books/" },
  { category: "Audio", title: "Music, talks and readings", count: "Audio library", items: ["Meditation music", "Recorded talks", "Readings and messages"], href: "https://www.motherandsriaurobindo.in/The-Mother/audio/" },
  { category: "Explore", title: "Explore Savitri", count: "Poem and study", items: ["Search the text", "Meditations on Savitri", "Book and canto index"], href: "https://www.motherandsriaurobindo.in/Sri-Aurobindo/savitri/" },
  { category: "Explore", title: "Spiritual significance of flowers", count: "800+ flowers", items: ["Search by significance", "Browse by colour", "Botanical index"], href: "https://www.motherandsriaurobindo.in/The-Mother/spiritual-significance-of-flowers/" },
  { category: "Explore", title: "The Mother as an artist", count: "100+ artworks", items: ["Paintings", "Drawings", "Thoughts on art"], href: "https://www.motherandsriaurobindo.in/The-Mother/The-Mother-as-an-artist/" },
  { category: "Books", title: "Disciples and seekers", count: "100+ persons", items: ["Books and memoirs", "Interviews", "A–Z index"], href: "https://www.motherandsriaurobindo.in/disciples/" },
  { category: "Explore", title: "Guidance and quotations", count: "Daily inspiration", items: ["Their guidance", "Aphorisms", "Prayers and mantras"], href: "https://www.motherandsriaurobindo.in/guidance/" },
];

const meditationMusicVolume = 0.22;

export function MissionHome() {
  const [lang, setLang] = useState<Language>("en");
  const [menu, setMenu] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicRequested, setMusicRequested] = useState(true);
  const [pushpanjaliOpen, setPushpanjaliOpen] = useState(true);
  const [videoPlaybackActive, setVideoPlaybackActive] = useState(false);
  const [filter, setFilter] = useState("All");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<LibrarySearchResult[]>([]);
  const [librarySearching, setLibrarySearching] = useState(false);
  const [librarySearchError, setLibrarySearchError] = useState("");
  const [dialog, setDialog] = useState<"register" | "join" | "volunteer" | "contribute" | "gallery" | "savitri" | null>(null);
  const [sent, setSent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadReference, setUploadReference] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"approved" | "pending">("pending");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [savitriVideos, setSavitriVideos] = useState<SavitriVideoItem[]>([]);
  const [savitriVideosLoading, setSavitriVideosLoading] = useState(true);
  const [sakhiOpen, setSakhiOpen] = useState(false);
  const [sakhiInput, setSakhiInput] = useState("");
  const [sakhiMessages, setSakhiMessages] = useState<SakhiMessage[]>([]);
  const [sakhiThinking, setSakhiThinking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeVideoIds = useRef(new Set<string>());
  const galleryTrack = useRef<HTMLDivElement>(null);
  const savitriTrack = useRef<HTMLDivElement>(null);
  const sakhiEndRef = useRef<HTMLDivElement>(null);
  const musicSuppressed = pushpanjaliOpen || dialog !== null || sakhiOpen || videoPlaybackActive;
  const pauseMeditationMusic = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    setMusicPlaying(false);
  }, []);
  const handleVideoPlaybackChange = useCallback((videoId: string, playing: boolean) => {
    if (playing) activeVideoIds.current.add(videoId);
    else activeVideoIds.current.delete(videoId);
    const anyVideoPlaying = activeVideoIds.current.size > 0;
    setVideoPlaybackActive(anyVideoPlaying);
    if (anyVideoPlaying) pauseMeditationMusic();
  }, [pauseMeditationMusic]);
  const t = copy[lang];
  const primaryNav = [
    { label: t.nav[0], href: "#wisdom" },
    { label: t.nav[1], href: "#events" },
    { label: t.nav[2], href: "#community" },
  ];
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const isSearchingLibrary = normalizedLibraryQuery.length > 0;
  const shown = useMemo(() => libraryCollections.filter(item => {
    const matchesCategory = filter === "All" || item.category === filter;
    const haystack = `${item.title} ${item.count} ${item.items.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(normalizedLibraryQuery);
  }), [filter, libraryQuery]);
  const filteredLibraryResults = useMemo(() => {
    if (!isSearchingLibrary) return shown;
    return libraryResults.filter(result => filter === "All" || result.category === filter).map(result => ({ ...result, kind: "remote" as const }));
  }, [filter, isSearchingLibrary, libraryResults, shown]);
  const hasLibraryResults = isSearchingLibrary ? filteredLibraryResults.length > 0 : shown.length > 0;
  const open = (name: typeof dialog) => { setSent(false); setUploading(false); setSubmitError(""); setUploadReference(""); setUploadStatus("pending"); setDialog(name); };
  useEffect(() => {
    const searchTerm = libraryQuery.trim();
    if (!searchTerm) {
      setLibraryResults([]);
      setLibrarySearchError("");
      setLibrarySearching(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLibrarySearching(true);
        setLibrarySearchError("");
        const response = await fetch(`/api/library-search?query=${encodeURIComponent(searchTerm)}`, {
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error((result as { error?: string }).error || "Live library search is temporarily unavailable.");
        const found = Array.isArray((result as { results?: unknown }).results) ? (result as { results: LibrarySearchResult[] }).results : [];
        setLibraryResults(found.map(item => ({
          title: typeof item.title === "string" ? item.title.trim() : "",
          snippet: typeof item.snippet === "string" ? item.snippet.trim() : "",
          category: typeof item.category === "string" ? item.category : "Source",
          source: typeof item.source === "string" ? item.source : "The Mother & Sri Aurobindo e-Library",
          href: typeof item.href === "string" ? item.href : "https://www.motherandsriaurobindo.in/",
        })).filter(item => item.title));
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setLibrarySearchError("Could not fetch live results right now. Showing local collections.");
        setLibraryResults([]);
      } finally {
        setLibrarySearching(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [libraryQuery]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/gallery-items", { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Gallery unavailable")))
      .then(result => setGalleryItems(Array.isArray(result.items) ? result.items : []))
      .catch(error => { if (error?.name !== "AbortError") setGalleryItems([]); })
      .finally(() => setGalleryLoading(false));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/savitri-videos", { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Savitri videos unavailable")))
      .then(result => setSavitriVideos(Array.isArray(result.items) ? result.items : []))
      .catch(error => { if (error?.name !== "AbortError") setSavitriVideos([]); })
      .finally(() => setSavitriVideosLoading(false));
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (sakhiOpen) sakhiEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [sakhiMessages, sakhiOpen, sakhiThinking]);
  useEffect(() => {
    const receiveVideoPlayback = (event: Event) => {
      const detail = (event as CustomEvent<{ videoId?: unknown; playing?: unknown }>).detail;
      if (typeof detail?.videoId === "string" && typeof detail.playing === "boolean") {
        handleVideoPlaybackChange(detail.videoId, detail.playing);
      }
    };
    window.addEventListener("sas:youtube-playback", receiveVideoPlayback);
    return () => window.removeEventListener("sas:youtube-playback", receiveVideoPlayback);
  }, [handleVideoPlaybackChange]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = meditationMusicVolume;
    if (musicSuppressed || !musicRequested) {
      pauseMeditationMusic();
      return;
    }
    const startMusic = () => {
      audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    };
    startMusic();
    const startAfterInteraction = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".meditation-control")) return;
      if (audio.paused) startMusic();
    };
    window.addEventListener("pointerdown", startAfterInteraction, { once: true });
    window.addEventListener("keydown", startAfterInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startAfterInteraction);
      window.removeEventListener("keydown", startAfterInteraction);
    };
  }, [musicRequested, musicSuppressed, pauseMeditationMusic]);
  const moveGallery = (direction: -1 | 1) => {
    const track = galleryTrack.current;
    if (track) track.scrollBy({ left: direction * Math.max(280, track.clientWidth * .82), behavior: "smooth" });
  };
  const moveSavitriVideos = (direction: -1 | 1) => {
    const track = savitriTrack.current;
    if (track) track.scrollBy({ left: direction * Math.max(280, track.clientWidth * .82), behavior: "smooth" });
  };
  const playMeditationMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return false;
    audio.volume = meditationMusicVolume;
    try {
      await audio.play();
      setMusicPlaying(true);
      return true;
    } catch {
      setMusicPlaying(false);
      return false;
    }
  };
  const toggleMeditationMusic = async () => {
    const audio = audioRef.current;
    if (!audio || musicSuppressed) return;
    if (!audio.paused) {
      setMusicRequested(false);
      audio.pause();
      audio.currentTime = 0;
      setMusicPlaying(false);
      return;
    }
    setMusicRequested(true);
    await playMeditationMusic();
  };
  const displayDate = (date: string) => {
    const value = new Date(`${date}T00:00:00`);
    return Number.isNaN(value.getTime()) ? date : new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" }).format(value);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialog !== "gallery" && dialog !== "savitri") { setSent(true); return; }
    setUploading(true);
    setSubmitError("");
    try {
      const isSavitriSubmission = dialog === "savitri";
      const response = await fetch(isSavitriSubmission ? "/api/savitri-video-submissions" : "/api/gallery-submissions", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The upload could not be saved.");
      setUploadReference(result.reference || "received");
      setUploadStatus(result.status === "approved" ? "approved" : "pending");
      if (isSavitriSubmission) {
        const savitri = await fetch("/api/savitri-videos").then(value => value.ok ? value.json() : { items: [] });
        setSavitriVideos(Array.isArray(savitri.items) ? savitri.items : []);
      } else if (result.status === "approved") {
        const gallery = await fetch("/api/gallery-items").then(value => value.ok ? value.json() : { items: [] });
        setGalleryItems(Array.isArray(gallery.items) ? gallery.items : []);
      }
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The upload could not be saved. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  const askSavitriSakhi = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = sakhiInput.trim();
    if (!question || sakhiThinking) return;
    const conversation: SakhiMessage[] = [...sakhiMessages, { role: "user", content: question }].slice(-12);
    setSakhiMessages(conversation);
    setSakhiInput("");
    setSakhiThinking(true);
    try {
      const response = await fetch("/api/savitri-sakhi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.answer !== "string") throw new Error(result.error || "Savitri Sakhi could not answer just now.");
      setSakhiMessages([...conversation, { role: "assistant", content: result.answer }]);
    } catch (error) {
      setSakhiMessages([...conversation, {
        role: "assistant",
        content: error instanceof Error ? error.message : "I could not answer just now. Please try again in a moment.",
      }]);
    } finally {
      setSakhiThinking(false);
    }
  };

  return <div className={lang === "hi" ? "hindi" : ""}>
    <a href="#main" className="skip">Skip to content</a>
    <header className="site-header">
      <a className="brand" href="#"><img className="society-logo" src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></a>
      <button className="menu-button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Toggle navigation">☰</button>
      <nav className={menu ? "open" : ""} aria-label="Main navigation">
        {primaryNav.map(item => <a key={item.label} href={item.href} onClick={() => setMenu(false)}>{item.label}</a>)}
        <div className={`more-menu ${moreOpen ? "open" : ""}`}>
          <button type="button" aria-expanded={moreOpen} aria-haspopup="true" onClick={() => setMoreOpen(!moreOpen)}>{t.more}</button>
          <div className="more-dropdown">
            <a href="/participate#parichay" onClick={() => { setMoreOpen(false); setMenu(false); }}>Join the Community</a>
            <a href="/sultanpur-shrine" onClick={() => { setMoreOpen(false); setMenu(false); }}>{t.shrine}</a>
            <a href="/darshan-divas" onClick={() => { setMoreOpen(false); setMenu(false); }}>{t.darshan}</a>
          </div>
        </div>
      </nav>
      <div className="language"><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button><span>/</span><button className={lang === "hi" ? "active" : ""} onClick={() => setLang("hi")}>हिं</button></div>
    </header>
    <audio ref={audioRef} loop preload="auto" playsInline onPause={()=>setMusicPlaying(false)} onPlay={()=>setMusicPlaying(true)} onError={()=>setMusicPlaying(false)}><source src="/mothers-organ-joy-1960.mp3" type="audio/mpeg"/></audio>
    <button className={`meditation-control ${musicPlaying ? "playing" : ""}`} type="button" onClick={toggleMeditationMusic} disabled={musicSuppressed} aria-pressed={musicPlaying} aria-label={musicSuppressed ? "Meditation music paused while another video or window is open" : `${musicPlaying ? "Stop" : "Play"} the Mother's organ meditation music`} title={musicSuppressed ? "Meditation music pauses while another video or window is open" : "The Mother's organ music · Joy · 12 March 1960"}><span aria-hidden="true">♪</span><small>Meditation</small><b>{musicSuppressed ? "Paused" : musicPlaying ? "Stop" : "Play"}</b></button>
    <PushpanjaliCampaign onOpenChange={setPushpanjaliOpen}/>

    <main id="main">
      <section className="theme-banner" aria-label="Website theme: The Song of Life"><img src="/song-of-life-banner.png" alt="The Song of Life, glowing over a radiant golden dawn"/><div className="theme-caption"><span>THE SONG OF LIFE</span><p>Awaken to the soul within, and let its light shape every thought, work and relationship.</p></div></section>
      <section className="hero hero-vision" id="pathways" aria-label="The Vision">
        <div className="hero-orb" aria-hidden="true"><span>✦</span></div>
        <div className="hero-copy"><p className="eyebrow">{t.eyebrow}</p><h1 className="kicker vision-label">THE VISION</h1><div className="pillars hero-vision-pillars">{t.cards.map((x,i)=><article key={x}><b>0{i+1}</b><span>{x}</span><p>{t.cardNotes[i]}</p></article>)}</div></div>
      </section>

      <section className="people section" aria-labelledby="guides-title">
        <div className="section-title"><div><p className="kicker">LIVES & VISION</p><h2 id="guides-title">Meet Sri Aurobindo and the Mother</h2></div><p>Two lives joined in a work for the evolution of consciousness and the transformation of life.</p></div>
        <div className="people-grid">
          <article className="person-card"><img src="/sri-aurobindo-portrait.jpg" alt="Portrait of Sri Aurobindo" loading="lazy"/><div><small>1872–1950</small><h3>Sri Aurobindo</h3><p>Philosopher, poet, yogi and a leader of India’s independence movement, he developed Integral Yoga as a path of inner and earthly transformation.</p><a href="/sri-aurobindo/life-sketch">Explore his life sketch →</a></div></article>
          <article className="person-card"><img src="/the-mother-portrait.jpg" alt="Portrait of the Mother, Mirra Alfassa" loading="lazy"/><div><small>1878–1973</small><h3>The Mother</h3><p>Born Mirra Alfassa, the Mother was Sri Aurobindo’s spiritual collaborator and guided the Ashram’s many-sided life for nearly fifty years.</p><a href="/the-mother">Explore the Mother’s life →</a></div></article>
        </div>
        <p className="image-credit">Portraits displayed from the Sri Aurobindo Ashram website. Permission for permanent production use should be confirmed with the Ashram Photo Section.</p>
      </section>

      <section className="song-of-savitri gallery section" id="song-of-savitri" aria-labelledby="song-of-savitri-title">
        <div className="section-title gallery-heading"><div><p className="kicker">SAVITRI · IN VISION, VERSE & MEANING</p><h2 id="song-of-savitri-title">The Song of Savitri</h2></div><p>Five luminous lines at a time, Savitri comes alive through evocative imagery and clear meanings in English and Hindi.</p></div>
        {savitriVideos.length > 0 && <div className="gallery-slider-header"><div className="gallery-controls" aria-label="The Song of Savitri navigation"><button type="button" onClick={()=>moveSavitriVideos(-1)} aria-label="Previous Savitri videos">←</button><button type="button" onClick={()=>moveSavitriVideos(1)} aria-label="Next Savitri videos">→</button></div></div>}
        <div className={`gallery-track savitri-video-track ${savitriVideos.length ? "has-items" : ""}`} ref={savitriTrack} aria-label="The Song of Savitri videos" aria-live="polite">
          {savitriVideosLoading ? <div className="gallery-empty"><h3>Loading The Song of Savitri…</h3></div> : savitriVideos.length === 0 ? <div className="gallery-empty"><span>THE SERIES IS READY</span><h3>The first five lines will appear here.</h3><p>Add a YouTube video with its exact Book, Canto, line and page reference.</p></div> : savitriVideos.map(item => <article className="gallery-slide savitri-video-slide" key={item.id}><div className="gallery-media youtube-media"><YouTubeEmbed videoId={item.youtubeId} title={`${item.cantoName} — The Song of Savitri`}/></div><div className="gallery-caption"><span>Part {item.part}</span><h3><small>Book {item.bookNo} · Canto {item.cantoNo}</small>{item.cantoName}</h3><dl className="savitri-video-meta"><div><dt>Part</dt><dd>{item.part}</dd></div><div><dt>Book No.</dt><dd>{item.bookNo}</dd></div><div><dt>Canto No.</dt><dd>{item.cantoNo}</dd></div><div><dt>Name of Canto</dt><dd>{item.cantoName}</dd></div><div><dt>Line Nos.</dt><dd>{item.lineNos}</dd></div><div><dt>Page No.</dt><dd>{item.pageNo}</dd></div></dl></div></article>)}
        </div>
        <div className="gallery-action"><p>Add the next five-line visual passage from the SAS_Lko YouTube channel with its complete Savitri reference and description.</p><button className="button quiet" onClick={()=>open("savitri")}>Add a Song of Savitri video →</button></div>
      </section>

      <section className="roots section" aria-labelledby="roots-title"><div className="section-title"><div><p className="kicker">A LIVING MOVEMENT</p><h2 id="roots-title">From Puducherry to Lucknow</h2></div><p>Founded by the Mother in Pondicherry on 19 September 1960, Sri Aurobindo Society carries Indian spirituality into meditation, education, culture and everyday life, drawing on the deeper spirit of India and its philosophical heritage.</p></div><div className="roots-grid">
        <article><span>01</span><h3>Puducherry</h3><p>The Society’s administrative headquarters and Society House are in Puducherry, close to the wider spiritual, cultural and educational life inspired by Sri Aurobindo and the Mother.</p><a href="https://aurosociety.org/society/index/About-Sri-Aurobindo-Society" target="_blank" rel="noreferrer">About the Society ↗</a></article>
        <article><span>02</span><h3>Auroville</h3><p>Founded by the Mother in 1968, Auroville is an international township dedicated to human unity, unending education and material and spiritual research.</p><a href="https://auroville.org/page/history" target="_blank" rel="noreferrer">Explore Auroville ↗</a></article>
        <article><span>03</span><h3>Sultanpur</h3><p>A sacred centre housing Sri Aurobindo’s relics and nurturing collective meditation, study and educational activities.</p><a href="/sultanpur-shrine">Explore the Sultanpur Shrine →</a></article>
        <article><span>04</span><h3>Lucknow</h3><p>The Lucknow and Gomti Nagar centres bring this vision into local life through Sunday meetings, lectures, study, reflection and community participation.</p><a href="#location">Visit our centre →</a></article>
      </div></section>

      <section className="library section" id="wisdom">
        <div className="section-title"><div><p className="kicker">E-LIBRARY · READ · LISTEN · EXPLORE</p><h2>A digital doorway to their works</h2></div><p>Browse books, audio, art, Savitri, flowers and the lives of disciples through a carefully organised spiritual library.</p></div>
        <div className="language-strip" aria-label="Available library languages"><span>LANGUAGES</span><b>English</b><b>हिन्दी</b><b>বাংলা</b><b>Français</b><b>मराठी</b><b>தமிழ்</b><b>ગુજરાતી</b><b>తెలుగు</b></div>
        <div className="library-toolbar">
          <label className="library-search"><span>Search the library</span><input value={libraryQuery} onChange={event=>setLibraryQuery(event.target.value)} placeholder="Try Savitri, flowers, audio…"/></label>
          <div className="filters" aria-label="Filter library collections">{["All","Books","Audio","Explore"].map(value=><button key={value} onClick={()=>setFilter(value)} className={filter===value?"active":""}>{value}</button>)}</div>
        </div>
        <div className="library-grid">{isSearchingLibrary ? filteredLibraryResults.map((item,i)=><a className="library-card" href={item.href} target="_blank" rel="noreferrer" key={item.href}><span className="library-number">{String(i + 1).padStart(2,"0")}</span><small>{item.category} · {item.source}</small><h3>{item.title}</h3><p className="library-search-snippet">{item.snippet || "From the official e-Library index."}</p><b>Open result →</b></a>) : shown.map((item,i)=><a className="library-card" href={item.href} target="_blank" rel="noreferrer" key={item.title}><span className="library-number">{String(i+1).padStart(2,"0")}</span><small>{item.category} · {item.count}</small><h3>{item.title}</h3><ul>{item.items.map(entry=><li key={entry}>{entry}</li>)}</ul><b>Open collection →</b></a>)}</div>
        {isSearchingLibrary && librarySearching && <p className="library-empty">Searching the live e-Library for "{libraryQuery}"...</p>}
        {isSearchingLibrary && librarySearchError && <p className="library-empty">Live search is temporarily unavailable. Showing local collections.</p>}
        {isSearchingLibrary && !librarySearching && !librarySearchError && filteredLibraryResults.length === 0 && <p className="library-empty">No matches found. Try another keyword.</p>}
        {!isSearchingLibrary && shown.length === 0 && <p className="library-empty">No collection matches that search. Try a broader word.</p>}
        <p className="library-credit">Catalogue information and destination links are adapted from <a href="https://www.motherandsriaurobindo.in/" target="_blank" rel="noreferrer">The Mother & Sri Aurobindo e‑Library</a>. Content opens on the source website.</p>
      </section>

      <section className="lectures section" aria-labelledby="lectures-title"><div className="section-title"><div><p className="kicker">LUCKNOW LECTURE ARCHIVE</p><h2 id="lectures-title">Conversations for a conscious life</h2></div><p>Nearly fifty online lectures have brought seekers from Lucknow and neighbouring regions together for study and reflection.</p></div>
        <div className="lecture-grid"><article><span>01</span><small>FOUNDATIONS</small><h3>Sri Aurobindo’s evolutionary vision</h3><p>Introductions to consciousness, human potential and the movement towards a life divine.</p></article><article><span>02</span><small>PRACTICE</small><h3>Integral Yoga in daily life</h3><p>Talks on work, relationships, education, family life and the discovery of the inner being.</p></article><article><span>03</span><small>STUDY</small><h3>Approaching Savitri</h3><p>Guided readings and conversations around Sri Aurobindo’s epic poem.</p></article></div>
        <div className="facebook-embed"><iframe title="Sri Aurobindo Society Lucknow Facebook videos and posts" src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fsaslucknow&tabs=timeline&width=500&height=640&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false" width="500" height="640" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"/></div>
        <a className="facebook-link" href="https://www.facebook.com/saslucknow" target="_blank" rel="noreferrer"><b>f</b><span>Explore all videos on Facebook<small>Sri Aurobindo Society Lucknow · official page</small></span><strong>↗</strong></a>
      </section>

      <section className="gallery section" id="gallery"><div className="section-title gallery-heading"><div><p className="kicker">MEMORIES OF THE WORK</p><h2>Gatherings through the years</h2></div><p>A growing visual record of lectures, study circles, observances, shrine visits and community moments.</p></div>{galleryItems.length > 0 && <div className="gallery-slider-header"><div className="gallery-controls" aria-label="Gallery navigation"><button type="button" onClick={()=>moveGallery(-1)} aria-label="Previous gallery items">←</button><button type="button" onClick={()=>moveGallery(1)} aria-label="Next gallery items">→</button></div></div>}<div className={`gallery-track ${galleryItems.length ? "has-items" : ""}`} ref={galleryTrack} aria-label="Event photographs and videos" aria-live="polite">{galleryLoading ? <div className="gallery-empty">Loading event memories…</div> : galleryItems.length === 0 ? <div className="gallery-empty"><span>THE GALLERY IS READY</span><h3>Event memories will appear here.</h3><p>Use the button below to share photographs or add a YouTube video.</p></div> : galleryItems.map(item => <article className="gallery-slide" key={item.id}><div className={`gallery-media ${item.youtubeId ? "youtube-media" : ""}`}>{item.youtubeId ? <YouTubeEmbed videoId={item.youtubeId} title={`${item.title} event video`}/> : <img src={item.mediaUrl} alt={`${item.title} event photograph`} loading="lazy"/>}</div><div className="gallery-caption"><span>{item.category}</span><h3><small>Event</small>{item.title}</h3><p>{item.description}</p><time dateTime={item.eventDate}>{displayDate(item.eventDate)}</time></div></article>)}</div><div className="gallery-action"><p>Visitors may submit event photographs or add a public YouTube video link with its title, date and description. YouTube videos are published automatically; photo-only submissions are reviewed first.</p><button className="button quiet" onClick={()=>open("gallery")}>Add event photos or YouTube video →</button></div></section>

      <section className="events section" id="events"><div><p className="kicker">COME TOGETHER</p><h2>{t.upcoming}</h2></div>
        <article className="weekly-card"><span>EVERY SUNDAY</span><div><h3>Weekly collective meeting</h3><p>Quiet reflection, study and fellowship · 6:00–7:00 PM</p></div><a className="button primary" href="#location">Plan your visit →</a></article>
      </section>

      <section className="location section" id="location"><div className="location-copy"><p className="kicker">VISIT THE CENTRE</p><h2>Come, sit with us.</h2><address>4/668, Vijayant Khand<br/>Gomti Nagar, Lucknow – 226010</address><div className="meeting-time"><span>SUNDAY</span><strong>6:00–7:00 PM</strong><small>Regular weekly meeting</small></div><h3>Mr. Rajendra Kumar Singh</h3><p>Secretary, Gomti Nagar Centre (UC-02)<br/>Vice-Chairman, Sri Aurobindo Society, UP & Uttarakhand</p><a className="contact-phone" href="tel:+917388899001">+91 73888 99001</a><a className="contact-email" href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a><div className="location-actions"><a className="button primary" href="https://www.google.com/maps/search/?api=1&query=4%2F668%2C%20Vijayant%20Khand%2C%20Gomti%20Nagar%2C%20Lucknow%20226010" target="_blank" rel="noreferrer">Get directions ↗</a><a className="button quiet" href="tel:+917388899001">Call the centre</a></div></div><div className="map"><iframe title="Map to Sri Aurobindo Society Gomti Nagar Centre" src="https://www.google.com/maps?q=4%2F668%2C%20Vijayant%20Khand%2C%20Gomti%20Nagar%2C%20Lucknow%20226010&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></div></section>

      <section className="community section" id="community"><p className="kicker">JOIN THE COMMUNITY</p><h2>{t.community}</h2><div className="community-grid"><a href="/participate#parichay"><span>01</span><b>{t.join}</b><small>Create your member account →</small></a><a href="/participate#sankalp"><span>02</span><b>{t.volunteer}</b><small>Discover current Sankalp and offer seva →</small></a></div></section>

      <section className="support section"><div><p className="kicker">A QUIET INVITATION</p><h2>{t.support}</h2><p>{t.supportText}</p></div><a className="button quiet light" href="/participate#kosh">{t.contribute} →</a></section>
    </main>

    <footer><div className="brand inverse"><img className="society-logo" src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></div><p>{t.footer}</p><div><a href="#wisdom">Wisdom</a><a href="#events">Events</a><a href="mailto:info.saslucknow@gmail.com">Email</a></div><small>{t.disclaimer}</small></footer>

    <aside className={`sakhi-widget ${sakhiOpen ? "open" : ""}`} aria-label="Savitri Sakhi AI assistant">
      {sakhiOpen && <section className="sakhi-window" role="dialog" aria-label="Chat with Savitri Sakhi">
        <header className="sakhi-header">
          <div className="sakhi-symbol" aria-hidden="true"><span>✦</span>S</div>
          <div><small>SAVITRI · SRI AUROBINDO · THE MOTHER</small><h2>Savitri Sakhi</h2><p>सावित्री सखी</p></div>
          <button type="button" onClick={() => setSakhiOpen(false)} aria-label="Close Savitri Sakhi">×</button>
        </header>
        <div className="sakhi-conversation" role="log" aria-live="polite" aria-relevant="additions">
          {sakhiMessages.length === 0 && <div className="sakhi-welcome">
            <span aria-hidden="true">✦</span>
            <h3>What would you like to explore?</h3>
            <p>Ask me about <em>Savitri</em>—its lines, symbols, books and cantos—or about the vision of Sri Aurobindo and the Mother. Write in English or Hindi.</p>
            <p className="sakhi-hindi">सावित्री की पंक्तियों, प्रतीकों, पर्वों और सर्गों या श्री अरविंद और श्री माँ के दर्शन के बारे में अंग्रेज़ी अथवा हिंदी में पूछें।</p>
            <div className="sakhi-prompts">
              {["Identify this line: All can be done if the god-touch is there", "Explain the symbol of Night in Savitri", "सावित्री का मुख्य संदेश क्या है?"].map(prompt => <button type="button" key={prompt} onClick={() => setSakhiInput(prompt)}>{prompt}</button>)}
            </div>
          </div>}
          {sakhiMessages.map((message, index) => <article className={`sakhi-message ${message.role}`} key={`${message.role}-${index}`}>
            <small>{message.role === "assistant" ? "Savitri Sakhi" : "You"}</small>
            {message.role === "assistant" ? <SakhiFormattedAnswer content={message.content}/> : <p>{message.content}</p>}
          </article>)}
          {sakhiThinking && <div className="sakhi-thinking" aria-label="Savitri Sakhi is reflecting"><i/><i/><i/><span>Reflecting…</span></div>}
          <div ref={sakhiEndRef}/>
        </div>
        <form className="sakhi-form" onSubmit={askSavitriSakhi}>
          <label htmlFor="sakhi-question">Ask in English or Hindi</label>
          <div><textarea id="sakhi-question" value={sakhiInput} onChange={event => setSakhiInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={4000} placeholder="Type your question… / अपना प्रश्न लिखें…" disabled={sakhiThinking}/><button type="submit" disabled={sakhiThinking || !sakhiInput.trim()} aria-label="Send question to Savitri Sakhi">↑</button></div>
          <small>AI responses may contain errors. Exact references are verified when possible.</small>
        </form>
      </section>}
      <button className="sakhi-launcher" type="button" onClick={() => setSakhiOpen(!sakhiOpen)} aria-expanded={sakhiOpen} aria-label={`${sakhiOpen ? "Close" : "Open"} Savitri Sakhi`}>
        <span className="sakhi-launcher-icon" aria-hidden="true">{sakhiOpen ? "×" : <><i>✦</i>S</>}</span><b>{sakhiOpen ? "Close" : "Savitri Sakhi"}</b><small>{sakhiOpen ? "" : "Ask in English or Hindi"}</small>
      </button>
    </aside>

    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={()=>setDialog(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setDialog(null)} aria-label="Close">×</button>
      {!sent ? <><p className="kicker">SRI AUROBINDO SOCIETY · LUCKNOW</p><h2 id="dialog-title">{dialog === "register" ? "Register for this gathering" : dialog === "join" ? "Join the Community" : dialog === "volunteer" ? "Volunteer with us" : dialog === "gallery" ? "Add event photos or a YouTube video" : dialog === "savitri" ? "Add to The Song of Savitri" : "Make a voluntary contribution"}</h2><p className="privacy">{dialog === "gallery" ? "Share photographs from a Society gathering or paste a public YouTube video link. YouTube videos are published immediately; photo-only submissions are held for review." : dialog === "savitri" ? "Paste one public YouTube video link and provide its complete Savitri reference. The YouTube thumbnail will be used automatically." : "Your details are used only to respond to this request. Optional updates require separate consent."}</p>
      {dialog === "gallery" ? <form onSubmit={submit}>
        <label>Event or album title<input required name="title" maxLength={160}/></label>
        <div className="form-row"><label>Event date<input required type="date" name="date"/></label><label>Category<input required name="category" maxLength={80} placeholder="Lecture, shrine visit…"/></label></div>
        <div className="form-row"><label>Your name<input name="name" maxLength={120} autoComplete="name"/></label><label>Your email<input name="email" maxLength={180} type="email" autoComplete="email"/></label></div>
        <label>Event photographs (optional)<input name="media" type="file" accept="image/jpeg,image/png,image/webp" multiple/><small>Up to 8 photographs, 12 MB each. JPG, PNG or WebP.</small></label>
        <label>YouTube video link (optional)<input name="youtubeUrl" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…"/><small>Add a public YouTube video URL. Its YouTube thumbnail will appear automatically.</small></label>
        <label>Description, context and people pictured<textarea required name="description" maxLength={2500} rows={4}/></label>
        <label className="upload-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        <label className="check"><input required type="checkbox" name="permission" value="yes"/> I confirm that I have permission to publish these photographs or this YouTube video on the website.</label>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}<button className="button primary" type="submit" disabled={uploading}>{uploading ? "Saving securely…" : "Submit media →"}</button>
      </form> : dialog === "savitri" ? <form className="savitri-upload-form" onSubmit={submit}>
        <div className="form-row"><label>Part<input required name="part" maxLength={80} placeholder="Part One"/></label><label>Book No.<input required name="bookNo" maxLength={40} inputMode="numeric" placeholder="1"/></label></div>
        <div className="form-row"><label>Canto No.<input required name="cantoNo" maxLength={40} inputMode="numeric" placeholder="1"/></label><label>Page No.<input required name="pageNo" maxLength={80} placeholder="1–3"/></label></div>
        <label>Name of Canto<input required name="cantoName" maxLength={180} placeholder="The Symbol Dawn"/></label><label>Line Nos.<input required name="lineNos" maxLength={120} placeholder="1–5"/></label>
        <label>Description<textarea required name="description" maxLength={2500} rows={5} placeholder="Add the English and Hindi meaning or a short note about these five lines."/></label>
        <label>YouTube Video Link<input required name="youtubeUrl" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…"/><small>Paste the public SAS_Lko YouTube video URL. The YouTube thumbnail will be used automatically.</small></label>
        <label className="upload-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}<button className="button primary" type="submit" disabled={uploading}>{uploading ? "Publishing video…" : "Publish video →"}</button>
      </form> : <form onSubmit={submit}><label>Full name<input required name="name" autoComplete="name"/></label><div className="form-row"><label>Email<input required type="email" name="email" autoComplete="email"/></label><label>Mobile<input required name="mobile" inputMode="tel" autoComplete="tel"/></label></div>{dialog === "contribute" ? <label>Amount (₹)<input required type="number" min="100" name="amount"/></label> : <label>City<input name="city" defaultValue="Lucknow"/></label>}<label className="check"><input type="checkbox" name="updates"/> I would like occasional mission updates.</label><button className="button primary" type="submit">{dialog === "contribute" ? "Continue securely" : "Submit"} →</button></form>}</> : <div className="success"><span>✓</span><h2>Thank you.</h2><p>{dialog === "savitri" ? `Your YouTube video is now published in The Song of Savitri. Reference: ${uploadReference}.` : dialog === "gallery" ? uploadStatus === "approved" ? `Your YouTube video is now published in Gatherings. Reference: ${uploadReference}.` : `Your photographs have been saved for review. Reference: ${uploadReference}.` : "Your request has been received."}</p><button className="button quiet" onClick={()=>setDialog(null)}>Close</button></div>}
    </div></div>}
  </div>;
}
