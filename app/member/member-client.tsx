"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Member = { id: string; fullName: string; email: string; mobile: string; city: string; interests: string; skills: string; sevaPreference: string; pushpanjaliCertificateNumber: string; role: string };
type Sankalp = { id: string; title: string; summary: string; purpose: string; rules: string; status: string; stage: string; acceptsDonations: boolean; acceptsSeva: boolean; donorCount: number; volunteerCount: number; completionPercent: number; targetAmountRupees: number; receivedAmountRupees: number; remainingAmountRupees: number; fundingPercent: number; targetDate: string | null };
type Contribution = { id: string; receiptNumber: string; sankalpTitle: string; amountRupees: number; status: string; provider: string; contributedAt: string };
type Dashboard = { member: Member; organisation: { name: string; receiptIssuer: Record<string, string> | null }; sankalps: Sankalp[]; contributions: Contribution[]; totals: { contributedRupees: number }; payments: { razorpayEnabled: boolean } };
type Receipt = { receiptNumber: string; issuedAt: string; amountRupees: number; sankalpTitle: string; donor: { donorName: string; donorEmail: string; donorMobile: string; donorPan: string; donorAddress: string }; providerPaymentId: string; organisation: string; receiptIssuer: Record<string, string> | null; note: string };

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The member service is taking too long to respond. Please try again shortly.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The requested action could not be completed.");
  return result;
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); return; }
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

function stageLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()); }

export function MemberClient() {
  const [member, setMember] = useState<Member | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [checking, setChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "activate">("login");
  const [tab, setTab] = useState<"darshan" | "sankalp" | "parichay" | "yogdaan">("darshan");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "info"; title: string; detail: string } | null>(null);
  const [paymentSankalp, setPaymentSankalp] = useState<Sankalp | null>(null);
  const [celebration, setCelebration] = useState<{ contribution: Contribution; next: Sankalp | null } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const liveSankalps = useMemo(() => dashboard?.sankalps.filter(item => item.status === "active") || [], [dashboard]);

  const loadDashboard = useCallback(async () => {
    const result = await api<Dashboard>("/dashboard");
    setMember(result.member);
    setDashboard(result);
  }, []);

  useEffect(() => {
    api<{ member: Member }>("/auth/me")
      .then(result => { setMember(result.member); return loadDashboard(); })
      .catch(() => setMember(null))
      .finally(() => setChecking(false));
  }, [loadDashboard]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const body = authMode === "login"
        ? { identity: data.get("identity"), password: data.get("password") }
        : { mobile: data.get("mobile"), reference: data.get("reference"), password: data.get("password") };
      const result = await api<{ member: Member; message?: string }>(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(body) });
      setMember(result.member); await loadDashboard(); form.reset();
      setNotice({ tone: "success", title: authMode === "activate" ? "Welcome to the member portal" : `Welcome back, ${result.member.fullName}`, detail: result.message || "Your secure session is ready." });
    } catch (error) { setNotice({ tone: "error", title: "Could not continue", detail: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    setMember(null); setDashboard(null); setTab("darshan"); setNotice(null);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ member: Member; message: string }>("/profile", { method: "PATCH", body: JSON.stringify({ city: data.get("city"), interests: data.get("interests"), skills: data.get("skills"), sevaPreference: data.get("sevaPreference") }) });
      setMember(result.member); setDashboard(current => current ? { ...current, member: result.member } : current);
      setNotice({ tone: "success", title: "Parichay updated", detail: result.message });
    } catch (error) { setNotice({ tone: "error", title: "Profile not saved", detail: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  async function beginPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!paymentSankalp || !member) return;
    setBusy(true); setNotice(null);
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const result = await api<{ order: { id: string; amountPaise: number; currency: string; razorpayKeyId: string; sankalpTitle: string }; message: string }>("/payments/razorpay/orders", {
        method: "POST",
        body: JSON.stringify({ sankalpId: paymentSankalp.id, amountRupees: data.get("amountRupees"), donorName: data.get("donorName"), donorEmail: data.get("donorEmail"), donorMobile: data.get("donorMobile"), donorPan: data.get("donorPan"), donorAddress: data.get("donorAddress") }),
      });
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
            const verified = await api<{ contribution: Contribution; message: string }>("/payments/razorpay/verify", { method: "POST", body: JSON.stringify({ razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature }) });
            await loadDashboard();
            const next = liveSankalps.filter(item => item.id !== paymentSankalp.id && item.acceptsDonations).sort((a, b) => a.remainingAmountRupees - b.remainingAmountRupees)[0] || null;
            setPaymentSankalp(null); setCelebration({ contribution: verified.contribution, next });
          } catch (error) { setNotice({ tone: "error", title: "Payment needs attention", detail: error instanceof Error ? error.message : "The centre will verify the payment status." }); }
          finally { setBusy(false); }
        },
      });
      checkout.on("payment.failed", response => setNotice({ tone: "error", title: "Payment was not completed", detail: response.error?.description || "No contribution was recorded. Please try again." }));
      checkout.open();
    } catch (error) { setNotice({ tone: "error", title: "Payment could not start", detail: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(false); }
  }

  async function openReceipt(id: string) {
    try { const result = await api<{ receipt: Receipt }>(`/contributions/${id}/receipt`); setReceipt(result.receipt); }
    catch (error) { setNotice({ tone: "error", title: "Receipt not available", detail: error instanceof Error ? error.message : "Please try again." }); }
  }

  if (checking) return <main className="member-shell member-loading"><Image src="/society-logo-transparent.png" alt="" width={72} height={72} unoptimized /><p>Opening the member space...</p></main>;

  if (!member) return <main className="member-shell member-auth">
    <Link className="member-auth-brand" href="/"><Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={70} height={70} unoptimized /><span>Sri Aurobindo Society<small>Lucknow Centre</small></span></Link>
    <section className="member-auth-panel">
      <div className="member-auth-copy"><p>MEMBER SPACE</p><h1>Parichay becomes participation.</h1><span>Follow the Sankalp, offer seva, contribute securely and keep every acknowledgement in one private place.</span></div>
      <div className="member-auth-form">
        <div className="member-auth-tabs"><button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Sign in</button><button className={authMode === "activate" ? "active" : ""} onClick={() => setAuthMode("activate")}>First visit</button></div>
        <h2>{authMode === "login" ? "Welcome back" : "Activate approved Parichay"}</h2>
        <p>{authMode === "login" ? "Use your mobile number or email and password." : "Use the mobile number and private reference from your approved Parichay."}</p>
        <form onSubmit={authenticate}>
          {authMode === "login" ? <label>Mobile or email<input required name="identity" autoComplete="username" /></label> : <><label>Mobile number<input required name="mobile" inputMode="tel" autoComplete="tel" /></label><label>Parichay reference<input required name="reference" placeholder="PAR-2026-XXXXXXXX" autoCapitalize="characters" /></label></>}
          <label>{authMode === "login" ? "Password" : "Create password"}<input required type="password" name="password" minLength={10} autoComplete={authMode === "login" ? "current-password" : "new-password"} /><small>At least 10 characters with a letter and number.</small></label>
          <button className="member-primary" disabled={busy}>{busy ? "Please wait..." : authMode === "login" ? "Open member portal" : "Activate securely"}</button>
        </form>
        <p className="member-help">Not approved yet? <Link href="/participate#parichay">Submit your Parichay</Link> first.</p>
      </div>
    </section>
    {notice && <Notice notice={notice} close={() => setNotice(null)} />}
  </main>;

  return <main className="member-shell member-portal">
    <header className="member-header"><Link href="/" className="member-brand"><Image src="/society-logo-transparent.png" alt="" width={46} height={46} unoptimized /><span><strong>SAS Lucknow</strong><small>Member Portal</small></span></Link><div className="member-account"><span>{member.fullName}</span><button onClick={signOut}>Sign out</button></div></header>
    <nav className="member-nav" aria-label="Member portal"><button className={tab === "darshan" ? "active" : ""} onClick={() => setTab("darshan")}><span>D</span>Darshan</button><button className={tab === "sankalp" ? "active" : ""} onClick={() => setTab("sankalp")}><span>S</span>Sankalp</button><button className={tab === "yogdaan" ? "active" : ""} onClick={() => setTab("yogdaan")}><span>Y</span>Yogdaan</button><button className={tab === "parichay" ? "active" : ""} onClick={() => setTab("parichay")}><span>P</span>Parichay</button></nav>
    <div className="member-content">
      {tab === "darshan" && <><PageHeading eyebrow="A SHARED FIELD OF WORK" title={`Namaste, ${member.fullName.split(" ")[0]}`} text="See what needs attention today and choose a meaningful next action." />
        <section className="member-metrics"><div><span>Live Sankalp</span><strong>{liveSankalps.length}</strong></div><div><span>My Yogdaan</span><strong>{money.format(dashboard?.totals.contributedRupees || 0)}</strong></div><div><span>Acknowledgements</span><strong>{dashboard?.contributions.length || 0}</strong></div></section>
        <section className="member-band"><div><p>NEXT MEANINGFUL ACTION</p><h2>{liveSankalps[0]?.title || "New Sankalp are being prepared"}</h2><span>{liveSankalps[0]?.summary || "Return soon to participate in the centre's shared work."}</span></div>{liveSankalps[0] && <button className="member-primary" onClick={() => { setTab("sankalp"); document.documentElement.scrollTop = 0; }}>View Sankalp</button>}</section>
        <section className="member-quiet"><h2>A conscious offering</h2><blockquote>“All life is Yoga.”</blockquote><p>Participation is most powerful when aspiration, responsibility and transparent action move together.</p></section>
      </>}
      {tab === "sankalp" && <><PageHeading eyebrow="COLLECTIVE COMMITMENTS" title="Sankalp" text="Understand the purpose, follow progress and support only the work that speaks to you." />
        <div className="member-sankalp-grid">{liveSankalps.map(item => <article key={item.id} className="member-sankalp-card"><div className="member-card-top"><span>{stageLabel(item.stage)}</span><strong>{item.fundingPercent}% supported</strong></div><h2>{item.title}</h2><p>{item.summary || item.purpose}</p><div className="member-progress"><i style={{ width: `${item.fundingPercent}%` }} /></div><dl><div><dt>Received</dt><dd>{money.format(item.receivedAmountRupees)}</dd></div><div><dt>Still needed</dt><dd>{item.targetAmountRupees ? money.format(item.remainingAmountRupees) : "Open"}</dd></div><div><dt>Participants</dt><dd>{item.donorCount}</dd></div></dl>{item.rules && <details><summary>Purpose and rules</summary><p>{item.purpose}</p><p>{item.rules}</p></details>}<div className="member-card-actions">{item.acceptsDonations && <button className="member-primary" disabled={!dashboard?.payments.razorpayEnabled} onClick={() => setPaymentSankalp(item)}>{dashboard?.payments.razorpayEnabled ? "Offer Yogdaan" : "Online support opening soon"}</button>}{item.acceptsSeva && <button className="member-secondary" onClick={() => setNotice({ tone: "info", title: "Seva interest noted locally", detail: "Please contact the centre coordinator while online Seva enrolment is being prepared." })}>Offer Seva</button>}</div></article>)}</div>
      </>}
      {tab === "yogdaan" && <><PageHeading eyebrow="PRIVATE CONTRIBUTION RECORD" title="My Yogdaan" text="Only you and authorised administrators can see your amounts and payment references." />
        <section className="member-total"><span>Total verified contribution</span><strong>{money.format(dashboard?.totals.contributedRupees || 0)}</strong><small>Across {dashboard?.contributions.length || 0} verified offering(s)</small></section>
        <div className="member-ledger">{dashboard?.contributions.length ? dashboard.contributions.map(item => <article key={item.id}><div><strong>{item.sankalpTitle}</strong><span>{displayDate(item.contributedAt)} · {item.receiptNumber}</span></div><b>{money.format(item.amountRupees)}</b><button className="member-secondary" onClick={() => openReceipt(item.id)}>Acknowledgement</button></article>) : <Empty title="No contribution yet" text="Choose a live Sankalp when you are ready. Only verified provider payments appear here." />}</div>
      </>}
      {tab === "parichay" && <><PageHeading eyebrow="YOUR MEMBER PROFILE" title="Parichay" text="Keep your interests and abilities current so the centre can invite you into meaningful work." />
        <form className="member-profile" onSubmit={saveProfile}><div className="member-profile-identity"><strong>{member.fullName}</strong><span>{member.mobile}</span><span>{member.email || "Email not added"}</span>{member.pushpanjaliCertificateNumber && <span>Pushpanjali · {member.pushpanjaliCertificateNumber}</span>}</div><label>City<input name="city" defaultValue={member.city} /></label><label>Areas of interest<textarea name="interests" rows={4} defaultValue={member.interests} /></label><label>Skills you may offer<textarea name="skills" rows={4} defaultValue={member.skills} /></label><label>Seva you would like to explore<textarea name="sevaPreference" rows={3} defaultValue={member.sevaPreference} /></label><button className="member-primary" disabled={busy}>{busy ? "Saving..." : "Save Parichay"}</button></form>
      </>}
    </div>
    {notice && <Notice notice={notice} close={() => setNotice(null)} />}
    {paymentSankalp && <div className="member-modal"><div className="member-modal-panel"><button className="member-modal-close" onClick={() => setPaymentSankalp(null)} aria-label="Close">×</button><p className="member-eyebrow">SECURE YOGDAAN</p><h2>{paymentSankalp.title}</h2><p>Your verified payment will be recorded directly against this Sankalp.</p><form onSubmit={beginPayment}><label>Amount (Rs)<input required name="amountRupees" type="number" min="100" max={paymentSankalp.remainingAmountRupees || 1000000} defaultValue={paymentSankalp.remainingAmountRupees ? Math.min(2100, paymentSankalp.remainingAmountRupees) : 2100} /></label><label>Legal name<input required name="donorName" defaultValue={member.fullName} /></label><div className="member-form-row"><label>Mobile<input required name="donorMobile" defaultValue={member.mobile} /></label><label>Email<input name="donorEmail" type="email" defaultValue={member.email} /></label></div><label>PAN <small>optional; required later for eligible 80G processing</small><input name="donorPan" maxLength={10} autoCapitalize="characters" /></label><label>Address <small>optional</small><textarea name="donorAddress" rows={2} /></label><button className="member-primary" disabled={busy}>{busy ? "Preparing secure payment..." : "Continue to Razorpay"}</button><small className="member-payment-note">The amount is recorded only after server verification. An 80G certificate is separate from the instant payment acknowledgement.</small></form></div></div>}
    {celebration && <div className="member-modal member-celebration"><div className="member-modal-panel"><div className="member-ripple"><span>ॐ</span></div><p className="member-eyebrow">OFFERING RECEIVED</p><h2>Thank you, {member.fullName.split(" ")[0]}.</h2><p>Your verified Yogdaan of <strong>{money.format(celebration.contribution.amountRupees)}</strong> now supports <strong>{celebration.contribution.sankalpTitle}</strong>.</p><div className="member-success-reference">Acknowledgement {celebration.contribution.receiptNumber}</div><button className="member-primary" onClick={() => { openReceipt(celebration.contribution.id); setCelebration(null); }}>View acknowledgement</button>{celebration.next && <button className="member-secondary" onClick={() => { setPaymentSankalp(celebration.next); setCelebration(null); }}>See next Sankalp: {celebration.next.title}</button>}<button className="member-link-button" onClick={() => setCelebration(null)}>Return to portal</button></div></div>}
    {receipt && <div className="member-modal"><div className="member-modal-panel member-receipt"><button className="member-modal-close" onClick={() => setReceipt(null)} aria-label="Close">×</button><Image src="/society-logo-transparent.png" alt="" width={58} height={58} unoptimized /><p className="member-eyebrow">PAYMENT ACKNOWLEDGEMENT</p><h2>{receipt.receiptNumber}</h2><dl><div><dt>Received from</dt><dd>{receipt.donor.donorName}</dd></div><div><dt>Amount</dt><dd>{money.format(receipt.amountRupees)}</dd></div><div><dt>For Sankalp</dt><dd>{receipt.sankalpTitle}</dd></div><div><dt>Date</dt><dd>{displayDate(receipt.issuedAt)}</dd></div><div><dt>Payment reference</dt><dd>{receipt.providerPaymentId}</dd></div></dl><p>{receipt.note}</p><button className="member-primary" onClick={() => window.print()}>Print acknowledgement</button></div></div>}
  </main>;
}

function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <header className="member-page-heading"><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></header>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="member-empty"><strong>{title}</strong><span>{text}</span></div>; }
function Notice({ notice, close }: { notice: { tone: string; title: string; detail: string }; close: () => void }) { return <div className={`member-notice ${notice.tone}`} role="status"><div><strong>{notice.title}</strong><span>{notice.detail}</span></div><button onClick={close} aria-label="Close">×</button></div>; }
