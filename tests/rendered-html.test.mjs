import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
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
  assert.match(html, /Upload event photographs/);
});

test("renders official Society identity, email, roots and sourced wisdom", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Sri Aurobindo Society/);
  assert.match(html, /sas-symbol%281%29\.jpg/);
  assert.match(html, /info\.saslucknow@gmail\.com/);
  assert.match(html, /From Puducherry to Lucknow/);
  assert.match(html, /Auroville is an international township/);
  assert.match(html, /To know is good, to live is better/);
});
