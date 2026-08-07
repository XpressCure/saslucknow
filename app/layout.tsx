import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aurobindo-mission-lucknow.org"),
  title: { default: "Sri Aurobindo Society, Lucknow", template: "%s | Sri Aurobindo Society, Lucknow" },
  description: "Study, reflect, participate, and grow together.",
  icons: {
    icon: [{ url: "/society-logo-transparent.png", type: "image/png" }],
    shortcut: "/society-logo-transparent.png",
    apple: "/society-logo-transparent.png",
  },
  openGraph: { title: "Sri Aurobindo Society, Lucknow", description: "The Song of Life", type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
