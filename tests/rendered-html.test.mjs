import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the mission homepage with accessible landmarks", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sri Aurobindo Society/);
  assert.match(html, /A quiet space for inner growth/);
  assert.match(html, /aria-label="Main navigation"/);
  assert.match(html, /id="wisdom"/);
  assert.match(html, /id="events"/);
  assert.match(html, /href="\/sultanpur-shrine"/);
  assert.doesNotMatch(html, /<a href="#discover">Discover<\/a>/);
  assert.match(html, /Gomti Nagar Centre \(UC-02\)/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("renders the Sultanpur Shrine detail page", async () => {
  const response = await render("/sultanpur-shrine");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /The Sultanpur Shrine/);
  assert.match(html, /April 6, 2008/);
  assert.match(html, /Dr\. J\. P\. Singh/);
  assert.match(html, /Address and map coming soon/);
});

test("renders sourced portraits and the lecture archive", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Portrait of Sri Aurobindo/);
  assert.match(html, /Portrait of the Mother/);
  assert.match(html, /LUCKNOW LECTURE ARCHIVE/);
  assert.match(html, /CWSA Vol\. 12, p\. 157/);
});

test("renders location, weekly meeting, gallery and Facebook embed", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /The Song of Life/);
  assert.match(html, /4\/668, Vijayant Khand/);
  assert.match(html, /6:00–7:00 PM/);
  assert.match(html, /73888 99001/);
  assert.match(html, /facebook\.com%2Fsaslucknow/);
  assert.match(html, /Upload event photos or videos/);
  assert.match(html, /Videos are published automatically/);
  assert.match(html, /Stop soft meditation music/);
  assert.match(html, /autoplay=""/i);
  assert.doesNotMatch(html, /Enter with music|Continue in silence/);
  assert.match(html, /src="\/quiet-aspiration\.wav"/);
  assert.match(html, /Savitri Sakhi/);
  assert.match(html, /Open Savitri Sakhi/);
  assert.doesNotMatch(html, /Swipe left or right to explore approved event memories/);
  assert.doesNotMatch(html, /Ideas that open doors/);
  assert.doesNotMatch(html, /Learning together/);
  assert.doesNotMatch(html, /A place of remembrance/);
});

test("renders the 15 August Pushpanjali campaign entry point", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Pushpanjali/);
  assert.match(html, /15 August 2026/);
  const source = await readFile(new URL("../app/pushpanjali-campaign.tsx", import.meta.url), "utf8");
  for (const asset of [
    "pushpanjali-sri-aurobindo.jpg",
    "pushpanjali-divine-love-cutout.png",
    "pushpanjali-integral-love-cutout.png",
    "pushpanjali-supramental-power-cutout.png",
  ]) {
    assert.match(source, new RegExp(asset.replace(".", "\\.")));
    assert.ok((await stat(new URL(`../public/${asset}`, import.meta.url))).size > 10_000);
  }
  assert.match(source, /1872–1950/);
  assert.match(source, /154th Birthday/);
  assert.match(source, /15 AUGUST 2026  \|  DARSHAN DIVAS/);
  assert.match(source, /CERTIFICATE NUMBER:/);
});

test("records a Pushpanjali offering and returns a certificate reference", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sas-pushpanjali-"));
  const previousDirectory = process.env.PUSHPANJALI_DIR;
  const previousMongo = process.env.MONGODB_URI;
  const previousSmtpHost = process.env.SMTP_HOST;
  process.env.PUSHPANJALI_DIR = directory;
  delete process.env.MONGODB_URI;
  delete process.env.SMTP_HOST;
  const moduleUrl = new URL("../server/gallery-api.mjs", import.meta.url);
  moduleUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { createGalleryServer } = await import(moduleUrl.href);
  const server = createGalleryServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    const initialCountResponse = await fetch(`http://127.0.0.1:${address.port}/api/pushpanjali-offerings`);
    assert.equal(initialCountResponse.status, 200);
    assert.deepEqual(await initialCountResponse.json(), { ok: true, count: 0 });
    const response = await fetch(`http://127.0.0.1:${address.port}/api/pushpanjali-offerings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Devotee", email: "devotee@example.com", phone: "+91 98765 43210", flowerId: "integral-love" }),
    });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.equal(result.emailed, false);
    assert.equal(result.offeringNumber, 1);
    assert.equal(result.reference, "UC02-000001");
    const files = await readdir(directory);
    const offeringFiles = files.filter(name => name.endsWith(".json"));
    assert.equal(offeringFiles.length, 1);
    const document = JSON.parse(await readFile(path.join(directory, offeringFiles[0]), "utf8"));
    assert.equal(document.participant.phone, "+919876543210");
    assert.equal(document.certificateNumber, "UC02-000001");
    const secondResponse = await fetch(`http://127.0.0.1:${address.port}/api/pushpanjali-offerings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Second Devotee", email: "second@example.com", phone: "9123456789", flowerId: "divine-love" }),
    });
    assert.equal(secondResponse.status, 201);
    const secondResult = await secondResponse.json();
    assert.equal(secondResult.reference, "UC02-000002");
    assert.equal(secondResult.offeringNumber, 2);
    const finalCountResponse = await fetch(`http://127.0.0.1:${address.port}/api/pushpanjali-offerings`);
    assert.equal((await finalCountResponse.json()).count, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
    if (previousDirectory === undefined) delete process.env.PUSHPANJALI_DIR; else process.env.PUSHPANJALI_DIR = previousDirectory;
    if (previousMongo === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previousMongo;
    if (previousSmtpHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = previousSmtpHost;
  }
});

test("renders official Society identity, email, roots and sourced wisdom", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Sri Aurobindo Society/);
  assert.match(html, /sas-symbol%281%29\.jpg/);
  assert.match(html, /info\.saslucknow@gmail\.com/);
  assert.match(html, /From Puducherry to Lucknow/);
  assert.match(html, /Auroville is an international township/);
  assert.match(html, /A sacred centre housing Sri Aurobindo’s relics/);
  assert.doesNotMatch(html, /Begin with what speaks to you/);
  assert.doesNotMatch(html, /A SACRED PLACE<\/p><h2>The Sultanpur shrine/);
  assert.doesNotMatch(html, /WORDS TO LIVE BY|A few lights for the way/);
});

test("renders the complete Sri Aurobindo profile structure", async () => {
  const response = await render("/sri-aurobindo");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const heading of ["Introduction", "Life Sketch", "On Himself", "The Mother on Sri Aurobindo", "Writings", "Translations"]) assert.match(html, new RegExp(heading));
  assert.match(html, /official Ashram website/);
});

test("renders the complete Mother profile structure", async () => {
  const response = await render("/the-mother");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const heading of ["Introduction", "On Herself", "Sri Aurobindo on The Mother", "Writings"]) assert.match(html, new RegExp(heading));
  assert.match(html, /Académie Julian/);
  assert.match(html, /17 November 1973/);
  assert.match(html, /src="\/the-mother-portrait\.jpg"/);
  assert.doesNotMatch(html, /href="https?:\/\//);
});

test("renders the internal chronological life sketch", async () => {
  const response = await render("/sri-aurobindo/life-sketch");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const heading of ["Origins and education", "India’s awakening", "Pondicherry and Integral Yoga", "Alipore Jail", "Siddhi Day and the Ashram"]) assert.match(html, new RegExp(heading));
  assert.match(html, /Sri Aurobindo Ashram photographic exhibition/);
  assert.match(html, /src="\/sri-aurobindo-portrait\.jpg"/);
  assert.doesNotMatch(html, /href="https?:\/\//);
});

test("homepage biography cards use internal routes", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /href="\/sri-aurobindo\/life-sketch"/);
  assert.match(html, /href="\/the-mother"/);
  assert.doesNotMatch(html, /href="https:\/\/www\.sriaurobindoashram\.org\/exhibitions\/a-life-sketch\/page01\.html"[^>]*>Read the authorised/);
});

test("explains all four vision pillars inside their boxes", async () => {
  const response = await render();
  const html = await response.text();
  for (const line of [
    "Discover the deeper self",
    "Let thought, work and relationships",
    "Recognise one spirit in all",
    "Participate consciously in humanity’s movement",
  ]) assert.match(html, new RegExp(line));
});

test("renders the internal Darshan Divas guide and navigation entry", async () => {
  const home = await render();
  const homeHtml = await home.text();
  assert.match(homeHtml, /Darshan Divas/);
  assert.match(homeHtml, /href="\/darshan-divas"/);

  const response = await render("/darshan-divas");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const day of ["The Mother’s Birthday", "Sri Aurobindo’s Birthday", "Siddhi Day", "Supramental Manifestation Day", "Sri Aurobindo’s Mahasamadhi", "The Mother’s Mahasamadhi"]) assert.match(html, new RegExp(day));
  const yearPositions = ["1872", "1878", "1920", "1926", "1950", "1956", "1973"].map(year => html.indexOf(`>${year}<`));
  assert.deepEqual(yearPositions, [...yearPositions].sort((a, b) => a - b));
  assert.doesNotMatch(html, /href="https?:\/\//);
});

test("identifies an indexed Savitri line without an API key", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("sakhi", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/api/savitri-sakhi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Identify this line: All can be done if the god-touch is there" }] }),
  }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.verified, true);
  assert.match(result.answer, /Book 1/);
  assert.match(result.answer, /Canto 1/);
  assert.match(result.answer, /line 78/);
});
