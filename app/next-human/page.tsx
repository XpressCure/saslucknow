import type { Metadata } from "next";
import { NextHumanConcept } from "./next-human-concept";
import "./next-human.css";

export const metadata: Metadata = {
  title: "NEXT HUMAN | An Inquiry into Human Possibility",
  description: "Explore the idea of the Next Human through Book Zero and Book One: consciousness, evolution and what humanity may become.",
  openGraph: {
    title: "NEXT HUMAN — What comes after the human we know?",
    description: "An inquiry into consciousness, evolution and human possibility through Book Zero and Book One.",
    url: "/next-human",
    type: "website",
    images: [{ url: "/next-human/og.png", width: 1730, height: 910, alt: "NEXT HUMAN — An inquiry into human possibility" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXT HUMAN — What comes after the human we know?",
    description: "An inquiry into consciousness, evolution and human possibility through Book Zero and Book One.",
    images: ["/next-human/og.png"],
  },
};

export default function NextHumanPage() {
  return <NextHumanConcept />;
}
