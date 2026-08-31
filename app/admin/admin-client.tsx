"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FocusCampaignsPanel } from "./campaign-studio";
import { NextHumanEventStudio } from "./next-human-event-studio";
import { AdminControlPanel } from "./control-panel";

type Administrator = { id: string; fullName: string; email: string; role: string; permissions: string[] };
type AdminView = "overview" | "control_panel" | "members" | "certificates" | "yogdaan" | "sangha" | "sankalps" | "campaigns" | "notifications";
type YogdaanBySankalp = { sankalpId: string; title: string; amountRupees: number; contributionCount: number; lastContributedAt: string | null };
type AdminMember = {
  id: string; memberNumber: string; fullName: string; email: string; mobile: string; city: string; role: string;
  membershipStatus: "enabled" | "disabled"; canManageAccess: boolean; certificateCreated: boolean; joinedAt: string;
  parichay: { city: string; interests: string; skills: string; sevaPreference: string; pushpanjaliCertificateNumber: string };
  yogdaan: { totalAmountRupees: number; contributionCount: number; lastContributedAt: string | null; sankalps: YogdaanBySankalp[] };
};
type SanghaPost = { id: string; author: string; authorRole: string; type: string; text: string; status: "published" | "hidden"; createdAt: string; createdAtIst: string; media: null | { kind: string; name: string } };
type Overview = { metrics: { pendingApplications: number; newNextHumanInquiries: number; activeMembers: number; draftSankalps: number; liveSankalps: number; completedSankalps: number; visiblePosts: number; totalYogdaanRupees: number; contributingMembers: number; certificates: number }; recentActivity: { id: string; action: string; actorName: string; entityType: string; createdAt: string }[] };
type YogdaanTransaction = { id: string; transactionId: string; orderId: string; receiptNumber: string; memberId: string; memberNumber: string; memberName: string; email: string; mobile: string; amountRupees: number; sankalpTitle: string; status: string; provider: string; receivedAt: string | null };
type YogdaanLedger = { summary: { totalRupees: number; contributingMembers: number; transactionCount: number; averageRupees: number; latestAt: string | null }; transactions: YogdaanTransaction[] };
type NotificationItem = { id: string; type: "sangha" | "yogdaan" | "certificate" | "next_human" | "member"; title: string; message: string; entityId: string; createdAt: string };
type NotificationFeed = { unreadCount: number; readAt: string; notifications: NotificationItem[] };
type Sankalp = { id: string; title: string; summary: string; purpose: string; rules: string; status: string; stage: string; acceptsDonations: boolean; acceptsSeva: boolean; completionPercent: number; donorCount: number; volunteerCount: number; updatedAt?: string };
type PushpanjaliCertificate = { id: string; certificateNumber: string; offeringNumber: number; name: string; email: string; flowerId: string; flowerName: string; flowerBotanical: string; flowerMeaning: string; ceremonyDate: string; generatedAt: string | null; emailStatus: string; emailedAt: string | null; memberNumber: string; memberName: string };
type CertificateRegister = { summary: { recordedCertificates: number; uniqueDevotees: number; emailedCertificates: number; linkedMembers: number; latestAt: string | null }; certificates: PushpanjaliCertificate[] };
type NextHumanInquiry = { id: string; reference: string; status: string; fullName: string; ageRange: string; city: string; mobile: string; email: string; professionOrInstitution: string; filmResponse: string; whyNextHuman: string; nextQuality: string; explorationInterests: string[]; contributionAreas: string[]; primaryContributionArea: string; relevantContribution: string; exampleOfWork: string; contributionStyle: string; contributionLocation: string[]; weeklyAvailability: string; usualAvailability: string[]; organisationConnection: string; organisationConnectionDetails: string; orientationPreference: string; additionalContext: string; source: string; internalNote?: string; createdAt: string; latestSubmittedAt: string };

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const EMPTY_LEDGER: YogdaanLedger = { summary: { totalRupees: 0, contributingMembers: 0, transactionCount: 0, averageRupees: 0, latestAt: null }, transactions: [] };
const EMPTY_OVERVIEW: Overview = { metrics: { pendingApplications: 0, newNextHumanInquiries: 0, activeMembers: 0, draftSankalps: 0, liveSankalps: 0, completedSankalps: 0, visiblePosts: 0, totalYogdaanRupees: 0, contributingMembers: 0, certificates: 0 }, recentActivity: [] };
const EMPTY_CERTIFICATES: CertificateRegister = { summary: { recordedCertificates: 0, uniqueDevotees: 0, emailedCertificates: 0, linkedMembers: 0, latestAt: null }, certificates: [] };

async function adminApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/participation${path}`, {
    credentials: "same-origin", ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The administrator action could not be completed.");
  return result;
}

function readableDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not recorded" : `${dateTime.format(parsed)} IST`;
}

function accessValue(member: AdminMember) {
  if (member.membershipStatus === "disabled") return "disabled";
  if (["administrator", "super_administrator"].includes(member.role)) return "administrator";
  return "enabled";
}

function actionLabel(action: string) {
  return action.replaceAll(".", " ").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function AdminClient() {
  const [administrator, setAdministrator] = useState<Administrator | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<AdminView>("overview");
  const [overview, setOverview] = useState<Overview>(EMPTY_OVERVIEW);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [posts, setPosts] = useState<SanghaPost[]>([]);
  const [ledger, setLedger] = useState<YogdaanLedger>(EMPTY_LEDGER);
  const [certificateRegister, setCertificateRegister] = useState<CertificateRegister>(EMPTY_CERTIFICATES);
  const [notifications, setNotifications] = useState<NotificationFeed>({ unreadCount: 0, readAt: "", notifications: [] });
  const [sankalps, setSankalps] = useState<Sankalp[]>([]);
  const [nextHumanInquiries, setNextHumanInquiries] = useState<NextHumanInquiry[]>([]);
  const [inquiryReview, setInquiryReview] = useState<{ item: NextHumanInquiry; status: string; internalNote: string } | null>(null);
  const [search, setSearch] = useState("");
  const [postFilter, setPostFilter] = useState<"all" | "published" | "hidden">("all");
  const [yogdaanSearch, setYogdaanSearch] = useState("");
  const [yogdaanSort, setYogdaanSort] = useState<"date" | "name" | "amount">("date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [certificateSearch, setCertificateSearch] = useState("");
  const [certificateSort, setCertificateSort] = useState<"date" | "name" | "number">("date");
  const [certificateFrom, setCertificateFrom] = useState("");
  const [certificateTo, setCertificateTo] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "request-reset" | "complete-reset">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const loadAdministration = useCallback(async (dates?: { from: string; to: string }, certificateDates?: { from: string; to: string }) => {
    const range = dates || { from: dateFrom, to: dateTo };
    const certificateRange = certificateDates || { from: certificateFrom, to: certificateTo };
    const query = new URLSearchParams();
    if (range.from) query.set("from", range.from);
    if (range.to) query.set("to", range.to);
    const certificateQuery = new URLSearchParams();
    if (certificateRange.from) certificateQuery.set("from", certificateRange.from);
    if (certificateRange.to) certificateQuery.set("to", certificateRange.to);
    const [overviewResult, memberResult, postResult, yogdaanResult, notificationResult, sankalpResult, certificateResult, nextHumanResult] = await Promise.all([
      adminApi<Overview>("/admin/overview"),
      adminApi<{ members: AdminMember[] }>("/admin/members"),
      adminApi<{ posts: SanghaPost[] }>("/admin/sangha/posts"),
      adminApi<YogdaanLedger>(`/admin/yogdaan${query.size ? `?${query.toString()}` : ""}`),
      adminApi<NotificationFeed>("/admin/notifications"),
      adminApi<{ sankalps: Sankalp[] }>("/admin/sankalps"),
      adminApi<CertificateRegister>(`/admin/pushpanjali-certificates${certificateQuery.size ? `?${certificateQuery.toString()}` : ""}`),
      adminApi<{ inquiries: NextHumanInquiry[] }>("/admin/next-human-inquiries"),
    ]);
    setOverview(overviewResult); setMembers(memberResult.members); setPosts(postResult.posts); setLedger(yogdaanResult); setNotifications(notificationResult); setSankalps(sankalpResult.sankalps); setCertificateRegister(certificateResult); setNextHumanInquiries(nextHumanResult.inquiries);
  }, [dateFrom, dateTo, certificateFrom, certificateTo]);

  useEffect(() => {
    adminApi<{ administrator: Administrator }>("/auth/me")
      .then(result => { setAdministrator(result.administrator); return loadAdministration(); })
      .catch(() => setAdministrator(null))
      .finally(() => setChecking(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!administrator) return;
    const timer = window.setInterval(() => {
      adminApi<NotificationFeed>("/admin/notifications").then(result => {
        if (alertsEnabled && result.unreadCount > notifications.unreadCount && Notification.permission === "granted") {
          const newest = result.notifications[0];
          if (newest) new Notification(newest.title, { body: newest.message, icon: "/society-logo-transparent.png" });
        }
        setNotifications(result);
      }).catch(() => null);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [administrator, alertsEnabled, notifications.unreadCount]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return members;
    return members.filter(member => [member.memberNumber, member.fullName, member.email, member.mobile, member.city].some(value => String(value || "").toLocaleLowerCase().includes(term)));
  }, [members, search]);
  const filteredPosts = useMemo(() => posts.filter(post => postFilter === "all" || post.status === postFilter), [posts, postFilter]);
  const filteredTransactions = useMemo(() => {
    const term = yogdaanSearch.trim().toLowerCase();
    const rows = term ? ledger.transactions.filter(item => [item.memberName, item.memberNumber, item.email, item.mobile, item.transactionId, item.receiptNumber, item.sankalpTitle].some(value => String(value || "").toLowerCase().includes(term))) : [...ledger.transactions];
    return rows.sort((a, b) => yogdaanSort === "name" ? a.memberName.localeCompare(b.memberName) : yogdaanSort === "amount" ? b.amountRupees - a.amountRupees : new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime());
  }, [ledger.transactions, yogdaanSearch, yogdaanSort]);
  const filteredCertificates = useMemo(() => {
    const term = certificateSearch.trim().toLowerCase();
    const rows = term ? certificateRegister.certificates.filter(item => [item.certificateNumber, item.name, item.email, item.flowerName, item.flowerBotanical, item.memberNumber, item.memberName].some(value => String(value || "").toLowerCase().includes(term))) : [...certificateRegister.certificates];
    return rows.sort((a, b) => certificateSort === "name" ? a.name.localeCompare(b.name) : certificateSort === "number" ? b.offeringNumber - a.offeringNumber : new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime());
  }, [certificateRegister.certificates, certificateSearch, certificateSort]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("login"); setError("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const result = await adminApi<{ administrator: Administrator }>("/auth/login", { method: "POST", body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      setAdministrator(result.administrator); await loadAdministration(); form.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Administrator sign-in failed."); }
    finally { setBusy(""); setChecking(false); }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("password-reset-request"); setError(""); setAuthNotice("");
    const form = event.currentTarget; const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    try {
      const result = await adminApi<{ message: string }>("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
      setResetEmail(email); setAuthMode("complete-reset"); setAuthNotice(result.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The password reset code could not be sent."); }
    finally { setBusy(""); setChecking(false); }
  }

  async function completePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("password-reset-complete"); setError(""); setAuthNotice("");
    const form = event.currentTarget; const data = new FormData(form);
    const email = String(data.get("email") || resetEmail).trim();
    try {
      const result = await adminApi<{ message: string }>("/auth/password-reset/complete", { method: "POST", body: JSON.stringify({ email, code: data.get("code"), password: data.get("password") }) });
      setResetEmail(email); setAuthMode("login"); setAuthNotice(result.message); form.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The administrator password could not be reset."); }
    finally { setBusy(""); setChecking(false); }
  }

  async function logout() {
    await adminApi("/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    setAdministrator(null); setMembers([]); setPosts([]); setNotice("");
  }

  async function changeAccess(member: AdminMember, action: string) {
    if (action === accessValue(member)) return;
    const description = action === "administrator" ? `Make ${member.fullName} an administrator?` : `${action === "disabled" ? "Disable" : "Enable"} membership access for ${member.fullName}?`;
    if (!window.confirm(description)) return;
    setBusy(`member-${member.id}`); setError("");
    try {
      const result = await adminApi<{ membershipStatus: "enabled" | "disabled"; role: string; message: string }>(`/admin/members/${member.id}/access`, { method: "PATCH", body: JSON.stringify({ action }) });
      setMembers(current => current.map(item => item.id === member.id ? { ...item, membershipStatus: result.membershipStatus, role: result.role } : item));
      setNotice(result.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Member access could not be changed."); }
    finally { setBusy(""); }
  }

  async function changePostVisibility(post: SanghaPost) {
    const hide = post.status !== "hidden";
    if (hide && !window.confirm(`Hide this ${post.type.toLowerCase()} by ${post.author} from Sangha?`)) return;
    setBusy(`post-${post.id}`); setError("");
    try {
      const result = await adminApi<{ status: "published" | "hidden"; message: string }>(`/admin/sangha/posts/${post.id}/visibility`, { method: "PATCH", body: JSON.stringify({ hidden: hide }) });
      setPosts(current => current.map(item => item.id === post.id ? { ...item, status: result.status } : item)); setNotice(result.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Post visibility could not be changed."); }
    finally { setBusy(""); }
  }

  function beginInquiryReview(item: NextHumanInquiry, status: string) {
    setInquiryReview({ item, status, internalNote: item.internalNote || "" });
    setError("");
  }

  async function reviewNextHumanInquiry(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!inquiryReview) return;
    const { item, status, internalNote } = inquiryReview;
    setBusy(`next-human-${item.id}`); setError(""); setNotice("");
    try {
      const result = await adminApi<{ message: string }>(`/admin/next-human-inquiries/${item.id}`, { method: "PATCH", body: JSON.stringify({ status, internalNote }) });
      await loadAdministration();
      setNotice(result.message || "NEXT HUMAN inquiry updated.");
      setInquiryReview(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The inquiry review could not be saved."); }
    finally { setBusy(""); }
  }

  async function markNotificationsRead() {
    const result = await adminApi<{ message: string }>("/admin/notifications", { method: "POST", body: "{}" });
    setNotifications(current => ({ ...current, unreadCount: 0 })); setNotice(result.message);
  }

  async function enableAlerts() {
    if (!("Notification" in window)) return setError("This browser does not support notification alerts.");
    const permission = await Notification.requestPermission();
    setAlertsEnabled(permission === "granted");
    setNotice(permission === "granted" ? "New Sangha posts and Yogdaan will alert you while this administration page is open." : "Notification permission was not enabled. Alerts remain visible inside Administration.");
  }

  async function createSankalp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("sankalp-create"); setError("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const result = await adminApi<{ sankalp: Sankalp; message: string }>("/admin/sankalps", { method: "POST", body: JSON.stringify({
        title: data.get("title"), summary: data.get("summary"), purpose: data.get("purpose"), rules: data.get("rules"), type: "service",
        status: data.get("status"), stage: data.get("stage"), acceptsDonations: data.get("acceptsDonations") === "on", acceptsSeva: data.get("acceptsSeva") === "on", budgetRequired: data.get("budgetRequired") === "on",
        tentativeBudgetRupees: data.get("tentativeBudgetRupees"), estimatedBudgetRupees: data.get("estimatedBudgetRupees"), completionPercent: 0, featuredOrder: 0,
      }) });
      setSankalps(current => [result.sankalp, ...current]); form.reset(); setNotice(result.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sankalp could not be saved."); }
    finally { setBusy(""); }
  }

  if (checking) return <main className="admin-loading"><Image src="/society-logo-transparent.png" alt="" width={72} height={72} unoptimized /><p>Opening administration...</p></main>;
  if (!administrator) return <main className="admin-auth">
    <Link href="/" className="admin-brand"><Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={66} height={66} unoptimized /><span>Sri Aurobindo Society<small>Lucknow Centre</small></span></Link>
    <section className="admin-login-card">
      <p>SECURE ADMINISTRATION</p>
      <h1>{authMode === "login" ? "Administrator sign in" : authMode === "request-reset" ? "Reset your password" : "Create a new password"}</h1>
      <span>{authMode === "login" ? "Manage members, moderate Sangha, guide Sankalp and review Community Yogdaan from one protected space." : authMode === "request-reset" ? "Enter the email address of your administrator account. We will send a short-lived verification code before any password is changed." : "Enter the six-digit code sent to your email, then create your new administrator password."}</span>
      {authNotice && <div className="admin-alert success admin-auth-notice" role="status">{authNotice}</div>}
      {authMode === "login" && <form onSubmit={login}>
        <label>Email<input name="email" type="email" required autoComplete="username" defaultValue={resetEmail} /></label>
        <label>Password<input name="password" type="password" required minLength={10} autoComplete="current-password" /></label>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        <button disabled={busy === "login"}>{busy === "login" ? "Signing in..." : "Sign in securely"}</button>
      </form>}
      {authMode === "request-reset" && <form onSubmit={requestPasswordReset}>
        <label>Administrator email<input name="email" type="email" required autoComplete="email" defaultValue={resetEmail} /></label>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        <button disabled={busy === "password-reset-request"}>{busy === "password-reset-request" ? "Sending verification code..." : "Send verification code"}</button>
      </form>}
      {authMode === "complete-reset" && <form onSubmit={completePasswordReset}>
        <label>Administrator email<input name="email" type="email" required autoComplete="email" defaultValue={resetEmail} /></label>
        <label>Six-digit verification code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" /></label>
        <label>New password<input name="password" type="password" required minLength={10} autoComplete="new-password" /></label>
        <small className="admin-password-rule">Use at least 10 characters, including one letter and one number.</small>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        <button disabled={busy === "password-reset-complete"}>{busy === "password-reset-complete" ? "Resetting password..." : "Reset password"}</button>
      </form>}
      <div className="admin-auth-actions">
        {authMode === "login" ? <button type="button" onClick={() => { setAuthMode("request-reset"); setError(""); setAuthNotice(""); }}>Forgot password?</button> : <button type="button" onClick={() => { setAuthMode("login"); setError(""); setAuthNotice(""); }}>Back to sign in</button>}
        <Link href="/member">Member Login</Link>
      </div>
    </section>
  </main>;

  const navigation: { id: AdminView; label: string; badge: number | string }[] = [
    { id: "overview", label: "Dashboard", badge: "D" },
    { id: "control_panel", label: "Control Panel", badge: "C" },
    { id: "members", label: "Members", badge: members.length },
    { id: "certificates", label: "Pushpanjali Records", badge: certificateRegister.summary.recordedCertificates },
    { id: "yogdaan", label: "Community Yogdaan", badge: ledger.summary.transactionCount }, { id: "sangha", label: "Sangha moderation", badge: posts.filter(item => item.status === "published").length },
    { id: "sankalps", label: "Sankalp Studio", badge: sankalps.length },
    { id: "campaigns", label: "Focus Campaigns", badge: "F" },
    { id: "notifications", label: "Notifications", badge: notifications.unreadCount },
  ];

  return <main className="admin-shell">
    <header className="admin-header"><Link href="/" className="admin-brand"><Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={52} height={52} unoptimized /><span>Sri Aurobindo Society<small>Lucknow - Administration</small></span></Link><div><Link className="admin-darshan-link" href="/member">Darshan & Member Space</Link><span>{administrator.fullName}</span><button onClick={logout}>Sign out</button></div></header>
    <div className="admin-body"><aside><p>MASTER ADMINISTRATION</p>{navigation.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.badge}</span>{item.label}</button>)}</aside>
      <section className="admin-content">
        {notice && <div className="admin-alert success" role="status">{notice}<button aria-label="Close message" onClick={() => setNotice("")}>&times;</button></div>}
        {error && <div className="admin-alert error" role="alert">{error}<button aria-label="Close error" onClick={() => setError("")}>&times;</button></div>}
        {inquiryReview && <div className="admin-review-overlay" role="presentation"><section className="admin-review-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-inquiry-review-title"><header><div><p>NEXT HUMAN INQUIRY</p><h2 id="admin-inquiry-review-title">{actionLabel(inquiryReview.status)} {inquiryReview.item.fullName}</h2><span>{inquiryReview.item.reference}</span></div><button type="button" aria-label="Close inquiry review" onClick={() => setInquiryReview(null)}>×</button></header><form onSubmit={reviewNextHumanInquiry}><label>Internal note <small>Optional · visible only to administrators</small><textarea rows={4} value={inquiryReview.internalNote} onChange={event => setInquiryReview(current => current ? { ...current, internalNote: event.target.value } : current)} /></label><footer><button type="button" className="admin-secondary" onClick={() => setInquiryReview(null)}>Cancel</button><button type="submit" className="admin-primary" disabled={busy === `next-human-${inquiryReview.item.id}`}>{busy === `next-human-${inquiryReview.item.id}` ? "Saving…" : `Confirm ${actionLabel(inquiryReview.status)}`}</button></footer></form></section></div>}

        {view === "overview" && <><div className="admin-title"><div><p>ADMINISTRATOR HOME</p><h1>Centre at a glance</h1><span>Member access, community activity, Sankalp and verified Yogdaan—quietly organised in one place.</span></div></div>
          <section className="admin-hero"><div><p>TOTAL COMMUNITY YOGDAAN</p><strong>{currency.format(overview.metrics.totalYogdaanRupees)}</strong><span>from {overview.metrics.contributingMembers} contributing members</span></div><div className="admin-hero-orb" aria-hidden="true" /></section>
          <div className="admin-stat-grid"><button onClick={() => setView("control_panel")}><strong>{overview.metrics.newNextHumanInquiries}</strong><span>New NEXT HUMAN inquiries</span></button><button onClick={() => setView("members")}><strong>{overview.metrics.activeMembers}</strong><span>Active members</span></button><button onClick={() => setView("certificates")}><strong>{overview.metrics.certificates}</strong><span>Recorded certificates</span></button><button onClick={() => setView("sangha")}><strong>{overview.metrics.visiblePosts}</strong><span>Visible Sangha posts</span></button><button onClick={() => setView("sankalps")}><strong>{overview.metrics.liveSankalps}</strong><span>Live Sankalp</span></button><button onClick={() => setView("notifications")}><strong>{notifications.unreadCount}</strong><span>Unread alerts</span></button></div>
          <section className="admin-panel"><div className="admin-panel-heading"><div><p>RECENT ACTIVITY</p><h2>What has moved</h2></div><button className="admin-secondary" onClick={() => void loadAdministration()}>Refresh dashboard</button></div><div className="admin-activity-list">{overview.recentActivity.map(item => <article key={item.id}><i /><div><strong>{actionLabel(item.action)}</strong><span>{item.actorName || "System"} - {readableDate(item.createdAt)}</span></div></article>)}</div></section>
        </>}

        {view === "control_panel" && <AdminControlPanel nextHuman2026={<NextHumanEventStudio foundingCircle={!nextHumanInquiries.length ? <section className="admin-panel admin-nh-empty"><h2>No Founding Circle inquiry yet</h2><p>New foundation-team submissions from the public NEXT HUMAN page will appear here automatically.</p></section> : <div className="admin-nh-list">{nextHumanInquiries.map(item => <article key={item.id}>
          <header><div><span className={`admin-nh-status ${item.status}`}>{actionLabel(item.status)}</span><small>{item.reference} · {readableDate(item.latestSubmittedAt || item.createdAt)}</small><h2>{item.fullName}</h2><p>{[actionLabel(item.ageRange), item.city, item.professionOrInstitution].filter(Boolean).join(" · ")}</p></div><aside><a href={`tel:+91${item.mobile}`}>{item.mobile}</a><a href={`mailto:${item.email}`}>{item.email}</a><a href={`https://wa.me/91${item.mobile}?text=${encodeURIComponent(`Namaste ${item.fullName}, we are writing from Sri Aurobindo Society, Lucknow regarding your NEXT HUMAN inquiry ${item.reference}.`)}`} target="_blank" rel="noreferrer">Contact on WhatsApp</a><strong>{actionLabel(item.source || "website")}</strong></aside></header>
          <div className="admin-nh-grid"><section><h3>What called them</h3><p>{item.filmResponse}</p><p>{item.whyNextHuman}</p></section><section><h3>The next quality</h3><blockquote>{item.nextQuality}</blockquote><small>{(item.explorationInterests || []).map(actionLabel).join(" · ")}</small></section><section><h3>Contribution</h3><strong>{actionLabel(item.primaryContributionArea)}</strong><p>{item.relevantContribution}</p>{item.exampleOfWork && <small>{item.exampleOfWork}</small>}</section><section><h3>Practical fit</h3><dl><div><dt>Areas</dt><dd>{(item.contributionAreas || []).map(actionLabel).join(", ")}</dd></div><div><dt>Mode</dt><dd>{(item.contributionLocation || []).map(actionLabel).join(", ")}</dd></div><div><dt>Time</dt><dd>{actionLabel(item.weeklyAvailability)} · {(item.usualAvailability || []).map(actionLabel).join(", ")}</dd></div><div><dt>Orientation</dt><dd>{actionLabel(item.orientationPreference)}</dd></div></dl></section></div>
          {item.organisationConnectionDetails && <p className="admin-nh-context"><strong>Network:</strong> {item.organisationConnectionDetails}</p>}{item.additionalContext && <p className="admin-nh-context"><strong>Additional context:</strong> {item.additionalContext}</p>}{item.internalNote && <p className="admin-nh-note"><strong>Internal note:</strong> {item.internalNote}</p>}
          <div className="admin-nh-actions"><button className="admin-primary" disabled={busy === `next-human-${item.id}`} onClick={() => beginInquiryReview(item, "orientation_invited")}>Invite to orientation</button><button className="admin-secondary" disabled={busy === `next-human-${item.id}`} onClick={() => beginInquiryReview(item, "foundation_circle")}>Add to Founding Circle</button><button className="admin-secondary" disabled={busy === `next-human-${item.id}`} onClick={() => beginInquiryReview(item, "reviewing")}>Mark reviewing</button><button className="admin-secondary" disabled={busy === `next-human-${item.id}`} onClick={() => beginInquiryReview(item, "hold")}>Hold</button><button className="admin-secondary danger" disabled={busy === `next-human-${item.id}`} onClick={() => beginInquiryReview(item, "declined")}>Close</button></div>
        </article>)}</div>} />} />}

        {view === "certificates" && <><div className="admin-title"><div><p>PUSHPANJALI REGISTER</p><h1>Certificate records</h1><span>Every new offering is preserved with the devotee's name, email, certificate number, selected flower and exact generation time in IST.</span></div></div>
          <div className="admin-certificate-stats"><div><small>Recorded certificates</small><strong>{certificateRegister.summary.recordedCertificates}</strong></div><div><small>Unique email addresses</small><strong>{certificateRegister.summary.uniqueDevotees}</strong></div><div><small>Certificates emailed</small><strong>{certificateRegister.summary.emailedCertificates}</strong></div><div><small>Linked member accounts</small><strong>{certificateRegister.summary.linkedMembers}</strong></div></div>
          <form className="admin-certificate-filters" onSubmit={event => { event.preventDefault(); void loadAdministration(undefined, { from: certificateFrom, to: certificateTo }); }}><label>From<input type="date" value={certificateFrom} onChange={event => setCertificateFrom(event.target.value)} /></label><label>To<input type="date" value={certificateTo} onChange={event => setCertificateTo(event.target.value)} /></label><label>Sort<select value={certificateSort} onChange={event => setCertificateSort(event.target.value as typeof certificateSort)}><option value="date">Latest first</option><option value="name">Devotee name</option><option value="number">Certificate number</option></select></label><label className="admin-certificate-search">Search<input value={certificateSearch} onChange={event => setCertificateSearch(event.target.value)} placeholder="Name, email, certificate, flower..." /></label><button>Apply dates</button></form>
          <div className="admin-certificate-register"><div className="admin-certificate-head"><span>Certificate</span><span>Devotee</span><span>Flower offered</span><span>Generated</span><span>Email / membership</span></div>{filteredCertificates.length ? filteredCertificates.map(item => <article key={item.id}><div><strong>{item.certificateNumber}</strong><small>Offering #{item.offeringNumber}</small></div><div><strong>{item.name}</strong><small>{item.email}</small></div><div><strong>{item.flowerName}</strong><small>{item.flowerBotanical}</small></div><span>{readableDate(item.generatedAt)}</span><div><strong className={`admin-email-status ${item.emailStatus}`}>{actionLabel(item.emailStatus)}</strong><small>{item.memberNumber ? `Member ${item.memberNumber}` : "Not linked to a member"}</small></div></article>) : <div className="admin-empty-register"><strong>No records in this date range</strong><span>New Pushpanjali certificates will appear here immediately after generation.</span></div>}</div>
          <p className="admin-ledger-note">Older certificates generated before database recording was enabled can be imported safely from the sent-certificate emails. Duplicate certificate numbers will not be created.</p>
        </>}

        {view === "members" && <><div className="admin-title"><div><p>MEMBER DIRECTORY</p><h1>Members & access</h1><span>Every new account starts enabled. Change access or promote a trusted member to Administrator from the right-hand control.</span></div><label>Search members<input value={search} onChange={event => setSearch(event.target.value)} placeholder="ID, name, email, mobile or city" /></label></div>
          <div className="admin-member-summary"><div><strong>{members.filter(item => item.membershipStatus === "enabled").length}</strong><span>Enabled</span></div><div><strong>{members.filter(item => item.membershipStatus === "disabled").length}</strong><span>Disabled</span></div><div><strong>{members.filter(item => ["administrator", "super_administrator"].includes(item.role)).length}</strong><span>Administrators</span></div></div>
          <div className="admin-member-list">{filteredMembers.map(member => <article key={member.id} className={member.membershipStatus === "disabled" ? "disabled" : ""}><header><div><span className="admin-member-id">{member.memberNumber || "ID pending"}</span><h2>{member.fullName}</h2><p>{member.email || "No email"} - {member.mobile || "No mobile"}</p></div><div className="admin-member-access"><span>{member.role === "super_administrator" ? "Master administrator" : member.membershipStatus === "disabled" ? "Disabled" : member.role === "administrator" ? "Administrator" : "Enabled"}</span>{member.canManageAccess && <select aria-label={`Access for ${member.fullName}`} disabled={busy === `member-${member.id}`} value={accessValue(member)} onChange={event => void changeAccess(member, event.target.value)}><option value="enabled">Membership Enabled</option><option value="disabled">Membership Disabled</option><option value="administrator">Make Administrator</option></select>}</div></header>
            <div className="admin-member-facts"><span><small>Joined</small>{readableDate(member.joinedAt)}</span><span><small>Certificate</small>{member.certificateCreated ? member.parichay.pushpanjaliCertificateNumber : "Not created"}</span><span><small>Total Yogdaan</small>{currency.format(member.yogdaan.totalAmountRupees)}</span><span><small>Last Yogdaan</small>{readableDate(member.yogdaan.lastContributedAt)}</span></div>
            <details><summary>View complete Parichay and Yogdaan</summary><div className="admin-member-details"><section><h3>Parichay</h3><dl><div><dt>Email</dt><dd>{member.email || "Not added"}</dd></div><div><dt>Mobile</dt><dd>{member.mobile || "Not added"}</dd></div><div><dt>City</dt><dd>{member.parichay.city || "Not added"}</dd></div><div><dt>Interests</dt><dd>{member.parichay.interests || "Not added"}</dd></div><div><dt>Skills</dt><dd>{member.parichay.skills || "Not added"}</dd></div><div><dt>Preferred Seva</dt><dd>{member.parichay.sevaPreference || "Not added"}</dd></div></dl></section><section><div className="admin-yogdaan-heading"><h3>Yogdaan by Sankalp</h3><strong>{currency.format(member.yogdaan.totalAmountRupees)}</strong></div><div className="admin-yogdaan-list">{member.yogdaan.sankalps.length ? member.yogdaan.sankalps.map(item => <div key={`${member.id}-${item.sankalpId}`}><span><strong>{item.title}</strong><small>{item.contributionCount} offering(s) - {readableDate(item.lastContributedAt)}</small></span><b>{currency.format(item.amountRupees)}</b></div>) : <p>No verified Yogdaan yet.</p>}</div></section></div></details></article>)}</div>
        </>}

        {view === "yogdaan" && <><div className="admin-title"><div><p>COMMUNITY YOGDAAN</p><h1>Transparent contribution ledger</h1><span>Verified amounts and provider transaction references are preserved here for reconciliation, disputes and authorised refund handling.</span></div></div>
          <div className="admin-yogdaan-stats"><div><small>Total Yogdaan</small><strong>{currency.format(ledger.summary.totalRupees)}</strong></div><div><small>Contributors</small><strong>{ledger.summary.contributingMembers}</strong></div><div><small>Transactions</small><strong>{ledger.summary.transactionCount}</strong></div><div><small>Average offering</small><strong>{currency.format(ledger.summary.averageRupees)}</strong></div></div>
          <form className="admin-ledger-filters" onSubmit={event => { event.preventDefault(); void loadAdministration({ from: dateFrom, to: dateTo }); }}><label>From<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} /></label><label>To<input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} /></label><label>Sort<select value={yogdaanSort} onChange={event => setYogdaanSort(event.target.value as typeof yogdaanSort)}><option value="date">Latest first</option><option value="name">Member name</option><option value="amount">Highest amount</option></select></label><label className="admin-ledger-search">Search<input value={yogdaanSearch} onChange={event => setYogdaanSearch(event.target.value)} placeholder="Name, member ID, payment ID..." /></label><button>Apply dates</button></form>
          <div className="admin-ledger"><div className="admin-ledger-head"><span>Member</span><span>Sankalp</span><span>Received</span><span>Amount</span><span>Transaction reference</span></div>{filteredTransactions.map(item => <article key={item.id}><div><strong>{item.memberName}</strong><small>{item.memberNumber || "Unlinked"} - {item.email || item.mobile || "No contact"}</small></div><div><strong>{item.sankalpTitle}</strong><small>{item.provider} - {item.status}</small></div><span>{readableDate(item.receivedAt)}</span><b>{currency.format(item.amountRupees)}</b><code>{item.transactionId}</code></article>)}</div>
          <p className="admin-ledger-note">Refunds must still be initiated in the authorised payment-provider dashboard. This ledger keeps the exact reference needed to locate the transaction safely.</p>
        </>}

        {view === "sangha" && <><div className="admin-title"><div><p>SANGHA MODERATION</p><h1>Review community posts</h1><span>Newest posts appear first. Hide content immediately without deleting the original moderation record.</span></div><label>Visibility<select value={postFilter} onChange={event => setPostFilter(event.target.value as typeof postFilter)}><option value="all">All posts</option><option value="published">Visible posts</option><option value="hidden">Hidden posts</option></select></label></div>
          <div className="admin-post-list">{filteredPosts.map(post => <article key={post.id} className={post.status === "hidden" ? "hidden" : ""}><header><div><strong>{post.author}</strong><small>{post.authorRole} - {post.type} - {readableDate(post.createdAt)}</small></div><span>{post.status}</span></header>{post.media && <p className="admin-media-label">{post.media.kind === "video" ? "Video" : "Photo"} attached - {post.media.name}</p>}<p className="admin-post-text">{post.text}</p><button disabled={busy === `post-${post.id}`} onClick={() => changePostVisibility(post)}>{busy === `post-${post.id}` ? "Updating..." : post.status === "hidden" ? "Restore to Sangha" : "Hide from Sangha"}</button></article>)}</div>
        </>}

        {view === "sankalps" && <><div className="admin-title"><div><p>SANKALP STUDIO</p><h1>Create, draft & guide Sankalp</h1><span>Prepare privately as a draft, publish when ready, and see every Sankalp with its present stage.</span></div></div>
          <div className="admin-sankalp-layout"><form className="admin-sankalp-form" onSubmit={createSankalp}><h2>New Sankalp</h2><label>Title<input required name="title" minLength={3} /></label><label>Short summary<textarea required name="summary" rows={2} /></label><label>Purpose<textarea required name="purpose" rows={4} minLength={10} /></label><label>Rules / guidance<textarea name="rules" rows={3} /></label><div className="admin-form-row"><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option></select></label><label>Stage<select name="stage" defaultValue="concept"><option value="concept">Concept</option><option value="research">Research</option><option value="estimate_pending">Estimate pending</option><option value="estimate_received">Estimate received</option><option value="fundraising">Fundraising</option><option value="ready_for_implementation">Ready for implementation</option><option value="implementation">Implementation</option><option value="completed">Completed</option></select></label></div><div className="admin-form-row"><label>Tentative budget<input name="tentativeBudgetRupees" type="number" min="0" /></label><label>Estimated budget<input name="estimatedBudgetRupees" type="number" min="0" /></label></div><div className="admin-checks"><label><input type="checkbox" name="acceptsDonations" /> Accept Yogdaan</label><label><input type="checkbox" name="acceptsSeva" /> Accept Seva</label><label><input type="checkbox" name="budgetRequired" defaultChecked /> Budget required</label></div><button disabled={busy === "sankalp-create"}>{busy === "sankalp-create" ? "Saving..." : "Save Sankalp"}</button></form>
            <div className="admin-sankalp-list"><div className="admin-panel-heading"><div><p>ALL SANKALP</p><h2>{sankalps.length} workspaces</h2></div></div>{sankalps.map(item => <article key={item.id}><div><span>{actionLabel(item.status)} - {actionLabel(item.stage)}</span><h3>{item.title}</h3><p>{item.summary || item.purpose}</p></div><dl><div><dt>Progress</dt><dd>{item.completionPercent || 0}%</dd></div><div><dt>Contributors</dt><dd>{item.donorCount || 0}</dd></div><div><dt>Seva</dt><dd>{item.volunteerCount || 0}</dd></div></dl></article>)}</div></div>
        </>}

        {view === "campaigns" && <FocusCampaignsPanel />}

        {view === "notifications" && <><div className="admin-title"><div><p>ADMINISTRATOR ALERTS</p><h1>Notifications</h1><span>NEXT HUMAN inquiries, Sangha posts, verified Yogdaan, certificates and member accounts are recorded here.</span></div><div className="admin-notification-actions"><button className="admin-secondary" onClick={enableAlerts}>{alertsEnabled ? "Phone alerts enabled" : "Enable phone alerts"}</button><button className="admin-primary" onClick={markNotificationsRead}>Mark all reviewed</button></div></div>
          <div className="admin-notification-list">{notifications.notifications.map((item, index) => <button key={item.id} className={index < notifications.unreadCount ? "unread" : ""} onClick={() => setView(item.type === "next_human" ? "control_panel" : item.type === "sangha" ? "sangha" : item.type === "yogdaan" ? "yogdaan" : item.type === "certificate" ? "certificates" : "members")}><span className={`admin-notification-icon ${item.type}`}>{item.type === "next_human" ? "N" : item.type === "sangha" ? "S" : item.type === "yogdaan" ? "Y" : item.type === "certificate" ? "P" : "M"}</span><div><strong>{item.title}</strong><p>{item.message}</p><small>{readableDate(item.createdAt)}</small></div></button>)}</div>
        </>}
      </section>
    </div>
  </main>;
}
