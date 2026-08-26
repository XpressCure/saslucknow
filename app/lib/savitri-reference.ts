import { readFileSync } from "node:fs";
import { join } from "node:path";

type CorpusCanto = {
  part: number;
  book: number;
  bookName: string;
  canto: number;
  cantoName: string;
  sourceUrl: string;
  lines: string[];
};

type Corpus = {
  edition: string;
  lineNumbering: string;
  cantos: CorpusCanto[];
};

export type SavitriMatch = {
  confidence: "exact" | "strong";
  score: number;
  part: number;
  book: number;
  bookName: string;
  canto: number;
  cantoName: string;
  startLine: number;
  endLine: number;
  passage: string[];
  sourceUrl: string;
};

let corpusCache: Corpus | undefined;

function getCorpus(): Corpus {
  if (corpusCache) return corpusCache;
  try {
    corpusCache = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "savitri-corpus.json"), "utf8")) as Corpus;
  } catch (error) {
    console.error("Savitri reference corpus could not be loaded", error);
    corpusCache = { edition: "", lineNumbering: "", cantos: [] };
  }
  return corpusCache;
}
const QUESTION_WORDS = new Set([
  "a", "about", "and", "are", "book", "canto", "can", "could", "explain",
  "find", "for", "from", "give", "identify", "in", "is", "it", "line",
  "lines", "me", "number", "of", "please", "quote", "savitri", "source",
  "tell", "the", "this", "to", "what", "where", "which", "who", "you",
]);

function words(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];
}

function extractQuotedWords(question: string): string[] {
  // Visitors often paste a line after a colon without quotation marks.
  // Preserve every word in the verse so connective words do not break exact
  // phrase matching (for example: "All can be done if...").
  const afterColon = question.match(/:\s*([\s\S]{8,})$/)?.[1];
  const colonWords = afterColon ? words(afterColon.replace(/[?]+$/, "")) : [];
  if (colonWords.length >= 3) return colonWords;

  // A line pasted on its own line is also treated as a verbatim quotation.
  const pastedLine = question
    .split(/\r?\n/)
    .map(line => words(line.trim()))
    .filter(lineWords => lineWords.length >= 3)
    .sort((a, b) => b.length - a.length)[0];
  if (pastedLine?.length >= 3 && question.includes("\n")) return pastedLine;

  const quoted = [...question.matchAll(/[“"]([^”"]{8,})[”"]/g)]
    .map(match => words(match[1]))
    .sort((a, b) => b.length - a.length)[0];
  if (quoted?.length >= 3) return quoted;

  // A visitor may paste only the verse, with no quotation marks or prompt.
  // Keep its connective words intact so it can be matched verbatim.
  const rawWords = words(question.trim());
  const looksLikeQuestion = /^(?:please\s+)?(?:what|where|which|who|when|why|how|explain|identify|find|tell|can you|could you|would you)\b/i.test(question.trim());
  if (rawWords.length >= 4 && !looksLikeQuestion && !question.includes("?")) return rawWords;

  return words(question).filter(word => !QUESTION_WORDS.has(word));
}

function containsSequence(haystack: string[], needle: string[]): number {
  if (!needle.length || needle.length > haystack.length) return -1;
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function overlapScore(query: string[], candidate: string[]): number {
  const querySet = new Set(query);
  const candidateSet = new Set(candidate);
  let overlap = 0;
  for (const token of querySet) if (candidateSet.has(token)) overlap += 1;
  const coverage = overlap / Math.max(1, querySet.size);
  let orderedPairs = 0;
  let matchedPairs = 0;
  for (let i = 0; i < query.length - 1; i += 1) {
    orderedPairs += 1;
    const pair = `${query[i]} ${query[i + 1]}`;
    if (candidate.join(" ").includes(pair)) matchedPairs += 1;
  }
  const order = orderedPairs ? matchedPairs / orderedPairs : coverage;
  return coverage * 0.72 + order * 0.28;
}

export function findSavitriMatches(question: string, limit = 3): SavitriMatch[] {
  const corpus = getCorpus();
  const query = extractQuotedWords(question);
  if (query.length < 3 || !Array.isArray(corpus.cantos) || corpus.cantos.length === 0) return [];

  const exact: SavitriMatch[] = [];
  const fuzzy: SavitriMatch[] = [];

  for (const canto of corpus.cantos) {
    for (let start = 0; start < canto.lines.length; start += 1) {
      const windowLines = canto.lines.slice(start, Math.min(canto.lines.length, start + 5));
      const windowWords = words(windowLines.join(" "));
      const sequenceStart = containsSequence(windowWords, query);
      if (sequenceStart >= 0) {
        const sequenceEnd = sequenceStart + query.length - 1;
        let wordOffset = 0;
        let matchStart = start;
        let matchEnd = start;

        for (let lineOffset = 0; lineOffset < windowLines.length; lineOffset += 1) {
          const lineWordCount = words(windowLines[lineOffset]).length;
          const lineLastWord = wordOffset + lineWordCount - 1;
          if (sequenceStart >= wordOffset && sequenceStart <= lineLastWord) matchStart = start + lineOffset;
          if (sequenceEnd >= wordOffset && sequenceEnd <= lineLastWord) {
            matchEnd = start + lineOffset;
            break;
          }
          wordOffset += lineWordCount;
        }

        exact.push(toMatch(canto, matchStart, matchEnd, 1, "exact"));
        continue;
      }

      if (query.length >= 5) {
        const score = overlapScore(query, windowWords);
        if (score >= 0.7) fuzzy.push(toMatch(canto, start, Math.min(canto.lines.length - 1, start + 4), score, "strong"));
      }
    }
  }

  const results = exact.length ? exact : fuzzy.sort((a, b) => b.score - a.score);
  const unique = new Map<string, SavitriMatch>();
  for (const match of results) {
    const key = `${match.book}:${match.canto}:${match.startLine}`;
    if (!unique.has(key)) unique.set(key, match);
    if (unique.size >= limit) break;
  }
  return [...unique.values()];
}

function toMatch(canto: CorpusCanto, start: number, end: number, score: number, confidence: SavitriMatch["confidence"]): SavitriMatch {
  const contextStart = Math.max(0, start - 2);
  const contextEnd = Math.min(canto.lines.length, end + 3);
  return {
    confidence,
    score,
    part: canto.part,
    book: canto.book,
    bookName: canto.bookName,
    canto: canto.canto,
    cantoName: canto.cantoName,
    startLine: start + 1,
    endLine: end + 1,
    passage: canto.lines.slice(contextStart, contextEnd),
    sourceUrl: canto.sourceUrl,
  };
}

export function formatReferenceContext(matches: SavitriMatch[]): string {
  if (!matches.length) return "No reliable local Savitri text match was found.";
  return matches.map((match, index) => [
    `MATCH ${index + 1} (${match.confidence}, score ${match.score.toFixed(2)})`,
    `Savitri, Part ${match.part}, Book ${match.book}: ${match.bookName}`,
    `Canto ${match.canto}: ${match.cantoName}`,
    `Lines ${match.startLine}${match.endLine === match.startLine ? "" : `-${match.endLine}`} within this canto`,
    `Passage:\n${match.passage.join("\n")}`,
    `Text source: ${match.sourceUrl}`,
  ].join("\n")).join("\n\n");
}

