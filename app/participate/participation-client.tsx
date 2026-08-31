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

const parichayJourneyKey = "sas-pushpanjali-parichay";

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pushpanjaliCertificateNumber, setPushpanjaliCertificateNumber] = useState("");
  const activeSankalps = useMemo(() => overview.sankalps.filter(item => item.status !== "completed"), [overview.sankalps]);

  useEffect(() => {
    const shouldOpenMemberForm = !window.location.hash || window.location.hash === "#parichay";
    if (!shouldOpenMemberForm) return;
    if (!window.location.hash) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#parichay`);
    }
    const timer = window.setTimeout(() => {
      document.getElementById("parichay")?.scrollIntoView({ block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(parichayJourneyKey) || "null") as null | {
        fullName?: string;
        email?: string;
        pushpanjaliCertificateNumber?: string;
        savedAt?: string;
      };
      if (!stored || !/^UC02-\d{6}$/.test(String(stored.pushpanjaliCertificateNumber || ""))) return;
      const savedAt = new Date(String(stored.savedAt || ""));
      if (Number.isNaN(savedAt.getTime()) || Date.now() - savedAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(parichayJourneyKey);
        return;
      }
      const timer = window.setTimeout(() => {
        setFullName(String(stored.fullName || "").slice(0, 120));
        setEmail(String(stored.email || "").slice(0, 180));
        setPushpanjaliCertificateNumber(stored.pushpanjaliCertificateNumber!);
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      sessionStorage.removeItem(parichayJourneyKey);
    }
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
          pushpanjaliCertificateNumber: data.get("pushpanjaliCertificateNumber"),
          password: data.get("password"),
          consent: data.get("consent") === "yes",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your Parichay could not be submitted.");
      const loginResponse = await fetch("/api/participation/member/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: data.get("mobile"), password: data.get("password") }),
      });
      if (loginResponse.ok) {
        window.location.assign("/member");
        return;
      }
      setConfirmation(`${result.message} You may now use Member Login with the same mobile number and password.`);
      form.reset();
      setFullName("");
      setEmail("");
      setPushpanjaliCertificateNumber("");
      sessionStorage.removeItem(parichayJourneyKey);
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
        <div className="participation-header-actions"><Link className="home-link" href="/">Home</Link><Link className="home-link" href="/member">Member Login</Link><Link className="home-link" href="/admin">Administrator</Link></div>
      </header>

      <section className="participation-intro">
        <p className="participation-kicker">JOIN THE COMMUNITY</p>
        <h1>Create your account.<br />Serve a shared purpose.</h1>
        <p>Tell us about yourself, create your member login and begin exploring Sankalp, seva and Yogdaan.</p>
        <div className="participation-actions">
          <a className="participation-button primary" href="#parichay">Create My Account</a>
          <a className="participation-button" href="#sankalp">View Sankalp</a>
          <Link className="participation-button" href="/member">Member Login</Link>
        </div>
      </section>

      <section className="participation-path" aria-label="How to join the community">
        <article><span>01</span><h2>Join the Community</h2><p>Complete the form and create your secure member password.</p></article>
        <article><span>02</span><h2>Enter your member space</h2><p>Sign in to explore Darshan, Sangha, Sankalp, Seva and your private Yogdaan record.</p></article>
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
        <div className="parichay-copy"><p className="participation-kicker">CREATE YOUR MEMBER ACCOUNT</p><h2>Tell us about yourself</h2><p>Your introduction, or Parichay, helps us understand your interests, abilities and the seva you would like to explore.</p></div>
        <form className="parichay-form" onSubmit={submitParichay} aria-label="Create your SAS Lucknow member account">
          {pushpanjaliCertificateNumber && <div className="pushpanjali-parichay-link" role="status"><span>Pushpanjali connected</span><strong>{pushpanjaliCertificateNumber}</strong><p>Your certificate is connected to the member account you are creating.</p></div>}
          <input type="hidden" name="pushpanjaliCertificateNumber" value={pushpanjaliCertificateNumber} />
          <div className="participation-form-row"><label>Full name<input required name="fullName" autoComplete="name" maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} /></label><label>Mobile<input required name="mobile" inputMode="tel" autoComplete="tel" maxLength={14} /></label></div>
          <div className="participation-form-row"><label>Email <small>optional</small><input name="email" type="email" autoComplete="email" maxLength={180} value={email} onChange={event => setEmail(event.target.value)} /></label><label>City<input name="city" autoComplete="address-level2" maxLength={100} defaultValue="Lucknow" /></label></div>
          <label>Areas of interest<textarea name="interests" rows={3} maxLength={600} placeholder="Study circles, Savitri, education, youth, culture…" /></label>
          <label>Skills you may offer<textarea name="skills" rows={3} maxLength={600} placeholder="Teaching, writing, design, organising, accounting…" /></label>
          <label>Seva you would like to explore<input name="sevaPreference" maxLength={300} placeholder="A small way in which you would like to contribute" /></label>
          <label>Create your member password<input required name="password" type="password" minLength={10} autoComplete="new-password" /><small>Use at least 10 characters with a letter and number. You can sign in immediately after submitting.</small></label>
          <label className="participation-consent"><input required type="checkbox" name="consent" value="yes" /><span>I permit the centre to use these details to contact me about membership, gatherings and seva.</span></label>
          {formError && <p className="participation-notice error" role="alert">{formError}</p>}
          {confirmation && <p className="participation-notice success" role="status">{confirmation}</p>}
          <button className="participation-button primary submit" type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Create My Account"}</button>
        </form>
      </section>

      <footer className="participation-footer"><span>Sri Aurobindo Society · Lucknow</span><span><a href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a> · <Link href="/admin">Administration</Link></span></footer>
    </main>
  );
}
