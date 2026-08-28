import type { Metadata } from "next";
import { ParticipationClient } from "../participate/participation-client";
import "../participate/participate.css";

export const metadata: Metadata = {
  title: "Join the Community | Sri Aurobindo Society Lucknow",
  description: "Create your SAS Lucknow member account, share your Parichay and enter the member community.",
};

export default function JoinCommunityPage() {
  return <ParticipationClient />;
}
