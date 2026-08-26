import type { Metadata } from "next";
import { ParticipationClient } from "./participation-client";
import "./participate.css";

export const metadata: Metadata = {
  title: "Join the Community | Sri Aurobindo Society",
  description: "Create your SAS Lucknow member account, tell us about yourself and begin participating in Sankalp, seva and Yogdaan.",
};

export default function ParticipatePage() {
  return <ParticipationClient />;
}

