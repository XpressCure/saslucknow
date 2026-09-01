"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RowConfig = { row: string; seats: number; category: string; priceRupees: number; colour: string; enabled: boolean };
type DayConfig = { id: string; dayNumber: number; date: string; title: string; question: string; moments: string[]; bookingOpen: boolean; rows: RowConfig[] };
type EventConfig = {
  eventKey: string; title: string; openingTitle: string; strapline: string; time: string; city: string; venue: string; leadExplorer: string;
  totalCapacityPerDay: number; pathwayCapacityPerDay: { challenge: number; fellowship: number }; maxCompanionsPerDay: number; seatHoldMinutes: number; applicationsOpen: boolean;
  media: Record<string, null | { id: string; kind: string; name: string; url: string }>;
  pathways: { challenge: { title: string; ageLabel: string; questions: string[] }; fellowship: { title: string; ageLabel: string; questions: string[] } };
  days: DayConfig[];
};
type EventStats = { applications: Record<string, number>; daySeats: Record<string, number>; confirmedDayBookings: number };
type Application = { id: string; memberNumber: string; fullName: string; email: string; mobile: string; dateOfBirth: string; pathway: "challenge" | "fellowship"; questions: string[]; answers: string[]; submissionReference: string; submittedByRole: "administrator" | "member"; status: string; score: number; internalNote: string; submittedAt: string | null };
type Booking = { id: string; memberNumber: string; memberName: string; pathway: string; dayId: string; dayNumber: number; dayTitle: string; dayDate: string; seats: { id: string }[]; companions: string[]; amountRupees: number; status: string; providerPaymentId: string; passNumber: string; confirmedAt: string | null; createdAt: string };
type ChallengeAttempt = { id: string; attemptNumber: number; level: number; realm: string; title: string; questions: { prompt: string; selectedAnswer: string; correctAnswer: string; correct: boolean; note: string }[]; score: number; passed: boolean; completedAt: string | null };
type ChallengeMember = { id: string; memberNumber: string; memberName: string; email: string; mobile: string; currentLevel: number; highestCompletedLevel: number; completedLevels: number[]; certificateLevels: number[]; totalAttempts: number; passedAttempts: number; certificatesEarned: number; certificateDownloadCount: number; lastActivityAt: string | null; attempts: ChallengeAttempt[] };
type ChallengeSummary = { participatingMembers: number; savedAttempts: number; certificatesEarned: number };
type Tab = "command" | "programme" | "questions" | "memberChallenges" | "applications" | "seating" | "bookings" | "founding";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

async function eventApi<T>(path = "", options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/participation/admin/next-human-event${path}`, {
    credentials: "same-origin",
    ...options,
    headers: options.body instanceof FormData ? options.headers : options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "The NEXT HUMAN action could not be completed.");
  return result;
}

async function challengeAdminApi<T>(sort = "highest"): Promise<T> {
  const response = await fetch(`/api/participation/admin/next-human-challenge/members?sort=${encodeURIComponent(sort)}`, { credentials: "same-origin" });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Member challenge details could not be loaded.");
  return result;
}

function label(value: string) {
  if (value === "declined") return "Rejected";
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function when(value: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not recorded" : `${dateTime.format(parsed)} IST`;
}

export function NextHumanEventStudio({ foundingCircle }: { foundingCircle?: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("command");
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [stats, setStats] = useState<EventStats>({ applications: {}, daySeats: {}, confirmedDayBookings: 0 });
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [challengeMembers, setChallengeMembers] = useState<ChallengeMember[]>([]);
  const [challengeSummary, setChallengeSummary] = useState<ChallengeSummary>({ participatingMembers: 0, savedAttempts: 0, certificatesEarned: 0 });
  const [challengeSort, setChallengeSort] = useState("highest");
  const [payments, setPayments] = useState({ enabled: false, testMode: false });
  const [selectedDayId, setSelectedDayId] = useState("day-1");
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [bookingDay, setBookingDay] = useState("all");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [applicationReview, setApplicationReview] = useState<{ application: Application; status: string; internalNote: string; score: string } | null>(null);

  async function load() {
    setError("");
    const [eventResult, applicationResult, bookingResult, challengeResult] = await Promise.all([
      eventApi<{ event: EventConfig; stats: EventStats; payments: { enabled: boolean; testMode: boolean } }>(),
      eventApi<{ applications: Application[] }>("/applications"),
      eventApi<{ bookings: Booking[] }>("/bookings"),
      challengeAdminApi<{ members: ChallengeMember[]; summary: ChallengeSummary }>(challengeSort),
    ]);
    setEvent(eventResult.event); setStats(eventResult.stats); setPayments(eventResult.payments); setApplications(applicationResult.applications); setBookings(bookingResult.bookings); setChallengeMembers(challengeResult.members); setChallengeSummary(challengeResult.summary);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch(caught => setError(caught instanceof Error ? caught.message : "NEXT HUMAN could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedDay = event?.days.find(day => day.id === selectedDayId) || event?.days[0];
  const visibleApplications = useMemo(() => applications.filter(item => applicationFilter === "all" || item.status === applicationFilter), [applications, applicationFilter]);
  const visibleBookings = useMemo(() => bookings.filter(item => bookingDay === "all" || item.dayId === bookingDay), [bookings, bookingDay]);
  const confirmedRevenue = bookings.filter(item => item.status === "confirmed").reduce((sum, item) => sum + item.amountRupees, 0);

  async function saveGeneral(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!event) return;
    setBusy("general"); setError("");
    const form = new FormData(eventSubmit.currentTarget);
    try {
      const result = await eventApi<{ event: EventConfig; message: string }>("", { method: "PATCH", body: JSON.stringify({
        title: form.get("title"), openingTitle: form.get("openingTitle"), strapline: form.get("strapline"), time: form.get("time"), city: form.get("city"), venue: form.get("venue"), leadExplorer: form.get("leadExplorer"),
        totalCapacityPerDay: form.get("totalCapacityPerDay"), seatHoldMinutes: form.get("seatHoldMinutes"), maxCompanionsPerDay: 2, applicationsOpen: form.get("applicationsOpen") === "on",
        pathwayCapacityPerDay: { challenge: form.get("challengeCapacity"), fellowship: form.get("fellowshipCapacity") },
      }) });
      setEvent(result.event); setMessage(result.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Settings could not be saved."); }
    finally { setBusy(""); }
  }

  async function saveQuestions(pathway: "challenge" | "fellowship") {
    if (!event) return;
    setBusy(`questions-${pathway}`); setError("");
    try {
      const result = await eventApi<{ event: EventConfig; message: string }>("", { method: "PATCH", body: JSON.stringify({ pathways: { [pathway]: { questions: event.pathways[pathway].questions } } }) });
      setEvent(result.event); setMessage(`Five ${event.pathways[pathway].title} questions saved.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Questions could not be saved."); }
    finally { setBusy(""); }
  }

  async function saveDay() {
    if (!event || !selectedDay) return;
    setBusy("day"); setError("");
    try {
      const result = await eventApi<{ day: DayConfig; message: string }>(`/days/${selectedDay.id}`, { method: "PATCH", body: JSON.stringify(selectedDay) });
      setEvent(current => current ? { ...current, days: current.days.map(day => day.id === result.day.id ? result.day : day) } : current);
      setMessage(result.message);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Day pricing could not be saved."); }
    finally { setBusy(""); }
  }

  function beginDecision(application: Application, status: string) {
    setApplicationReview({ application, status, internalNote: application.internalNote || "", score: String(application.score || 0) });
    setError("");
  }

  async function decide(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!applicationReview) return;
    const { application, status, internalNote, score } = applicationReview;
    const scoreValue = Number(score);
    if (!Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      setError("Review score must be between 0 and 100.");
      return;
    }
    setBusy(application.id); setError("");
    try {
      const result = await eventApi<{ application: Application; message: string }>(`/applications/${application.id}`, { method: "PATCH", body: JSON.stringify({ status, internalNote, score: scoreValue }) });
      setApplications(current => current.map(item => item.id === application.id ? result.application : item)); setMessage(result.message); setApplicationReview(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Application decision could not be saved."); }
    finally { setBusy(""); }
  }

  async function uploadMedia(slot: string, file?: File) {
    if (!file) return;
    setBusy(`media-${slot}`); setError("");
    const form = new FormData(); form.set("slot", slot); form.set("media", file);
    try { const result = await eventApi<{ message: string }>("/media", { method: "POST", body: form }); setMessage(result.message); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Media could not be uploaded."); }
    finally { setBusy(""); }
  }

  function updateDayRow(rowLetter: string, patch: Partial<RowConfig>) {
    if (!event || !selectedDay) return;
    setEvent({ ...event, days: event.days.map(day => day.id === selectedDay.id ? { ...day, rows: day.rows.map(row => row.row === rowLetter ? { ...row, ...patch } : row) } : day) });
  }

  if (!event) return <section className="nh-admin-loading"><div className="nh-admin-orb" /><strong>Opening NEXT HUMAN Command Centre…</strong>{error && <span>{error}</span>}</section>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "command", label: "Command Centre" }, { id: "programme", label: "7 Days · 21 Moments" }, { id: "questions", label: "Challenge & Fellowship" },
    { id: "memberChallenges", label: "Member Challenge Progress" }, { id: "applications", label: "Applications" }, { id: "seating", label: "Daily Seats & Prices" }, { id: "bookings", label: "Day Bookings" }, { id: "founding", label: "Founding Circle" },
  ];

  return <div className="nh-admin">
    <section className="nh-admin-hero"><div><p>NEXT HUMAN · EVENT OPERATIONS</p><h1>{event.openingTitle}</h1><span>Control seven independently bookable days, two selection pathways, 500 seats per day and verified passes from one place.</span></div><div className="nh-admin-hero-number"><b>7</b><small>DAYS</small><b>21</b><small>MOMENTS</small></div></section>
    <nav className="nh-admin-tabs" aria-label="NEXT HUMAN administration sections">{tabs.map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {message && <div className="nh-admin-message success">{message}<button onClick={() => setMessage("")} aria-label="Close">×</button></div>}
    {error && <div className="nh-admin-message error">{error}<button onClick={() => setError("")} aria-label="Close">×</button></div>}
    {applicationReview && <div className="nh-admin-review-overlay" role="presentation"><section className="nh-admin-review-dialog" role="dialog" aria-modal="true" aria-labelledby="nh-review-title"><header><div><p>APPLICATION REVIEW</p><h2 id="nh-review-title">{label(applicationReview.status)} {applicationReview.application.fullName}</h2><span>{applicationReview.application.submissionReference || applicationReview.application.id}</span></div><button type="button" onClick={() => setApplicationReview(null)} aria-label="Close application review">×</button></header><form onSubmit={decide}><label>Internal review note<textarea rows={4} value={applicationReview.internalNote} onChange={change => setApplicationReview(current => current ? { ...current, internalNote: change.target.value } : current)} placeholder="Optional note visible only to administrators" /></label><label>Review score out of 100<input type="number" min="0" max="100" required value={applicationReview.score} onChange={change => setApplicationReview(current => current ? { ...current, score: change.target.value } : current)} /></label><footer><button type="button" className="cancel" onClick={() => setApplicationReview(null)}>Cancel</button><button type="submit" className={applicationReview.status === "approved" ? "approve" : "decline"} disabled={busy === applicationReview.application.id}>{busy === applicationReview.application.id ? "Saving…" : `Confirm ${label(applicationReview.status)}`}</button></footer></form></section></div>}

    {tab === "command" && <>
      <div className="nh-admin-stats"><article><small>Submitted</small><strong>{(stats.applications["challenge:submitted"] || 0) + (stats.applications["fellowship:submitted"] || 0)}</strong><span>awaiting review</span></article><article><small>Approved</small><strong>{(stats.applications["challenge:approved"] || 0) + (stats.applications["fellowship:approved"] || 0)}</strong><span>may book open days</span></article><article><small>Confirmed day visits</small><strong>{stats.confirmedDayBookings}</strong><span>one payment per day</span></article><article><small>Booking revenue</small><strong>{currency.format(confirmedRevenue)}</strong><span>{payments.enabled ? payments.testMode ? "Razorpay test mode" : "Razorpay live" : "gateway configuration pending"}</span></article></div>
      <form className="nh-admin-form" onSubmit={saveGeneral}><header><div><p>EVENT FOUNDATION</p><h2>Core settings</h2></div><label className="nh-admin-switch"><input name="applicationsOpen" type="checkbox" defaultChecked={event.applicationsOpen} /><span />Applications open</label></header>
        <div className="nh-admin-form-grid"><label>Event name<input name="title" defaultValue={event.title} /></label><label>Opening section<input name="openingTitle" defaultValue={event.openingTitle} /></label><label className="wide">Strapline<input name="strapline" defaultValue={event.strapline} /></label><label>Daily time<input name="time" defaultValue={event.time} /></label><label>City<input name="city" defaultValue={event.city} /></label><label>Venue<input name="venue" defaultValue={event.venue} /></label><label>Lead explorer<input name="leadExplorer" defaultValue={event.leadExplorer} /></label><label>Seats per day<input name="totalCapacityPerDay" type="number" min="1" defaultValue={event.totalCapacityPerDay} /></label><label>Challenge seats/day<input name="challengeCapacity" type="number" min="1" defaultValue={event.pathwayCapacityPerDay.challenge} /></label><label>Fellowship seats/day<input name="fellowshipCapacity" type="number" min="1" defaultValue={event.pathwayCapacityPerDay.fellowship} /></label><label>Seat hold (minutes)<input name="seatHoldMinutes" type="number" min="2" max="30" defaultValue={event.seatHoldMinutes} /></label></div>
        <footer><span>Companions are fixed at a maximum of two per participant, per day.</span><button disabled={busy === "general"}>{busy === "general" ? "Saving…" : "Save event settings"}</button></footer>
      </form>
    </>}

    {tab === "programme" && <>
      <section className="nh-admin-media"><header><p>EVENT VISUALS</p><h2>Image & video library</h2><span>The auditorium image can be added later without changing the booking logic.</span></header><div>{[["hero", "Hero image"], ["introVideo", "Introduction video"], ["auditorium", "Auditorium image"]].map(([slot, title]) => <label key={slot}><b>{title}</b><span>{event.media[slot]?.name || "No file added"}</span><input type="file" accept={slot === "introVideo" ? "video/*" : "image/*"} onChange={input => void uploadMedia(slot, input.target.files?.[0])} /><em>{busy === `media-${slot}` ? "Uploading…" : "Choose file"}</em></label>)}</div></section>
      <div className="nh-admin-days">{event.days.map(day => <article key={day.id}><header><span>DAY {day.dayNumber}</span><time>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></header><h2>{day.title}</h2><p>{day.question}</p><ol>{day.moments.map((moment, index) => <li key={moment}><b>{String(index + 1).padStart(2, "0")}</b>{moment}</li>)}</ol><footer className={day.bookingOpen ? "open" : "closed"}>{day.bookingOpen ? "Day booking is open" : "Day booking is closed"}</footer></article>)}</div>
    </>}

    {tab === "questions" && <div className="nh-admin-pathways">{(["challenge", "fellowship"] as const).map(pathway => <section key={pathway}><header><span>{event.pathways[pathway].ageLabel}</span><h2>{event.pathways[pathway].title}</h2><p>Five reflective answers are reviewed before daily seat booking becomes available.</p></header>{event.pathways[pathway].questions.map((question, index) => <label key={`${pathway}-${index}`}><b>Question {index + 1}</b><textarea value={question} onChange={change => setEvent({ ...event, pathways: { ...event.pathways, [pathway]: { ...event.pathways[pathway], questions: event.pathways[pathway].questions.map((item, position) => position === index ? change.target.value : item) } } })} /></label>)}<button onClick={() => void saveQuestions(pathway)} disabled={busy === `questions-${pathway}`}>Save five questions</button></section>)}</div>}

    {tab === "memberChallenges" && <><div className="nh-admin-challenge-summary"><article><small>Participating members</small><strong>{challengeSummary.participatingMembers}</strong></article><article><small>Saved attempts</small><strong>{challengeSummary.savedAttempts}</strong></article><article><small>Certificates earned</small><strong>{challengeSummary.certificatesEarned}</strong></article></div><div className="nh-admin-toolbar"><div><strong>Challenge details for members</strong><span>Account-linked levels, exact questions and selected answers, scores, reflections and certificates.</span></div><select value={challengeSort} onChange={change => { const nextSort = change.target.value; setChallengeSort(nextSort); void challengeAdminApi<{ members: ChallengeMember[]; summary: ChallengeSummary }>(nextSort).then(result => { setChallengeMembers(result.members); setChallengeSummary(result.summary); }).catch(caught => setError(caught instanceof Error ? caught.message : "Challenge details could not be sorted.")); }}><option value="highest">Highest level reached</option><option value="recent">Most recently active</option><option value="name">Member name</option><option value="certificates">Certificates earned</option></select></div><div className="nh-admin-member-challenges">{challengeMembers.length ? challengeMembers.map(member => <article key={member.id}><header><div><span className="nh-status approved">Level {member.highestCompletedLevel || 0}</span><h2>{member.memberName}</h2><p>{member.memberNumber || "Member"} · {member.email || member.mobile || "No contact recorded"}</p><p>Last activity: {when(member.lastActivityAt)}</p></div><aside><b>{member.completedLevels.length}/30</b><span>levels completed</span><small>{member.certificatesEarned} certificates · {member.certificateDownloadCount} downloads</small></aside></header><div className="nh-admin-level-strip">{Array.from({ length: 30 }, (_, index) => index + 1).map(level => <span key={`${member.id}-level-${level}`} className={member.completedLevels.includes(level) ? "done" : level === member.currentLevel ? "current" : ""}>{level}</span>)}</div><div className="nh-admin-attempts">{member.attempts.map(attempt => <details key={attempt.id}><summary><span>Level {attempt.level} · {attempt.realm || attempt.title || "Challenge"}</span><b className={attempt.passed ? "pass" : "fail"}>{attempt.score}/100 · Completed</b><small>Attempt {attempt.attemptNumber} · {when(attempt.completedAt)}</small></summary><ol>{attempt.questions.map((question, index) => <li key={`${attempt.id}-answer-${index}`} className={question.correct ? "correct" : "wrong"}><b>{index + 1}</b><span><small>{question.prompt}</small><strong>Member answered: {question.selectedAnswer}</strong>{!question.correct && <em>Correct answer: {question.correctAnswer}</em>}</span></li>)}</ol></details>)}</div></article>) : <section className="nh-admin-empty"><strong>No saved member challenge attempts yet</strong><span>New level attempts will appear here automatically after a signed-in member answers all ten questions. Earlier local-only attempts cannot be reconstructed.</span></section>}</div></>}

    {tab === "applications" && <><div className="nh-admin-toolbar"><div><strong>Saved applications</strong><span>Every final submission is retained, including applications sent while signed in as an administrator. Open each record below to approve or reject it.</span></div><select value={applicationFilter} onChange={change => setApplicationFilter(change.target.value)}><option value="all">All applications</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="waitlisted">Waitlisted</option><option value="declined">Rejected</option></select></div><div className="nh-admin-applications">{visibleApplications.length ? visibleApplications.map(application => <article key={application.id}><header><div><span className={`nh-status ${application.status}`}>{label(application.status)}</span><h2>{application.fullName}</h2><p>{application.memberNumber || "Member"} · {event.pathways[application.pathway].title} · {when(application.submittedAt)}</p><p>{application.submissionReference || application.id} · submitted via {application.submittedByRole === "administrator" ? "administrator account" : "member account"}</p></div><aside><b>{application.score}/100</b><a href={`mailto:${application.email}`}>{application.email}</a><a href={`tel:${application.mobile}`}>{application.mobile}</a></aside></header><ol>{application.answers.map((answer, index) => <li key={`${application.id}-${index}`}><b>{index + 1}</b><span><small>{application.questions[index] || event.pathways[application.pathway].questions[index]}</small>{answer}</span></li>)}</ol>{application.internalNote && <blockquote>Internal note: {application.internalNote}</blockquote>}<footer><button className="approve" onClick={() => beginDecision(application, "approved")} disabled={busy === application.id}>Approve application</button><button className="decline" onClick={() => beginDecision(application, "declined")} disabled={busy === application.id}>Reject application</button></footer></article>) : <section className="nh-admin-empty"><strong>No applications in this view</strong><span>New Challenge and Fellowship submissions will appear here automatically.</span></section>}</div></>}

    {tab === "seating" && <><div className="nh-admin-toolbar"><div><strong>Independent daily auditorium</strong><span>Every day has its own 500-seat inventory, row prices and booking switch.</span></div><select value={selectedDay?.id} onChange={change => setSelectedDayId(change.target.value)}>{event.days.map(day => <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.title}</option>)}</select></div>{selectedDay && <section className="nh-admin-seat-studio"><header><div><p>DAY {selectedDay.dayNumber} · {selectedDay.date}</p><h2>{selectedDay.title}</h2></div><label className="nh-admin-switch"><input type="checkbox" checked={selectedDay.bookingOpen} onChange={change => setEvent({ ...event, days: event.days.map(day => day.id === selectedDay.id ? { ...day, bookingOpen: change.target.checked } : day) })} /><span />Booking open</label></header><div className="nh-stage">STAGE · 21 MOMENTS</div><div className="nh-seat-pricing">{selectedDay.rows.map(row => <div key={row.row}><b>{row.row}</b><span>{row.seats} seats</span><input aria-label={`Category for Row ${row.row}`} value={row.category} onChange={change => updateDayRow(row.row, { category: change.target.value })} /><label>₹ <input aria-label={`Price for Row ${row.row}`} type="number" min="0" value={row.priceRupees} onChange={change => updateDayRow(row.row, { priceRupees: Number(change.target.value) })} /></label><input aria-label={`Colour for Row ${row.row}`} type="color" value={row.colour} onChange={change => updateDayRow(row.row, { colour: change.target.value })} /></div>)}</div><footer><span><b>{stats.daySeats[`${selectedDay.id}:booked`] || 0}</b> booked · <b>{stats.daySeats[`${selectedDay.id}:held`] || 0}</b> temporarily held</span><button onClick={() => void saveDay()} disabled={busy === "day"}>{busy === "day" ? "Saving…" : `Save Day ${selectedDay.dayNumber} pricing`}</button></footer></section>}</>}

    {tab === "bookings" && <><div className="nh-admin-toolbar"><div><strong>Day-wise booking ledger</strong><span>One row equals one paid or pending day visit—not a seven-day pass.</span></div><select value={bookingDay} onChange={change => setBookingDay(change.target.value)}><option value="all">All seven days</option>{event.days.map(day => <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.title}</option>)}</select></div><div className="nh-admin-bookings"><div className="head"><span>Participant</span><span>Day visit</span><span>Seats / companions</span><span>Payment</span><span>Pass</span></div>{visibleBookings.map(booking => <article key={booking.id}><div><strong>{booking.memberName}</strong><small>{booking.memberNumber || label(booking.pathway)}</small></div><div><strong>Day {booking.dayNumber} · {booking.dayTitle}</strong><small>{booking.dayDate} · {label(booking.status)}</small></div><div><strong>{booking.seats.map(seat => seat.id).join(", ")}</strong><small>{booking.companions.length ? booking.companions.join(", ") : "No companion"}</small></div><div><strong>{currency.format(booking.amountRupees)}</strong><small>{booking.providerPaymentId || "Payment pending"}</small></div><div><strong>{booking.passNumber || "Not issued"}</strong><small>{when(booking.confirmedAt || booking.createdAt)}</small></div></article>)}</div></>}

    {tab === "founding" && (foundingCircle || <section className="nh-admin-empty"><strong>No Founding Circle records</strong><span>The conference operations are independent of the team-building inquiry.</span></section>)}
  </div>;
}
