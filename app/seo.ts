import type { Metadata } from "next";

export const siteUrl = "https://www.saslucknow.in";

export const coreKeywords = [
  "Sri Aurobindo Society Lucknow",
  "Sri Aurobindo",
  "The Mother",
  "Mirra Alfassa",
  "Integral Yoga",
  "Savitri",
  "meditation in Lucknow",
  "spirituality",
  "Indian spirituality",
  "Indian culture",
  "Hinduism",
  "Hindu philosophy",
  "Indian independence movement",
  "Pondicherry",
  "Puducherry",
  "Auroville",
  "Sri Aurobindo Ashram",
  "Darshan Divas",
  "spiritual education",
  "consciousness",
  "yoga",
];

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image = "/song-of-life-banner.png",
}: PageMetadataOptions): Metadata {
  return {
    title: { absolute: title },
    description,
    keywords: [...new Set([...keywords, ...coreKeywords])],
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Sri Aurobindo Society, Lucknow",
      locale: "en_IN",
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
