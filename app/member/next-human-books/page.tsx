import type { Metadata } from "next";
import { NextHumanBooksClient } from "./books-client";
import "./books.css";

export const metadata: Metadata = {
  title: "My NEXT HUMAN Books | Member Portal",
  description: "Read NEXT HUMAN Book Zero and access Book One in English and Hindi.",
};

export default function NextHumanBooksPage() {
  return <NextHumanBooksClient />;
}
