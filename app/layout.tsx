import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aurobindo-mission-lucknow.org"),
  title: { default: "Aurobindo Mission Lucknow", template: "%s | Aurobindo Mission Lucknow" },
  description: "Study, reflect, participate, and grow together.",
  openGraph: { title: "Aurobindo Mission Lucknow", description: "Towards a Life Divine", type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
