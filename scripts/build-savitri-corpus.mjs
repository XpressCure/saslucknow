import { mkdir, writeFile } from "node:fs/promises";

const books = [
  { part: 1, book: 1, name: "The Book of Beginnings", cantos: [
    "The Symbol Dawn", "The Issue", "The Yoga of the King: The Yoga of the Soul's Release", "The Secret Knowledge", "The Yoga of the King: The Yoga of the Spirit's Freedom and Greatness",
  ] },
  { part: 1, book: 2, name: "The Book of the Traveller of the Worlds", cantos: [
    "The World-Stair", "The Kingdom of Subtle Matter", "The Glory and the Fall of Life", "The Kingdoms of the Little Life", "The Godheads of the Little Life", "The Kingdoms and Godheads of the Greater Life", "The Descent into Night", "The World of Falsehood, the Mother of Evil and the Sons of Darkness", "The Paradise of the Life-Gods", "The Kingdoms and Godheads of the Little Mind", "The Kingdoms and Godheads of the Greater Mind", "The Heavens of the Ideal", "In the Self of Mind", "The World-Soul", "The Kingdoms of the Greater Knowledge",
  ] },
  { part: 1, book: 3, name: "The Book of the Divine Mother", cantos: [
    "The Pursuit of the Unknowable", "The Adoration of the Divine Mother", "The House of the Spirit and the New Creation", "The Vision and the Boon",
  ] },
  { part: 2, book: 4, name: "The Book of Birth and Quest", cantos: [
    "The Birth and Childhood of the Flame", "The Growth of the Flame", "The Call to the Quest", "The Quest",
  ] },
  { part: 2, book: 5, name: "The Book of Love", cantos: [
    "The Destined Meeting-Place", "Satyavan", "Satyavan and Savitri",
  ] },
  { part: 2, book: 6, name: "The Book of Fate", cantos: [
    "The Word of Fate", "The Way of Fate and the Problem of Pain",
  ] },
  { part: 2, book: 7, name: "The Book of Yoga", cantos: [
    "The Joy of Union; the Ordeal of the Foreknowledge of Death and the Heart's Grief and Pain", "The Parable of the Search for the Soul", "The Entry into the Inner Countries", "The Triple Soul-Forces", "The Finding of the Soul", "Nirvana and the Discovery of the All-Negating Absolute", "The Discovery of the Cosmic Spirit and the Cosmic Consciousness",
  ] },
  { part: 2, book: 8, name: "The Book of Death", cantoOffset: 2, cantos: ["Death in the Forest"] },
  { part: 3, book: 9, name: "The Book of Eternal Night", cantos: [
    "Towards the Black Void", "The Journey in Eternal Night and the Voice of the Darkness",
  ] },
  { part: 3, book: 10, name: "The Book of the Double Twilight", cantos: [
    "The Dream Twilight of the Ideal", "The Gospel of Death and Vanity of the Ideal", "The Debate of Love and Death", "The Dream Twilight of the Earthly Real",
  ] },
  { part: 3, book: 11, name: "The Book of Everlasting Day", cantos: [
    "The Eternal Day: The Soul's Choice and the Supreme Consummation",
  ] },
  { part: 3, book: 12, name: "Epilogue", epilogue: true, cantos: ["The Return to Earth"] },
];

const numberWords = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen"];

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function textLines(html) {
  return decodeHtml(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|td|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalized(value) {
  return value.replace(/[’‘]/g, "'").replace(/[–—]/g, "-").replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
}

function locateTitle(lines, start, title) {
  const target = normalized(title);
  let joined = "";
  for (let i = start; i < Math.min(lines.length, start + 6); i += 1) {
    joined = `${joined} ${lines[i]}`.trim();
    if (normalized(joined) === target) return i + 1;
  }
  throw new Error(`Could not locate canto title: ${title}`);
}

const metadata = [];
let fileNumber = 1;
for (const book of books) {
  for (let index = 0; index < book.cantos.length; index += 1) {
    const canto = index + 1 + (book.cantoOffset || 0);
    metadata.push({
      part: book.part,
      book: book.book,
      bookName: book.name,
      canto,
      cantoName: book.cantos[index],
      heading: book.epilogue ? "Epilogue" : `Canto ${numberWords[canto - 1]}`,
      sourceUrl: `https://sri-aurobindo.co.in/workings/sa/2829/${String(fileNumber).padStart(4, "0")}_e.htm`,
    });
    fileNumber += 1;
  }
}

if (metadata.length !== 49) throw new Error(`Expected 49 cantos, got ${metadata.length}`);

async function fetchCanto(meta) {
  const response = await fetch(meta.sourceUrl, { headers: { "User-Agent": "SASLucknow-SavitriReference/1.0" } });
  if (!response.ok) throw new Error(`${meta.sourceUrl}: HTTP ${response.status}`);
  const lines = textLines(await response.text());
  const headings = meta.heading === "Epilogue" ? [meta.cantoName] : [meta.heading, `Canto ${meta.canto}`];
  let headingIndex = meta.heading === "Epilogue"
    ? lines.findIndex(line => normalized(line) === normalized(meta.cantoName))
    : lines.findIndex(line => headings.some(heading => normalized(line) === normalized(`${heading}. ${meta.cantoName}`)));
  let poemStart;
  if (headingIndex >= 0) {
    poemStart = headingIndex + 1;
  } else {
    headingIndex = lines.findIndex(line => headings.some(heading => normalized(line) === normalized(heading)));
    if (headingIndex < 0) throw new Error(`${meta.sourceUrl}: missing heading ${headings.join(" / ")}`);
    poemStart = locateTitle(lines, headingIndex + 1, meta.cantoName);
  }
  let poemEnd = lines.findIndex((line, index) => index > poemStart && /^End of /i.test(line));
  if (poemEnd < 0) poemEnd = lines.findIndex((line, index) => index > poemStart && /^in Russian$/i.test(line));
  if (poemEnd < 0) throw new Error(`${meta.sourceUrl}: missing end marker`);
  const poemLines = lines.slice(poemStart, poemEnd).filter(line => line.length > 1 && !/^\d+$/.test(line));
  if (poemLines.length < 20) throw new Error(`${meta.sourceUrl}: only ${poemLines.length} poem lines found`);
  return { ...meta, lines: poemLines };
}

const cantos = [];
for (let i = 0; i < metadata.length; i += 5) {
  const batch = metadata.slice(i, i + 5);
  cantos.push(...await Promise.all(batch.map(fetchCanto)));
  process.stdout.write(`Fetched ${Math.min(i + batch.length, metadata.length)}/${metadata.length}\n`);
}

const totalLines = cantos.reduce((sum, canto) => sum + canto.lines.length, 0);
if (totalLines < 23000 || totalLines > 24500) throw new Error(`Unexpected total line count: ${totalLines}`);

const corpus = {
  edition: "CWSA Volumes 33-34, fourth revised edition (1993)",
  lineNumbering: "Lines are numbered within each canto by this website index.",
  generatedAt: new Date().toISOString(),
  totalLines,
  cantos,
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/savitri-corpus.json", import.meta.url), `${JSON.stringify(corpus)}\n`, "utf8");
process.stdout.write(`Wrote ${cantos.length} cantos and ${totalLines} lines.\n`);
