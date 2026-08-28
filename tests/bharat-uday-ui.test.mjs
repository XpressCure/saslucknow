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
  assert.match(client, /<video ref=\{introFilmRef\} className="bu-hero-film" autoPlay muted loop playsInline/);
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
