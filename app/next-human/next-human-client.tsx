"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

const contributionAreas = [
  ["content_research", "Content & Research", "Questions, references, movement briefs and fact-checking."],
  ["colleges_youth", "Colleges & Youth", "Campus relationships, youth outreach and the future Challenge."],
  ["doctors_professionals", "Doctors & Professionals", "Interdisciplinary dialogue and professional communities."],
  ["art_culture", "Art & Culture", "Artists, exhibitions, performance and immersive experience."],
  ["technology", "Technology", "Website, data, registration and responsible digital experiences."],
  ["social_media_film", "Social Media & Film", "Campaign storytelling, production, photography and distribution."],
  ["event_production", "Event Production", "Schedules, vendors, stage, sound and venue operations."],
  ["hospitality", "Hospitality", "Participant care, guests, travel, food and the quality of welcome."],
  ["partnerships_funding", "Partnerships & Funding", "Aligned institutions, patrons and ethical resource mobilisation."],
  ["next_human_junior", "NEXT HUMAN Junior", "Age-appropriate experiences for children and families."],
  ["general_volunteer", "General Volunteer", "Flexible, responsible support wherever the work most needs it."],
] as const;

const explorationInterests = [
  ["consciousness", "Consciousness"], ["human_evolution", "Human evolution"], ["savitri", "Savitri"],
  ["science_and_evidence", "Science and evidence"], ["art_and_creativity", "Art and creativity"],
  ["youth_and_education", "Youth and education"], ["society_and_civilisation", "Society and civilisation"],
  ["technology_and_future", "Technology and the future"], ["inner_development", "Inner development"],
  ["community_and_service", "Community and service"], ["not_sure", "Not sure yet"],
] as const;

type FormState = Record<string, string | string[] | boolean>;
const initialForm: FormState = {
  fullName: "", ageRange: "", city: "", mobile: "", email: "", professionOrInstitution: "", profileUrl: "",
  filmResponse: "", whyNextHuman: "", nextQuality: "", explorationInterests: [], contributionAreas: [],
  primaryContributionArea: "", relevantContribution: "", exampleOfWork: "", contributionStyle: "",
  contributionLocation: [], weeklyAvailability: "", usualAvailability: [], organisationConnection: "",
  organisationConnectionDetails: "", orientationPreference: "", additionalContext: "", foundationStageAcknowledged: false,
  privacyConsent: false, updatesConsent: false, website: "",
};

function FieldError({ message }: { message?: string }) {
  return message ? <span className="nh-field-error">{message}</span> : null;
}

function participationApi(path: string) {
  return `/api/participation${path}`;
}

export function NextHumanClient() {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reference, setReference] = useState("");
  const areaLabel = useMemo(() => new Map(contributionAreas.map(([id, label]) => [id, label])), []);

  const text = (name: string) => String(values[name] || "");
  const list = (name: string) => Array.isArray(values[name]) ? values[name] as string[] : [];
  const set = (name: string, value: string | string[] | boolean) => {
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: "" }));
  };
  const toggle = (name: string, value: string, max = 20) => {
    const current = list(name);
    if (current.includes(value)) set(name, current.filter(item => item !== value));
    else if (current.length < max) set(name, [...current, value]);
  };

  function validate(currentStep: number) {
    const next: Record<string, string> = {};
    if (currentStep === 1) {
      if (text("fullName").trim().length < 2) next.fullName = "Please enter your full name.";
      if (!text("ageRange")) next.ageRange = "Choose an age range.";
      if (text("city").trim().length < 2) next.city = "Please enter your city.";
      if (text("mobile").replace(/\D/g, "").length < 10) next.mobile = "Enter a valid mobile number.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email"))) next.email = "Enter a valid email address.";
      if (text("professionOrInstitution").trim().length < 2) next.professionOrInstitution = "Tell us your profession, role or institution.";
    }
    if (currentStep === 2) {
      if (text("filmResponse").trim().length < 40) next.filmResponse = "Please share at least a few thoughtful sentences.";
      if (text("whyNextHuman").trim().length < 40) next.whyNextHuman = "Help us understand why this matters to you now.";
      if (text("nextQuality").trim().length < 30) next.nextQuality = "Name the quality and briefly explain why.";
      if (!list("explorationInterests").length) next.explorationInterests = "Choose at least one area.";
    }
    if (currentStep === 3) {
      if (!list("contributionAreas").length) next.contributionAreas = "Choose at least one contribution area.";
      if (!text("primaryContributionArea")) next.primaryContributionArea = "Choose your primary contribution.";
      if (text("relevantContribution").trim().length < 40) next.relevantContribution = "Please give a concrete account of what you could bring.";
      if (!text("contributionStyle")) next.contributionStyle = "Choose how you would prefer to contribute.";
      if (!list("contributionLocation").length) next.contributionLocation = "Choose at least one location mode.";
      if (!text("weeklyAvailability")) next.weeklyAvailability = "Choose realistic weekly availability.";
    }
    if (currentStep === 4) {
      if (!list("usualAvailability").length) next.usualAvailability = "Choose when you are usually available.";
      if (!text("organisationConnection")) next.organisationConnection = "Please choose an answer.";
      if (!text("orientationPreference")) next.orientationPreference = "Choose an orientation option.";
      if (values.foundationStageAcknowledged !== true) next.foundationStageAcknowledged = "Please confirm that you understand this stage.";
      if (values.privacyConsent !== true) next.privacyConsent = "Consent is required to evaluate and respond to your inquiry.";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      window.setTimeout(() => document.querySelector<HTMLElement>(".nh-field-error")?.closest("label,fieldset")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return false;
    }
    return true;
  }

  function nextStep() {
    if (!validate(step)) return;
    setStep(value => Math.min(4, value + 1));
    document.querySelector("#founding-inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate(4)) return;
    setSubmitting(true); setSubmitError("");
    const params = new URLSearchParams(window.location.search);
    try {
      const response = await fetch(participationApi("/next-human/volunteer-inquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          source: params.get("source") || params.get("utm_source") || "website",
          privacyNoticeVersion: "2026-08-26",
          utm: { source: params.get("utm_source") || "", medium: params.get("utm_medium") || "", campaign: params.get("utm_campaign") || "", content: params.get("utm_content") || "", term: params.get("utm_term") || "" },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your inquiry could not be submitted.");
      setReference(result.reference || "received");
      setValues(initialForm);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Your inquiry could not be submitted.");
    } finally { setSubmitting(false); }
  }

  return <main className="nh-page">
    <header className="nh-header">
      <Link href="/" className="nh-brand" aria-label="Sri Aurobindo Society Lucknow home">
        <Image src="/next-human/sri-aurobindo-symbol.png" alt="Sri Aurobindo symbol" width={42} height={42} unoptimized />
        <span><strong>NEXT HUMAN INQUIRIES</strong><small>SRI AUROBINDO SOCIETY · LUCKNOW</small></span>
      </Link>
      <nav className="nh-nav" aria-label="NEXT HUMAN sections"><a href="#event">The event</a><a href="#activities">Activities</a><a href="#books">Books</a></nav>
      <a href="#founding-inquiry" className="nh-header-cta">Enter the inquiry</a>
    </header>

    <section className="nh-hero">
      <div className="nh-hero-copy">
        <p className="nh-kicker">A PUBLIC INQUIRY IN FORMATION · LUCKNOW 2026</p>
        <h1>What comes <em>after</em> the human we know?</h1>
        <p className="nh-lead">An evidence-led inquiry into consciousness, the body, technology and human possibility. Neither devotional nor dismissive. Open to what can be examined—and to what remains unresolved.</p>
        <div className="nh-actions"><a href="#event" className="nh-button nh-primary">Discover NEXT HUMAN</a><a href="#founding-inquiry" className="nh-button">Enter the inquiry</a></div>
        <p className="nh-clarifier">NEXT HUMAN is under transformation. We are inviting thoughtful participants to help shape what it becomes.</p>
      </div>
      <div className="nh-explorer" aria-hidden="true"><Image src="/next-human/hero-inquiry.png" alt="" fill priority unoptimized /></div>
    </section>

    <section className="nh-position" id="event">
      <p className="nh-kicker">THE POSITION</p>
      <blockquote>We begin neither with belief nor disbelief. We begin with the quality of the question.</blockquote>
      <div><p>NEXT HUMAN brings contemplative traditions, embodied practice, science, philosophy, art and emerging technology into a shared field—without forcing premature agreement.</p><p>Claims are not protected by charisma. Skepticism is not mistaken for understanding. Experience, evidence and interpretation are kept distinct long enough for genuine inquiry to begin.</p></div>
    </section>

    <section className="nh-film" id="film">
      <div className="nh-section-heading"><p className="nh-kicker">THE EVENT · SEVEN DAYS · 21 MOVEMENTS</p><h2>A temporary institution for inquiry.</h2><p>Researchers, practitioners, artists, technologists and serious independent minds move between first-person experience and third-person examination—without collapsing one into the other.</p></div>
      <video controls playsInline preload="metadata" src="/next-human/founding-circle-film.mp4">Your browser does not support embedded video.</video>
    </section>

    <section className="nh-invitation">
      <div><p className="nh-kicker">THE INVITATION</p><h2>Don’t attend it.<br/><em>Build it.</em></h2></div>
      <div className="nh-invitation-copy"><p>An exploration of this depth cannot be assembled by an event company alone. It needs researchers and storytellers; young organisers and experienced institution-builders; doctors, artists, technologists, educators, filmmakers, hosts and partners.</p><p>You do not need every answer. You do need curiosity, integrity, generosity and a willingness to let evidence change your position.</p><blockquote>What are you genuinely trying to understand?</blockquote></div>
    </section>

    <section className="nh-architecture">
      {[['01','ENTER THE QUESTION','Shared provocations establish the territory—not conclusions.'],['02','ENCOUNTER THE EVIDENCE','Research, lived reports and contested claims are examined in context.'],['03','BUILD WHAT FOLLOWS','Working groups translate insight into studies, practices and public questions.']].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}
    </section>

    <section className="nh-activities" id="activities">
      <div className="nh-section-heading"><p className="nh-kicker">ACTIVITIES UNDERWAY</p><h2>The inquiry is already moving.</h2><p>NEXT HUMAN is not waiting for a single event. Its work develops through connected, evolving formats.</p></div>
      <div className="nh-activity-grid">{[['01','Inquiry Sessions','Small facilitated rooms where a precise question is examined across research, experience and dissent.'],['02','Embodied Protocols','Documented experiments in attention, perception and regulation—with conditions, observations and limits made visible.'],['03','Field Notes','Essays, conversations and working papers that reveal the evolution of the inquiry rather than a finished doctrine.']].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="nh-explorer-lead">
      <div className="nh-kapadia"><Image src="/next-human/dr-ashwin-kapadia.png" alt="Dr. Ashwinbhai Kapadia" fill sizes="(max-width: 760px) 100vw, 42vw" unoptimized /></div>
      <div><p className="nh-kicker">LEAD EXPLORER</p><h2>Dr. Ashwinbhai Kapadia</h2><p>A lifetime of engagement with Sri Aurobindo, The Mother and <em>Savitri</em> enters the exploration. A curatorial team will help shape each movement around a defined question and destination.</p><div className="nh-symbol-pair"><Image src="/next-human/sri-aurobindo-symbol.png" alt="Sri Aurobindo symbol" width={74} height={74} unoptimized/><Image src="/next-human/mother-symbol.png" alt="The Mother’s symbol" width={74} height={74} unoptimized/></div></div>
    </section>

    <section className="nh-contributions">
      <div className="nh-section-heading"><p className="nh-kicker">WHERE COULD YOU CONTRIBUTE?</p><h2>Find your place in the founding circle.</h2></div>
      <div className="nh-contribution-grid">{contributionAreas.map(([id,label,description],index)=><article key={id}><span>{String(index+1).padStart(2,"0")}</span><h3>{label}</h3><p>{description}</p></article>)}</div>
    </section>

    <section className="nh-books" id="books">
      <div className="nh-section-heading"><p className="nh-kicker">THE BOOKS</p><h2>The inquiry, in long form.</h2></div>
      <div className="nh-book-grid"><article><div className="nh-book-cover"><small>NEXT HUMAN</small><b>0</b><strong>Book Zero</strong></div><div><p className="nh-kicker">BOOK ZERO</p><h3>The ground of the question</h3><p>An opening text that clears conceptual space: what we mean by human, what we mistake for certainty, and why a different quality of inquiry is now required.</p><small>FOUNDATIONAL VOLUME</small></div></article><article><div className="nh-book-cover"><small>NEXT HUMAN</small><b>I</b><strong>Book One</strong></div><div><p className="nh-kicker">BOOK ONE</p><h3>Consciousness in question</h3><p>A deeper movement into first-person knowledge, scientific description and the difficult territory between experience and explanation.</p><small>IN DEVELOPMENT</small></div></article></div>
    </section>

    <section className="nh-form-section" id="founding-inquiry">
      <div className="nh-form-intro"><p className="nh-kicker">FOUNDING CIRCLE INQUIRY</p><h2>Begin with an inquiry.<br/>Grow into a responsibility.</h2><p>We are looking for thoughtful, dependable contributors—not the longest résumé. Your response will help us understand your resonance, capability, availability and most meaningful place in the work.</p><ol><li>Inquiry</li><li>Orientation</li><li>Conversation</li><li>Trial sprint</li><li>Defined role</li></ol></div>
      {reference ? <div className="nh-success" role="status"><span>INQUIRY RECEIVED</span><h2>Your inquiry has entered the circle.</h2><p>Reference <strong>{reference}</strong></p><p>The team will review your response and contact applicants whose interests and capabilities match the work taking shape.</p><a className="nh-button nh-primary" href={`https://wa.me/?text=${encodeURIComponent(`Hello. I have submitted my NEXT HUMAN 2026 Founding Circle inquiry. My reference is ${reference}.`)}`} target="_blank" rel="noreferrer">Confirm on WhatsApp</a></div> :
      <form className="nh-form" onSubmit={submit} noValidate>
        <div className="nh-progress" aria-label={`Step ${step} of 4`}><span>STEP {step} OF 4</span><div>{[1,2,3,4].map(item=><i key={item} className={item<=step?"active":""}/>)}</div></div>
        {step===1&&<fieldset><legend>About you</legend><div className="nh-two"><label>Full name<input value={text("fullName")} onChange={e=>set("fullName",e.target.value)} autoComplete="name" maxLength={100}/><FieldError message={errors.fullName}/></label><label>Age range<select value={text("ageRange")} onChange={e=>set("ageRange",e.target.value)}><option value="">Choose</option><option value="under_18">Under 18</option><option value="18_24">18–24</option><option value="25_34">25–34</option><option value="35_44">35–44</option><option value="45_59">45–59</option><option value="60_plus">60+</option><option value="prefer_not_to_say">Prefer not to say</option></select><FieldError message={errors.ageRange}/></label></div><div className="nh-two"><label>City and state/country<input value={text("city")} onChange={e=>set("city",e.target.value)} autoComplete="address-level2" maxLength={120}/><FieldError message={errors.city}/></label><label>WhatsApp/mobile number<input value={text("mobile")} onChange={e=>set("mobile",e.target.value)} autoComplete="tel" inputMode="tel" maxLength={18}/><FieldError message={errors.mobile}/></label></div><label>Email address<input value={text("email")} onChange={e=>set("email",e.target.value)} type="email" autoComplete="email" maxLength={180}/><FieldError message={errors.email}/></label><label>Profession, role or institution<input value={text("professionOrInstitution")} onChange={e=>set("professionOrInstitution",e.target.value)} maxLength={150}/><FieldError message={errors.professionOrInstitution}/></label><label>LinkedIn, portfolio or relevant profile <small>Optional</small><input value={text("profileUrl")} onChange={e=>set("profileUrl",e.target.value)} type="url" maxLength={300}/></label></fieldset>}
        {step===2&&<fieldset><legend>Your inquiry</legend><label>What stayed with you after watching the NEXT HUMAN film?<textarea rows={5} value={text("filmResponse")} onChange={e=>set("filmResponse",e.target.value)} maxLength={600}/><small>{text("filmResponse").length}/600</small><FieldError message={errors.filmResponse}/></label><label>Why does NEXT HUMAN interest you at this point in your life?<textarea rows={5} value={text("whyNextHuman")} onChange={e=>set("whyNextHuman",e.target.value)} maxLength={800}/><FieldError message={errors.whyNextHuman}/></label><label>If humanity could evolve one quality next, what should it be—and why?<textarea rows={4} value={text("nextQuality")} onChange={e=>set("nextQuality",e.target.value)} maxLength={500}/><FieldError message={errors.nextQuality}/></label><div className="nh-choice-group"><span>Which parts of the exploration draw you? <small>Choose up to three</small></span><div className="nh-chips">{explorationInterests.map(([id,label])=><button type="button" key={id} className={list("explorationInterests").includes(id)?"selected":""} onClick={()=>toggle("explorationInterests",id,3)}>{label}</button>)}</div><FieldError message={errors.explorationInterests}/></div></fieldset>}
        {step===3&&<fieldset><legend>Your contribution</legend><div className="nh-choice-group"><span>Where would you most like to contribute? <small>Choose up to three</small></span><div className="nh-chips">{contributionAreas.map(([id,label])=><button type="button" key={id} className={list("contributionAreas").includes(id)?"selected":""} onClick={()=>{toggle("contributionAreas",id,3);if(text("primaryContributionArea")===id)set("primaryContributionArea","")}}>{label}</button>)}</div><FieldError message={errors.contributionAreas}/></div><label>Primary contribution area<select value={text("primaryContributionArea")} onChange={e=>set("primaryContributionArea",e.target.value)}><option value="">Choose from your selections</option>{list("contributionAreas").map(id=><option key={id} value={id}>{areaLabel.get(id)}</option>)}</select><FieldError message={errors.primaryContributionArea}/></label><label>What relevant skill, experience or relationship could you bring?<textarea rows={5} value={text("relevantContribution")} onChange={e=>set("relevantContribution",e.target.value)} maxLength={800}/><FieldError message={errors.relevantContribution}/></label><label>Tell us about something you have helped organise, create, research or lead. <small>Optional</small><textarea rows={4} value={text("exampleOfWork")} onChange={e=>set("exampleOfWork",e.target.value)} maxLength={700}/></label><label>How would you prefer to contribute?<select value={text("contributionStyle")} onChange={e=>set("contributionStyle",e.target.value)}><option value="">Choose</option><option value="lead_workstream">Lead a workstream</option><option value="own_assignments">Own defined assignments</option><option value="consistent_team_support">Support a team consistently</option><option value="specialist_guidance">Offer specialist guidance</option><option value="peak_period_support">Help during peak periods</option><option value="discovering_fit">I am discovering my fit</option></select><FieldError message={errors.contributionStyle}/></label><div className="nh-choice-group"><span>Where can you contribute?</span><div className="nh-chips">{[["lucknow","Lucknow on-ground"],["delhi_ncr","Delhi/NCR on-ground"],["remote","Remote"],["travel_to_lucknow","Travel to Lucknow"],["other","Other"]].map(([id,label])=><button type="button" key={id} className={list("contributionLocation").includes(id)?"selected":""} onClick={()=>toggle("contributionLocation",id)}>{label}</button>)}</div><FieldError message={errors.contributionLocation}/></div><label>Realistic weekly availability over the next three months<select value={text("weeklyAvailability")} onChange={e=>set("weeklyAvailability",e.target.value)}><option value="">Choose</option><option value="under_2">Under 2 hours</option><option value="2_4">2–4 hours</option><option value="5_8">5–8 hours</option><option value="9_12">9–12 hours</option><option value="over_12">More than 12 hours</option><option value="project_based">Project-based only</option></select><FieldError message={errors.weeklyAvailability}/></label></fieldset>}
        {step===4&&<fieldset><legend>Networks and commitment</legend><div className="nh-choice-group"><span>When are you usually available?</span><div className="nh-chips">{[["weekday_mornings","Weekday mornings"],["weekday_afternoons","Weekday afternoons"],["weekday_evenings","Weekday evenings"],["saturdays","Saturdays"],["sundays","Sundays"],["flexible","Flexible"]].map(([id,label])=><button type="button" key={id} className={list("usualAvailability").includes(id)?"selected":""} onClick={()=>toggle("usualAvailability",id)}>{label}</button>)}</div><FieldError message={errors.usualAvailability}/></div><label>Are you connected with an institution or community that may find this work meaningful?<select value={text("organisationConnection")} onChange={e=>set("organisationConnection",e.target.value)}><option value="">Choose</option><option value="yes">Yes</option><option value="possibly">Possibly</option><option value="no">No</option></select><FieldError message={errors.organisationConnection}/></label>{["yes","possibly"].includes(text("organisationConnection"))&&<label>Tell us which organisation and the nature of your connection<textarea rows={4} value={text("organisationConnectionDetails")} onChange={e=>set("organisationConnectionDetails",e.target.value)} maxLength={500}/></label>}<label>Would you attend a 45-minute Founding Circle orientation?<select value={text("orientationPreference")} onChange={e=>set("orientationPreference",e.target.value)}><option value="">Choose</option><option value="online">Yes, online</option><option value="lucknow">Yes, in Lucknow</option><option value="delhi_ncr">Yes, in Delhi/NCR</option><option value="possibly">Possibly</option><option value="not_at_present">Not at present</option></select><FieldError message={errors.orientationPreference}/></label><label>Anything else we should understand? <small>Optional</small><textarea rows={4} value={text("additionalContext")} onChange={e=>set("additionalContext",e.target.value)} maxLength={600}/></label><label className="nh-check"><input type="checkbox" checked={values.foundationStageAcknowledged===true} onChange={e=>set("foundationStageAcknowledged",e.target.checked)}/><span>I understand that this is an inquiry about the voluntary foundation team—not registration for the event, application for the final 200 or a guarantee of a role.</span><FieldError message={errors.foundationStageAcknowledged}/></label><label className="nh-check"><input type="checkbox" checked={values.privacyConsent===true} onChange={e=>set("privacyConsent",e.target.checked)}/><span>I consent to Sri Aurobindo Society, Lucknow using this information to evaluate my inquiry and contact me about NEXT HUMAN 2026.</span><FieldError message={errors.privacyConsent}/></label><label className="nh-check"><input type="checkbox" checked={values.updatesConsent===true} onChange={e=>set("updatesConsent",e.target.checked)}/><span>I would also like occasional NEXT HUMAN updates. <small>Optional</small></span></label><label className="nh-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={text("website")} onChange={e=>set("website",e.target.value)}/></label></fieldset>}
        {submitError&&<p className="nh-submit-error" role="alert">{submitError}</p>}
        <div className="nh-form-actions">{step>1&&<button type="button" className="nh-button" onClick={()=>setStep(value=>value-1)}>Back</button>}{step<4?<button type="button" className="nh-button nh-primary" onClick={nextStep}>Continue</button>:<button type="submit" className="nh-button nh-primary" disabled={submitting}>{submitting?"Sending inquiry…":"Send my Founding Circle inquiry"}</button>}</div>
      </form>}
    </section>

    <footer className="nh-footer"><div><Image src="/next-human/sri-aurobindo-symbol.png" alt="Sri Aurobindo symbol" width={48} height={48} unoptimized/><span><strong>NEXT HUMAN 2026</strong><small>An initiative of Sri Aurobindo Society, Lucknow</small></span></div><p>Consciousness · Evolution · Savitri · The Future Human</p></footer>
  </main>;
}
