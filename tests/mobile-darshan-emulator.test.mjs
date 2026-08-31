import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const previewPath = new URL("../android-app-design/qa/sas-lucknow-android-redesign-preview.html", import.meta.url);
const serverPath = new URL("../android-app-design/qa/emulator-server.mjs", import.meta.url);

test("Darshan preview uses real playable sound assets and explicit end controls", async () => {
  const html = await readFile(previewPath, "utf8");

  assert.match(html, /public\/quiet-aspiration\.wav/);
  assert.match(html, /public\/inner-sound\/dawn-bells\.wav/);
  assert.match(html, /sound\.play\(\)/);
  assert.match(html, /sound\.pause\(\)/);
  assert.match(html, /sound\.currentTime = 0/);
  assert.match(html, /End listening/);
  assert.match(html, /Listening ended/);
});

test("e-Library opens authoritative sources outside the app", async () => {
  const html = await readFile(previewPath, "utf8");

  assert.match(html, /motherandsriaurobindo\.in\/Sri-Aurobindo\/books/);
  assert.match(html, /motherandsriaurobindo\.in\/The-Mother\/audio/);
  assert.match(html, /window\.open\(sourceUrl, &#x27;_blank&#x27;/);
  assert.match(html, /open official source outside the app/);
});

test("Savitri Sakhi calls the live API and preserves the conversation", async () => {
  const [html, server] = await Promise.all([
    readFile(previewPath, "utf8"),
    readFile(serverPath, "utf8"),
  ]);

  assert.match(html, /sas-lucknow-savitri-sakhi-history-v1/);
  assert.match(html, /\/emulator-api\/savitri-sakhi/);
  assert.match(html, /Savitri Sakhi is reflecting on your question/);
  assert.match(html, /JSON\.stringify\(\{ messages: conversation \}\)/);
  assert.doesNotMatch(html, /Your question has been received\. Savitri Sakhi will compare/);
  assert.match(server, /\["\/emulator-api\/savitri-sakhi", "\/api\/savitri-sakhi"\]/);
  assert.match(server, /\["GET", "HEAD", "POST"\]/);
});

test("Watch Videos and Sangha use live data and functional media and poll controls", async () => {
  const html = await readFile(previewPath, "utf8");

  assert.match(html, /const proxyPath = `\/emulator-api\//);
  assert.match(html, /liveCards\.join/);
  assert.match(html, /youtube-nocookie\.com\/embed/);
  assert.match(html, /postType\.addEventListener\(&#x27;change&#x27;/);
  assert.match(html, /reader\.readAsDataURL\(file\)/);
  assert.match(html, /pollOptions\.length &lt; 2/);
  assert.match(html, /Your vote has been recorded in this app preview/);
});

test("private reflections remain stored with date, time, images and follow-ups", async () => {
  const html = await readFile(previewPath, "utf8");

  assert.match(html, /sas-lucknow-private-reflections-v1/);
  assert.match(html, /localStorage\.setItem\(reflectionStorageKey/);
  assert.match(html, /dateKey/);
  assert.match(html, /followUps/);
  assert.match(html, /thought, image, followUps: \[\]/);
  assert.match(html, /aria-label=&quot;Reflection calendar&quot;/);
  assert.match(html, /green underline marks a day with saved thoughts/i);
});
