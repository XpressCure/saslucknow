"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ChallengeQuestion = { id: string; subject: string; prompt: string; choices: string[]; correctAnswer: string; note: string; source: "curated" | "custom" };
type ReleaseStatus = "closed" | "scheduled" | "live";
type ChallengeLevel = { level: number; label: string; opensOn: string; releaseStatus: ReleaseStatus; selectedQuestionIds: string[]; publishedQuestionIds: string[]; revision: number; publishedAt: string | null; pool: ChallengeQuestion[]; publishedQuestions: ChallengeQuestion[] };
type Sponsor = { id: string; name: string; enabled: boolean; levelIds: number[]; logo: null | { name: string; mimeType: string; url: string }; updatedAt: string | null };
type Configuration = { levels: ChallengeLevel[]; sponsors: Sponsor[]; summary: { levels: number; curatedQuestions: number; selectedQuestions: number; activeSponsors: number }; scoring: { questionsPerLevel: number; marksPerCorrectAnswer: number; maximumMarks: number; negativeMarks: number; qualificationRequired: boolean } };
type ChallengeAttempt = { id: string; attemptNumber: number; level: number; questions: { prompt: string; selectedAnswer: string; correctAnswer: string; correct: boolean; note: string }[]; score: number; completedAt: string | null };
type ChallengeMember = { id: string; memberNumber: string; memberName: string; email: string; mobile: string; currentLevel: number; highestCompletedLevel: number; completedLevels: number[]; certificateLevels: number[]; totalAttempts: number; certificatesEarned: number; certificateDownloadCount: number; lastActivityAt: string | null; attempts: ChallengeAttempt[] };
type MemberResult = { members: ChallengeMember[]; summary: { participatingMembers: number; savedAttempts: number; certificatesEarned: number } };
type Tab = "overview" | "levels" | "sponsors" | "participants";

const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

async function challengeApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/participation/admin/next-human-challenge${path}`, {
    credentials: "same-origin",
    ...options,
    headers: options.body instanceof FormData ? options.headers : options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "The Next Human Challenge action could not be completed.");
  return result;
}

function when(value: string | null) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not yet" : `${dateTime.format(parsed)} IST`;
}

export function NextHumanChallengeStudio() {
  const [tab, setTab] = useState<Tab>("overview");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [memberResult, setMemberResult] = useState<MemberResult>({ members: [], summary: { participatingMembers: 0, savedAttempts: 0, certificatesEarned: 0 } });
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [opensOn, setOpensOn] = useState("");
  const [releaseMode, setReleaseMode] = useState<"closed" | "date">("closed");
  const [memberSort, setMemberSort] = useState("highest");
  const [sponsorLevels, setSponsorLevels] = useState<number[]>([1]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (sort = memberSort) => {
    const [config, members] = await Promise.all([
      challengeApi<Configuration>("/configuration"),
      challengeApi<MemberResult>(`/members?sort=${encodeURIComponent(sort)}`),
    ]);
    setConfiguration(config); setMemberResult(members);
    const level = config.levels.find(item => item.level === selectedLevel) || config.levels[0];
    if (level) { setSelectedQuestionIds(level.selectedQuestionIds); setOpensOn(level.releaseStatus === "closed" ? "" : level.opensOn); setReleaseMode(level.releaseStatus === "closed" ? "closed" : "date"); }
  }, [memberSort, selectedLevel]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(caught => setError(caught instanceof Error ? caught.message : "Challenge controls could not load.")); }, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const level = configuration?.levels.find(item => item.level === selectedLevel) || null;
  const selectedQuestions = useMemo(() => selectedQuestionIds.map(id => level?.pool.find(question => question.id === id)).filter(Boolean) as ChallengeQuestion[], [level, selectedQuestionIds]);

  function chooseLevel(nextLevel: number) {
    const next = configuration?.levels.find(item => item.level === nextLevel);
    setSelectedLevel(nextLevel); setSelectedQuestionIds(next?.selectedQuestionIds || []); setOpensOn(next?.releaseStatus === "closed" ? "" : next?.opensOn || ""); setReleaseMode(next?.releaseStatus === "closed" ? "closed" : "date"); setMessage(""); setError("");
  }

  function toggleQuestion(id: string) {
    setSelectedQuestionIds(current => current.includes(id) ? current.filter(item => item !== id) : current.length >= 10 ? current : [...current, id]);
  }

  async function publishLevel() {
    if (selectedQuestionIds.length !== 10) return setError("Select exactly ten questions before publishing this level.");
    setBusy("level"); setError(""); setMessage("");
    try {
      const result = await challengeApi<{ message: string }>(`/levels/${selectedLevel}`, { method: "PATCH", body: JSON.stringify({ selectedQuestionIds, releaseMode, opensOn: releaseMode === "date" ? opensOn : "" }) });
      setMessage(result.message); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "This level could not be published."); }
    finally { setBusy(""); }
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("question"); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const choices = ["optionA", "optionB", "optionC", "optionD"].map(name => String(data.get(name) || "").trim());
    const correctIndex = Number(data.get("correctIndex"));
    try {
      const result = await challengeApi<{ message: string }>("/questions", { method: "POST", body: JSON.stringify({ level: selectedLevel, prompt: data.get("prompt"), choices, correctAnswer: choices[correctIndex], note: data.get("note") }) });
      setMessage(result.message); form.reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The custom question could not be added."); }
    finally { setBusy(""); }
  }

  async function addSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("sponsor"); setError(""); setMessage("");
    const form = event.currentTarget; const source = new FormData(form); const payload = new FormData();
    payload.set("name", String(source.get("name") || "")); payload.set("levelIds", JSON.stringify(sponsorLevels)); payload.set("enabled", "true");
    const logo = source.get("logo"); if (logo instanceof File && logo.size) payload.set("logo", logo);
    try {
      const result = await challengeApi<{ message: string }>("/sponsors", { method: "POST", body: payload });
      setMessage(result.message); form.reset(); setSponsorLevels([1]); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The sponsor could not be added."); }
    finally { setBusy(""); }
  }

  async function toggleSponsor(sponsor: Sponsor) {
    setBusy(`sponsor-${sponsor.id}`); setError("");
    try {
      const result = await challengeApi<{ message: string }>(`/sponsors/${sponsor.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !sponsor.enabled }) });
      setMessage(result.message); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sponsor visibility could not be changed."); }
    finally { setBusy(""); }
  }

  if (!configuration) return <section className="nhc-loading"><i /><strong>Opening the Challenge Control Room…</strong>{error && <span>{error}</span>}</section>;

  const tabs: { id: Tab; label: string }[] = [{ id: "overview", label: "Challenge Dashboard" }, { id: "levels", label: "Levels & Questions" }, { id: "sponsors", label: "Certificate Sponsors" }, { id: "participants", label: "Member Progress" }];
  const releaseLabel = (item: ChallengeLevel) => item.releaseStatus === "closed" ? "Closed" : item.releaseStatus === "live" ? `Live since ${item.opensOn}` : `Opens ${item.opensOn}`;
  return <div className="nhc-admin">
    <section className="nhc-hero"><div><p>THE NEXT HUMAN CHALLENGE</p><h1>Thirty levels. One clear control room.</h1><span>Publish ten mixed-subject questions per level, choose opening dates, monitor every member and place the right sponsors on the right certificates.</span></div><aside><b>30</b><small>LEVELS</small><b>100</b><small>MARKS EACH</small></aside></section>
    <nav className="nhc-tabs" aria-label="Next Human Challenge sections">{tabs.map(item => <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {message && <div className="nhc-message success">{message}<button onClick={() => setMessage("")} aria-label="Close">×</button></div>}
    {error && <div className="nhc-message error">{error}<button onClick={() => setError("")} aria-label="Close">×</button></div>}

    {tab === "overview" && <><div className="nhc-stats"><article><small>Participating members</small><strong>{memberResult.summary.participatingMembers}</strong></article><article><small>Saved attempts</small><strong>{memberResult.summary.savedAttempts}</strong></article><article><small>Certificates created</small><strong>{memberResult.summary.certificatesEarned}</strong></article><article><small>Active sponsors</small><strong>{configuration.summary.activeSponsors}</strong></article></div><section className="nhc-score-card"><div><p>SCORING RULE</p><h2>Every completed level earns its certificate.</h2><span>Ten questions · 10 marks for each correct answer · 0 for a wrong answer · no negative marking · no qualifying benchmark.</span></div><strong>0–100</strong></section><div className="nhc-level-dashboard">{configuration.levels.map(item => <button key={item.level} type="button" className={`release-${item.releaseStatus}`} onClick={() => { chooseLevel(item.level); setTab("levels"); }}><span>LEVEL {String(item.level).padStart(2, "0")}</span><strong>{item.publishedQuestionIds.length}/10</strong><small>{releaseLabel(item)}</small><em>{configuration.sponsors.filter(sponsor => sponsor.enabled && sponsor.levelIds.includes(item.level)).length} sponsor(s)</em></button>)}</div></>}

    {tab === "levels" && level && <div className="nhc-level-workspace"><aside className="nhc-level-picker"><p>CHOOSE LEVEL</p>{configuration.levels.map(item => <button type="button" key={item.level} className={`${item.level === selectedLevel ? "active " : ""}release-${item.releaseStatus}`} onClick={() => chooseLevel(item.level)}><b>{String(item.level).padStart(2, "0")}</b><span>Level {item.level}<small>{releaseLabel(item)}</small></span></button>)}</aside><main><header><div><p>LEVEL {String(level.level).padStart(2, "0")}</p><h2>Select the final ten questions</h2><span>The twenty curated choices mix culture, science, India and consciousness. Every member receives the same published order.</span></div><div className="nhc-release-controls"><label>Member access<select value={releaseMode} onChange={event => setReleaseMode(event.target.value as "closed" | "date")}><option value="closed">Closed</option><option value="date">Release on date</option></select></label><label>Opening date<input type="date" value={opensOn} disabled={releaseMode === "closed"} onChange={event => setOpensOn(event.target.value)} /></label><small>{releaseMode === "closed" ? "Members cannot see or start this level." : "The level opens automatically on this date (India time)."}</small></div></header><div className="nhc-selection-count"><strong>{selectedQuestionIds.length}/10 selected</strong><span>Revision {level.revision} · last published {when(level.publishedAt)}</span></div><div className="nhc-question-pool">{level.pool.map((question, index) => <label key={question.id} className={selectedQuestionIds.includes(question.id) ? "selected" : ""}><input type="checkbox" checked={selectedQuestionIds.includes(question.id)} onChange={() => toggleQuestion(question.id)} /><b>{String(index + 1).padStart(2, "0")}</b><span><small>{question.source === "custom" ? "YOUR QUESTION" : question.subject}</small><strong>{question.prompt}</strong><em>Correct: {question.correctAnswer}</em><i>{question.note}</i></span></label>)}</div><section className="nhc-final-ten"><header><div><p>FINAL PUBLISHED SET</p><h3>The ten questions members will receive</h3></div><button type="button" disabled={busy === "level" || selectedQuestionIds.length !== 10 || (releaseMode === "date" && !opensOn)} onClick={() => void publishLevel()}>{busy === "level" ? "Saving…" : releaseMode === "closed" ? "Save & keep closed" : "Save & schedule release"}</button></header><ol>{selectedQuestions.map(question => <li key={`final-${question.id}`}><b>{question.prompt}</b><span>{question.choices.join(" · ")}</span></li>)}</ol></section><form className="nhc-custom-question" onSubmit={addQuestion}><header><p>ADD YOUR OWN</p><h3>Create a question for Level {selectedLevel}</h3><span>It enters this level’s pool and can be combined with curated questions.</span></header><label>Question<textarea name="prompt" required rows={3} /></label><div>{["A", "B", "C", "D"].map(letter => <label key={letter}>Option {letter}<input name={`option${letter}`} required /></label>)}</div><label>Correct option<select name="correctIndex" defaultValue="0"><option value="0">Option A</option><option value="1">Option B</option><option value="2">Option C</option><option value="3">Option D</option></select></label><label>Why is this correct?<textarea name="note" required rows={3} /></label><button disabled={busy === "question"}>{busy === "question" ? "Adding…" : "Add to Level " + selectedLevel}</button></form></main></div>}

    {tab === "sponsors" && <><section className="nhc-sponsor-map"><header><p>CERTIFICATE SPONSOR MAP</p><h2>See every level at a glance</h2><span>The sponsor strip appears only on certificate levels selected here.</span></header><div>{configuration.levels.map(item => <article key={`sponsor-level-${item.level}`}><b>{String(item.level).padStart(2, "0")}</b><span><strong>Level {item.level}</strong><small>{configuration.sponsors.filter(sponsor => sponsor.enabled && sponsor.levelIds.includes(item.level)).map(sponsor => sponsor.name).join(" · ") || "No sponsor"}</small></span></article>)}</div></section><div className="nhc-sponsor-workspace"><form onSubmit={addSponsor}><header><p>POWERED BY STRIP</p><h2>Add a certificate sponsor</h2><span>Add the brand name, an optional logo, and exactly the levels where it should appear.</span></header><label>Sponsor or brand name<input name="name" required /></label><label>Logo image <small>Optional · JPG, PNG or WebP</small><input name="logo" type="file" accept="image/jpeg,image/png,image/webp" /></label><fieldset><legend>Certificate levels</legend>{configuration.levels.map(item => <label key={`sponsor-choice-${item.level}`}><input type="checkbox" checked={sponsorLevels.includes(item.level)} onChange={() => setSponsorLevels(current => current.includes(item.level) ? current.filter(levelId => levelId !== item.level) : [...current, item.level].sort((a, b) => a - b))} />Level {item.level}</label>)}</fieldset><button disabled={busy === "sponsor" || !sponsorLevels.length}>{busy === "sponsor" ? "Adding sponsor…" : "Add sponsor to certificates"}</button></form><section className="nhc-sponsor-list"><header><p>SPONSOR LIBRARY</p><h2>Show or hide at any time</h2></header>{configuration.sponsors.length ? configuration.sponsors.map(sponsor => <article key={sponsor.id} className={sponsor.enabled ? "" : "hidden"}>{sponsor.logo ? <img src={sponsor.logo.url} alt={`${sponsor.name} logo`} /> : <span>{sponsor.name.slice(0, 2).toUpperCase()}</span>}<div><strong>{sponsor.name}</strong><small>Levels {sponsor.levelIds.join(", ")}</small></div><button type="button" disabled={busy === `sponsor-${sponsor.id}`} onClick={() => void toggleSponsor(sponsor)}>{sponsor.enabled ? "Hide" : "Show"}</button></article>) : <p className="nhc-empty">No certificate sponsors have been added.</p>}</section></div></>}

    {tab === "participants" && <><div className="nhc-toolbar"><div><p>MEMBER PROGRESS</p><h2>Levels, marks and certificates</h2></div><select value={memberSort} onChange={event => { const sort = event.target.value; setMemberSort(sort); void load(sort); }}><option value="highest">Highest level</option><option value="recent">Most recent</option><option value="name">Member name</option><option value="certificates">Certificates</option></select></div><div className="nhc-members">{memberResult.members.length ? memberResult.members.map(member => <article key={member.id}><header><div><span>LEVEL {member.highestCompletedLevel || 0}</span><h3>{member.memberName}</h3><p>{member.memberNumber || "Member"} · {member.email || member.mobile || "No contact"}</p></div><aside><b>{member.certificatesEarned}</b><small>certificates</small></aside></header><div className="nhc-level-strip">{Array.from({ length: 30 }, (_, index) => index + 1).map(levelNumber => <i key={`${member.id}-${levelNumber}`} className={member.completedLevels.includes(levelNumber) ? "done" : levelNumber === member.currentLevel ? "current" : ""}>{levelNumber}</i>)}</div><details><summary>{member.totalAttempts} attempt(s) · last active {when(member.lastActivityAt)}</summary>{member.attempts.map(attempt => <section key={attempt.id}><strong>Level {attempt.level} · {attempt.score}/100</strong><small>Attempt {attempt.attemptNumber} · {when(attempt.completedAt)}</small><ol>{attempt.questions.map((question, index) => <li key={`${attempt.id}-${index}`} className={question.correct ? "correct" : "wrong"}><b>{question.prompt}</b><span>Answered: {question.selectedAnswer}</span>{!question.correct && <em>Correct: {question.correctAnswer}</em>}</li>)}</ol></section>)}</details></article>) : <p className="nhc-empty">Member progress will appear after the first level is completed.</p>}</div></>}
  </div>;
}
