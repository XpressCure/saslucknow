import { NextRequest, NextResponse } from "next/server";

type SearchItem = {
  title?: string | { rendered?: string };
  url?: string;
  link?: string;
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  type?: string;
  subtype?: string;
};

type LibrarySearchItem = {
  title: string;
  snippet: string;
  category: string;
  source: string;
  href: string;
};

const BASE_LIBRARY = "https://www.motherandsriaurobindo.in";
const SOLR_SEARCH = "https://sriaurobindoinstitute.in/dwrpl.php";

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripMarkup(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function officialHref(value: string): string {
  try {
    const url = new URL(value, BASE_LIBRARY);
    if (url.hostname === "motherandsriaurobindo.in" || url.hostname === "www.motherandsriaurobindo.in") return url.toString();
  } catch {
    // Invalid result URLs are discarded by the caller.
  }
  return "";
}

function normalizeCategory(value: unknown): string {
  if (typeof value !== "string") return "Result";
  const v = value.trim().toLowerCase();
  if (["post", "page", "media", "video", "book", "books", "audio", "disciple", "disciples", "savitri", "mother", "sri-aurobindo"].includes(v)) {
    if (v === "book" || v === "books") return "Books";
    if (v === "audio") return "Audio";
  }
  return value.trim();
}

function inferCategoryFromUrl(url: string, fallback: string): string {
  const link = url.toLowerCase();
  if (fallback === "Books" || fallback === "Audio") return fallback;
  if (link.includes("/books/") || link.includes("/book/")) return "Books";
  if (link.includes("/audio/") || link.includes("/music/")) return "Audio";
  return "Explore";
}

function ensureUnique(items: LibrarySearchItem[]): LibrarySearchItem[] {
  const seen = new Set<string>();
  const unique: LibrarySearchItem[] = [];
  for (const item of items) {
    const key = `${item.href}::${item.title}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}

function normalizeSnippet(value: unknown): string {
  if (typeof value !== "string") return "Open this result on the source site.";
  return stripMarkup(value).slice(0, 240);
}

function parseSolrResults(html: string): LibrarySearchItem[] {
  const cards = html.match(/<div\s+class="row mx-md-n2 myminht[^>]*"\s+id="r\d+">[\s\S]*?(?=<br><hr><br>|$)/gi) || [];

  return cards.map(card => {
    const heading = card.match(/<h3[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i);
    if (!heading) return null;

    const href = officialHref(heading[1]);
    if (!href || !heading[1].includes("/chapterise.php?")) return null;

    const snippetMatch = card.match(/<p\s+class="text-justify[^>]*>([\s\S]*?)<\/p>/i);
    const title = stripMarkup(heading[2]).replace(/\s*>\s*/g, " · ");
    const snippet = normalizeSnippet(snippetMatch?.[1] || "Matching passage from the e-Library full-text index.");
    return {
      title,
      snippet,
      category: "Full-text result",
      source: "The Mother & Sri Aurobindo e-Library",
      href,
    } satisfies LibrarySearchItem;
  }).filter((item): item is LibrarySearchItem => Boolean(item)).slice(0, 20);
}

async function searchViaSolr(query: string): Promise<LibrarySearchItem[] | null> {
  const params = new URLSearchParams({
    pguri: "SOLR",
    goto_page: "1",
    filterBookColl: "",
    filterBook: "",
    filterBookLang: "",
    filterAuthor: "",
    inq: query,
  });
  const response = await fetch(`${SOLR_SEARCH}?${params}`, {
    headers: {
      "User-Agent": "SAS-Lucknow-Library-Search/2.0",
      Referer: `${BASE_LIBRARY}/serp.php?inq=${encodeURIComponent(query)}`,
    },
    signal: AbortSignal.timeout(25000),
    next: { revalidate: 900 },
  });
  if (!response.ok) return null;
  const results = parseSolrResults(await response.text());
  return results.length ? results : null;
}

function fallbackFromSearchPage(html: string, query: string): LibrarySearchItem[] {
  const titleRegex = /<a[^>]+href="([^"\s]+)"[^>]*>(.*?)<\/a>/gi;
  const text = html.slice(0, 190000);
  const found: LibrarySearchItem[] = [];
  let match: RegExpExecArray | null;
  const lower = query.toLowerCase();

  while ((match = titleRegex.exec(text)) !== null) {
    const href = officialHref(match[1]);
    const title = stripMarkup(match[2]);
    if (!href || !title || title.length < 3) continue;
    if (title.toLowerCase() === "read more" || title.toLowerCase() === "more" || href.includes("/wp-json/") || href.includes("#")) {
      continue;
    }

    found.push({
      title,
      href,
      category: "Explore",
      source: "The Mother & Sri Aurobindo e-Library",
      snippet: `Search result for "${query}" from the official website index.`,
    });
    if (found.length >= 20) break;
  }

  return found
    .filter(item => item.title.toLowerCase().includes(lower))
    .slice(0, 12);
}

async function searchViaApi(query: string): Promise<LibrarySearchItem[] | null> {
  const endpoint = `${BASE_LIBRARY}/wp-json/wp/v2/search?search=${encodeURIComponent(query)}&per_page=20&_embed`;
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "SAS-Lucknow-Library-Search/1.0" },
  });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  const payload = await response.json();
  if (!Array.isArray(payload)) return null;

  return payload.map((item: SearchItem) => {
    const title = stripMarkup(
      typeof item.title === "string"
        ? item.title
        : typeof item.title === "object" && item.title !== null && "rendered" in item.title && typeof item.title.rendered === "string"
          ? item.title.rendered
          : "Library page",
    );
    const href = typeof item.url === "string" ? item.url : typeof item.link === "string" ? item.link : `${BASE_LIBRARY}/`;
    const fallbackCategory = normalizeCategory(item.subtype ?? item.type);
    return {
      title,
      href,
      category: inferCategoryFromUrl(href, fallbackCategory),
      source: "The Mother & Sri Aurobindo e-Library",
      snippet: normalizeSnippet(
        typeof item.excerpt?.rendered === "string"
          ? item.excerpt.rendered
          : typeof item.content?.rendered === "string"
            ? item.content.rendered
            : item.url ?? `${BASE_LIBRARY}/`,
      ),
    };
  })
    .filter(item => item.title && /^https?:\/\/./.test(item.href))
    .slice(0, 20);
}

async function searchByFallback(query: string): Promise<LibrarySearchItem[]> {
  const response = await fetch(`${BASE_LIBRARY}/?s=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "SAS-Lucknow-Library-Search/1.0" },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const matches = fallbackFromSearchPage(html, query);
  if (matches.length > 0) return matches;
  return [{
    title: `Search live e-Library for "${query}"`,
    snippet: "No direct snippet match was extracted. Open the official site to review the full index.",
    category: "Search",
    source: "The Mother & Sri Aurobindo e-Library",
    href: `${BASE_LIBRARY}/?s=${encodeURIComponent(query)}`,
  }];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Please enter at least 2 characters to search." }, { status: 400 });
  }

  try {
    const fullText = await searchViaSolr(query);
    const primary = fullText || await searchViaApi(query);
    const results = primary && primary.length > 0 ? primary : await searchByFallback(query);
    return NextResponse.json({ query, source: BASE_LIBRARY, results: ensureUnique(results) });
  } catch (error) {
    console.error("library-search failed", error);
    return NextResponse.json(
      {
        query,
        source: BASE_LIBRARY,
        error: "Live e-Library search failed.",
        results: [{
          title: `Search live e-Library for "${query}"`,
          snippet: "Could not connect to the source index right now. Use the following link to continue your search.",
          category: "Search",
          source: "The Mother & Sri Aurobindo e-Library",
          href: `${BASE_LIBRARY}/?s=${encodeURIComponent(query)}`,
        }],
      },
      { status: 200 },
    );
  }
}

