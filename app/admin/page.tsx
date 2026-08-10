import type { Metadata } from "next";
import { AdminClient } from "./admin-client";
import "./admin.css";

export const metadata: Metadata = {
  title: "Administration",
  description: "Secure administration for Parichay, Sankalp and the shared work of Sri Aurobindo Society Lucknow.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminClient />;
}
