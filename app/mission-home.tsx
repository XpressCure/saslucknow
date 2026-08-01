"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
};
const copy = {
  en: {
    nav: ["e-Library", "Events", "Sultanpur Shrine", "Community"],
    eyebrow: "Sri Aurobindo Society · Lucknow Centre",
    title: "A quiet space for inner growth.",
    intro: "Discover the vision of Sri Aurobindo and the Mother. Study, reflect, participate, and grow together.",
    explore: "Begin exploring", event: "View next gathering", today: "A thought for today",
    quote: "Man is a transitional being, he is not final.",
    vision: "A path towards a more conscious life",
    visionText: "Integral Yoga invites every part of life—thought, work, relationship and aspiration—to participate in inner growth.",
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
    community: "Grow with the community", join: "Join the community", volunteer: "Volunteer with us",
    support: "Support the work", supportText: "Voluntary contributions help sustain programmes, publications, shrine care and digital outreach.",
    contribute: "Contribute thoughtfully", footer: "Towards a Life Divine",
    more: "More", darshan: "Darshan Divas",
    disclaimer: "Sri Aurobindo Society, Lucknow · Gomti Nagar Centre (UC-02). The Society was founded by the Mother in 1960 and is headquartered in Puducherry.",
  },
  hi: {
    nav: ["ई-पुस्तकालय", "कार्यक्रम", "सुल्तानपुर समाधि", "समुदाय"],
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
    community: "समुदाय के साथ बढ़ें", join: "समुदाय से जुड़ें", volunteer: "सेवा में सहयोग दें",
    support: "कार्य में सहयोग", supportText: "स्वैच्छिक योगदान कार्यक्रमों, प्रकाशनों, स्थल की देखभाल और डिजिटल प्रसार में सहायक है।",
    contribute: "ससम्मान योगदान", footer: "दिव्य जीवन की ओर",
    more: "और", darshan: "दर्शन दिवस",
    disclaimer: "श्री अरविंद और श्री माँ की शिक्षाओं से प्रेरित एक स्वतंत्र आध्यात्मिक एवं शैक्षिक पहल। औपचारिक संबद्धता उचित प्राधिकरण के बाद ही बताई जाएगी।",
  },
};

const libraryCollections = [
  { category: "Books", title: "Works of Sri Aurobindo", count: "170+ books", items: ["Savitri", "The Life Divine", "The Synthesis of Yoga"], href: "https://www.motherandsriaurobindo.in/Sri-Aurobindo/books/" },
  { category: "Books", title: "Works of the Mother", count: "160+ books", items: ["Prayers and Meditations", "Questions and Answers", "Words of the Mother"], href: "https://www.motherandsriaurobindo.in/The-Mother/books/" },
  { category: "Audio", title: "Music, talks and readings", count: "Audio library", items: ["Meditation music", "Recorded talks", "Readings and messages"], href: "https://www.motherandsriaurobindo.in/The-Mother/audio/" },
  { category: "Explore", title: "Explore Savitri", count: "Poem and study", items: ["Search the text", "Meditations on Savitri", "Book and canto index"], href: "https://www.motherandsriaurobindo.in/Sri-Aurobindo/savitri/" },
  { category: "Explore", title: "Spiritual significance of flowers", count: "800+ flowers", items: ["Search by significance", "Browse by colour", "Botanical index"], href: "https://www.motherandsriaurobindo.in/The-Mother/spiritual-significance-of-flowers/" },
  { category: "Explore", title: "The Mother as an artist", count: "100+ artworks", items: ["Paintings", "Drawings", "Thoughts on art"], href: "https://www.motherandsriaurobindo.in/The-Mother/The-Mother-as-an-artist/" },
  { category: "Books", title: "Disciples and seekers", count: "100+ persons", items: ["Books and memoirs", "Interviews", "A–Z index"], href: "https://www.motherandsriaurobindo.in/disciples/" },
  { category: "Explore", title: "Guidance and quotations", count: "Daily inspiration", items: ["Their guidance", "Aphorisms", "Prayers and mantras"], href: "https://www.motherandsriaurobindo.in/guidance/" },
];

export function MissionHome() {
  const [lang, setLang] = useState<Language>("en");
  const [menu, setMenu] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [dialog, setDialog] = useState<"register" | "join" | "volunteer" | "contribute" | "gallery" | null>(null);
  const [sent, setSent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadReference, setUploadReference] = useState("");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const galleryTrack = useRef<HTMLDivElement>(null);
  const t = copy[lang];
  const shown = useMemo(() => libraryCollections.filter(item => {
    const matchesCategory = filter === "All" || item.category === filter;
    const haystack = `${item.title} ${item.count} ${item.items.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(libraryQuery.trim().toLowerCase());
  }), [filter, libraryQuery]);
  const open = (name: typeof dialog) => { setSent(false); setUploading(false); setSubmitError(""); setUploadReference(""); setDialog(name); };
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/gallery-items", { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Gallery unavailable")))
      .then(result => setGalleryItems(Array.isArray(result.items) ? result.items : []))
      .catch(error => { if (error?.name !== "AbortError") setGalleryItems([]); })
      .finally(() => setGalleryLoading(false));
    return () => controller.abort();
  }, []);
  const moveGallery = (direction: -1 | 1) => {
    const track = galleryTrack.current;
    if (track) track.scrollBy({ left: direction * Math.max(280, track.clientWidth * .82), behavior: "smooth" });
  };
  const displayDate = (date: string) => {
    const value = new Date(`${date}T00:00:00`);
    return Number.isNaN(value.getTime()) ? date : new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" }).format(value);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialog !== "gallery") { setSent(true); return; }
    setUploading(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/gallery-submissions", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The upload could not be saved.");
      setUploadReference(result.reference || "received");
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The upload could not be saved. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return <div className={lang === "hi" ? "hindi" : ""}>
    <a href="#main" className="skip">Skip to content</a>
    <header className="site-header">
      <a className="brand" href="#"><img className="society-logo" src="https://cms.aurosociety.org/kcfinder/images/images/sas-symbol%281%29.jpg" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></a>
      <button className="menu-button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Toggle navigation">☰</button>
      <nav className={menu ? "open" : ""} aria-label="Main navigation">
        {t.nav.map((item, i) => <a key={item} href={["#wisdom","#events","/sultanpur-shrine","#community"][i]} onClick={() => setMenu(false)}>{item}</a>)}
        <div className={`more-menu ${moreOpen ? "open" : ""}`}>
          <button type="button" aria-expanded={moreOpen} aria-haspopup="true" onClick={() => setMoreOpen(!moreOpen)}>{t.more}</button>
          <div className="more-dropdown"><a href="/darshan-divas" onClick={() => { setMoreOpen(false); setMenu(false); }}>{t.darshan}</a></div>
        </div>
      </nav>
      <div className="language"><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button><span>/</span><button className={lang === "hi" ? "active" : ""} onClick={() => setLang("hi")}>हिं</button></div>
    </header>

    <main id="main">
      <section className="theme-banner" aria-label="Website theme: The Song of Life"><img src="/song-of-life-banner.png" alt="The Song of Life, glowing over a radiant golden dawn"/><div className="theme-caption"><span>OUR WEBSITE THEME</span><p>A luminous invitation to discover the deeper music within life.</p></div></section>
      <section className="hero" id="discover">
        <div className="hero-orb" aria-hidden="true"><span>✦</span></div>
        <div className="hero-copy"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="lead">{t.intro}</p>
          <div className="actions"><a className="button primary" href="#pathways">{t.explore} <span>→</span></a><a className="button quiet" href="#events">{t.event}</a></div>
        </div>
        <aside className="quote-card"><span className="line"/><p>{t.today}</p><blockquote>“{t.quote}”</blockquote><small>— Sri Aurobindo · CWSA Vol. 12, p. 157</small></aside>
      </section>

      <section className="people section" aria-labelledby="guides-title">
        <div className="section-title"><div><p className="kicker">LIVES & VISION</p><h2 id="guides-title">Meet Sri Aurobindo and the Mother</h2></div><p>Two lives joined in a work for the evolution of consciousness and the transformation of life.</p></div>
        <div className="people-grid">
          <article className="person-card"><img src="/sri-aurobindo-portrait.jpg" alt="Portrait of Sri Aurobindo" loading="lazy"/><div><small>1872–1950</small><h3>Sri Aurobindo</h3><p>Philosopher, poet, yogi and a leader of India’s awakening, he developed Integral Yoga as a path of inner and earthly transformation.</p><a href="/sri-aurobindo/life-sketch">Explore his life sketch →</a></div></article>
          <article className="person-card"><img src="/the-mother-portrait.jpg" alt="Portrait of the Mother, Mirra Alfassa" loading="lazy"/><div><small>1878–1973</small><h3>The Mother</h3><p>Born Mirra Alfassa, the Mother was Sri Aurobindo’s spiritual collaborator and guided the Ashram’s many-sided life for nearly fifty years.</p><a href="/the-mother">Explore the Mother’s life →</a></div></article>
        </div>
        <p className="image-credit">Portraits displayed from the Sri Aurobindo Ashram website. Permission for permanent production use should be confirmed with the Ashram Photo Section.</p>
      </section>

      <section className="vision section" id="pathways"><div><p className="kicker">THE VISION</p><h2>{t.vision}</h2><p>{t.visionText}</p></div><div className="pillars">{t.cards.map((x,i)=><article key={x}><b>0{i+1}</b><span>{x}</span><p>{t.cardNotes[i]}</p></article>)}</div></section>

      <section className="roots section" aria-labelledby="roots-title"><div className="section-title"><div><p className="kicker">A LIVING MOVEMENT</p><h2 id="roots-title">From Puducherry to Lucknow</h2></div><p>Sri Aurobindo Society was started by the Mother on 19 September 1960 and has grown into an international organisation carrying spirituality into many fields of life.</p></div><div className="roots-grid">
        <article><span>01</span><h3>Puducherry</h3><p>The Society’s administrative headquarters and Society House are in Puducherry, close to the wider spiritual, cultural and educational life inspired by Sri Aurobindo and the Mother.</p><a href="https://aurosociety.org/society/index/About-Sri-Aurobindo-Society" target="_blank" rel="noreferrer">About the Society ↗</a></article>
        <article><span>02</span><h3>Auroville</h3><p>Founded by the Mother in 1968, Auroville is an international township dedicated to human unity, unending education and material and spiritual research.</p><a href="https://auroville.org/page/history" target="_blank" rel="noreferrer">Explore Auroville ↗</a></article>
        <article><span>03</span><h3>Lucknow</h3><p>The Lucknow and Gomti Nagar centres bring this vision into local life through Sunday meetings, lectures, study, reflection and community participation.</p><a href="#location">Visit our centre →</a></article>
        <article><span>04</span><h3>Sultanpur</h3><p>A sacred centre housing Sri Aurobindo’s relics and nurturing collective meditation, study and educational activities.</p><a href="/sultanpur-shrine">Explore the Sultanpur Shrine →</a></article>
      </div></section>

      <section className="library section" id="wisdom">
        <div className="section-title"><div><p className="kicker">E-LIBRARY · READ · LISTEN · EXPLORE</p><h2>A digital doorway to their works</h2></div><p>Browse books, audio, art, Savitri, flowers and the lives of disciples through a carefully organised spiritual library.</p></div>
        <div className="language-strip" aria-label="Available library languages"><span>LANGUAGES</span><b>English</b><b>हिन्दी</b><b>বাংলা</b><b>Français</b><b>मराठी</b><b>தமிழ்</b><b>ગુજરાતી</b><b>తెలుగు</b></div>
        <div className="library-toolbar">
          <label className="library-search"><span>Search the library</span><input value={libraryQuery} onChange={event=>setLibraryQuery(event.target.value)} placeholder="Try Savitri, flowers, audio…"/></label>
          <div className="filters" aria-label="Filter library collections">{["All","Books","Audio","Explore"].map(value=><button key={value} onClick={()=>setFilter(value)} className={filter===value?"active":""}>{value}</button>)}</div>
        </div>
        <div className="library-grid">{shown.map((item,i)=><a className="library-card" href={item.href} target="_blank" rel="noreferrer" key={item.title}><span className="library-number">{String(i+1).padStart(2,"0")}</span><small>{item.category} · {item.count}</small><h3>{item.title}</h3><ul>{item.items.map(entry=><li key={entry}>{entry}</li>)}</ul><b>Open collection ↗</b></a>)}</div>
        {shown.length === 0 && <p className="library-empty">No collection matches that search. Try a broader word.</p>}
        <p className="library-credit">Catalogue information and destination links are adapted from <a href="https://www.motherandsriaurobindo.in/" target="_blank" rel="noreferrer">The Mother & Sri Aurobindo e‑Library</a>. Content opens on the source website.</p>
      </section>

      <section className="lectures section" aria-labelledby="lectures-title"><div className="section-title"><div><p className="kicker">LUCKNOW LECTURE ARCHIVE</p><h2 id="lectures-title">Conversations for a conscious life</h2></div><p>Nearly fifty online lectures have brought seekers from Lucknow and neighbouring regions together for study and reflection.</p></div>
        <div className="lecture-grid"><article><span>01</span><small>FOUNDATIONS</small><h3>Sri Aurobindo’s evolutionary vision</h3><p>Introductions to consciousness, human potential and the movement towards a life divine.</p></article><article><span>02</span><small>PRACTICE</small><h3>Integral Yoga in daily life</h3><p>Talks on work, relationships, education, family life and the discovery of the inner being.</p></article><article><span>03</span><small>STUDY</small><h3>Approaching Savitri</h3><p>Guided readings and conversations around Sri Aurobindo’s epic poem.</p></article></div>
        <div className="facebook-embed"><iframe title="Sri Aurobindo Society Lucknow Facebook videos and posts" src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fsaslucknow&tabs=timeline&width=500&height=640&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false" width="500" height="640" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"/></div>
        <a className="facebook-link" href="https://www.facebook.com/saslucknow" target="_blank" rel="noreferrer"><b>f</b><span>Explore all videos on Facebook<small>Sri Aurobindo Society Lucknow · official page</small></span><strong>↗</strong></a>
      </section>

      <section className="events section" id="events"><div><p className="kicker">COME TOGETHER</p><h2>{t.upcoming}</h2></div>
        <article className="weekly-card"><span>EVERY SUNDAY</span><div><h3>Weekly collective meeting</h3><p>Quiet reflection, study and fellowship · 6:00–7:00 PM</p></div><a className="button primary" href="#location">Plan your visit →</a></article>
        <article className="event-card"><div className="date"><strong>15</strong><span>AUG<br/>2026</span></div><div className="event-info"><span>SPECIAL OBSERVANCE · OFFLINE</span><h3>A collective meditation & reflection</h3><p>Saturday · 5:30 PM IST · Lucknow</p></div><button className="button primary" onClick={()=>open("register")}>{t.register} →</button></article>
        <article className="event-card secondary"><div className="date"><strong>23</strong><span>AUG<br/>2026</span></div><div className="event-info"><span>SAVITRI STUDY · ONLINE</span><h3>Savitri: Book One, Canto One</h3><p>Sunday · 10:30 AM IST · Zoom</p></div><button className="button quiet" onClick={()=>open("register")}>{t.register}</button></article>
      </section>

      <section className="gallery section" id="gallery"><div className="section-title gallery-heading"><div><p className="kicker">MEMORIES OF THE WORK</p><h2>Gatherings through the years</h2></div><p>A growing visual record of lectures, study circles, observances, shrine visits and community moments.</p></div>{galleryItems.length > 0 && <div className="gallery-slider-header"><div className="gallery-controls" aria-label="Gallery navigation"><button type="button" onClick={()=>moveGallery(-1)} aria-label="Previous gallery items">←</button><button type="button" onClick={()=>moveGallery(1)} aria-label="Next gallery items">→</button></div></div>}<div className={`gallery-track ${galleryItems.length ? "has-items" : ""}`} ref={galleryTrack} aria-label="Event photographs and videos" aria-live="polite">{galleryLoading ? <div className="gallery-empty">Loading event memories…</div> : galleryItems.length === 0 ? <div className="gallery-empty"><span>THE GALLERY IS READY</span><h3>Approved event memories will appear here.</h3><p>Use the upload button below to submit photographs or videos for review.</p></div> : galleryItems.map(item => <article className="gallery-slide" key={item.id}><div className="gallery-media">{item.kind === "video" ? <video controls preload="metadata" playsInline><source src={item.mediaUrl} type={item.mimeType}/>Your browser cannot play this video.</video> : <img src={item.mediaUrl} alt={`${item.title} event photograph`} loading="lazy"/>}</div><div className="gallery-caption"><span>{item.category}</span><h3><small>Event</small>{item.title}</h3><p>{item.description}</p><time dateTime={item.eventDate}>{displayDate(item.eventDate)}</time></div></article>)}</div><div className="gallery-action"><p>Visitors may submit event photographs or videos with a title, date and description. Every submission is reviewed before publication.</p><button className="button quiet" onClick={()=>open("gallery")}>Upload event photos or videos →</button></div></section>

      <section className="location section" id="location"><div className="location-copy"><p className="kicker">VISIT THE CENTRE</p><h2>Come, sit with us.</h2><address>4/668, Vijayant Khand<br/>Gomti Nagar, Lucknow – 226010</address><div className="meeting-time"><span>SUNDAY</span><strong>6:00–7:00 PM</strong><small>Regular weekly meeting</small></div><h3>Mr. Rajendra Kumar Singh</h3><p>Secretary, Gomti Nagar Centre (UC-02)<br/>Vice-Chairman, Sri Aurobindo Society, UP & Uttarakhand</p><a className="contact-phone" href="tel:+917388899001">+91 73888 99001</a><a className="contact-email" href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a><div className="location-actions"><a className="button primary" href="https://www.google.com/maps/search/?api=1&query=4%2F668%2C%20Vijayant%20Khand%2C%20Gomti%20Nagar%2C%20Lucknow%20226010" target="_blank" rel="noreferrer">Get directions ↗</a><a className="button quiet" href="tel:+917388899001">Call the centre</a></div></div><div className="map"><iframe title="Map to Sri Aurobindo Society Gomti Nagar Centre" src="https://www.google.com/maps?q=4%2F668%2C%20Vijayant%20Khand%2C%20Gomti%20Nagar%2C%20Lucknow%20226010&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></div></section>

      <section className="community section" id="community"><p className="kicker">PARTICIPATE</p><h2>{t.community}</h2><div className="community-grid"><button onClick={()=>open("join")}><span>01</span><b>{t.join}</b><small>Study circles, gatherings and updates →</small></button><button onClick={()=>open("volunteer")}><span>02</span><b>{t.volunteer}</b><small>Offer time, skills or venue support →</small></button></div></section>

      <section className="support section"><div><p className="kicker">A QUIET INVITATION</p><h2>{t.support}</h2><p>{t.supportText}</p></div><button className="button quiet light" onClick={()=>open("contribute")}>{t.contribute} →</button></section>
    </main>

    <footer><div className="brand inverse"><img className="society-logo" src="https://cms.aurosociety.org/kcfinder/images/images/sas-symbol%281%29.jpg" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></div><p>{t.footer}</p><div><a href="#wisdom">Wisdom</a><a href="#events">Events</a><a href="mailto:info.saslucknow@gmail.com">Email</a></div><small>{t.disclaimer}</small></footer>

    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={()=>setDialog(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setDialog(null)} aria-label="Close">×</button>
      {!sent ? <><p className="kicker">AUROBINDO MISSION LUCKNOW</p><h2 id="dialog-title">{dialog === "register" ? "Register for this gathering" : dialog === "join" ? "Join the community" : dialog === "volunteer" ? "Volunteer with us" : dialog === "gallery" ? "Add event photos or videos" : "Make a voluntary contribution"}</h2><p className="privacy">{dialog === "gallery" ? "Share media from a Society gathering. Files are stored privately with a pending status and reviewed before they can appear on the website." : "Your details are used only to respond to this request. Optional updates require separate consent."}</p>
      {dialog === "gallery" ? <form onSubmit={submit}><label>Event or album title<input required name="title" maxLength={160}/></label><div className="form-row"><label>Event date<input required type="date" name="date"/></label><label>Category<input required name="category" maxLength={80} placeholder="Lecture, shrine visit…"/></label></div><div className="form-row"><label>Your name<input name="name" maxLength={120} autoComplete="name"/></label><label>Your email<input name="email" maxLength={180} type="email" autoComplete="email"/></label></div><label>Photographs or videos<input required name="media" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple/><small>Up to 8 files. Photos: 12 MB each. Videos: 80 MB each. JPG, PNG, WebP, MP4, WebM or MOV.</small></label><label>Description, context and people pictured<textarea required name="description" maxLength={2500} rows={4}/></label><label className="upload-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label><label className="check"><input required type="checkbox" name="permission" value="yes"/> I confirm that I have permission to submit these photos or videos for review and possible publication.</label>{submitError && <p className="form-error" role="alert">{submitError}</p>}<button className="button primary" type="submit" disabled={uploading}>{uploading ? "Uploading securely…" : "Submit for review →"}</button></form> : <form onSubmit={submit}><label>Full name<input required name="name" autoComplete="name"/></label><div className="form-row"><label>Email<input required type="email" name="email" autoComplete="email"/></label><label>Mobile<input required name="mobile" inputMode="tel" autoComplete="tel"/></label></div>{dialog === "contribute" ? <label>Amount (₹)<input required type="number" min="100" name="amount"/></label> : <label>City<input name="city" defaultValue="Lucknow"/></label>}<label className="check"><input type="checkbox" name="updates"/> I would like occasional mission updates.</label><button className="button primary" type="submit">{dialog === "contribute" ? "Continue securely" : "Submit"} →</button></form>}</> : <div className="success"><span>✓</span><h2>Thank you.</h2><p>{dialog === "gallery" ? `Your media has been saved for review. Reference: ${uploadReference}. It will not appear publicly until approved.` : "Your request has been received."}</p><button className="button quiet" onClick={()=>setDialog(null)}>Close</button></div>}
    </div></div>}
  </div>;
}
