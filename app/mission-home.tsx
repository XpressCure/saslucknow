"use client";

import { FormEvent, useMemo, useState } from "react";

type Language = "en" | "hi";
const copy = {
  en: {
    nav: ["Discover", "Wisdom", "Events", "Sultanpur Shrine", "Community"],
    eyebrow: "Sri Aurobindo Society · Lucknow Centre",
    title: "A quiet space for inner growth.",
    intro: "Discover the vision of Sri Aurobindo and the Mother. Study, reflect, participate, and grow together.",
    explore: "Begin exploring", event: "View next gathering", today: "A thought for today",
    quote: "Man is a transitional being, he is not final.",
    vision: "A path towards a more conscious life",
    visionText: "Integral Yoga invites every part of life—thought, work, relationship and aspiration—to participate in inner growth.",
    cards: ["Inner growth", "Conscious living", "Human unity", "Spiritual evolution"],
    learn: "Begin with what speaks to you",
    learnText: "Simple entry points into a vast and many-sided vision.",
    pathways: ["Sri Aurobindo", "The Mother", "Integral Yoga", "Savitri"],
    library: "From the wisdom library", all: "All", articles: "Articles", talks: "Talks", reflections: "Reflections",
    upcoming: "Upcoming gatherings", register: "Register", shrine: "The Sultanpur shrine",
    shrineText: "A sacred place holding the relics of Sri Aurobindo, and a living centre for remembrance, study and quiet collective aspiration.",
    community: "Grow with the community", join: "Join the community", volunteer: "Volunteer with us",
    support: "Support the work", supportText: "Voluntary contributions help sustain programmes, publications, shrine care and digital outreach.",
    contribute: "Contribute thoughtfully", footer: "Towards a Life Divine",
    disclaimer: "Sri Aurobindo Society, Lucknow · Gomti Nagar Centre (UC-02). The Society was founded by the Mother in 1960 and is headquartered in Puducherry.",
  },
  hi: {
    nav: ["परिचय", "ज्ञान", "कार्यक्रम", "सुल्तानपुर समाधि", "समुदाय"],
    eyebrow: "श्री अरविंद–श्री माँ मिशन, लखनऊ", title: "आंतरिक विकास के लिए एक शांत स्थान।",
    intro: "श्री अरविंद और श्री माँ के दर्शन को जानें। अध्ययन करें, मनन करें, सहभागी बनें और साथ बढ़ें।",
    explore: "यात्रा आरंभ करें", event: "अगला कार्यक्रम देखें", today: "आज का विचार",
    quote: "Man is a transitional being, he is not final.",
    vision: "अधिक सचेत जीवन की ओर", visionText: "पूर्ण योग जीवन के प्रत्येक अंग—विचार, कर्म, संबंध और आकांक्षा—को आंतरिक विकास में सहभागी बनाता है।",
    cards: ["आंतरिक विकास", "सचेत जीवन", "मानव एकता", "आध्यात्मिक विकास"],
    learn: "जहाँ से मन जुड़े, वहीं से आरंभ करें", learnText: "एक विशाल और बहुआयामी दर्शन के सरल प्रवेश-द्वार।",
    pathways: ["श्री अरविंद", "श्री माँ", "पूर्ण योग", "सावित्री"],
    library: "ज्ञान संग्रह से", all: "सभी", articles: "लेख", talks: "व्याख्यान", reflections: "मनन",
    upcoming: "आगामी आयोजन", register: "पंजीकरण", shrine: "सुल्तानपुर पवित्र स्थल",
    shrineText: "श्री अरविंद के पवित्र अवशेषों का स्थल—स्मरण, अध्ययन और सामूहिक आकांक्षा का जीवंत केंद्र।",
    community: "समुदाय के साथ बढ़ें", join: "समुदाय से जुड़ें", volunteer: "सेवा में सहयोग दें",
    support: "कार्य में सहयोग", supportText: "स्वैच्छिक योगदान कार्यक्रमों, प्रकाशनों, स्थल की देखभाल और डिजिटल प्रसार में सहायक है।",
    contribute: "ससम्मान योगदान", footer: "दिव्य जीवन की ओर",
    disclaimer: "श्री अरविंद और श्री माँ की शिक्षाओं से प्रेरित एक स्वतंत्र आध्यात्मिक एवं शैक्षिक पहल। औपचारिक संबद्धता उचित प्राधिकरण के बाद ही बताई जाएगी।",
  },
};

const resources = [
  { type: "Articles", title: "What is Integral Yoga?", meta: "A gentle introduction · 6 min" },
  { type: "Talks", title: "The relevance of Sri Aurobindo today", meta: "Recorded lecture · 42 min" },
  { type: "Reflections", title: "Reading Savitri together", meta: "Study circle notes · 8 min" },
];

export function MissionHome() {
  const [lang, setLang] = useState<Language>("en");
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState("All");
  const [dialog, setDialog] = useState<"register" | "join" | "volunteer" | "contribute" | "gallery" | null>(null);
  const [sent, setSent] = useState(false);
  const t = copy[lang];
  const shown = useMemo(() => filter === "All" ? resources : resources.filter(r => r.type === filter), [filter]);
  const open = (name: typeof dialog) => { setSent(false); setDialog(name); };
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true); };

  return <div className={lang === "hi" ? "hindi" : ""}>
    <a href="#main" className="skip">Skip to content</a>
    <header className="site-header">
      <a className="brand" href="#"><img className="society-logo" src="https://cms.aurosociety.org/kcfinder/images/images/sas-symbol%281%29.jpg" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></a>
      <button className="menu-button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Toggle navigation">☰</button>
      <nav className={menu ? "open" : ""} aria-label="Main navigation">
        {t.nav.map((item, i) => <a key={item} href={`#${["discover","wisdom","events","shrine","community"][i]}`} onClick={() => setMenu(false)}>{item}</a>)}
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
          <article className="person-card"><img src="https://www.sriaurobindoashram.org/sriaurobindo/images/sa_37.jpg" alt="Portrait of Sri Aurobindo" loading="lazy"/><div><small>1872–1950</small><h3>Sri Aurobindo</h3><p>Philosopher, poet, yogi and a leader of India’s awakening, he developed Integral Yoga as a path of inner and earthly transformation.</p><a href="https://www.sriaurobindoashram.org/exhibitions/a-life-sketch/page01.html" target="_blank" rel="noreferrer">Read the authorised life sketch ↗</a></div></article>
          <article className="person-card"><img src="https://www.sriaurobindoashram.org/mother/images/ma01.jpg" alt="Portrait of the Mother, Mirra Alfassa" loading="lazy"/><div><small>1878–1973</small><h3>The Mother</h3><p>Born Mirra Alfassa, the Mother was Sri Aurobindo’s spiritual collaborator and guided the Ashram’s many-sided life for nearly fifty years.</p><a href="https://www.sriaurobindoashram.org/mother/" target="_blank" rel="noreferrer">Read the authorised introduction ↗</a></div></article>
        </div>
        <p className="image-credit">Portraits displayed from the Sri Aurobindo Ashram website. Permission for permanent production use should be confirmed with the Ashram Photo Section.</p>
      </section>

      <section className="vision section" id="pathways"><div><p className="kicker">THE VISION</p><h2>{t.vision}</h2><p>{t.visionText}</p></div><div className="pillars">{t.cards.map((x,i)=><article key={x}><b>0{i+1}</b><span>{x}</span></article>)}</div></section>

      <section className="roots section" aria-labelledby="roots-title"><div className="section-title"><div><p className="kicker">A LIVING MOVEMENT</p><h2 id="roots-title">From Puducherry to Lucknow</h2></div><p>Sri Aurobindo Society was started by the Mother on 19 September 1960 and has grown into an international organisation carrying spirituality into many fields of life.</p></div><div className="roots-grid">
        <article><span>01</span><h3>Puducherry</h3><p>The Society’s administrative headquarters and Society House are in Puducherry, close to the wider spiritual, cultural and educational life inspired by Sri Aurobindo and the Mother.</p><a href="https://aurosociety.org/society/index/About-Sri-Aurobindo-Society" target="_blank" rel="noreferrer">About the Society ↗</a></article>
        <article><span>02</span><h3>Auroville</h3><p>Founded by the Mother in 1968, Auroville is an international township dedicated to human unity, unending education and material and spiritual research.</p><a href="https://auroville.org/page/history" target="_blank" rel="noreferrer">Explore Auroville ↗</a></article>
        <article><span>03</span><h3>Lucknow</h3><p>The Lucknow and Gomti Nagar centres bring this vision into local life through Sunday meetings, lectures, study, reflection and community participation.</p><a href="#location">Visit our centre →</a></article>
      </div></section>

      <section className="wisdom-quotes section" aria-labelledby="quotes-title"><p className="kicker">WORDS TO LIVE BY</p><h2 id="quotes-title">A few lights for the way</h2><div className="quote-grid"><blockquote><p>“Escape, however high, redeems not life.”</p><cite>Sri Aurobindo · Daily quote, Sri Aurobindo Society</cite></blockquote><blockquote><p>“To know is good, to live is better, to be, that is perfect.”</p><cite>The Mother · Society motto</cite></blockquote><blockquote><p>“The soul in man is greater than his fate…”</p><cite>Sri Aurobindo · Sri Aurobindo Society</cite></blockquote></div><a className="source-note" href="https://aurosociety.org/society/index/About-Sri-Aurobindo-Society" target="_blank" rel="noreferrer">Read the source on the official Society website ↗</a></section>

      <section className="section pathways"><div className="section-title"><div><p className="kicker">DISCOVER</p><h2>{t.learn}</h2></div><p>{t.learnText}</p></div>
        <div className="path-grid">{t.pathways.map((x,i)=><a href="#wisdom" key={x} className={`path path-${i}`}><span className="path-symbol">{["A","M","∞","S"][i]}</span><small>0{i+1}</small><h3>{x}</h3><p>{["Life, works and evolutionary vision","A life of service and transformation","A practical psychology of consciousness","An epic of the soul’s journey"][i]}</p><b>Explore <span>↗</span></b></a>)}</div>
      </section>

      <section className="library section" id="wisdom"><div className="section-title"><div><p className="kicker">READ · LISTEN · REFLECT</p><h2>{t.library}</h2></div>
        <div className="filters">{[t.all,t.articles,t.talks,t.reflections].map((label,i)=>{const value=["All","Articles","Talks","Reflections"][i];return <button key={value} onClick={()=>setFilter(value)} className={filter===value?"active":""}>{label}</button>})}</div></div>
        <div className="resource-list">{shown.map((r,i)=><article key={r.title}><span className="resource-number">0{i+1}</span><div><small>{r.type}</small><h3>{r.title}</h3><p>{r.meta}</p></div><button aria-label={`Open ${r.title}`}>↗</button></article>)}</div>
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

      <section className="shrine section" id="shrine"><div className="shrine-art" aria-label="Abstract peaceful illustration of the Sultanpur shrine"><div className="sun"/><div className="temple">ॐ</div></div><div><p className="kicker">A SACRED PLACE</p><h2>{t.shrine}</h2><p>{t.shrineText}</p><a href="#community">Plan a quiet visit →</a></div></section>

      <section className="gallery section" id="gallery"><div className="section-title"><div><p className="kicker">MEMORIES OF THE WORK</p><h2>Gatherings through the years</h2></div><p>A growing visual record of lectures, study circles, observances, shrine visits and community moments.</p></div><div className="gallery-grid"><article className="gallery-one"><span>LECTURES</span><h3>Ideas that open doors</h3><p>Talks and conversations in Lucknow</p></article><article className="gallery-two"><span>COLLECTIVE LIFE</span><h3>Learning together</h3><p>Study circles and Sunday meetings</p></article><article className="gallery-three"><span>SULTANPUR</span><h3>A place of remembrance</h3><p>Shrine visits and sacred observances</p></article></div><div className="gallery-action"><p>Administrators can add a title, date, description, album and accessible caption with each photograph.</p><button className="button quiet" onClick={()=>open("gallery")}>Upload event photographs →</button></div></section>

      <section className="location section" id="location"><div className="location-copy"><p className="kicker">VISIT THE CENTRE</p><h2>Come, sit with us.</h2><address>4/668, Vijayant Khand<br/>Gomti Nagar, Lucknow – 226010</address><div className="meeting-time"><span>SUNDAY</span><strong>6:00–7:00 PM</strong><small>Regular weekly meeting</small></div><h3>Mr. Rajendra Kumar Singh</h3><p>Secretary, Gomti Nagar Centre (UC-02)<br/>Vice-Chairman, Sri Aurobindo Society, UP & Uttarakhand</p><a className="contact-phone" href="tel:+917388899001">+91 73888 99001</a><a className="contact-email" href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a><div className="location-actions"><a className="button primary" href="https://www.google.com/maps/search/?api=1&query=4%2F668%2C%20Vijayant%20Khand%2C%20Gomti%20Nagar%2C%20Lucknow%20226010" target="_blank" rel="noreferrer">Get directions ↗</a><a className="button quiet" href="tel:+917388899001">Call the centre</a></div></div><div className="map"><iframe title="Map to Sri Aurobindo Society Gomti Nagar Centre" src="https://www.google.com/maps?q=4%2F668%2C%20Vijayant%20Khand%2C%20Gomti%20Nagar%2C%20Lucknow%20226010&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></div></section>

      <section className="community section" id="community"><p className="kicker">PARTICIPATE</p><h2>{t.community}</h2><div className="community-grid"><button onClick={()=>open("join")}><span>01</span><b>{t.join}</b><small>Study circles, gatherings and updates →</small></button><button onClick={()=>open("volunteer")}><span>02</span><b>{t.volunteer}</b><small>Offer time, skills or venue support →</small></button></div></section>

      <section className="support section"><div><p className="kicker">A QUIET INVITATION</p><h2>{t.support}</h2><p>{t.supportText}</p></div><button className="button quiet light" onClick={()=>open("contribute")}>{t.contribute} →</button></section>
    </main>

    <footer><div className="brand inverse"><img className="society-logo" src="https://cms.aurosociety.org/kcfinder/images/images/sas-symbol%281%29.jpg" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></div><p>{t.footer}</p><div><a href="#wisdom">Wisdom</a><a href="#events">Events</a><a href="mailto:info.saslucknow@gmail.com">Email</a></div><small>{t.disclaimer}</small></footer>

    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={()=>setDialog(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setDialog(null)} aria-label="Close">×</button>
      {!sent ? <><p className="kicker">AUROBINDO MISSION LUCKNOW</p><h2 id="dialog-title">{dialog === "register" ? "Register for this gathering" : dialog === "join" ? "Join the community" : dialog === "volunteer" ? "Volunteer with us" : dialog === "gallery" ? "Add event photographs" : "Make a voluntary contribution"}</h2><p className="privacy">{dialog === "gallery" ? "Upload controls are prepared for the S3 media library. Images should include event details and permission to publish." : "Your details are used only to respond to this request. Optional updates require separate consent."}</p>
      {dialog === "gallery" ? <form onSubmit={submit}><label>Event or album title<input required name="title"/></label><div className="form-row"><label>Event date<input required type="date" name="date"/></label><label>Category<input required name="category" placeholder="Lecture, shrine visit…"/></label></div><label>Photographs<input required type="file" accept="image/jpeg,image/png,image/webp" multiple/></label><label>Description and people pictured<input required name="description"/></label><label className="check"><input required type="checkbox"/> I confirm permission to publish these photographs.</label><button className="button primary" type="submit">Prepare upload →</button></form> : <form onSubmit={submit}><label>Full name<input required name="name" autoComplete="name"/></label><div className="form-row"><label>Email<input required type="email" name="email" autoComplete="email"/></label><label>Mobile<input required name="mobile" inputMode="tel" autoComplete="tel"/></label></div>{dialog === "contribute" ? <label>Amount (₹)<input required type="number" min="100" name="amount"/></label> : <label>City<input name="city" defaultValue="Lucknow"/></label>}<label className="check"><input type="checkbox" name="updates"/> I would like occasional mission updates.</label><button className="button primary" type="submit">{dialog === "contribute" ? "Continue securely" : "Submit"} →</button></form>}</> : <div className="success"><span>✓</span><h2>Thank you.</h2><p>Your request has been received. This demonstration is ready to connect to the MongoDB and S3 services.</p><button className="button quiet" onClick={()=>setDialog(null)}>Close</button></div>}
    </div></div>}
  </div>;
}
