import type { Metadata } from "next";
import { BharatUdayClient } from "../bharat-uday/bharat-uday-client";
import "../bharat-uday/bharat-uday.css";

export const metadata: Metadata = {
  title: "The Next Human Quiz | 30 Levels of Discovery",
  description: "Explore culture, science and consciousness through The Next Human Quiz—a free 30-level journey of questions, discoveries and words for life.",
  alternates: { canonical: "/next-human-quiz" },
};

export default function NextHumanQuizPage() {
  return <BharatUdayClient />;
}
