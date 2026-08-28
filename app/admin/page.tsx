import type { Metadata } from "next";
import { AdminClient } from "./admin-client";
import "./admin.css";
import "./campaign-studio.css";
import "./campaign-studio-operations.css";
import "./campaign-mobile-preview.css";
import "./campaign-motion-fixes.css";
import "./campaign-destinations.css";
import "./admin-responsive-nav-fix.css";
import "./next-human-event-studio.css";

export const metadata: Metadata = {
  title: "Administration | Sri Aurobindo Society Lucknow",
  description: "Secure member administration and Sangha moderation for Sri Aurobindo Society Lucknow.",
};

export default function AdminPage() {
  return <AdminClient />;
}
