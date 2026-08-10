import type { Metadata } from "next";
import { ParticipationClient } from "./participation-client";
import "./participate.css";

export const metadata: Metadata = {
  title: "Participate | Sri Aurobindo Society Lucknow",
  description: "Offer your Parichay, join a Sankalp and support the shared work of Sri Aurobindo Society Lucknow.",
};

export default function ParticipatePage() {
  return <ParticipationClient />;
}
