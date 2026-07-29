import type { Metadata } from "next";
import { MissionHome } from "./mission-home";

export const metadata: Metadata = {
  title: "Sri Aurobindo Society, Lucknow | The Song of Life",
  description: "A spiritual and educational initiative inspired by Sri Aurobindo and the Mother in Lucknow and Sultanpur.",
};

export default function Home() {
  return <MissionHome />;
}
