import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("The Next Human Challenge uses a real, stable intro video", async () => {
  const [client, css, video] = await Promise.all([
    read("../app/bharat-uday/bharat-uday-client.tsx"),
    read("../app/bharat-uday/bharat-uday.css"),
    stat(new URL("../public/next-human-challenge-intro.mp4", import.meta.url)),
  ]);
  assert.match(client, /<video ref=\{introFilmRef\} className="bu-hero-film" autoPlay muted playsInline/);
  assert.doesNotMatch(client, /className="bu-hero-film"[^>]*\bloop\b/);
  assert.match(client, /film\.play\(\)\.catch/);
  assert.match(client, /next-human-challenge-intro\.mp4/);
  assert.match(client, /The Next Human <em>Challenge<\/em>/);
  assert.doesNotMatch(client, /bu-hero-glow/);
  assert.doesNotMatch(client, /bharat-uday-motion\.webp/);
  assert.match(css, /\.bu-hero-film\{[^}]*animation:none/);
  assert.match(css, /\.bu-page main\{padding-top:0\}/);
  assert.ok(video.size > 100_000, "intro video should contain rendered motion scenes");
});

test("challenge presentation avoids the former neon-blue campaign palette", async () => {
  const [page, studio, preview, member] = await Promise.all([
    read("../app/bharat-uday/bharat-uday.css"),
    read("../app/admin/campaign-studio.css"),
    read("../app/admin/campaign-mobile-preview.css"),
    read("../app/member/member.css"),
  ]);
  for (const source of [page, studio, preview, member]) {
    const latestTheme = source.slice(source.lastIndexOf("electric_uday") - 80);
    assert.doesNotMatch(latestTheme, /#43d9ff/i);
  }
  assert.match(page, /--bu-night:#061a25/);
  assert.match(page, /--bu-saffron:#f4a42c/);
});

test("challenge attempts rotate questions and keep answers private until completion", async () => {
  const [client, data, css] = await Promise.all([
    read("../app/bharat-uday/bharat-uday-client.tsx"),
    read("../app/bharat-uday/bharat-uday-data.ts"),
    read("../app/bharat-uday/bharat-uday.css"),
  ]);
  assert.match(client, /attempts: Record<number, number>/);
  assert.match(client, /setQuestionOrder\(questionOrderFor\(nextAttempt\)\)/);
  assert.match(client, /Answers are revealed only after all five questions/);
  assert.match(client, /Array\.from\(\{ length: 5 \}/);
  assert.match(data, /function questionOrderFor/);
  assert.match(data, /function questionPromptFor/);
  assert.match(css, /\.bu-question-progress\{display:grid;grid-template-columns:repeat\(5,1fr\)/);
  assert.match(css, /\.bu-question-progress span\.current/);
});

test("Sadhana is a life quotation, not a timed activity", async () => {
  const [client, data, css] = await Promise.all([
    read("../app/bharat-uday/bharat-uday-client.tsx"),
    read("../app/bharat-uday/bharat-uday-data.ts"),
    read("../app/bharat-uday/bharat-uday.css"),
  ]);
  assert.match(client, /SĀDHANA · A WORD FOR LIFE/);
  assert.match(client, /Carry this with me/);
  assert.match(client, /lifeQuoteFor\(levelNumber\)/);
  assert.doesNotMatch(client, /pauseSeconds|pauseRunning|Begin two minutes|Take a two-minute inner pause/);
  assert.match(data, /author: "Sri Aurobindo" \| "The Mother"/);
  assert.match(data, /The future belongs to those who want to progress/);
  assert.match(css, /\.bu-life-quote/);
  assert.match(css, /\.bu-quote-aura/);
});

test("life quote leads directly to the Discovery Card without Abhivyakti", async () => {
  const client = await read("../app/bharat-uday/bharat-uday-client.tsx");
  assert.match(client, /onClick=\{completeLevel\}>Carry this with me & create my card/);
  assert.doesNotMatch(client, /ABHIVYAKTI · YOUR VOICE/);
  assert.doesNotMatch(client, /What stayed with you\?/);
  assert.doesNotMatch(client, /stage === "reflection"/);
  assert.doesNotMatch(client, /<textarea/);
});

test("every level produces a Society-branded certificate with a compact share menu", async () => {
  const [client, css] = await Promise.all([
    read("../app/bharat-uday/bharat-uday-client.tsx"),
    read("../app/bharat-uday/bharat-uday.css"),
  ]);
  assert.match(client, /Certificate of Discovery/);
  assert.match(client, /Sri Aurobindo Society logo/);
  assert.match(client, /An initiative by Sri Aurobindo Society, Lucknow · Gomti Nagar Centre \(UC-02\)/);
  assert.match(client, /Name on your certificate/);
  assert.match(client, /Share Certificate/);
  assert.match(client, /shareMenuOpen && <div className="bu-share-options"/);
  assert.match(client, /Download Certificate/);
  assert.match(css, /\.bu-certificate-brand/);
  assert.match(css, /\.bu-share-options/);
});
