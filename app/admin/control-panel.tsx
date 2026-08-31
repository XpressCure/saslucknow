"use client";

import { useState } from "react";
import { CreativeStudioPanel } from "./campaign-studio";
import { NextHumanChallengeStudio } from "./next-human-challenge-studio";

type ControlPage = "dashboard" | "next-human-2026" | "challenge";

export function AdminControlPanel({ nextHuman2026 }: { nextHuman2026: React.ReactNode }) {
  const [page, setPage] = useState<ControlPage>("dashboard");
  return <div className="admin-control-panel">
    <section className="admin-control-hero"><div><p>MASTER CONTROL PANEL</p><h1>Guide the member app from one place.</h1><span>Choose dashboard shortcuts and cards, operate NEXT HUMAN 2026, or manage every level, question, certificate and sponsor in The Next Human Challenge.</span></div><strong>CP</strong></section>
    <nav className="admin-control-tabs" aria-label="Control Panel sections">
      <button type="button" className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>Dashboard Cards & Shortcuts</button>
      <button type="button" className={page === "next-human-2026" ? "active" : ""} onClick={() => setPage("next-human-2026")}>NEXT HUMAN 2026</button>
      <button type="button" className={page === "challenge" ? "active" : ""} onClick={() => setPage("challenge")}>The Next Human Challenge</button>
    </nav>
    {page === "dashboard" && <CreativeStudioPanel />}
    {page === "next-human-2026" && nextHuman2026}
    {page === "challenge" && <NextHumanChallengeStudio />}
  </div>;
}
