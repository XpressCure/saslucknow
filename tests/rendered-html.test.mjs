import assert from "node:assert/strict";
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
  assert.match(html, /id="shrine"/);
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
  assert.match(html, /Every submission is reviewed before publication/);
  assert.match(html, /Swipe left or right to explore approved event memories/);
  assert.doesNotMatch(html, /Ideas that open doors/);
  assert.doesNotMatch(html, /Learning together/);
  assert.doesNotMatch(html, /A place of remembrance/);
});

test("renders official Society identity, email, roots and sourced wisdom", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Sri Aurobindo Society/);
  assert.match(html, /sas-symbol%281%29\.jpg/);
  assert.match(html, /info\.saslucknow@gmail\.com/);
  assert.match(html, /From Puducherry to Lucknow/);
  assert.match(html, /Auroville is an international township/);
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
