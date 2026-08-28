"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { bharatUdayLevels, choicesFor, milestoneLevels } from "./bharat-uday-data";

type Stage = "overview" | "welcome" | "question" | "coach" | "practice" | "reflection" | "card";
type StoredProgress = {
  completed: number[];
  currentLevel: number;
  scores: Record<number, number>;
  reflections: Record<number, string>;
  name: string;
};

const storageKey = "sas-bharat-uday-progress-v1";
const blankProgress: StoredProgress = { completed: [], currentLevel: 1, scores: {}, reflections: {}, name: "" };

function safeProgress(value: unknown): StoredProgress {
  if (!value || typeof value !== "object") return blankProgress;
  const source = value as Partial<StoredProgress>;
  return {
    completed: Array.isArray(source.completed) ? source.completed.filter(value => Number.isInteger(value) && value >= 1 && value <= 30) : [],
    currentLevel: Math.min(30, Math.max(1, Number(source.currentLevel) || 1)),
    scores: source.scores && typeof source.scores === "object" ? source.scores : {},
    reflections: source.reflections && typeof source.reflections === "object" ? source.reflections : {},
    name: typeof source.name === "string" ? source.name.slice(0, 60) : "",
  };
}

function shareText(levelNumber: number, name: string, milestone: boolean) {
  const achievement = milestone ? `a milestone at Level ${levelNumber}` : `Level ${levelNumber}`;
  return `I completed ${achievement} of The Next Human Challenge. Culture, science and consciousness—one discovery at a time.\n\nTake the challenge: https://www.saslucknow.in/bharat-uday${name ? `\n— ${name}` : ""}`;
}

function ProgressRing({ completed }: { completed: number }) {
  const percentage = Math.round((completed / 30) * 100);
  return <div className="bu-progress-ring" style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}>
    <div><strong>{completed}</strong><span>of 30</span></div>
  </div>;
}

export function BharatUdayClient() {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<StoredProgress>(blankProgress);
  const [stage, setStage] = useState<Stage>("overview");
  const [levelNumber, setLevelNumber] = useState(1);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [pauseSeconds, setPauseSeconds] = useState(120);
  const [pauseRunning, setPauseRunning] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const journeyRef = useRef<HTMLElement>(null);
  const introFilmRef = useRef<HTMLVideoElement>(null);

  const activeLevel = bharatUdayLevels[levelNumber - 1];
  const currentQuestion = activeLevel.discoveries[questionIndex];
  const choices = useMemo(() => choicesFor(activeLevel, questionIndex), [activeLevel, questionIndex]);
  const completedCount = progress.completed.length;
  const score = answers.reduce((total, answer, index) => total + (answer === activeLevel.discoveries[index]?.answer ? 1 : 0), 0);
  const milestone = milestoneLevels.has(levelNumber);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const next = safeProgress(JSON.parse(stored));
        setProgress(next);
        setLevelNumber(next.currentLevel);
        setParticipantName(next.name);
      }
    } catch { /* Progress remains usable if browser storage is unavailable. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Continue without persistence. */ }
  }, [hydrated, progress]);

  useEffect(() => {
    const film = introFilmRef.current;
    if (!film) return;
    film.muted = true;
    const beginPlayback = () => { void film.play().catch(() => undefined); };
    beginPlayback();
    film.addEventListener("canplay", beginPlayback);
    return () => film.removeEventListener("canplay", beginPlayback);
  }, []);

  useEffect(() => {
    if (!pauseRunning) return;
    if (pauseSeconds <= 0) { setPauseRunning(false); return; }
    const timer = window.setTimeout(() => setPauseSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [pauseRunning, pauseSeconds]);

  function showStage(next: Stage) {
    setStage(next);
    window.setTimeout(() => journeyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function beginLevel(number: number) {
    const firstUnfinished = progress.completed.includes(number) ? Math.min(30, Math.max(number, progress.currentLevel)) : number;
    setLevelNumber(firstUnfinished);
    setQuestionIndex(0);
    setSelectedChoice("");
    setAnswers([]);
    setReflection(progress.reflections[firstUnfinished] || "");
    setPauseSeconds(120);
    setPauseRunning(false);
    setShareNotice("");
    showStage("welcome");
  }

  function confirmAnswer() {
    if (!selectedChoice) return;
    const nextAnswers = [...answers, selectedChoice];
    setAnswers(nextAnswers);
    setSelectedChoice("");
    if (questionIndex < 4) setQuestionIndex(value => value + 1);
    else showStage("coach");
  }

  function enterReflection() {
    setPauseRunning(false);
    showStage("reflection");
  }

  function completeLevel() {
    if (!reflection.trim()) return;
    const nextCompleted = [...new Set([...progress.completed, levelNumber])].sort((a, b) => a - b);
    const nextLevel = Math.min(30, levelNumber + 1);
    const nextProgress: StoredProgress = {
      ...progress,
      completed: nextCompleted,
      currentLevel: nextLevel,
      scores: { ...progress.scores, [levelNumber]: score },
      reflections: { ...progress.reflections, [levelNumber]: reflection.trim().slice(0, 600) },
    };
    setProgress(nextProgress);
    showStage("card");
  }

  function saveName(value: string) {
    setParticipantName(value);
    setProgress(current => ({ ...current, name: value.slice(0, 60) }));
  }

  function drawCard(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) return;
    const size = 1080;
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#061a25");
    gradient.addColorStop(.46, activeLevel.accent);
    gradient.addColorStop(1, "#d8583c");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    const glow = context.createRadialGradient(820, 170, 10, 820, 170, 520);
    glow.addColorStop(0, "rgba(255,245,177,.94)");
    glow.addColorStop(.28, "rgba(255,177,27,.28)");
    glow.addColorStop(1, "rgba(255,177,27,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "rgba(255,255,255,.25)";
    context.lineWidth = 2;
    for (let radius = 120; radius <= 420; radius += 70) {
      context.beginPath(); context.arc(820, 170, radius, 0, Math.PI * 2); context.stroke();
    }
    context.fillStyle = "rgba(5,13,41,.82)";
    context.beginPath(); context.roundRect(62, 62, 956, 956, 54); context.fill();
    context.strokeStyle = "rgba(255,211,111,.72)"; context.lineWidth = 4; context.stroke();
    context.fillStyle = "#ffcf5c"; context.font = "700 27px Arial"; context.letterSpacing = "5px";
    context.fillText("THE NEXT HUMAN CHALLENGE", 112, 142);
    context.fillStyle = "#ffffff"; context.font = "700 76px Georgia";
    context.fillText(milestone ? "Milestone Awakened" : "Discovery Awakened", 112, 256);
    context.fillStyle = activeLevel.accent; context.font = "700 34px Arial";
    context.fillText(`LEVEL ${String(levelNumber).padStart(2, "0")}  ·  ${activeLevel.realm.toUpperCase()}`, 112, 330);
    context.fillStyle = "#ffffff"; context.font = "700 57px Georgia";
    const titleWords = activeLevel.title.split(" ");
    let titleLine = "", titleY = 430;
    for (const word of titleWords) {
      const test = `${titleLine}${word} `;
      if (context.measureText(test).width > 820 && titleLine) { context.fillText(titleLine.trim(), 112, titleY); titleLine = `${word} `; titleY += 70; }
      else titleLine = test;
    }
    context.fillText(titleLine.trim(), 112, titleY);
    context.fillStyle = "rgba(255,255,255,.78)"; context.font = "32px Arial";
    context.fillText(`${score}/5 discoveries · ${progress.completed.length}/30 levels completed`, 112, titleY + 86);
    context.fillStyle = "#ffcf5c"; context.font = "700 31px Arial";
    context.fillText("ONE THOUGHT I CARRY FORWARD", 112, titleY + 175);
    context.fillStyle = "#ffffff"; context.font = "italic 35px Georgia";
    const words = reflection.trim().split(/\s+/); let line = "", y = titleY + 235;
    for (const word of words) {
      const test = `${line}${word} `;
      if (context.measureText(test).width > 815 && line) { context.fillText(line.trim(), 112, y); line = `${word} `; y += 47; if (y > 820) break; }
      else line = test;
    }
    if (y <= 820) context.fillText(line.trim(), 112, y);
    context.fillStyle = "#ffffff"; context.font = "700 39px Georgia";
    context.fillText(participantName.trim() || "A curious explorer", 112, 905);
    context.fillStyle = "rgba(255,255,255,.65)"; context.font = "24px Arial";
    context.fillText("Sri Aurobindo Society, Lucknow · saslucknow.in/bharat-uday", 112, 958);
  }

  function downloadCard() {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1080;
    drawCard(canvas);
    const anchor = document.createElement("a");
    anchor.download = `next-human-challenge-level-${levelNumber}-${(participantName || "explorer").trim().replace(/\s+/g, "-").toLowerCase()}.png`;
    anchor.href = canvas.toDataURL("image/png"); anchor.click();
  }

  async function shareCard(platform?: "facebook" | "instagram" | "linkedin" | "whatsapp") {
    const text = shareText(levelNumber, participantName.trim(), milestone);
    const url = "https://www.saslucknow.in/bharat-uday";
    if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    else if (platform === "instagram") {
      downloadCard();
      await navigator.clipboard?.writeText(text).catch(() => null);
      setShareNotice("Card downloaded and caption copied. Add both to your Instagram post.");
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    }
    else if (platform === "linkedin") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    else if (navigator.share) await navigator.share({ title: "My Next Human Challenge Discovery Card", text, url }).catch(() => null);
    else await navigator.clipboard?.writeText(text).then(() => setShareNotice("Sharing message copied."));
  }

  function nextLevel() {
    if (levelNumber >= 30) { showStage("overview"); return; }
    beginLevel(levelNumber + 1);
  }

  return <div className="bu-page">
    <header className="bu-topbar">
      <Link href="/" className="bu-brand"><img src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>Lucknow · Gomti Nagar Centre</small></span></Link>
      <nav aria-label="The Next Human Challenge navigation"><a href="#journey">30 Levels</a><a href="#how-it-works">How it works</a><Link href="/member">Member Login</Link></nav>
      <button type="button" className="bu-nav-start" onClick={() => beginLevel(progress.currentLevel)}>{completedCount ? "Continue challenge" : "Start challenge"}</button>
    </header>

    <main>
      <section className="bu-hero">
        <div className="bu-hero-media">
          <video ref={introFilmRef} className="bu-hero-film" autoPlay muted loop playsInline preload="auto" poster="/next-human-challenge-poster.jpg" aria-label="A short introduction to The Next Human Challenge">
            <source src="/next-human-challenge-intro.mp4" type="video/mp4"/>
          </video>
        </div>
        <div className="bu-hero-copy">
          <span className="bu-live-pill"><i/> A 30-level discovery experience</span>
          <p>CULTURE · SCIENCE · CONSCIOUSNESS</p>
          <h1>The Next Human <em>Challenge</em></h1>
          <h2>Five fast questions. One discovery. One personal reflection.</h2>
          <div className="bu-hero-actions"><button type="button" onClick={() => beginLevel(progress.currentLevel)}>{completedCount ? `Continue from Level ${progress.currentLevel}` : "Begin Level 01"}<b>↗</b></button><a href="#journey">Explore the 30 discoveries</a></div>
          <div className="bu-hero-proof"><span><strong>30</strong> vivid levels</span><span><strong>5</strong> questions each</span><span><strong>∞</strong> go at your pace</span></div>
        </div>
        <div className="bu-scroll-cue"><span>Scroll to discover</span><i>↓</i></div>
      </section>

      <section className="bu-intro" id="how-it-works">
        <div><p className="bu-kicker">NOT A TEST. A DISCOVERY.</p><h2>Culture meets science.<br/><em>Knowledge meets you.</em></h2></div>
        <div className="bu-intro-copy"><p>The Next Human Challenge is a fast, free journey through 30 surprising worlds—from zero and space science to biodiversity, music, attention and the future human.</p><p>Complete one level or race through several. Your progress waits for you, and every finish reveals a Discovery Card created from your own reflection.</p></div>
      </section>

      <section className="bu-flow" aria-label="How each level works">
        {[ ["01","JÑĀNA","Answer five inviting questions"], ["02","KHOJ","Unlock a surprising discovery"], ["03","SĀDHANA","Pause, notice or carry a thought"], ["04","DISCOVERY CARD","Make the discovery your own"] ].map(item => <article key={item[0]}><span>{item[0]}</span><i/><h3>{item[1]}</h3><p>{item[2]}</p></article>)}
      </section>

      <section className="bu-journey" id="journey" ref={journeyRef}>
        {stage === "overview" && <>
          <header className="bu-journey-title"><div><p className="bu-kicker">YOUR ASCENT</p><h2>30 levels. <em>One awakening journey.</em></h2><span>Difficulty rises gently. Curiosity leads the way.</span></div><ProgressRing completed={completedCount}/></header>
          <div className="bu-milestone-rail"><span>START</span><i className={completedCount >= 7 ? "reached" : ""}>7<small>First Light</small></i><i className={completedCount >= 15 ? "reached" : ""}>15<small>Widening Mind</small></i><i className={completedCount >= 21 ? "reached" : ""}>21<small>Living Energy</small></i><i className={completedCount >= 30 ? "reached" : ""}>30<small>NEXT HUMAN</small></i></div>
          <div className="bu-level-grid">{bharatUdayLevels.map(item => {
            const complete = progress.completed.includes(item.number);
            const available = item.number <= progress.currentLevel || complete;
            return <button key={item.number} type="button" className={`${complete ? "complete" : ""} ${available ? "available" : "locked"}`} style={{ "--accent": item.accent } as React.CSSProperties} onClick={() => available && beginLevel(item.number)} disabled={!available}>
              <span>{String(item.number).padStart(2,"0")}</span><i>{item.symbol}</i><small>{item.realm}</small><strong>{item.title}</strong><b>{complete ? "✓ Complete" : available ? item.number === progress.currentLevel ? "Continue →" : "Open →" : "Complete earlier levels"}</b>
            </button>;
          })}</div>
        </>}

        {stage === "welcome" && <div className="bu-experience bu-welcome" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <button className="bu-back" type="button" onClick={() => showStage("overview")}>← Level map</button><span className="bu-level-symbol">{activeLevel.symbol}</span><p className="bu-kicker">LEVEL {String(levelNumber).padStart(2,"0")} · {activeLevel.realm.toUpperCase()}</p><h2>{activeLevel.title}</h2><p>Five quick questions. One unexpected connection. A thought that becomes yours.</p><div className="bu-welcome-meta"><span>5 questions</span><span>About 3 minutes</span><span>No negative marking</span></div><button className="bu-primary" type="button" onClick={() => showStage("question")}>Enter this discovery <b>→</b></button>
        </div>}

        {stage === "question" && <div className="bu-experience bu-question" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <header><button className="bu-back" type="button" onClick={() => showStage("welcome")}>← Exit level</button><span>LEVEL {String(levelNumber).padStart(2,"0")}</span><strong>{questionIndex + 1} / 5</strong></header><div className="bu-question-progress"><i style={{ width: `${((questionIndex + 1) / 5) * 100}%` }}/></div><p className="bu-kicker">DISCOVERY QUESTION {questionIndex + 1}</p><h2>{currentQuestion.prompt}</h2><div className="bu-options">{choices.map((choice, index) => <button type="button" key={choice} className={selectedChoice === choice ? "selected" : ""} onClick={() => setSelectedChoice(choice)}><span>{String.fromCharCode(65 + index)}</span>{choice}<i>{selectedChoice === choice ? "●" : "○"}</i></button>)}</div><button className="bu-primary" type="button" disabled={!selectedChoice} onClick={confirmAnswer}>{questionIndex === 4 ? "Reveal my discovery" : "Next question"}<b>→</b></button>
        </div>}

        {stage === "coach" && <div className="bu-experience bu-coach" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <div className="bu-coach-score"><span>{score}</span><small>out of 5</small></div><p className="bu-kicker">KHOJ · YOUR DISCOVERY</p><h2>{score >= 4 ? "Your curiosity is wide awake." : score >= 2 ? "Good questions are opening." : "A new doorway has opened."}</h2><p className="bu-coach-fact">{activeLevel.coachFact}</p><div className="bu-answer-notes">{activeLevel.discoveries.map((item, index) => <details key={item.prompt}><summary><span>{answers[index] === item.answer ? "✓" : "↗"}</span>{item.answer}</summary><p>{item.note}</p></details>)}</div><button className="bu-primary" type="button" onClick={() => showStage("practice")}>Proceed to finish this level <b>→</b></button>
        </div>}

        {stage === "practice" && <div className="bu-experience bu-practice" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <div className={`bu-breathing-orb ${pauseRunning ? "running" : ""}`}><span>{pauseRunning ? `${String(Math.floor(pauseSeconds/60)).padStart(2,"0")}:${String(pauseSeconds%60).padStart(2,"0")}` : activeLevel.symbol}</span></div><p className="bu-kicker">SĀDHANA · LET IT BECOME PERSONAL</p><h2>{levelNumber % 3 === 0 ? "Carry one thought." : "Take a two-minute inner pause."}</h2><blockquote>“{activeLevel.innerPrompt}”</blockquote>{pauseSeconds > 0 && levelNumber % 3 !== 0 ? <button className="bu-primary" type="button" onClick={() => setPauseRunning(value => !value)}>{pauseRunning ? "Pause timer" : pauseSeconds < 120 ? "Continue pause" : "Begin two minutes"}</button> : null}<button className="bu-text-button" type="button" onClick={enterReflection}>{pauseSeconds === 0 || levelNumber % 3 === 0 ? "I am ready to reflect →" : "Continue when ready →"}</button>
        </div>}

        {stage === "reflection" && <div className="bu-experience bu-reflection" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <p className="bu-kicker">ABHIVYAKTI · YOUR VOICE</p><h2>What stayed with you?</h2><p>There is no right answer here. Write one honest sentence—this becomes part of your personal Discovery Card.</p><label><span>My reflection</span><textarea value={reflection} onChange={event => setReflection(event.target.value)} maxLength={600} rows={6} placeholder="Something I noticed, questioned or want to carry forward…"/><small>{reflection.length}/600</small></label><button className="bu-primary" type="button" disabled={!reflection.trim()} onClick={completeLevel}>Submit & create my Discovery Card <b>✦</b></button>
        </div>}

        {stage === "card" && <div className="bu-experience bu-card-stage" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <div className="bu-confetti" aria-hidden="true">✦ <i>●</i> ◆ <b>✺</b> ✦</div><p className="bu-kicker">{milestone ? "MILESTONE UNLOCKED" : "LEVEL COMPLETE"}</p><h2>{milestone ? "A larger light has opened." : "This discovery is now yours."}</h2><p>{milestone ? `Level ${levelNumber} has unlocked a special Next Human Challenge milestone certificate.` : "Add your name and make a square card ready to share."}</p><div className={`bu-discovery-card ${milestone ? "milestone" : ""}`}>
            <div className="bu-card-rings"/><span>THE NEXT HUMAN CHALLENGE</span><h3>{milestone ? "Milestone Awakened" : "Discovery Awakened"}</h3><p>LEVEL {String(levelNumber).padStart(2,"0")} · {activeLevel.realm.toUpperCase()}</p><h4>{activeLevel.title}</h4><blockquote>“{reflection}”</blockquote><strong>{participantName.trim() || "A curious explorer"}</strong><small>Sri Aurobindo Society, Lucknow</small>
          </div><label className="bu-name-field"><span>Name on your card</span><input value={participantName} onChange={event => saveName(event.target.value)} maxLength={60} placeholder="Write your name"/></label><div className="bu-card-actions"><button type="button" onClick={downloadCard}>Download card</button><button type="button" onClick={() => void shareCard()}>Share</button><button type="button" onClick={() => void shareCard("whatsapp")}>WhatsApp</button><button type="button" onClick={() => void shareCard("facebook")}>Facebook</button><button type="button" onClick={() => void shareCard("instagram")}>Instagram</button><button type="button" onClick={() => void shareCard("linkedin")}>LinkedIn</button></div>{shareNotice && <p className="bu-share-notice">{shareNotice}</p>}<button className="bu-primary" type="button" onClick={nextLevel}>{levelNumber === 30 ? "Return to my complete journey" : `Proceed to Level ${String(levelNumber + 1).padStart(2,"0")}`} <b>→</b></button>
        </div>}
      </section>
    </main>

    <footer className="bu-footer"><div><img src="/society-logo-transparent.png" alt=""/><span><strong>Sri Aurobindo Society, Lucknow</strong><small>Gomti Nagar Centre (UC-02)</small></span></div><p>The Next Human Challenge · Culture, Science & Consciousness</p><Link href="/">Return to The Song of Life</Link></footer>
  </div>;
}
