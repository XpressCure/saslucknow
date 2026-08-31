import type { Metadata } from "next";
import { MemberClient } from "./member-client";
import "./member.css";
import "./member-access.css";
import "./member-campaign-motion-fixes.css";

export const metadata: Metadata = {
  title: "Member Portal | Sri Aurobindo Society Lucknow",
  description: "Member Parichay, Sankalp participation, secure contributions and acknowledgements.",
};

export default function MemberPage() {
  return <MemberClient />;
}
