import type { Metadata } from "next";
import { MissionHome } from "./mission-home";
import { createPageMetadata, siteUrl } from "./seo";

export const metadata: Metadata = createPageMetadata({
  title: "NEXT HUMAN 2026 | Sri Aurobindo Society Lucknow",
  description: "Enter NEXT HUMAN 2026, a living inquiry into consciousness and the future human, while exploring Bharat Uday, Savitri, Integral Yoga and the work of Sri Aurobindo Society Lucknow.",
  path: "/",
  keywords: ["NEXT HUMAN 2026", "future human", "Bharat Uday", "spiritual centre Lucknow", "Indian culture Lucknow"],
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Sri Aurobindo Society, Lucknow",
      alternateName: "SAS Lucknow",
      url: siteUrl,
      logo: `${siteUrl}/society-logo-transparent.png`,
      image: `${siteUrl}/song-of-life-banner.png`,
      description: "The Lucknow centre of Sri Aurobindo Society, sharing Integral Yoga, meditation, Indian spirituality, culture and the vision of Sri Aurobindo and the Mother.",
      email: "info.saslucknow@gmail.com",
      telephone: "+91-7388899001",
      address: {
        "@type": "PostalAddress",
        streetAddress: "4/668, Vijayant Khand, Gomti Nagar",
        addressLocality: "Lucknow",
        addressRegion: "Uttar Pradesh",
        postalCode: "226010",
        addressCountry: "IN",
      },
      sameAs: ["https://www.facebook.com/saslucknow"],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Sri Aurobindo Society, Lucknow",
      alternateName: "SAS Lucknow — The Song of Life",
      inLanguage: ["en-IN", "hi-IN"],
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <MissionHome />
  </>;
}

