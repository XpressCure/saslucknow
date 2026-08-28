import { BharatUdayClient } from "./bharat-uday-client";
import "./bharat-uday.css";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "The Next Human Challenge — 30 Levels of Discovery",
  description: "A free 30-level journey through Indian culture, science and consciousness. Answer, discover, reflect and create your personalised Discovery Cards.",
  path: "/bharat-uday",
  keywords: ["Bharat quiz", "Indian culture quiz", "science quiz India", "NEXT HUMAN challenge", "youth consciousness"],
  image: "/next-human-challenge-poster.jpg",
});

export default function BharatUdayPage() {
  return <BharatUdayClient />;
}
