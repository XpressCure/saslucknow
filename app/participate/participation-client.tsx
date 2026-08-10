"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Sankalp = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  purpose: string;
  status: string;
  stage: string;
  acceptsDonations: boolean;
  acceptsSeva: boolean;
  donorCount: number;
  volunteerCount: number;
  targetDate: string | null;
};

type RecentContribution = {
  id: string;
  sankalpTitle: string;
  contributedAt: string;
};

type Overview = {
  organisation: null | {
    name: string;
    centreName: string;
    location: string;
    supportEmail: string;
    supportPhone: string;
  };
  memberCount: number;
  summary: {
    activeSankalpCount: number;
    contributorCount: number;
    sevaParticipantCount: number;
  };
  sankalps: Sankalp[];
  recentContributions: RecentContribution[];
};

const emptyOverview: Overview = {
  organisation: null,
  memberCount: 0,
  summary: { activeSankalpCount: 0, contributorCount: 0, sevaParticipantCount: 0 },
  sankalps: [],
  recentContributions: [],
};

function displayContributionDate(value: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function ParticipationClient() {
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const activeSankalps = useMemo(() => overview.sankalps.filter(item => item.status !== "completed"), [overview.sankalps]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/participation/overview", { signal: controller.signal })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Participation details are temporarily unavailable.");
        setOverview(result);
      })
      .catch(error => {
        if (error?.name !== "AbortError") setLoadError(error instanceof Error ? error.message : "Participation details are temporarily unavailable.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function submitParichay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setConfirmation("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/participation/parichay/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.get("fullName"),
          mobile: data.get("mobile"),
          email: data.get("email"),
          city: data.get("city"),
          interests: data.get("interests"),
          skills: data.get("skills"),
          sevaPreference: data.get("sevaPreference"),
          consent: data.get("consent") === "yes",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your Parichay could not be submitted.");
      setConfirmation(`${result.message} Reference: ${result.reference}`);
      form.reset();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Your Parichay could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="participation-page">
      <header className="participation-header">
        <Link className="participation-brand" href="/" aria-label="Sri Aurobindo Society Lucknow home">
          <Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={44} height={44} priority unoptimized />
          <span><strong>Sri Aurobindo Society</strong><small>LUCKNOW · GOMTI NAGAR CENTRE</small></span>
        </Link>
        <div className="participation-header-actions"><Link className="home-link" href="/">Home</Link><Link className="home-link" href="/member">Member sign in</Link><Link className="home-link" href="/admin">Administrator</Link></div>
      </header>

      <section className="participation-intro">
        <p className="participation-kicker">CONSCIOUS PARTICIPATION · सचेत सहभागिता</p>
        <h1>Know one another.<br />Serve a shared purpose.</h1>
        <p>Offer your Parichay, join a Sankalp through seva, and support clearly defined work through the Kosh.</p>
        <div className="participation-actions">
          <a className="participation-button primary" href="#parichay">Share Parichay</a>
          <a className="participation-button" href="#sankalp">View Sankalp</a>
          <Link className="participation-button" href="/member">Open member portal</Link>
        </div>
      </section>

      <section className="participation-path" aria-label="Ways to participate">
        <article><span>01</span><h2>Parichay · परिचय</h2><p>Bring your interests, abilities and aspiration into the community.</p></article>
        <article><span>02</span><h2>Sankalp · संकल्प</h2><p>Take responsibility for a defined work, milestone or act of seva.</p></article>
        <article><span>03</span><h2>Kosh · कोष</h2><p>Offer transparently to the shared work or to a particular Sankalp.</p></article>
      </section>

      <section className="participation-overview" aria-labelledby="overview-title">
        <div>
          <p className="participation-kicker">THE WORK AT A GLANCE</p>
          <h2 id="overview-title">A living community of aspiration and action</h2>
        </div>
        {loadError ? <p className="participation-notice error" role="alert">{loadError}</p> : (
          <dl className="participation-stats" aria-busy={loading}>
            <div><dt>Active members</dt><dd>{loading ? "—" : overview.memberCount}</dd></div>
            <div><dt>Active Sankalp</dt><dd>{loading ? "—" : overview.summary.activeSankalpCount}</dd></div>
            <div><dt>Contributors</dt><dd>{loading ? "—" : overview.summary.contributorCount}</dd></div>
            <div><dt>Seva participants</dt><dd>{loading ? "—" : overview.summary.sevaParticipantCount}</dd></div>
          </dl>
        )}
      </section>

      <section className="sankalp-section" id="sankalp">
        <div className="participation-heading">
          <div><p className="participation-kicker">SHARED COMMITMENTS</p><h2>Current Sankalp</h2></div>
          <p>Each Sankalp carries a clear purpose, responsible team, progress record and transparent use of support.</p>
        </div>
        {!loading && !loadError && activeSankalps.length === 0 ? (
          <div className="participation-empty"><strong>The first Sankalp are being prepared.</strong><p>Approved works will appear here with their purpose, team, milestones and support requirement.</p></div>
        ) : (
          <div className="sankalp-list">
            {activeSankalps.map(item => <article key={item.id} className="sankalp-row">
              <div className="sankalp-copy"><span>{item.status}</span><h3>{item.title}</h3><p>{item.summary || item.purpose}</p></div>
              <div className="sankalp-progress">
                {item.acceptsDonations && <div className="participation-count"><span>{item.donorCount}</span><small>contributors</small></div>}
                {item.acceptsSeva && <div className="participation-count"><span>{item.volunteerCount}</span><small>seva participants</small></div>}
                <p className="sankalp-stage">Stage: {item.stage}</p>
              </div>
              <Link className="participation-button" href="/member">View and participate</Link>
            </article>)}
          </div>
        )}
      </section>

      <section className="kosh-section" id="kosh">
        <div><p className="participation-kicker">PRIVACY-RESPECTING TRANSPARENCY</p><h2>Recent support</h2><p>Financial balances and personal details remain private. This public view shows recent participation without identifying contributors or displaying individual amounts.</p></div>
        <div className="recent-contributions" aria-label="Five recent contributions">
          {loading ? <p>Loading recent activity…</p> : overview.recentContributions.length === 0 ? (
            <div className="recent-empty"><strong>Recent verified contributions will appear here.</strong><span>No personal details or amounts will be displayed.</span></div>
          ) : overview.recentContributions.map((item, index) => (
            <article key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{item.sankalpTitle}</strong><time dateTime={item.contributedAt}>{displayContributionDate(item.contributedAt)}</time></div>
            </article>
          ))}
        </div>
      </section>

      <section className="parichay-section" id="parichay">
        <div className="parichay-copy"><p className="participation-kicker">BEGIN WITH PARICHAY</p><h2>How would you like to participate?</h2><p>Share only what helps the centre know you and invite you into meaningful study, service and collective work.</p></div>
        <form className="parichay-form" onSubmit={submitParichay}>
          <div className="participation-form-row"><label>Full name<input required name="fullName" autoComplete="name" maxLength={120} /></label><label>Mobile<input required name="mobile" inputMode="tel" autoComplete="tel" maxLength={14} /></label></div>
          <div className="participation-form-row"><label>Email <small>optional</small><input name="email" type="email" autoComplete="email" maxLength={180} /></label><label>City<input name="city" autoComplete="address-level2" maxLength={100} defaultValue="Lucknow" /></label></div>
          <label>Areas of interest<textarea name="interests" rows={3} maxLength={600} placeholder="Study circles, Savitri, education, youth, culture…" /></label>
          <label>Skills you may offer<textarea name="skills" rows={3} maxLength={600} placeholder="Teaching, writing, design, organising, accounting…" /></label>
          <label>Seva you would like to explore<input name="sevaPreference" maxLength={300} placeholder="A small way in which you would like to contribute" /></label>
          <label className="participation-consent"><input required type="checkbox" name="consent" value="yes" /><span>I permit the centre to use these details to contact me about membership, gatherings and seva. My Parichay will remain pending until reviewed.</span></label>
          {formError && <p className="participation-notice error" role="alert">{formError}</p>}
          {confirmation && <p className="participation-notice success" role="status">{confirmation}</p>}
          <button className="participation-button primary submit" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Parichay"}</button>
        </form>
      </section>

      <footer className="participation-footer"><span>Sri Aurobindo Society · Lucknow</span><span><a href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a> · <Link href="/admin">Administration</Link></span></footer>
    </main>
  );
}
