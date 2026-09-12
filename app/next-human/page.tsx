import type { Metadata } from "next";
import { NextHumanConcept } from "./next-human-concept";
import "./next-human.css";

export const metadata: Metadata = {
  title: "NEXT HUMAN | आपके जीवन का अगला प्रश्न क्या है?",
  description: "AI, work, marriage, parenting, health, ageing and mortality—begin with the questions of your life and explore them through evidence, experience and the NEXT HUMAN books.",
  openGraph: {
    title: "NEXT HUMAN — आपके जीवन का अगला प्रश्न क्या है?",
    description: "आज के जीवन के प्रश्नों से चेतना और मानवीय सम्भावना की गहरी खोज तक।",
    url: "/next-human",
    type: "website",
    images: [{ url: "/next-human/og.png", width: 1730, height: 910, alt: "NEXT HUMAN — An inquiry into human possibility" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXT HUMAN — आपके जीवन का अगला प्रश्न क्या है?",
    description: "आज के जीवन के प्रश्नों से चेतना और मानवीय सम्भावना की गहरी खोज तक।",
    images: ["/next-human/og.png"],
  },
};

export default function NextHumanPage() {
  return <NextHumanConcept />;
}
