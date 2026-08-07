import type { Metadata } from "next";
import "./globals.css";
import { coreKeywords } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.saslucknow.in"),
  title: {
    default: "Sri Aurobindo Society Lucknow | Spiritual Centre",
    template: "%s | Sri Aurobindo Society Lucknow",
  },
  description: "Explore Sri Aurobindo, the Mother, Integral Yoga, Savitri, meditation, Indian spirituality and cultural activities at the Society's Lucknow centre.",
  keywords: coreKeywords,
  applicationName: "Sri Aurobindo Society, Lucknow",
  authors: [{ name: "Sri Aurobindo Society, Lucknow", url: "https://www.saslucknow.in" }],
  creator: "Sri Aurobindo Society, Lucknow",
  publisher: "Sri Aurobindo Society, Lucknow",
  category: "Spirituality, Indian Culture and Education",
  icons: {
    icon: [{ url: "/society-logo-transparent.png", type: "image/png" }],
    shortcut: "/society-logo-transparent.png",
    apple: "/society-logo-transparent.png",
  },
  openGraph: {
    title: "Sri Aurobindo Society Lucknow | Spiritual Centre",
    description: "The Song of Life — meditation, Integral Yoga, Indian spirituality and the living vision of Sri Aurobindo and the Mother.",
    url: "/",
    siteName: "Sri Aurobindo Society, Lucknow",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/song-of-life-banner.png", alt: "Sri Aurobindo Society Lucknow — The Song of Life" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sri Aurobindo Society Lucknow | Spiritual Centre",
    description: "Meditation, Integral Yoga, Indian spirituality and the living vision of Sri Aurobindo and the Mother.",
    images: ["/song-of-life-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
