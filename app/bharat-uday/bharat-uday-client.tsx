"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { bharatUdayLevels, choicesFor, lifeQuoteFor, milestoneLevels, questionOrderFor } from "./bharat-uday-data";

type Stage = "overview" | "welcome" | "question" | "coach" | "quote" | "card";
type StoredProgress = {
  completed: number[];
  currentLevel: number;
  scores: Record<number, number>;
  reflections: Record<number, string>;
  attempts: Record<number, number>;
  name: string;
};

const storageKey = "sas-bharat-uday-progress-v1";
const blankProgress: StoredProgress = { completed: [], currentLevel: 1, scores: {}, reflections: {}, attempts: {}, name: "" };
const launchLevel = 1;
const launchDate = "31 August 2026";

function safeProgress(value: unknown): StoredProgress {
  if (!value || typeof value !== "object") return blankProgress;
  const source = value as Partial<StoredProgress>;
  return {
    completed: Array.isArray(source.completed) ? source.completed.filter(value => Number.isInteger(value) && value >= 1 && value <= 30) : [],
    currentLevel: Math.min(30, Math.max(1, Number(source.currentLevel) || 1)),
    scores: source.scores && typeof source.scores === "object" ? source.scores : {},
    reflections: source.reflections && typeof source.reflections === "object" ? source.reflections : {},
    attempts: source.attempts && typeof source.attempts === "object" ? source.attempts : {},
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
  const [questionOrder, setQuestionOrder] = useState(() => questionOrderFor(0, 10));
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [answerLocked, setAnswerLocked] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const journeyRef = useRef<HTMLElement>(null);
  const introFilmRef = useRef<HTMLVideoElement>(null);

  const activeLevel = bharatUdayLevels[levelNumber - 1];
  const currentDiscoveryIndex = questionOrder[questionIndex] ?? questionIndex;
  const currentQuestion = activeLevel.discoveries[currentDiscoveryIndex];
  const currentPrompt = currentQuestion.prompt;
  const choices = useMemo(() => choicesFor(activeLevel, currentDiscoveryIndex, attemptNumber), [activeLevel, currentDiscoveryIndex, attemptNumber]);
  const completedCount = progress.completed.length;
  const correctAnswers = answers.reduce((total, answer, index) => total + (answer === activeLevel.discoveries[questionOrder[index]]?.answer ? 1 : 0), 0);
  const score = correctAnswers * 10;
  const milestone = milestoneLevels.has(levelNumber);
  const lifeQuote = lifeQuoteFor(levelNumber);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const next = safeProgress(JSON.parse(stored));
        setProgress(next);
        setLevelNumber(launchLevel);
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

  function showStage(next: Stage) {
    setStage(next);
    window.setTimeout(() => journeyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function beginLevel(number: number) {
    if (number !== launchLevel) return;
    const nextAttempt = (progress.attempts[launchLevel] || 0) + 1;
    setLevelNumber(launchLevel);
    setAttemptNumber(nextAttempt);
    setQuestionOrder(questionOrderFor(nextAttempt, bharatUdayLevels[0].discoveries.length));
    setProgress(current => ({ ...current, currentLevel: launchLevel, attempts: { ...current.attempts, [launchLevel]: nextAttempt } }));
    setQuestionIndex(0);
    setSelectedChoice("");
    setAnswerLocked(false);
    setAnswers([]);
    setShareNotice("");
    setShareMenuOpen(false);
    showStage("welcome");
  }

  function confirmAnswer() {
    if (!selectedChoice || !answerLocked) return;
    const nextAnswers = [...answers, selectedChoice];
    setAnswers(nextAnswers);
    setSelectedChoice("");
    setAnswerLocked(false);
    if (questionIndex < questionOrder.length - 1) setQuestionIndex(value => value + 1);
    else showStage("coach");
  }

  function completeLevel() {
    const nextCompleted = [...new Set([...progress.completed, levelNumber])].sort((a, b) => a - b);
    const nextProgress: StoredProgress = {
      ...progress,
      completed: nextCompleted,
      currentLevel: launchLevel,
      scores: { ...progress.scores, [levelNumber]: score },
    };
    setProgress(nextProgress);
    showStage("card");
  }

  function saveName(value: string) {
    setParticipantName(value);
    setProgress(current => ({ ...current, name: value.slice(0, 60) }));
  }

  function drawCard(canvas: HTMLCanvasElement, logo?: HTMLImageElement) {
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
    if (logo) context.drawImage(logo, 108, 92, 80, 80);
    context.fillStyle = "#ffffff"; context.font = "700 31px Arial";
    context.fillText("SRI AUROBINDO SOCIETY, LUCKNOW", 212, 124);
    context.fillStyle = "#ffcf5c"; context.font = "700 18px Arial";
    context.fillText("GOMTI NAGAR CENTRE (UC-02)", 212, 158);
    context.textAlign = "center";
    context.fillStyle = "#ffcf5c"; context.font = "700 22px Arial";
    context.fillText("THE NEXT HUMAN CHALLENGE", 540, 230);
    context.fillStyle = "#ffffff"; context.font = "700 62px Georgia";
    context.fillText(milestone ? "Milestone Certificate" : "Certificate of Discovery", 540, 304);
    context.strokeStyle = "rgba(255,211,111,.7)"; context.lineWidth = 2;
    context.beginPath(); context.moveTo(300, 332); context.lineTo(780, 332); context.stroke();
    context.fillStyle = "rgba(255,255,255,.7)"; context.font = "25px Arial";
    context.fillText("This certifies that", 540, 386);
    context.fillStyle = "#ffffff"; context.font = "italic 700 57px Georgia";
    context.fillText(participantName.trim() || "A curious explorer", 540, 458);
    context.fillStyle = "rgba(255,255,255,.76)"; context.font = "27px Arial";
    context.fillText("has successfully completed", 540, 512);
    context.fillStyle = activeLevel.accent; context.font = "700 29px Arial";
    context.fillText(`LEVEL ${String(levelNumber).padStart(2, "0")}  ·  ${activeLevel.realm.toUpperCase()}`, 540, 566);
    context.fillStyle = "#ffffff"; context.font = "700 49px Georgia";
    context.fillText(activeLevel.title, 540, 630);
    context.fillStyle = "rgba(255,255,255,.72)"; context.font = "24px Arial";
    context.fillText("with curiosity across culture, science and consciousness.", 540, 678);
    context.fillStyle = "#ffcf5c"; context.font = "700 20px Arial";
    context.fillText("A WORD FOR LIFE", 540, 740);
    context.fillStyle = "#ffffff"; context.font = "italic 31px Georgia";
    const quoteWords = lifeQuote.text.split(/\s+/); let quoteLine = "", quoteY = 790;
    for (const word of quoteWords) {
      const test = `${quoteLine}${word} `;
      if (context.measureText(test).width > 750 && quoteLine) { context.fillText(quoteLine.trim(), 540, quoteY); quoteLine = `${word} `; quoteY += 40; }
      else quoteLine = test;
    }
    context.fillText(quoteLine.trim(), 540, quoteY);
    context.fillStyle = "#ffcf5c"; context.font = "700 21px Arial";
    context.fillText(`— ${lifeQuote.author}`, 540, quoteY + 40);
    context.fillStyle = "rgba(255,255,255,.68)"; context.font = "700 18px Arial";
    context.fillText("AN INITIATIVE BY SRI AUROBINDO SOCIETY, LUCKNOW · GOMTI NAGAR CENTRE (UC-02)", 540, 958);
    context.textAlign = "start";
  }

  async function downloadCard() {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1080;
    let logo: HTMLImageElement | undefined;
    try {
      logo = new Image();
      logo.src = "/society-logo-transparent.png";
      await logo.decode();
    } catch { logo = undefined; }
    drawCard(canvas, logo);
    const anchor = document.createElement("a");
    anchor.download = `next-human-challenge-certificate-level-${levelNumber}-${(participantName || "explorer").trim().replace(/\s+/g, "-").toLowerCase()}.png`;
    anchor.href = canvas.toDataURL("image/png"); anchor.click();
  }

  async function shareCard(platform?: "facebook" | "instagram" | "linkedin" | "whatsapp") {
    const text = shareText(levelNumber, participantName.trim(), milestone);
    const url = "https://www.saslucknow.in/bharat-uday";
    if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    else if (platform === "instagram") {
      await downloadCard();
      await navigator.clipboard?.writeText(text).catch(() => null);
      setShareNotice("Card downloaded and caption copied. Add both to your Instagram post.");
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    }
    else if (platform === "linkedin") window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    else if (navigator.share) await navigator.share({ title: "My Next Human Challenge Discovery Card", text, url }).catch(() => null);
    else await navigator.clipboard?.writeText(text).then(() => setShareNotice("Sharing message copied."));
  }

  function nextLevel() {
    showStage("overview");
  }

  return <div className="bu-page">
    <header className="bu-topbar">
      <Link href="/" className="bu-brand"><img src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>Lucknow · Gomti Nagar Centre</small></span></Link>
      <nav aria-label="The Next Human Challenge navigation"><a href="#journey">30 Levels</a><a href="#how-it-works">How it works</a><Link href="/member">Member Login</Link></nav>
      <button type="button" className="bu-nav-start" onClick={() => beginLevel(launchLevel)}>{progress.completed.includes(launchLevel) ? "Replay Level 1" : "Play Level 1"}</button>
    </header>

    <main>
      <section className="bu-hero">
        <div className="bu-hero-media">
          <video ref={introFilmRef} className="bu-hero-film" autoPlay muted playsInline preload="auto" poster="/next-human-challenge-poster.jpg" aria-label="A short introduction to The Next Human Challenge">
            <source src="/next-human-challenge-intro.mp4" type="video/mp4"/>
          </video>
        </div>
        <div className="bu-hero-copy">
          <span className="bu-live-pill"><i/> LEVEL 1 OPEN NOW · {launchDate.toUpperCase()}</span>
          <p>CULTURE · SCIENCE · CONSCIOUSNESS</p>
          <h1>The Next Human <em>Challenge</em></h1>
          <h2>Ten fast questions. One discovery. One life quote.</h2>
          <div className="bu-hero-proof"><span><strong>30</strong> vivid levels</span><span><strong>10</strong> questions each</span><span><strong>∞</strong> go at your pace</span></div>
        </div>
        <div className="bu-scroll-cue"><span>Scroll to discover</span><i>↓</i></div>
      </section>

      <section className="bu-hero-cta" aria-label="Start The Next Human Challenge">
        <div><span>YOUR NEXT DISCOVERY IS READY</span><strong>{progress.completed.includes(launchLevel) ? "Replay Level 1 and rediscover its ideas." : `Level 1 opened on ${launchDate}.`}</strong></div>
        <div className="bu-hero-cta-actions"><button type="button" onClick={() => beginLevel(launchLevel)}>{progress.completed.includes(launchLevel) ? "Replay Level 01" : "Begin Level 01"}<b>→</b></button><a href="#journey">View the open level</a></div>
      </section>

      <section className="bu-intro" id="how-it-works">
        <div><p className="bu-kicker">NOT A TEST. A DISCOVERY.</p><h2>Culture meets science.<br/><em>Knowledge meets you.</em></h2></div>
        <div className="bu-intro-copy"><p>The Next Human Challenge is a fast, free journey through 30 surprising worlds—from zero and space science to biodiversity, music, attention and the future human.</p><p>Complete one level or race through several. Your progress waits for you, and every finish reveals a Discovery Card carrying a word for life.</p></div>
      </section>

      <section className="bu-flow" aria-label="How each level works">
        {[ ["01","JÑĀNA","Answer ten inviting questions"], ["02","KHOJ","Unlock a surprising discovery"], ["03","SĀDHANA","Receive a word for life"], ["04","DISCOVERY CARD","Make the discovery your own"] ].map(item => <article key={item[0]}><span>{item[0]}</span><i/><h3>{item[1]}</h3><p>{item[2]}</p></article>)}
      </section>

      <section className="bu-journey" id="journey" ref={journeyRef}>
        {stage === "overview" && <>
          <header className="bu-journey-title"><div><p className="bu-kicker">YOUR ASCENT</p><h2>30 levels. <em>One awakening journey.</em></h2><span>Difficulty rises gently. Curiosity leads the way.</span></div><ProgressRing completed={completedCount}/></header>
          <div className="bu-milestone-rail"><span>START</span><i className={completedCount >= 7 ? "reached" : ""}>7<small>First Light</small></i><i className={completedCount >= 15 ? "reached" : ""}>15<small>Widening Mind</small></i><i className={completedCount >= 21 ? "reached" : ""}>21<small>Living Energy</small></i><i className={completedCount >= 30 ? "reached" : ""}>30<small>NEXT HUMAN</small></i></div>
          <p className="bu-release-note">Only Level 1 is open. New levels will appear here automatically after the administrator selects their release dates.</p>
          <div className="bu-level-grid">{bharatUdayLevels.filter(item => item.number === launchLevel).map(item => {
            const complete = progress.completed.includes(item.number);
            return <button key={item.number} type="button" className={`${complete ? "complete" : ""} available`} style={{ "--accent": item.accent } as React.CSSProperties} onClick={() => beginLevel(item.number)}>
              <span>{String(item.number).padStart(2,"0")}</span><i>{item.symbol}</i><small>{item.realm}</small><strong>{item.title}</strong><b>{complete ? "✓ Complete · Replay →" : `Open now · ${launchDate} →`}</b>
            </button>;
          })}</div>
        </>}

        {stage === "welcome" && <div className="bu-experience bu-welcome" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <button className="bu-back" type="button" onClick={() => showStage("overview")}>← Level map</button><span className="bu-level-symbol">{activeLevel.symbol}</span><p className="bu-kicker">LEVEL {String(levelNumber).padStart(2,"0")} · {activeLevel.realm.toUpperCase()}</p><h2>{activeLevel.title}</h2><p>Ten quick questions. Ten marks for every correct answer. Every completed attempt earns its certificate.</p><div className="bu-welcome-meta"><span>10 questions</span><span>100 marks</span><span>No qualifying benchmark</span></div><button className="bu-primary" type="button" onClick={() => showStage("question")}>Enter this discovery <b>→</b></button>
        </div>}

        {stage === "question" && <div className="bu-experience bu-question" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <header><button className="bu-back" type="button" onClick={() => showStage("welcome")}>← Exit level</button><span>LEVEL {String(levelNumber).padStart(2,"0")}</span><strong>{questionIndex + 1} / {questionOrder.length}</strong></header><div className="bu-question-progress" aria-label={`Question ${questionIndex + 1} of ${questionOrder.length}`}>{Array.from({ length: questionOrder.length }, (_, index) => <span key={index} className={index < questionIndex ? "completed" : index === questionIndex ? "current" : ""} aria-hidden="true"/>)}</div><p className="bu-kicker">DISCOVERY QUESTION {questionIndex + 1}</p><h2 className="bu-question-prompt">{currentPrompt}</h2><div className="bu-options">{choices.map((choice, index) => { const isCorrect = answerLocked && choice === currentQuestion.answer; const isWrong = answerLocked && selectedChoice === choice && choice !== currentQuestion.answer; return <button type="button" key={choice} disabled={answerLocked} aria-pressed={selectedChoice === choice} className={`${selectedChoice === choice ? "selected " : ""}${isCorrect ? "correct" : isWrong ? "wrong" : ""}`.trim()} onClick={() => { setSelectedChoice(choice); setAnswerLocked(true); }}><span>{String.fromCharCode(65 + index)}</span>{choice}<i>{isCorrect ? "✓" : isWrong ? "×" : selectedChoice === choice ? "●" : "○"}</i></button>; })}</div>{answerLocked ? <p className={`bu-answer-feedback ${selectedChoice === currentQuestion.answer ? "correct" : "wrong"}`}>{selectedChoice === currentQuestion.answer ? "Correct. " : `Not quite. The correct answer is ${currentQuestion.answer}. `}{currentQuestion.note}</p> : <p className="bu-answer-privacy">Choose one answer. You will see the correct answer immediately.</p>}<button className="bu-primary" type="button" disabled={!answerLocked} onClick={confirmAnswer}>{questionIndex === questionOrder.length - 1 ? "Reveal my discovery" : "Next question"}<b>→</b></button>
        </div>}

        {stage === "coach" && <div className="bu-experience bu-coach" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <div className="bu-coach-score"><span>{score}</span><small>out of 100</small></div><p className="bu-kicker">KHOJ · YOUR DISCOVERY</p><h2>Level 01 is complete.</h2><p className="bu-coach-fact">You answered {correctAnswers} of 10 correctly. Every completed level earns its certificate; there is no qualifying benchmark.</p><div className="bu-answer-notes">{questionOrder.map((discoveryIndex, index) => { const item = activeLevel.discoveries[discoveryIndex]; return <details key={item.prompt}><summary><span>{answers[index] === item.answer ? "✓" : "↗"}</span>{item.answer}</summary><p>{item.note}</p></details>; })}</div><button className="bu-primary" type="button" onClick={() => showStage("quote")}>Proceed to finish this level <b>→</b></button>
        </div>}

        {stage === "quote" && <div className="bu-experience bu-life-quote" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <div className="bu-quote-aura" aria-hidden="true"><span>{activeLevel.symbol}</span></div><p className="bu-kicker">SĀDHANA · A WORD FOR LIFE</p><h2>Carry this into your day.</h2><blockquote>“{lifeQuote.text}”</blockquote><cite>— {lifeQuote.author}{lifeQuote.source ? <small>{lifeQuote.source}</small> : null}</cite><p className="bu-quote-guidance">Read it once, quietly. Let its meaning travel with you beyond this level.</p><button className="bu-primary" type="button" onClick={completeLevel}>Carry this with me & create my card <b>→</b></button>
        </div>}

        {stage === "card" && <div className="bu-experience bu-card-stage" style={{ "--accent": activeLevel.accent } as React.CSSProperties}>
          <div className="bu-confetti" aria-hidden="true">✦ <i>●</i> ◆ <b>✺</b> ✦</div><p className="bu-kicker">{milestone ? "MILESTONE UNLOCKED" : "LEVEL COMPLETE"}</p><h2>{milestone ? "A larger light has opened." : "Your certificate is ready."}</h2><p>{milestone ? `Level ${levelNumber} has unlocked a special Next Human Challenge milestone certificate.` : "Add your name to personalise your Certificate of Discovery."}</p><div className={`bu-discovery-card bu-certificate ${milestone ? "milestone" : ""}`}>
            <div className="bu-card-rings"/><header className="bu-certificate-brand"><img src="/society-logo-transparent.png" alt="Sri Aurobindo Society logo"/><span><strong>Sri Aurobindo Society, Lucknow</strong><small>Gomti Nagar Centre (UC-02)</small></span></header><p className="bu-certificate-series">THE NEXT HUMAN CHALLENGE</p><h3>{milestone ? "Milestone Certificate" : "Certificate of Discovery"}</h3><p className="bu-certifies">This certifies that</p><strong className="bu-certificate-name">{participantName.trim() || "A curious explorer"}</strong><p className="bu-certificate-copy">has successfully completed <b>Level {String(levelNumber).padStart(2,"0")} — {activeLevel.title}</b> and explored <b>{activeLevel.realm}</b> through culture, science and consciousness.</p><blockquote>“{lifeQuote.text}”<cite>— {lifeQuote.author}</cite></blockquote><footer>An initiative by Sri Aurobindo Society, Lucknow · Gomti Nagar Centre (UC-02)</footer>
          </div><label className="bu-name-field"><span>Name on your certificate</span><input value={participantName} onChange={event => saveName(event.target.value)} maxLength={60} placeholder="Write your name"/></label><div className="bu-card-actions"><button type="button" onClick={() => void downloadCard()}>Download Certificate</button><button type="button" aria-expanded={shareMenuOpen} onClick={() => setShareMenuOpen(value => !value)}>Share Certificate</button></div>{shareMenuOpen && <div className="bu-share-options" aria-label="Share certificate options"><button type="button" onClick={() => { setShareMenuOpen(false); void shareCard("whatsapp"); }}>WhatsApp</button><button type="button" onClick={() => { setShareMenuOpen(false); void shareCard("facebook"); }}>Facebook</button><button type="button" onClick={() => { setShareMenuOpen(false); void shareCard("instagram"); }}>Instagram</button><button type="button" onClick={() => { setShareMenuOpen(false); void shareCard("linkedin"); }}>LinkedIn</button></div>}{shareNotice && <p className="bu-share-notice">{shareNotice}</p>}<button className="bu-primary" type="button" onClick={nextLevel}>More levels coming soon <b>→</b></button>
        </div>}
      </section>
    </main>

    <footer className="bu-footer"><div><img src="/society-logo-transparent.png" alt=""/><span><strong>Sri Aurobindo Society, Lucknow</strong><small>Gomti Nagar Centre (UC-02)</small></span></div><p>The Next Human Challenge · Culture, Science & Consciousness</p><Link href="/">Return to The Song of Life</Link></footer>
  </div>;
}
