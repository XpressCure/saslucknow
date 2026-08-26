"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Administrator = { id: string; fullName: string; email: string; role: string; permissions: string[] };
type Member = { id: string; fullName: string; email: string; mobile: string; city: string; role: string };
type Application = { id: string; reference: string; fullName: string; mobile: string; email: string; city: string; interests: string; skills: string; sevaPreference: string; pushpanjaliCertificateNumber: string; createdAt: string };
type NextHumanInquiry = { id: string; reference: string; status: string; fullName: string; ageRange: string; city: string; mobile: string; email: string; professionOrInstitution: string; filmResponse: string; whyNextHuman: string; nextQuality: string; explorationInterests: string[]; contributionAreas: string[]; primaryContributionArea: string; relevantContribution: string; exampleOfWork: string; contributionStyle: string; contributionLocation: string[]; weeklyAvailability: string; usualAvailability: string[]; organisationConnection: string; organisationConnectionDetails: string; orientationPreference: string; additionalContext: string; source: string; internalNote?: string; createdAt: string; latestSubmittedAt: string };
type Sankalp = {
  id: string; title: string; slug: string; summary: string; purpose: string; rules: string; type: string;
  status: string; stage: string; acceptsDonations: boolean; acceptsSeva: boolean; budgetRequired: boolean;
  tentativeBudgetRupees: number; estimatedBudgetRupees: number; receivedAmountRupees: number; spentAmountRupees: number;
  completionPercent: number; projectLeadMemberId: string; auditorMemberId: string; implementationLeadMemberId: string;
  startDate: string | null; targetDate: string | null; featuredOrder: number;
  team?: { projectLead: string; auditor: string; implementationLead: string };
  milestones?: Array<{ id: string; title: string; description: string; status: string; dueDate: string | null; budgetRupees: number }>;
  progressReports?: Array<{ id: string; title: string; report: string; completionPercent: number; createdByName: string; createdAt: string }>;
  documents?: Array<{ id: string; title: string; url: string; downloadUrl: string; documentType: string; note: string; createdByName: string; createdAt: string }>;
};
type AuditEntry = { id: string; action: string; actorName: string; entityType: string; createdAt: string };
type Overview = {
  administrator: Administrator;
  metrics: { pendingApplications: number; newNextHumanInquiries: number; activeMembers: number; draftSankalps: number; liveSankalps: number; completedSankalps: number };
  stageCounts: Record<string, number>;
  recentActivity: AuditEntry[];
};

const stages = [
  ["concept", "Concept"], ["research", "Research"], ["estimate_pending", "Estimate pending"],
  ["estimate_received", "Estimate received"], ["fundraising", "Kosh support"],
  ["ready_for_implementation", "Ready for implementation"], ["implementation", "Implementation"],
  ["completed", "Completed"], ["paused", "Paused"], ["archived", "Archived"],
];
const statuses = [["draft", "Private draft"], ["active", "Live"], ["completed", "Completed"], ["archived", "Archived"]];
const emptySankalp = {
  title: "", summary: "", purpose: "", rules: "", type: "service", status: "draft", stage: "concept",
  acceptsDonations: true, acceptsSeva: true, budgetRequired: true, tentativeBudgetRupees: "", estimatedBudgetRupees: "",
  completionPercent: 0, projectLeadMemberId: "", auditorMemberId: "", implementationLeadMemberId: "",
  startDate: "", targetDate: "", featuredOrder: 0,
};

function dateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Date pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date pending" : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`/api/participation${path}`, {
    credentials: "same-origin",
    ...options,
    headers: options.body && !isFormData ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The requested action could not be completed.");
  return result;
}

export function AdminClient() {
  const [administrator, setAdministrator] = useState<Administrator | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "activate">("login");
  const [tab, setTab] = useState<"darshan" | "next_human" | "parichay" | "sankalp" | "audit">("darshan");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [nextHumanInquiries, setNextHumanInquiries] = useState<NextHumanInquiry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sankalps, setSankalps] = useState<Sankalp[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<Sankalp | null>(null);
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>(emptySankalp);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; title: string; detail: string } | null>(null);

  const notify = (tone: "success" | "error", title: string, detail: string) => setNotice({ tone, title, detail });

  const loadWorkspace = useCallback(async () => {
    const [overviewResult, applicationResult, nextHumanResult, memberResult, sankalpResult, auditResult] = await Promise.all([
      api<Overview>("/admin/overview"),
      api<{ applications: Application[] }>("/admin/applications?status=pending"),
      api<{ inquiries: NextHumanInquiry[] }>("/admin/next-human-inquiries"),
      api<{ members: Member[] }>("/admin/members"),
      api<{ sankalps: Sankalp[] }>("/admin/sankalps"),
      api<{ entries: AuditEntry[] }>("/admin/audit"),
    ]);
    setOverview(overviewResult);
    setApplications(applicationResult.applications);
    setNextHumanInquiries(nextHumanResult.inquiries);
    setMembers(memberResult.members);
    setSankalps(sankalpResult.sankalps);
    setAuditEntries(auditResult.entries);
  }, []);

  useEffect(() => {
    api<{ administrator: Administrator }>("/auth/me")
      .then(result => { setAdministrator(result.administrator); return loadWorkspace(); })
      .catch(() => setAdministrator(null))
      .finally(() => setCheckingSession(false));
  }, [loadWorkspace]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const result = await api<{ administrator: Administrator }>(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify({ email: values.get("email"), password: values.get("password"), activationCode: values.get("activationCode") }),
      });
      setAdministrator(result.administrator);
      await loadWorkspace();
      notify("success", authMode === "activate" ? "Administrator account activated" : "Welcome back", "The secure administration workspace is ready.");
    } catch (error) {
      notify("error", "Sign-in not completed", error instanceof Error ? error.message : "Please try again.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    setAdministrator(null); setOverview(null); setSelected(null); setSelectedId("");
  }

  async function reviewApplication(id: string, decision: "approve" | "reject") {
    setBusy(true);
    try {
      const result = await api<{ message: string }>(`/admin/applications/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
      await loadWorkspace();
      notify("success", decision === "approve" ? "Parichay approved" : "Application closed", result.message);
    } catch (error) { notify("error", "Review not saved", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function reviewNextHumanInquiry(item: NextHumanInquiry, status: string) {
    setBusy(true);
    try {
      const note = window.prompt("Internal note (optional)", item.internalNote || "");
      if (note === null) return;
      const result = await api<{ message: string }>(`/admin/next-human-inquiries/${item.id}`, { method: "PATCH", body: JSON.stringify({ status, internalNote: note }) });
      await loadWorkspace();
      notify("success", "NEXT HUMAN inquiry updated", result.message);
    } catch (error) { notify("error", "Review not saved", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function openSankalp(id: string) {
    setBusy(true); setCreating(false); setSelectedId(id);
    try {
      const result = await api<{ sankalp: Sankalp }>(`/admin/sankalps/${id}`);
      setSelected(result.sankalp);
      setDraft({ ...result.sankalp, startDate: dateInput(result.sankalp.startDate), targetDate: dateInput(result.sankalp.targetDate) });
      requestAnimationFrame(() => document.getElementById("sankalp-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) { notify("error", "Sankalp could not open", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function saveSankalp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api<{ sankalp: Sankalp; message: string }>(selectedId ? `/admin/sankalps/${selectedId}` : "/admin/sankalps", {
        method: selectedId ? "PATCH" : "POST",
        body: JSON.stringify(draft),
      });
      await loadWorkspace();
      setCreating(false);
      await openSankalp(result.sankalp.id);
      notify("success", result.sankalp.status === "draft" ? "Draft saved privately" : "Sankalp is live", result.message);
    } catch (error) { notify("error", "Sankalp not saved", error instanceof Error ? error.message : "Please check the fields and try again."); }
    finally { setBusy(false); }
  }

  async function addMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedId) return;
    const form = event.currentTarget; const values = new FormData(form); setBusy(true);
    try {
      const result = await api<{ message: string }>(`/admin/sankalps/${selectedId}/milestones`, { method: "POST", body: JSON.stringify(Object.fromEntries(values)) });
      form.reset(); await openSankalp(selectedId); notify("success", "Milestone added", result.message);
    } catch (error) { notify("error", "Milestone not added", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function updateMilestone(id: string, status: string) {
    setBusy(true);
    try {
      const result = await api<{ message: string }>(`/admin/sankalps/${selectedId}/milestones/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await openSankalp(selectedId); notify("success", "Milestone updated", result.message);
    } catch (error) { notify("error", "Milestone not updated", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function addProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setBusy(true);
    try {
      const result = await api<{ message: string }>(`/admin/sankalps/${selectedId}/progress-reports`, { method: "POST", body: JSON.stringify(Object.fromEntries(values)) });
      form.reset(); await openSankalp(selectedId); await loadWorkspace(); notify("success", "Progress published", result.message);
    } catch (error) { notify("error", "Progress not published", error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setBusy(true);
    try {
      const result = await api<{ message: string }>(`/admin/sankalps/${selectedId}/documents`, { method: "POST", body: values });
      form.reset(); await openSankalp(selectedId); notify("success", "Document linked", result.message);
    } catch (error) { notify("error", "Document not linked", error instanceof Error ? error.message : "Please use a complete https:// link."); }
    finally { setBusy(false); }
  }

  const nextAction = useMemo(() => {
    if (!selected) return "Open a Sankalp to see its next action.";
    const messages: Record<string, string> = {
      concept: "Clarify the purpose, rules and responsible team, then begin research.",
      research: "Record findings and move to estimate preparation when the approach is clear.",
      estimate_pending: "Add the estimate document and actual estimated budget.",
      estimate_received: "Approve the estimate and open Kosh support if funding is required.",
      fundraising: "Track support until the Sankalp is ready for implementation.",
      ready_for_implementation: "Confirm the implementation lead, dates and first milestone.",
      implementation: "Update milestones, progress reports, documents and completion percentage.",
      completed: "Keep the final report and learning available for future Sankalp.",
    };
    return messages[selected.stage] || "Review the current stage and record the next decision.";
  }, [selected]);

  if (checkingSession) return <main className="sas-admin-loading"><span /><p>Preparing the secure workspace...</p></main>;

  if (!administrator) return (
    <main className="sas-auth-page">
      <section className="sas-auth-identity">
        <Link href="/"><Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society" width={72} height={72} priority unoptimized /></Link>
        <p>SRI AUROBINDO SOCIETY · LUCKNOW</p>
        <h1>Administration with clarity, responsibility and trust.</h1>
        <p>Review Parichay, guide each Sankalp from idea to completion, and preserve a transparent record of collective work.</p>
      </section>
      <section className="sas-auth-panel">
        <div className="sas-auth-switch" role="tablist">
          <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Sign in</button>
          <button className={authMode === "activate" ? "active" : ""} onClick={() => setAuthMode("activate")}>Activate account</button>
        </div>
        <h2>{authMode === "login" ? "Administrator sign in" : "First-time activation"}</h2>
        <p>{authMode === "login" ? "Use your approved administrator account." : "Set the first password using the private activation code."}</p>
        <form onSubmit={authenticate}>
          <label>Email<input required type="email" name="email" autoComplete="username" defaultValue="rksingh.668@gmail.com" /></label>
          {authMode === "activate" && <label>Activation code<input required name="activationCode" autoComplete="one-time-code" /></label>}
          <label>Password<input required type="password" name="password" minLength={10} autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>
          {notice && <Notice notice={notice} close={() => setNotice(null)} />}
          <button className="sas-primary" disabled={busy}>{busy ? "Please wait..." : authMode === "login" ? "Open administration" : "Activate securely"}</button>
        </form>
        <Link className="sas-back-link" href="/participate">Return to participation page</Link>
      </section>
    </main>
  );

  return (
    <main className="sas-admin-page">
      <header className="sas-admin-header">
        <Link href="/" className="sas-admin-brand"><Image src="/society-logo-transparent.png" alt="" width={48} height={48} unoptimized /><span><strong>SAS Lucknow</strong><small>ADMINISTRATION</small></span></Link>
        <div className="sas-admin-user"><span><strong>{administrator.fullName}</strong><small>{label(administrator.role)}</small></span><button onClick={signOut}>Sign out</button></div>
      </header>
      <nav className="sas-admin-nav" aria-label="Administration sections">
        {[["darshan", "Darshan"], ["next_human", `NEXT HUMAN${overview?.metrics.newNextHumanInquiries ? ` (${overview.metrics.newNextHumanInquiries})` : ""}`], ["parichay", `Parichay${applications.length ? ` (${applications.length})` : ""}`], ["sankalp", "Sankalp"], ["audit", "Activity"]].map(([id, text]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id as typeof tab)}>{text}</button>)}
      </nav>
      {notice && <div className="sas-notice-wrap"><Notice notice={notice} close={() => setNotice(null)} /></div>}

      {tab === "darshan" && <section className="sas-admin-content">
        <PageHeading eyebrow="OPERATIONAL DARSHAN" title="The work at a glance" text="Begin with what needs attention, then move each responsibility forward with a visible record." />
        <div className="sas-metric-grid">
          <Metric label="New NEXT HUMAN inquiries" value={overview?.metrics.newNextHumanInquiries ?? 0} action="Review Founding Circle" onClick={() => setTab("next_human")} />
          <Metric label="Pending Parichay" value={overview?.metrics.pendingApplications ?? 0} action="Review now" onClick={() => setTab("parichay")} />
          <Metric label="Active members" value={overview?.metrics.activeMembers ?? 0} />
          <Metric label="Private drafts" value={overview?.metrics.draftSankalps ?? 0} action="Open Sankalp" onClick={() => setTab("sankalp")} />
          <Metric label="Live Sankalp" value={overview?.metrics.liveSankalps ?? 0} />
          <Metric label="Completed" value={overview?.metrics.completedSankalps ?? 0} />
        </div>
        <div className="sas-darshan-grid">
          <section className="sas-band"><h2>Sankalp movement</h2><div className="sas-stage-list">{stages.map(([id, text]) => <div key={id}><span>{text}</span><strong>{overview?.stageCounts[id] || 0}</strong></div>)}</div></section>
          <section className="sas-band"><h2>Recent responsibility</h2><ActivityList entries={overview?.recentActivity || []} /></section>
        </div>
      </section>}

      {tab === "next_human" && <section className="sas-admin-content">
        <PageHeading eyebrow="FOUNDING CIRCLE" title="People ready to build NEXT HUMAN" text="Read for resonance, capability and realistic commitment. This is the foundation-team queue—not attendee registration or selection for the 200-person Challenge." />
        {!nextHumanInquiries.length ? <Empty title="No Founding Circle inquiry yet" text="New submissions from the NEXT HUMAN page will appear here automatically." /> : <div className="sas-nh-list">{nextHumanInquiries.map(item => <article key={item.id}>
          <header><div><span className={`sas-status ${item.status}`}>{label(item.status)}</span><small>{item.reference} · {displayDate(item.latestSubmittedAt || item.createdAt)}</small><h2>{item.fullName}</h2><p>{[label(item.ageRange), item.city, item.professionOrInstitution].filter(Boolean).join(" · ")}</p></div><aside><a href={`tel:+91${item.mobile}`}>{item.mobile}</a><a href={`mailto:${item.email}`}>{item.email}</a><strong>{label(item.source || "website")}</strong></aside></header>
          <div className="sas-nh-inquiry-grid"><section><h3>What called them</h3><p>{item.filmResponse}</p><p>{item.whyNextHuman}</p></section><section><h3>The next quality</h3><blockquote>{item.nextQuality}</blockquote><small>{(item.explorationInterests || []).map(label).join(" · ")}</small></section><section><h3>Contribution</h3><strong>{label(item.primaryContributionArea)}</strong><p>{item.relevantContribution}</p>{item.exampleOfWork && <small>{item.exampleOfWork}</small>}</section><section><h3>Practical fit</h3><dl><div><dt>Areas</dt><dd>{(item.contributionAreas || []).map(label).join(", ")}</dd></div><div><dt>Mode</dt><dd>{(item.contributionLocation || []).map(label).join(", ")}</dd></div><div><dt>Time</dt><dd>{label(item.weeklyAvailability)} · {(item.usualAvailability || []).map(label).join(", ")}</dd></div><div><dt>Orientation</dt><dd>{label(item.orientationPreference)}</dd></div></dl></section></div>
          {item.organisationConnectionDetails && <p className="sas-nh-context"><strong>Network:</strong> {item.organisationConnectionDetails}</p>}{item.additionalContext && <p className="sas-nh-context"><strong>Additional context:</strong> {item.additionalContext}</p>}{item.internalNote && <p className="sas-nh-note"><strong>Internal note:</strong> {item.internalNote}</p>}
          <div className="sas-row-actions"><button className="sas-primary" disabled={busy} onClick={() => reviewNextHumanInquiry(item, "orientation_invited")}>Invite to orientation</button><button className="sas-secondary" disabled={busy} onClick={() => reviewNextHumanInquiry(item, "foundation_circle")}>Add to Founding Circle</button><button className="sas-secondary" disabled={busy} onClick={() => reviewNextHumanInquiry(item, "reviewing")}>Mark reviewing</button><button className="sas-secondary" disabled={busy} onClick={() => reviewNextHumanInquiry(item, "hold")}>Hold</button><button className="sas-secondary danger" disabled={busy} onClick={() => reviewNextHumanInquiry(item, "declined")}>Close</button></div>
        </article>)}</div>}
      </section>}

      {tab === "parichay" && <section className="sas-admin-content">
        <PageHeading eyebrow="MEMBER REVIEW" title="Parichay awaiting attention" text="Approve genuine applications into the active community record or close submissions that should not proceed." />
        {!applications.length ? <Empty title="No Parichay is waiting" text="New applications will appear here automatically." /> : <div className="sas-application-list">{applications.map(item => <article key={item.id}>
          <div className="sas-application-head"><span>{item.reference}</span><time>{displayDate(item.createdAt)}</time></div>
          <h2>{item.fullName}</h2><p>{[item.city, item.mobile, item.email].filter(Boolean).join(" · ")}</p>
          {item.pushpanjaliCertificateNumber && <p className="sas-journey-reference">Pushpanjali · {item.pushpanjaliCertificateNumber}</p>}
          <dl><div><dt>Interests</dt><dd>{item.interests || "Not provided"}</dd></div><div><dt>Skills</dt><dd>{item.skills || "Not provided"}</dd></div><div><dt>Seva preference</dt><dd>{item.sevaPreference || "Not provided"}</dd></div></dl>
          <div className="sas-row-actions"><button className="sas-primary" disabled={busy} onClick={() => reviewApplication(item.id, "approve")}>Approve Parichay</button><button className="sas-secondary danger" disabled={busy} onClick={() => reviewApplication(item.id, "reject")}>Reject</button></div>
        </article>)}</div>}
      </section>}

      {tab === "sankalp" && <section className="sas-admin-content">
        <PageHeading eyebrow="SANKALP PRABANDHAN" title="From aspiration to accountable action" text="Create privately, appoint the responsible team, publish when ready, and preserve every milestone and decision." action={<button className="sas-primary" onClick={() => { setCreating(true); setSelected(null); setSelectedId(""); setDraft(emptySankalp); requestAnimationFrame(() => document.getElementById("sankalp-workspace")?.scrollIntoView({ behavior: "smooth" })); }}>Create Sankalp</button>} />
        <div className="sas-lifecycle" aria-label="Sankalp lifecycle">{stages.slice(0, 8).map(([id, text], index) => <div key={id}><span>{index + 1}</span><small>{text}</small></div>)}</div>
        {!sankalps.length ? <Empty title="No Sankalp yet" text="Create the first private draft to begin." /> : <div className="sas-sankalp-board">{sankalps.map(item => <article key={item.id} className={selectedId === item.id ? "selected" : ""}>
          <div><span className={`sas-status ${item.status}`}>{label(item.status)}</span><h2>{item.title}</h2><p>{item.summary || item.purpose}</p></div>
          <dl><div><dt>Stage</dt><dd>{label(item.stage)}</dd></div><div><dt>Progress</dt><dd>{item.completionPercent}%</dd></div><div><dt>Estimate</dt><dd>{item.budgetRequired ? formatMoney(item.estimatedBudgetRupees || item.tentativeBudgetRupees) : "No budget"}</dd></div></dl>
          <button className="sas-secondary" onClick={() => openSankalp(item.id)}>Open workspace</button>
        </article>)}</div>}

        {(creating || selected) && <section className="sas-workspace" id="sankalp-workspace">
          <div className="sas-workspace-heading"><div><p>{creating ? "NEW PRIVATE DRAFT" : "OPEN WORKSPACE"}</p><h2>{creating ? "Create Sankalp" : selected?.title}</h2></div>{!creating && <aside><strong>Next action</strong><span>{nextAction}</span></aside>}</div>
          <form className="sas-editor" onSubmit={saveSankalp}>
            <label className="wide">Sankalp name<input required value={String(draft.title || "")} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></label>
            <label className="wide">Summary<input value={String(draft.summary || "")} onChange={event => setDraft(current => ({ ...current, summary: event.target.value }))} /></label>
            <label className="wide">Purpose<textarea required rows={4} value={String(draft.purpose || "")} onChange={event => setDraft(current => ({ ...current, purpose: event.target.value }))} /></label>
            <label className="wide">Rules and scope<textarea rows={5} value={String(draft.rules || "")} onChange={event => setDraft(current => ({ ...current, rules: event.target.value }))} /></label>
            <label>Type<select value={String(draft.type || "service")} onChange={event => setDraft(current => ({ ...current, type: event.target.value }))}><option value="service">Service</option><option value="research">Research</option><option value="event">Event</option><option value="education">Education</option><option value="infrastructure">Infrastructure</option><option value="patient_support">Patient support</option></select></label>
            <label>Publication<select value={String(draft.status || "draft")} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}>{statuses.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
            <label>Current stage<select value={String(draft.stage || "concept")} onChange={event => setDraft(current => ({ ...current, stage: event.target.value }))}>{stages.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
            <label>Project lead<select value={String(draft.projectLeadMemberId || "")} onChange={event => setDraft(current => ({ ...current, projectLeadMemberId: event.target.value }))}><option value="">Select member</option>{members.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
            <label>Progress auditor<select value={String(draft.auditorMemberId || "")} onChange={event => setDraft(current => ({ ...current, auditorMemberId: event.target.value }))}><option value="">Select member</option>{members.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
            <label>Implementation lead<select value={String(draft.implementationLeadMemberId || "")} onChange={event => setDraft(current => ({ ...current, implementationLeadMemberId: event.target.value }))}><option value="">Select member</option>{members.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
            <label>Start date<input type="date" value={String(draft.startDate || "")} onChange={event => setDraft(current => ({ ...current, startDate: event.target.value }))} /></label>
            <label>Target date<input type="date" value={String(draft.targetDate || "")} onChange={event => setDraft(current => ({ ...current, targetDate: event.target.value }))} /></label>
            <label>Tentative budget (INR)<input type="number" min="0" value={String(draft.tentativeBudgetRupees ?? "")} onChange={event => setDraft(current => ({ ...current, tentativeBudgetRupees: event.target.value }))} /></label>
            <label>Approved estimate (INR)<input type="number" min="0" value={String(draft.estimatedBudgetRupees ?? "")} onChange={event => setDraft(current => ({ ...current, estimatedBudgetRupees: event.target.value }))} /></label>
            <label>Completion %<input type="number" min="0" max="100" value={Number(draft.completionPercent || 0)} onChange={event => setDraft(current => ({ ...current, completionPercent: Number(event.target.value) }))} /></label>
            <div className="sas-checks wide"><label><input type="checkbox" checked={Boolean(draft.budgetRequired)} onChange={event => setDraft(current => ({ ...current, budgetRequired: event.target.checked }))} /> Budget required</label><label><input type="checkbox" checked={Boolean(draft.acceptsDonations)} onChange={event => setDraft(current => ({ ...current, acceptsDonations: event.target.checked }))} /> Accept Kosh support</label><label><input type="checkbox" checked={Boolean(draft.acceptsSeva)} onChange={event => setDraft(current => ({ ...current, acceptsSeva: event.target.checked }))} /> Accept seva</label></div>
            <button className="sas-primary wide" disabled={busy}>{busy ? "Saving..." : creating ? "Save Sankalp" : "Update Sankalp"}</button>
          </form>

          {selected && <div className="sas-workspace-tools">
            <section className="sas-tool"><h3>Milestones</h3>{selected.milestones?.length ? <div className="sas-records">{selected.milestones.map(item => <article key={item.id}><div><strong>{item.title}</strong><span>{item.description || "No description"} · {displayDate(item.dueDate)}</span></div><select value={item.status} onChange={event => updateMilestone(item.id, event.target.value)}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select></article>)}</div> : <p>No milestones recorded.</p>}
              <form onSubmit={addMilestone}><input required name="title" placeholder="Milestone title" /><input type="date" name="dueDate" /><input type="number" min="0" name="budgetRupees" placeholder="Budget INR" /><textarea name="description" placeholder="What will be completed?" /><button className="sas-secondary">Add milestone</button></form>
            </section>
            <section className="sas-tool"><h3>Progress reports</h3>{selected.progressReports?.length ? <div className="sas-records">{selected.progressReports.map(item => <article key={item.id}><div><strong>{item.title} · {item.completionPercent}%</strong><span>{item.report}</span><small>{item.createdByName} · {displayDate(item.createdAt)}</small></div></article>)}</div> : <p>No progress reports recorded.</p>}
              <form onSubmit={addProgress}><input required name="title" placeholder="Report title" /><input required type="number" min="0" max="100" name="completionPercent" defaultValue={selected.completionPercent} /><textarea required name="report" placeholder="Work completed, decisions, blockers and next action" /><button className="sas-secondary">Publish progress</button></form>
            </section>
            <section className="sas-tool"><h3>Documents</h3><p className="sas-tool-note">Upload a private estimate, receipt or report, or link an approved cloud document.</p>{selected.documents?.length ? <div className="sas-records">{selected.documents.map(item => <article key={item.id}><div><a href={item.downloadUrl || item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong></a><span>{label(item.documentType)} · {item.note}</span></div></article>)}</div> : <p>No documents linked.</p>}
              <form onSubmit={addDocument} encType="multipart/form-data"><input required name="title" placeholder="Document title" /><select name="documentType"><option value="estimate">Estimate</option><option value="receipt">Receipt</option><option value="progress_report">Progress report</option><option value="research">Research</option><option value="supporting_document">Supporting document</option></select><input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" /><input type="url" name="url" placeholder="Or use an https:// link" /><textarea name="note" placeholder="Short note" /><button className="sas-secondary">Add document</button></form>
            </section>
          </div>}
        </section>}
      </section>}

      {tab === "audit" && <section className="sas-admin-content"><PageHeading eyebrow="ACCOUNTABILITY" title="Activity record" text="Important decisions and changes are retained with the responsible administrator and time." /><section className="sas-band"><ActivityList entries={auditEntries} empty="No administration activity recorded yet." /></section></section>}
    </main>
  );
}

function Notice({ notice, close }: { notice: { tone: "success" | "error"; title: string; detail: string }; close: () => void }) {
  return <div className={`sas-notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}><span><strong>{notice.title}</strong><small>{notice.detail}</small></span><button onClick={close} aria-label="Close message">Close</button></div>;
}
function PageHeading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <header className="sas-page-heading"><div><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></div>{action}</header>; }
function Metric({ label: text, value, action, onClick }: { label: string; value: number; action?: string; onClick?: () => void }) { return <article className="sas-metric"><span>{text}</span><strong>{value}</strong>{action && <button onClick={onClick}>{action}</button>}</article>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="sas-empty"><strong>{title}</strong><p>{text}</p></div>; }
function ActivityList({ entries, empty = "No recent activity." }: { entries: AuditEntry[]; empty?: string }) { return entries.length ? <div className="sas-activity-list">{entries.map(item => <article key={item.id}><span>{item.action.replaceAll(".", " · ").replaceAll("_", " ")}</span><strong>{item.actorName || "System"}</strong><time>{displayDate(item.createdAt)}</time></article>)}</div> : <p>{empty}</p>; }
