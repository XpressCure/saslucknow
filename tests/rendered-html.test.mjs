import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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

function renderedBody(html) {
  return html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] || html;
}

test("renders the mission homepage with accessible landmarks", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sri Aurobindo Society/);
  assert.match(html, /id="pathways"/);
  assert.doesNotMatch(html, /A path towards a more conscious life/);
  assert.doesNotMatch(html, /Integral Yoga invites every part of life/);
  assert.doesNotMatch(html, /Begin exploring/);
  assert.doesNotMatch(html, /A thought for today/);
  assert.match(html, /aria-label="Main navigation"/);
  assert.match(html, /id="wisdom"/);
  assert.match(html, /id="events"/);
  assert.ok(html.indexOf('id="gallery"') < html.indexOf('id="events"'));
  assert.match(html, /href="\/sultanpur-shrine"/);
  assert.doesNotMatch(html, /<a href="#discover">Discover<\/a>/);
  assert.match(html, /Gomti Nagar Centre \(UC-02\)/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("uses the transparent Society logo as the browser icon", async () => {
  const source = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(source, /icons:/);
  assert.match(source, /society-logo-transparent\.png/);
  assert.match(source, /https:\/\/www\.saslucknow\.in/);
});

test("publishes complete homepage SEO metadata and organization data", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Sri Aurobindo Society Lucknow \| Meditation &amp; Culture<\/title>/);
  assert.match(html, /name="description" content="Explore Sri Aurobindo, the Mother \(Mirra Alfassa\), Integral Yoga, Savitri, meditation/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.saslucknow\.in\/"/);
  assert.match(html, /name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"/);
  assert.match(html, /type="application\/ld\+json"/);
  assert.match(html, /"@type":"Organization"/);
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, /4\/668, Vijayant Khand, Gomti Nagar/);
});

test("gives every public guide a unique title, description and canonical URL", async () => {
  const pages = [
    ["/sri-aurobindo", "Sri Aurobindo: Life, Integral Yoga", "independence movement"],
    ["/sri-aurobindo/life-sketch", "Sri Aurobindo Life Sketch", "chronological life story"],
    ["/the-mother", "The Mother (Mirra Alfassa)", "Pondicherry and Auroville"],
    ["/darshan-divas", "Darshan Divas", "spiritual significance"],
    ["/sultanpur-shrine", "Sri Aurobindo Sultanpur Shrine", "sacred relics"],
  ];
  for (const [route, title, description] of pages) {
    const response = await render(route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`<title>${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(html, new RegExp(description));
    assert.match(html, new RegExp(`rel="canonical" href="https:\\/\\/www\\.saslucknow\\.in${route.replaceAll("/", "\\/")}"`));
  }
});

test("publishes crawl rules and a sitemap for every public page", async () => {
  const robotsResponse = await render("/robots.txt");
  assert.equal(robotsResponse.status, 200);
  const robots = await robotsResponse.text();
  assert.match(robots, /User-Agent: \*/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/www\.saslucknow\.in\/sitemap\.xml/);

  const sitemapResponse = await render("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  for (const route of ["/sri-aurobindo", "/sri-aurobindo/life-sketch", "/the-mother", "/darshan-divas", "/sultanpur-shrine"]) {
    assert.match(sitemap, new RegExp(`https:\\/\\/www\\.saslucknow\\.in${route.replaceAll("/", "\\/")}`));
  }
});

test("applies phone-safe layouts to every page family and floating experience", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /Full-site responsive hardening/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.pushpanjali-aurobindo\{[^}]*object-position:30% 30%/);
  assert.match(css, /\.pushpanjali-heading\{[^}]*grid-template-areas:"empty eyebrow counter"/);
  assert.match(css, /\.pushpanjali-counter\{[^}]*grid-area:counter[^}]*align-items:flex-end[^}]*text-align:right/);
  assert.match(css, /\.pushpanjali-form\{[^}]*display:grid[^}]*grid-template-rows:auto minmax\(0,1fr\) auto auto/);
  assert.match(css, /\.pushpanjali-flowers>label\{[^}]*display:grid[^}]*grid-template-rows:96px minmax\(0,1fr\)/);
  assert.match(css, /\.pushpanjali-flowers\{display:grid;grid-template-columns:1fr;grid-auto-rows:auto/);
  assert.match(css, /\.pushpanjali-flowers>label\{display:grid;grid-template-columns:104px minmax\(0,1fr\);grid-template-rows:minmax\(126px,auto\)/);
  assert.match(css, /\.pushpanjali-flowers b\{font-size:1rem/);
  assert.match(css, /\.pushpanjali-flowers q\{[^}]*font-size:\.76rem/);
  assert.match(css, /\.pushpanjali-flowers small\{[^}]*font-size:\.62rem/);
  assert.match(css, /\.pushpanjali-backdrop\{width:100vw;max-width:none/);
  assert.match(css, /\.pushpanjali-modal\{width:100vw;max-width:none/);
  assert.match(css, /\.pushpanjali-success h3\{[^}]*flex-direction:column/);
  for (const selector of [
    ".site-header",
    ".detail-header",
    ".biography-hero",
    ".life-sketch-hero",
    ".darshan-grid article",
    ".gallery-slide",
    ".pushpanjali-modal",
    ".sakhi-window",
  ]) assert.match(css, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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
  assert.doesNotMatch(html, /CWSA Vol\. 12, p\. 157/);
});

test("renders location, weekly meeting, gallery and Facebook embed", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /The Song of Life/);
  assert.match(html, /4\/668, Vijayant Khand/);
  assert.match(html, /Weekly collective meeting/);
  assert.doesNotMatch(html, /SPECIAL OBSERVANCE · OFFLINE/);
  assert.doesNotMatch(html, /SAVITRI STUDY · ONLINE/);
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

test("renders The Song of Savitri directly after Lives and Vision", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /id="song-of-savitri"/);
  assert.match(html, /The Song of Savitri/);
  assert.match(html, /SAVITRI · IN VISION, VERSE &amp; MEANING/);
  assert.match(html, /Five luminous lines at a time/);
  assert.doesNotMatch(html, /SAVITRI · IN IMAGE, WORD &amp; MEANING/);
  assert.ok(html.indexOf('id="guides-title"') < html.indexOf('id="song-of-savitri"'));
  assert.ok(html.indexOf('id="song-of-savitri"') < html.indexOf('aria-labelledby="roots-title"'));
  const source = await readFile(new URL("../app/mission-home.tsx", import.meta.url), "utf8");
  for (const field of ["Part", "Book No.", "Canto No.", "Name of Canto", "Line Nos.", "Page No.", "Description", "Upload Video"]) {
    assert.match(source, new RegExp(field.replace(".", "\\.")));
  }
  assert.match(source, /\/api\/savitri-video-submissions/);
  assert.match(source, /\/api\/savitri-videos/);
  assert.doesNotMatch(source, /className="savitri-video-description"/);
});

test("stores and lists a Song of Savitri video", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sas-savitri-videos-"));
  const previousUploadDirectory = process.env.UPLOAD_DIR;
  const previousMongo = process.env.MONGODB_URI;
  process.env.UPLOAD_DIR = directory;
  delete process.env.MONGODB_URI;
  const moduleUrl = new URL("../server/gallery-api.mjs", import.meta.url);
  moduleUrl.searchParams.set("savitri-test", `${process.pid}-${Date.now()}`);
  const { createGalleryServer } = await import(moduleUrl.href);
  const server = createGalleryServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    const form = new FormData();
    form.set("part", "One");
    form.set("bookNo", "1");
    form.set("cantoNo", "1");
    form.set("cantoName", "The Symbol Dawn");
    form.set("lineNos", "1-5");
    form.set("pageNo", "1");
    form.set("description", "Five opening lines with English and Hindi meaning.");
    form.set("media", new Blob([Buffer.alloc(2048, 1)], { type: "video/mp4" }), "symbol-dawn.mp4");
    const uploadResponse = await fetch(`http://127.0.0.1:${address.port}/api/savitri-video-submissions`, { method: "POST", body: form });
    assert.equal(uploadResponse.status, 201);
    const uploadResult = await uploadResponse.json();
    assert.equal(uploadResult.status, "approved");
    const listResponse = await fetch(`http://127.0.0.1:${address.port}/api/savitri-videos`);
    assert.equal(listResponse.status, 200);
    const list = await listResponse.json();
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].cantoName, "The Symbol Dawn");
    assert.equal(list.items[0].lineNos, "1-5");
    assert.equal(list.items[0].description, "Five opening lines with English and Hindi meaning.");
    assert.match(list.items[0].mediaUrl, /^\/api\/savitri-video-media\//);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
    if (previousUploadDirectory === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = previousUploadDirectory;
    if (previousMongo === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previousMongo;
  }
});

test("renders the 15 August Pushpanjali campaign entry point", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Pushpanjali/);
  assert.match(html, /15 August 2026/i);
  const source = await readFile(new URL("../app/pushpanjali-campaign.tsx", import.meta.url), "utf8");
  for (const asset of [
    "pushpanjali-certificate-ornamental-bg.png",
    "society-logo-transparent.png",
    "pushpanjali-sri-aurobindo.jpg",
    "pushpanjali-divine-love-cutout.png",
    "pushpanjali-integral-love-cutout.png",
    "pushpanjali-supramental-power-cutout.png",
  ]) {
    assert.match(source, new RegExp(asset.replace(".", "\\.")));
    assert.ok((await stat(new URL(`../public/${asset}`, import.meta.url))).size > 10_000);
  }
  assert.match(source, /1872-1950/);
  assert.match(source, /society-logo-transparent\.png/);
  assert.match(source, /ornamentalBackground/);
  assert.match(source, /const \[open, setOpen\] = useState\(true\)/);
  assert.match(source, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.doesNotMatch(source, /sas-pushpanjali-2026-seen|550/);
  assert.doesNotMatch(source, /WhatsApp mobile number|setPhone/);
  assert.doesNotMatch(source, /pushpanjali-thank-flower/);
  assert.doesNotMatch(source, /pushpanjali-flower-label[^>]*>Flower offered/);
  assert.match(source, /<h3><span>With gratitude,<\/span><em>\{name\.trim\(\)\}\.<\/em><\/h3>/);
  assert.match(source, /const portraitHeight = 763/);
  assert.match(source, /const focalX = portrait\.width \* \.432/);
  assert.match(source, /context\.font = "bold 34px Georgia"/);
  assert.match(source, /let nameFontSize = 66/);
  assert.match(source, /const headerWidth = logoWidth \+ headerGap \+ societyWidth/);
  assert.match(source, /context\.fillText\("Flower Offered", contentLeft, 610\)/);
  assert.match(source, /context\.fillText\("BOTANICAL NAME \/ VARIETY", contentLeft, 650\)/);
  assert.match(source, /context\.fillText\(selectedFlower\.botanical, contentLeft, 675\)/);
  assert.match(source, /context\.fillText\(selectedFlower\.name, contentLeft, 795\)/);
  assert.match(source, /context\.drawImage\(flower, 1235, 610, 220, 220\)/);
  assert.match(source, /setStatus\("offered"\)[\s\S]*?await fetch\(offeringEndpoint\(\)/);
  assert.ok((source.match(/const flowerPositions = \[([^\]]+)/)?.[1].split(",").length || 0) >= 30);
  assert.match(source, /154th Birthday\./);
  assert.match(source, /15 AUGUST 2026  \|  DARSHAN DIVAS/);
  assert.match(source, /CERTIFICATE NUMBER:/);
  const apiSource = await readFile(new URL("../server/gallery-api.mjs", import.meta.url), "utf8");
  assert.match(apiSource, /YOUR PUSHPA HAS BEEN OFFERED/);
  assert.match(apiSource, /contentDisposition: "inline"/);
  assert.match(apiSource, /cid: `pushpanjali-certificate-\$\{reference\}`/);
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
      body: JSON.stringify({ name: "Test Devotee", email: "devotee@example.com", flowerId: "integral-love" }),
    });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.ok, true);
    assert.equal(result.emailed, false);
    assert.equal(result.emailQueued, false);
    assert.equal(result.emailToken, "");
    assert.equal(result.offeringNumber, 1);
    assert.equal(result.reference, "UC02-000001");
    const files = await readdir(directory);
    const offeringFiles = files.filter(name => name.endsWith(".json"));
    assert.equal(offeringFiles.length, 0);
    const secondResponse = await fetch(`http://127.0.0.1:${address.port}/api/pushpanjali-offerings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Second Devotee", email: "second@example.com", flowerId: "divine-love" }),
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

test("queues the generated Pushpanjali certificate image for inline email delivery", async () => {
  const source = await readFile(new URL("../server/gallery-api.mjs", import.meta.url), "utf8");
  assert.match(source, /pendingPushpanjaliEmails\.set\(emailToken/);
  assert.match(source, /contentDisposition: "inline"/);
  assert.match(source, /cid: `pushpanjali-certificate-\$\{reference\}`/);
  assert.match(source, /YOUR PUSHPA HAS BEEN OFFERED/);
  assert.match(source, /emailQueued,/);
});

test("assigns sequential UC-02 certificate numbers to legacy offerings", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sas-pushpanjali-migration-"));
  try {
    await writeFile(path.join(directory, "later.json"), JSON.stringify({ offeringId: "later", reference: "legacy-b", createdAt: "2026-08-02T10:00:00.000Z" }));
    await writeFile(path.join(directory, "earlier.json"), JSON.stringify({ offeringId: "earlier", reference: "legacy-a", createdAt: "2026-08-01T10:00:00.000Z" }));
    const { migratePushpanjaliCertificateNumbers } = await import("../scripts/migrate-pushpanjali-certificate-numbers.mjs");
    const result = await migratePushpanjaliCertificateNumbers(directory);
    assert.equal(result.migrated, 2);
    assert.equal(result.counter, 2);
    assert.equal(JSON.parse(await readFile(path.join(directory, "earlier.json"), "utf8")).certificateNumber, "UC02-000001");
    assert.equal(JSON.parse(await readFile(path.join(directory, "later.json"), "utf8")).certificateNumber, "UC02-000002");
    assert.equal(await readFile(path.join(directory, ".certificate-counter"), "utf8"), "2");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("renders official Society identity, email, roots and sourced wisdom", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Sri Aurobindo Society/);
  assert.match(html, /society-logo-transparent\.png/);
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
  assert.doesNotMatch(renderedBody(html), /href="https?:\/\//);
});

test("renders the internal chronological life sketch", async () => {
  const response = await render("/sri-aurobindo/life-sketch");
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const heading of ["Origins and education", "India’s awakening", "Pondicherry and Integral Yoga", "Alipore Jail", "Siddhi Day and the Ashram"]) assert.match(html, new RegExp(heading));
  assert.match(html, /Sri Aurobindo Ashram photographic exhibition/);
  assert.match(html, /src="\/sri-aurobindo-portrait\.jpg"/);
  assert.doesNotMatch(renderedBody(html), /href="https?:\/\//);
});

test("homepage biography cards use internal routes", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /href="\/sri-aurobindo\/life-sketch"/);
  assert.match(html, /href="\/the-mother"/);
  assert.doesNotMatch(html, /href="https:\/\/www\.sriaurobindoashram\.org\/exhibitions\/a-life-sketch\/page01\.html"[^>]*>Read the authorised/);
});

test("displays all four vision explanations inside their boxes", async () => {
  const response = await render();
  const html = await response.text();
  assert.ok(html.indexOf('id="pathways"') < html.indexOf('aria-labelledby="guides-title"'));
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
  assert.doesNotMatch(renderedBody(html), /href="https?:\/\//);
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
