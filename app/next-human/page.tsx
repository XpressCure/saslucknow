import type { Metadata } from "next";
import { NextHumanConcept } from "./next-human-concept";
import "./next-human.css";

export const metadata: Metadata = {
  title: "NEXT HUMAN | मनुष्य की अगली सम्भावना",
  description: "आज के जीवित प्रश्नों से भविष्य की मानवीय सम्भावना तक—चेतना, विवेक, जीवन-अभ्यास और NEXT HUMAN books की एक खुली खोज।",
  openGraph: {
    title: "NEXT HUMAN — भविष्य केवल आता नहीं, मनुष्य उसे जन्म देता है",
    description: "आज के प्रश्नों से अधिक सचेत, स्वतंत्र और करुणामय मनुष्य की सम्भावना तक।",
    url: "/next-human",
    type: "website",
    images: [{ url: "/next-human/og.png", width: 1730, height: 910, alt: "NEXT HUMAN — An inquiry into human possibility" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXT HUMAN — मनुष्य की अगली सम्भावना",
    description: "आज के प्रश्नों से एक अधिक सचेत भविष्य की ओर।",
    images: ["/next-human/og.png"],
  },
};

export default function NextHumanPage() {
  return <NextHumanConcept />;
}
