import type { Metadata } from "next";
import { NextHumanClient } from "./next-human-client";
import "./next-human.css";

export const metadata: Metadata = {
  title: "NEXT HUMAN 2026 Founding Circle",
  description: "Help build NEXT HUMAN 2026—Seven Days, 21 Movements and one extraordinary exploration of what comes after man.",
  openGraph: {
    title: "NEXT HUMAN 2026 — Enter the Founding Circle",
    description: "Before we find the 200, we must find the people who will build the journey.",
    url: "/next-human",
    type: "website",
    images: [{ url: "/next-human/og.png", width: 1730, height: 910, alt: "NEXT HUMAN 2026 — Don’t attend it. Build it. Lucknow 2026" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXT HUMAN 2026 — Enter the Founding Circle",
    description: "Before we find the 200, we must find the people who will build the journey.",
    images: ["/next-human/og.png"],
  },
};

export default function NextHumanPage() {
  return <NextHumanClient />;
}
