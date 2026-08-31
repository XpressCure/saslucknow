"use client";

import { useEffect } from "react";

export default function ContributePage() {
  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    parameters.set("contribute", "1");
    window.location.replace(`/?${parameters.toString()}#support`);
  }, []);

  return <main aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", background: "#fbf7ee", color: "#173846", textAlign: "center" }}>
    <p>Taking you to the secure Support the Work form…</p>
  </main>;
}
