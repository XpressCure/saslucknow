"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Copy = { eyebrow: string; headline: string; body: string; cta: string };
type Destination = { id: string; label: string; description: string };
type Template = {
  id: string; label: string; spiritualTheme: string; objective: string; destination: string; themePackId: string;
  allowedMotionPresets: string[]; defaultMotionPreset: string; copy: { en: Copy; hi: Copy };
};
type Creative = {
  id: string; name: string; templateId: string; objective: string; destination: string; themePackId: string;
  motionPresetId: string; displayMode: "card_only" | "coordinated_dashboard"; copy: { en: Copy; hi: Copy };
  status: "draft" | "approved" | "archived"; revision: number; updatedAt: string; approvedAt: string | null;
};
type Campaign = {
  id: string; name: string; note: string; creativeId: string; creative: Creative | null; locale: "all" | "en" | "hi"; startsAt: string; endsAt: string;
  maxImpressionsPerDay: number; status: "draft" | "published" | "paused"; phase: "draft" | "scheduled" | "live" | "completed" | "paused"; configVersion: number; updatedAt: string;
  metrics: { impressions: number; membersReached: number; callsToAction: number; membersEngaged: number; engagementRate: number };
};
type CampaignAuditEntry = { id: string; action: string; actorName: string; entityType: string; entityId: string; details: Record<string, unknown>; createdAt: string };

async function campaignApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/participation${path}`, {
    credentials: "same-origin",
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "The campaign action could not be completed.");
  return result;
}

function localDateTime(value: string | Date) {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readable(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function CampaignPreview({ creative, language = "en", compact = false }: { creative: Creative | null; language?: "en" | "hi"; compact?: boolean }) {
  if (!creative) return <div className="campaign-preview campaign-preview-empty"><span>Select a template to see the member experience.</span></div>;
  const copy = creative.copy[language] || creative.copy.en;
  return <article className={`campaign-preview theme-${creative.themePackId} motion-${creative.motionPresetId} ${compact ? "compact" : ""}`}>
    <div className="campaign-preview-symbol" aria-hidden="true"><i /><i /><i /></div>
    <div className="campaign-preview-copy">
      <p>{copy.eyebrow}</p>
      <h3>{copy.headline}</h3>
      <span>{copy.body}</span>
      <button type="button">{copy.cta}<b>→</b></button>
    </div>
  </article>;
}

function MobileDashboardPreview({ creative, destination, language = "en" }: { creative: Creative | null; destination?: Destination | null; language?: "en" | "hi" }) {
  const copy = creative?.copy[language] || creative?.copy.en;
  const themeClass = creative?.displayMode === "coordinated_dashboard" ? ` theme-${creative.themePackId}` : " theme-neutral";
  const cardThemeClass = creative ? ` theme-${creative.themePackId}` : "";

  return <div className="campaign-phone-stage">
    <div className={`campaign-phone${themeClass}`} aria-label="Full mobile app dashboard preview">
      <div className="campaign-phone-speaker" aria-hidden="true" />
      <div className="campaign-phone-screen">
        <div className="campaign-phone-status" aria-hidden="true"><span>9:41</span><span>5G&nbsp;&nbsp;▮▮▮&nbsp;&nbsp;92%</span></div>
        <header className="campaign-phone-header">
          <img src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" />
          <span><strong>Sri Aurobindo Society</strong><small>Lucknow Centre · Member Portal</small></span>
          <i aria-hidden="true">•••</i>
        </header>
        <div className="campaign-phone-dashboard">
          <section className="campaign-phone-welcome">
            <p>A SHARED FIELD OF WORK</p>
            <h3>Namaste, Member</h3>
            <span>A quiet member space for study, meditation and inward discovery.</span>
          </section>
          {creative && copy ? <article className={`campaign-device-card${cardThemeClass} motion-${creative.motionPresetId}`} data-preview-destination={creative.destination}>
            <div className="campaign-device-symbol" aria-hidden="true"><i /><i /><i /></div>
            <div className="campaign-device-copy">
              <p>{copy.eyebrow}</p>
              <h4>{copy.headline}</h4>
              <span>{copy.body}</span>
              <button type="button" title={destination ? `Opens ${destination.label}` : "Opens an approved member-app page"}>{copy.cta}<b>→</b></button>
            </div>
          </article> : <div className="campaign-device-empty"><strong>Your campaign card will appear here.</strong><span>Select an approved Creative Studio design.</span></div>}
          <section className="campaign-phone-metrics" aria-label="Example member dashboard metrics">
            <div><strong>2</strong><span>Live Sankalp</span></div><div><strong>₹0</strong><span>My Yogdaan</span></div><div><strong>0</strong><span>Acknowledgements</span></div>
          </section>
          <section className="campaign-phone-action"><p>NEXT MEANINGFUL ACTION</p><strong>Support for Patient Consultations</strong><span>Help make necessary medical consultations accessible to patients who need support.</span><button type="button">View Sankalp →</button></section>
          <section className="campaign-phone-quote"><p>A CONSCIOUS OFFERING</p><blockquote>“All life is Yoga.”</blockquote></section>
        </div>
        <nav className="campaign-phone-nav" aria-label="Mobile app navigation preview"><span><b>D</b>Darshan</span><span><b>S</b>Sankalp</span><span><b>Y</b>Yogdaan</span><span><b>P</b>Parichay</span></nav>
      </div>
    </div>
    <div className="campaign-phone-caption"><strong>Full mobile app preview</strong><span>{creative?.displayMode === "coordinated_dashboard" ? "The selected theme colours the dashboard and places the campaign card at the top." : "The app keeps its standard background and changes only the campaign card."}</span></div>
  </div>;
}

function creativeFromTemplate(template: Template): Creative {
  return {
    id: "", name: `${template.label} campaign`, templateId: template.id, objective: template.objective,
    destination: template.destination, themePackId: template.themePackId, motionPresetId: template.defaultMotionPreset,
    displayMode: "coordinated_dashboard", copy: structuredClone(template.copy), status: "draft", revision: 1,
    updatedAt: "", approvedAt: null,
  };
}

export function CreativeStudioPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [draft, setDraft] = useState<Creative | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [catalog, list] = await Promise.all([
      campaignApi<{ templates: Template[]; destinations: Destination[] }>("/admin/campaign-studio/catalog"),
      campaignApi<{ creatives: Creative[] }>("/admin/campaign-studio/creatives"),
    ]);
    setTemplates(catalog.templates); setDestinations(catalog.destinations); setCreatives(list.creatives);
    if (!draft && catalog.templates[0]) setDraft(creativeFromTemplate(catalog.templates[0]));
  }, [draft]);

  useEffect(() => { void load().catch(caught => setError(caught instanceof Error ? caught.message : "Creative Studio could not load.")); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseTemplate(template: Template) {
    setDraft(creativeFromTemplate(template)); setMessage(""); setError("");
  }

  function duplicateCreative(creative: Creative) {
    setDraft({
      ...structuredClone(creative),
      id: "",
      name: `${creative.name} · new version`,
      status: "draft",
      revision: 1,
      updatedAt: "",
      approvedAt: null,
    });
    setMessage("A new editable draft has been prepared from the selected design.");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateCopy(languageKey: "en" | "hi", field: keyof Copy, value: string) {
    setDraft(current => current ? { ...current, copy: { ...current.copy, [languageKey]: { ...current.copy[languageKey], [field]: value } } } : current);
  }

  async function saveCreative(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy("save"); setError(""); setMessage("");
    try {
      const path = draft.id ? `/admin/campaign-studio/creatives/${draft.id}` : "/admin/campaign-studio/creatives";
      const result = await campaignApi<{ creative: Creative; message: string }>(path, { method: draft.id ? "PATCH" : "POST", body: JSON.stringify(draft) });
      setDraft(result.creative); setMessage(result.message); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Creative could not be saved."); }
    finally { setBusy(""); }
  }

  async function changeState(creative: Creative, action: "approve" | "archive") {
    if (action === "approve" && !window.confirm("Approve and lock this creative? Approved creative revisions cannot be edited.")) return;
    setBusy(`${action}-${creative.id}`); setError("");
    try {
      const result = await campaignApi<{ creative: Creative; message: string }>(`/admin/campaign-studio/creatives/${creative.id}/${action}`, { method: "POST", body: "{}" });
      setMessage(result.message); if (draft?.id === creative.id) setDraft(result.creative); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Creative status could not be changed."); }
    finally { setBusy(""); }
  }

  const selectedTemplate = templates.find(item => item.id === draft?.templateId);
  const selectedDestination = destinations.find(item => item.id === draft?.destination) || null;
  return <div className="campaign-studio-page">
    <header className="campaign-admin-title"><div><p>CREATIVE STUDIO</p><h1>Shape a luminous invitation</h1><span>Approved SAS visual families for meditation, study, community, guidance and youth discovery. Edit the English and Hindi message, preview the member experience, then approve a locked revision.</span></div><div className="campaign-title-mark" aria-hidden="true"><i /><i /></div></header>
    {message && <div className="campaign-message success">{message}</div>}{error && <div className="campaign-message error">{error}</div>}
    <section className="template-gallery" aria-label="SAS campaign templates">
      {templates.map((template, index) => <button type="button" key={template.id} className={`template-tile theme-${template.themePackId} ${draft?.templateId === template.id ? "selected" : ""}`} onClick={() => chooseTemplate(template)}>
        <span>0{index + 1} · {template.objective}</span><strong>{template.label}</strong><small>{template.spiritualTheme}</small><i aria-hidden="true" />
      </button>)}
    </section>
    <section className="creative-workbench">
      <form className="creative-editor" onSubmit={saveCreative}>
        <div className="campaign-section-heading"><div><p>EDITABLE MESSAGE</p><h2>{draft?.id ? "Edit draft revision" : "Create a new design"}</h2></div><div className="language-switch"><button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>English</button><button type="button" className={language === "hi" ? "active" : ""} onClick={() => setLanguage("hi")}>हिन्दी</button></div></div>
        {draft && <>
          <label>Creative name<input value={draft.name} maxLength={80} disabled={draft.status !== "draft"} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
          <div className="creative-editor-grid"><label>Presentation<select value={draft.displayMode} disabled={draft.status !== "draft"} onChange={event => setDraft({ ...draft, displayMode: event.target.value as Creative["displayMode"] })}><option value="coordinated_dashboard">Campaign card + dashboard colour</option><option value="card_only">Campaign card only</option></select></label><label>Motion<select value={draft.motionPresetId} disabled={draft.status !== "draft"} onChange={event => setDraft({ ...draft, motionPresetId: event.target.value })}>{selectedTemplate?.allowedMotionPresets.map(option => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label></div>
          <label className="campaign-destination-field">Button destination<select value={draft.destination} disabled={draft.status !== "draft"} onChange={event => setDraft({ ...draft, destination: event.target.value })}>{destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.label}</option>)}</select>{selectedDestination && <small><strong>{selectedDestination.label}</strong>{selectedDestination.description}</small>}</label>
          <label>Eyebrow<input value={draft.copy[language].eyebrow} maxLength={48} disabled={draft.status !== "draft"} onChange={event => updateCopy(language, "eyebrow", event.target.value)} /><small>{draft.copy[language].eyebrow.length}/48</small></label>
          <label>Headline<input value={draft.copy[language].headline} maxLength={92} disabled={draft.status !== "draft"} onChange={event => updateCopy(language, "headline", event.target.value)} /><small>{draft.copy[language].headline.length}/92</small></label>
          <label>Message<textarea value={draft.copy[language].body} maxLength={220} rows={4} disabled={draft.status !== "draft"} onChange={event => updateCopy(language, "body", event.target.value)} /><small>{draft.copy[language].body.length}/220</small></label>
          <label>Button text<input value={draft.copy[language].cta} maxLength={36} disabled={draft.status !== "draft"} onChange={event => updateCopy(language, "cta", event.target.value)} /><small>{draft.copy[language].cta.length}/36</small></label>
          <div className="creative-editor-actions"><button className="campaign-primary" disabled={busy === "save" || draft.status !== "draft"}>{busy === "save" ? "Saving..." : draft.id ? "Save draft revision" : "Create creative draft"}</button>{draft.id && draft.status === "draft" && <button type="button" className="campaign-approve" disabled={busy === `approve-${draft.id}`} onClick={() => void changeState(draft, "approve")}>Approve & lock</button>}</div>
        </>}
      </form>
      <div className="creative-live-preview"><div className="campaign-section-heading"><div><p>LIVE MOBILE PREVIEW</p><h2>Full member dashboard</h2></div><span>{draft?.displayMode === "coordinated_dashboard" ? "Coordinated colour" : "Card only"}</span></div><MobileDashboardPreview creative={draft} destination={selectedDestination} language={language} />{selectedDestination && <div className="campaign-destination-summary"><span>BUTTON OPENS</span><strong>{selectedDestination.label}</strong><p>{selectedDestination.description}</p></div>}</div>
    </section>
    <section className="creative-library"><div className="campaign-section-heading"><div><p>REVISION LIBRARY</p><h2>Saved SAS creatives</h2></div><span>{creatives.length} design{creatives.length === 1 ? "" : "s"}</span></div>
      <div className="creative-library-grid">{creatives.length ? creatives.map(creative => <article key={creative.id}><CampaignPreview creative={creative} compact /><footer><div><span className={`campaign-status ${creative.status}`}>{creative.status}</span><strong>{creative.name}</strong><small>Revision {creative.revision} · {readable(creative.updatedAt)}</small></div><div>{creative.status === "draft" && <button type="button" onClick={() => { setDraft(structuredClone(creative)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>}<button type="button" onClick={() => duplicateCreative(creative)}>Use as new draft</button>{creative.status !== "archived" && <button type="button" onClick={() => void changeState(creative, "archive")}>Archive</button>}</div></footer></article>) : <p className="campaign-empty">Your first approved spiritual campaign will appear here.</p>}</div>
    </section>
  </div>;
}

export function FocusCampaignsPanel() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [auditEntries, setAuditEntries] = useState<CampaignAuditEntry[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [creativeId, setCreativeId] = useState("");
  const [locale, setLocale] = useState<"all" | "en" | "hi">("all");
  const [startsAt, setStartsAt] = useState(localDateTime(new Date(Date.now() + 15 * 60 * 1000)));
  const [endsAt, setEndsAt] = useState(localDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [cap, setCap] = useState(3);
  const [statusFilter, setStatusFilter] = useState<"all" | Campaign["phase"]>("all");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [catalogResult, creativeResult, campaignResult, auditResult] = await Promise.all([
      campaignApi<{ destinations: Destination[] }>("/admin/campaign-studio/catalog"),
      campaignApi<{ creatives: Creative[] }>("/admin/campaign-studio/creatives"),
      campaignApi<{ campaigns: Campaign[] }>("/admin/focus-campaigns"),
      campaignApi<{ entries: CampaignAuditEntry[] }>("/admin/focus-campaigns/audit"),
    ]);
    const approved = creativeResult.creatives.filter(item => item.status === "approved");
    setDestinations(catalogResult.destinations); setCreatives(approved); setCampaigns(campaignResult.campaigns); setAuditEntries(auditResult.entries);
    setCreativeId(current => current || approved[0]?.id || "");
  }, []);
  useEffect(() => { void load().catch(caught => setError(caught instanceof Error ? caught.message : "Focus Campaigns could not load.")); }, [load]);

  function edit(campaign: Campaign) {
    setSelected(campaign); setName(campaign.name); setNote(campaign.note || ""); setCreativeId(campaign.creativeId); setLocale(campaign.locale); setStartsAt(localDateTime(campaign.startsAt)); setEndsAt(localDateTime(campaign.endsAt)); setCap(campaign.maxImpressionsPerDay); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setSelected(null); setName(""); setNote(""); setCreativeId(creatives[0]?.id || ""); setLocale("all"); setStartsAt(localDateTime(new Date(Date.now() + 15 * 60 * 1000))); setEndsAt(localDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); setCap(3);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy("save"); setError(""); setMessage("");
    try {
      const result = await campaignApi<{ campaign: Campaign; message: string }>(selected ? `/admin/focus-campaigns/${selected.id}` : "/admin/focus-campaigns", { method: selected ? "PATCH" : "POST", body: JSON.stringify({ name, note, creativeId, locale, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), maxImpressionsPerDay: cap }) });
      setMessage(result.message); reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Campaign could not be saved."); }
    finally { setBusy(""); }
  }

  async function action(campaign: Campaign, name: "publish" | "pause") {
    if (name === "publish" && !window.confirm("Publish this campaign to the live member dashboard at its scheduled time?")) return;
    setBusy(`${name}-${campaign.id}`); setError("");
    try {
      const result = await campaignApi<{ message: string }>(`/admin/focus-campaigns/${campaign.id}/${name}`, { method: "POST", body: "{}" });
      setMessage(result.message); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : `Campaign could not be ${name}d.`); }
    finally { setBusy(""); }
  }

  async function emergencyDisable() {
    if (!window.confirm("Pause every published Focus Campaign immediately?")) return;
    setBusy("disable");
    try { const result = await campaignApi<{ message: string }>("/admin/focus-campaigns/emergency-disable", { method: "POST", body: "{}" }); setMessage(result.message); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Campaigns could not be paused."); }
    finally { setBusy(""); }
  }

  const previewCreative = creatives.find(item => item.id === creativeId) || selected?.creative || null;
  const previewDestination = destinations.find(item => item.id === previewCreative?.destination) || null;
  const active = campaigns.filter(item => item.phase === "live");
  const visibleCampaigns = campaigns.filter(item => statusFilter === "all" || item.phase === statusFilter);
  const totalClicks = campaigns.reduce((sum, item) => sum + Number(item.metrics?.callsToAction || 0), 0);
  return <div className="campaign-studio-page focus-campaign-page">
    <header className="campaign-admin-title"><div><p>FOCUS CAMPAIGNS</p><h1>Give one invitation the centre stage</h1><span>Schedule an approved creative, preview its exact member experience, publish with confidence, or pause every active campaign instantly.</span></div><button className="campaign-danger" onClick={() => void emergencyDisable()} disabled={busy === "disable"}>Emergency pause all</button></header>
    {message && <div className="campaign-message success">{message}</div>}{error && <div className="campaign-message error">{error}</div>}
    <div className="focus-status-band"><div><strong>{active.length}</strong><span>Live now</span></div><div><strong>{campaigns.reduce((sum, item) => sum + Number(item.metrics?.membersReached || 0), 0)}</strong><span>Member reach</span></div><div><strong>{campaigns.reduce((sum, item) => sum + Number(item.metrics?.impressions || 0), 0)}</strong><span>Card views</span></div><div><strong>{totalClicks}</strong><span>CTA opens</span></div><p>{active[0]?.creative?.copy.en.headline || "No campaign is currently changing the member dashboard."}</p></div>
    <section className="focus-builder">
      <form onSubmit={save}><div className="campaign-section-heading"><div><p>CAMPAIGN CONTROL</p><h2>{selected ? "Edit scheduled draft" : "Schedule a Focus Campaign"}</h2></div>{selected && <button type="button" onClick={reset}>New campaign</button>}</div>
        <label>Campaign name<input required minLength={3} maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Example: Seven days of Inner Silence" /></label>
        <label>Internal note <span className="campaign-optional">optional · visible only to administrators</span><textarea maxLength={180} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Purpose, audience or review note" /></label>
        <label>Approved Creative Studio design<select required value={creativeId} onChange={event => setCreativeId(event.target.value)}><option value="">Choose an approved creative</option>{creatives.map(item => <option key={item.id} value={item.id}>{item.name} · {item.templateId.replaceAll("_", " ")}</option>)}</select></label>
        <div className="focus-form-grid"><label>Audience language<select value={locale} onChange={event => setLocale(event.target.value as typeof locale)}><option value="all">English + Hindi audiences</option><option value="en">English</option><option value="hi">हिन्दी</option></select></label><label>Daily views per member<input type="number" min={1} max={100} value={cap} onChange={event => setCap(Number(event.target.value))} /></label><label>Start (local time)<input type="datetime-local" required value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label>End (local time)<input type="datetime-local" required value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label></div>
        <button className="campaign-primary" disabled={busy === "save" || !creativeId || name.trim().length < 3}>{busy === "save" ? "Saving schedule..." : selected ? "Update campaign draft" : "Create campaign draft"}</button>
      </form>
      <div className="focus-preview"><div className="campaign-section-heading"><div><p>EXACT MOBILE PREVIEW</p><h2>Full app dashboard</h2></div></div><MobileDashboardPreview creative={previewCreative} destination={previewDestination} language={locale === "hi" ? "hi" : "en"} />{previewDestination && <div className="campaign-destination-summary"><span>BUTTON OPENS</span><strong>{previewDestination.label}</strong><p>{previewDestination.description}</p></div>}</div>
    </section>
    <section className="campaign-timeline"><div className="campaign-section-heading"><div><p>PUBLISHING CALENDAR</p><h2>Campaigns & status</h2></div><span>{campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</span></div>
      <div className="campaign-filters" aria-label="Filter campaigns">{(["all", "live", "scheduled", "draft", "completed", "paused"] as const).map(filter => <button type="button" key={filter} className={statusFilter === filter ? "active" : ""} onClick={() => setStatusFilter(filter)}>{titleCase(filter)}</button>)}</div>
      <div>{visibleCampaigns.length ? visibleCampaigns.map(campaign => <article key={campaign.id}><span className={`campaign-status ${campaign.phase}`}>{campaign.phase}</span><div><strong>{campaign.name}</strong><small>{campaign.creative?.name || "Creative unavailable"} · {readable(campaign.startsAt)} → {readable(campaign.endsAt)} · {campaign.locale === "all" ? "English + Hindi" : campaign.locale.toUpperCase()} · cap {campaign.maxImpressionsPerDay}/day</small>{campaign.note && <small className="campaign-note">{campaign.note}</small>}<em>{campaign.metrics?.membersReached || 0} reached · {campaign.metrics?.impressions || 0} views · {campaign.metrics?.callsToAction || 0} opens · {campaign.metrics?.engagementRate || 0}% response</em></div><div>{campaign.status === "draft" && <><button type="button" onClick={() => edit(campaign)}>Edit</button><button type="button" className="publish" disabled={busy === `publish-${campaign.id}`} onClick={() => void action(campaign, "publish")}>Publish</button></>}{campaign.status === "published" && campaign.phase !== "completed" && <button type="button" className="pause" disabled={busy === `pause-${campaign.id}`} onClick={() => void action(campaign, "pause")}>Pause</button>}</div></article>) : <p className="campaign-empty">No campaigns match this view.</p>}</div>
    </section>
    <section className="campaign-audit"><div className="campaign-section-heading"><div><p>CONTROL HISTORY</p><h2>Recent campaign activity</h2></div><span>Latest {Math.min(12, auditEntries.length)}</span></div>
      <div>{auditEntries.slice(0, 12).map(entry => <article key={entry.id}><i aria-hidden="true" /><div><strong>{titleCase(entry.action.replaceAll(".", " "))}</strong><small>{entry.actorName || "System"} · {readable(entry.createdAt)}</small></div><code>{entry.entityType === "campaignCreative" ? "Creative" : "Campaign"}</code></article>)}{!auditEntries.length && <p className="campaign-empty">Campaign changes will be recorded here.</p>}</div>
    </section>
  </div>;
}
