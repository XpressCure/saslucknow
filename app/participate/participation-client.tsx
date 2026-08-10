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
  targetAmountPaise: number;
  receivedAmountPaise: number;
  donorCount: number;
  volunteerCount: number;
  targetDate: string | null;
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
  kosh: {
    receivedAmountPaise: number;
    allocatedAmountPaise: number;
    availableAmountPaise: number;
    activeSankalpCount: number;
  };
  sankalps: Sankalp[];
};

const emptyOverview: Overview = {
  organisation: null,
  memberCount: 0,
  kosh: { receivedAmountPaise: 0, allocatedAmountPaise: 0, availableAmountPaise: 0, activeSankalpCount: 0 },
  sankalps: [],
};

function rupees(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function progress(sankalp: Sankalp) {
  if (!sankalp.targetAmountPaise) return 0;
  return Math.min(100, Math.round((sankalp.receivedAmountPaise / sankalp.targetAmountPaise) * 100));
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
        <Link className="home-link" href="/">Home</Link>
      </header>

      <section className="participation-intro">
        <p className="participation-kicker">CONSCIOUS PARTICIPATION · सचेत सहभागिता</p>
        <h1>Know one another.<br />Serve a shared purpose.</h1>
        <p>Offer your Parichay, join a Sankalp through seva, and support clearly defined work through the Kosh.</p>
        <div className="participation-actions">
          <a className="participation-button primary" href="#parichay">Share Parichay</a>
          <a className="participation-button" href="#sankalp">View Sankalp</a>
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
            <div><dt>Active Sankalp</dt><dd>{loading ? "—" : overview.kosh.activeSankalpCount}</dd></div>
            <div><dt>Received in Kosh</dt><dd>{loading ? "—" : rupees(overview.kosh.receivedAmountPaise)}</dd></div>
            <div><dt>Available for work</dt><dd>{loading ? "—" : rupees(overview.kosh.availableAmountPaise)}</dd></div>
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
                {item.acceptsDonations && item.targetAmountPaise > 0 && <><div><span>{rupees(item.receivedAmountPaise)}</span><small>of {rupees(item.targetAmountPaise)}</small></div><progress value={progress(item)} max="100">{progress(item)}%</progress><p>{item.donorCount} contributors</p></>}
                {item.acceptsDonations && item.targetAmountPaise === 0 && <div className="budget-pending"><span>Budget being finalised</span><small>Contributions will open after approval</small></div>}
                {item.acceptsSeva && <p>{item.volunteerCount} seva participants</p>}
              </div>
              <button type="button" className="participation-button" disabled>Details soon</button>
            </article>)}
          </div>
        )}
      </section>

      <section className="kosh-section" id="kosh">
        <div><p className="participation-kicker">TRANSPARENT SUPPORT</p><h2>Kosh · कोष</h2><p>Support will be accepted into the Society’s approved account and recorded against the selected Sankalp or the general Kosh.</p></div>
        <div className="kosh-amount"><small>Currently recorded</small><strong>{rupees(overview.kosh.receivedAmountPaise)}</strong><span>Payment access will open after legal and Razorpay verification.</span></div>
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

      <footer className="participation-footer"><span>Sri Aurobindo Society · Lucknow</span><a href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a></footer>
    </main>
  );
}
