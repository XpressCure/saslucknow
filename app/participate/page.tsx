import type { Metadata } from "next";
import { ParticipationClient } from "./participation-client";
import "./participate.css";

export const metadata: Metadata = {
  title: "Join SAS Lucknow | Sri Aurobindo Society",
  description: "Create your SAS Lucknow member account, tell us about yourself and begin participating in Sankalp, seva and Yogdaan.",
};

export default function ParticipatePage() {
  return <ParticipationClient />;
}
