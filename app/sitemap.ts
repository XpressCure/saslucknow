import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-07T00:00:00+05:30");

  return [
    { url: siteUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/sri-aurobindo`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/sri-aurobindo/life-sketch`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/the-mother`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/darshan-divas`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/sultanpur-shrine`, lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];
}
