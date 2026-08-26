import { NextRequest, NextResponse } from "next/server";
import { findSavitriMatches, formatReferenceContext, type SavitriMatch } from "@/app/lib/savitri-reference";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_INSTRUCTIONS = `
You are Savitri Sakhi, a serious, compassionate study companion for Sri Aurobindo's Savitri and for the lives, works and vision of Sri Aurobindo and the Mother.

Answer in the language of the visitor's latest message: natural English or natural Devanagari Hindi. Answer bilingually only when asked.

Scope and manner:
- Answer questions about Savitri, Sri Aurobindo, the Mother and Integral Yoga. If a request is outside this scope, say so courteously and guide the visitor back to these subjects.
- Use the conversation context for follow-up questions instead of repeating the previous answer.
- If a question is genuinely ambiguous, ask one focused clarifying question.
- In Hindi, retain important Sanskrit or Integral Yoga terms and give their English equivalent in parentheses the first time it helps understanding.

Accuracy contract:
- Lead with the direct answer. Never give a vague generic answer when the question asks for a source, meaning or explanation.
- For a quoted Savitri passage, use the supplied VERIFIED SAVITRI REFERENCE. State Part, Book number and title, Canto number and title, and the supplied line number or range within that canto.
- Describe a supplied line number explicitly as a canto-relative line number. Printed page and line numbering vary by edition.
- Never invent a line number, page number, quotation, Book, Canto, date or attribution. Page numbers vary by edition; do not infer a page number from a line number.
- If no reliable local match is supplied, say that the exact wording was not verified and ask for more surrounding words. You may search authoritative sources, but do not claim an exact reference unless the wording is found.
- Distinguish clearly among Sri Aurobindo's exact words, the Mother's exact words, another author's words, a paraphrase and your own interpretation.
- For interpretation, explain the immediate poetic context first, then the spiritual or philosophical significance. Mark interpretive readings as interpretation, not unquestionable doctrine.
- Prefer primary sources and the supplied text. Use web search for wider questions and verification, prioritising the Sri Aurobindo Ashram, its online library, Sri Aurobindo Society, and the cited Savitri text.
- For factual answers beyond a locally verified passage, end with a short "References" section containing one to three authoritative source links actually used. Never fabricate a URL or source.

For a line-identification request, structure the response as:
1. Identification
2. Passage context
3. Meaning
4. Reference

Be lucid and substantial without becoming repetitive. Quote only the short passage needed for study.
`;

function validMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const message = item as Partial<ChatMessage>;
      return (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim().length > 0;
    })
    .slice(-12)
    .map(message => ({ role: message.role, content: message.content.trim().slice(0, 4000) }));
}

function extractAnswer(response: Record<string, unknown>): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  if (!Array.isArray(response.output)) return "";
  for (const item of response.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const candidate = part as { type?: unknown; text?: unknown };
      if (candidate.type === "output_text" && typeof candidate.text === "string" && candidate.text.trim()) return candidate.text.trim();
    }
  }
  return "";
}

function deterministicReferenceAnswer(match: SavitriMatch, hindi: boolean): string {
  const lineLabel = match.startLine === match.endLine ? `${match.startLine}` : `${match.startLine}-${match.endLine}`;
  const passage = match.passage.join("\n");
  if (hindi) {
    return `पहचान\nसावित्री, भाग ${match.part}, पुस्तक ${match.book} — ${match.bookName}; सर्ग ${match.canto} — ${match.cantoName}; इस सर्ग के भीतर पंक्ति ${lineLabel}। मुद्रित संस्करणों में पृष्ठ और पंक्ति-संख्या बदल सकती है।\n\nप्रसंग\n${passage}\n\nसंदर्भ\n${match.sourceUrl}\n\nअर्थ की विस्तृत AI व्याख्या अभी उपलब्ध नहीं है, लेकिन ऊपर दिया गया पाठ-संदर्भ स्थानीय सावित्री अनुक्रमणिका से सत्यापित है।`;
  }
  return `Identification\nSavitri, Part ${match.part}, Book ${match.book} — ${match.bookName}; Canto ${match.canto} — ${match.cantoName}; canto-relative line ${lineLabel}. Printed page and line numbering vary by edition.\n\nPassage context\n${passage}\n\nReference\n${match.sourceUrl}\n\nThe detailed AI interpretation is temporarily unavailable, but the textual identification above is verified against the local Savitri index.`;
}

export async function POST(request: NextRequest) {
  let payload: { messages?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please enter a valid question." }, { status: 400 });
  }

  const messages = validMessages(payload.messages);
  const latest = messages.at(-1);
  if (!latest || latest.role !== "user") return NextResponse.json({ error: "Please enter a question for Savitri Sakhi." }, { status: 400 });

  const matches = findSavitriMatches(latest.content);
  const exactMatch = matches.find(match => match.confidence === "exact");
  const referenceRequest = /\b(which book|which canto|where (?:is|does)|identify|find (?:the )?(?:book|canto|source)|source of|line number|quote from|contains:)\b/i.test(latest.content)
    || /(किस पुस्तक|किस सर्ग|कहाँ|पहचान|स्रोत|पंक्ति संख्या)/.test(latest.content)
    || /[“"][^”"]{8,}[”"]/.test(latest.content);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (exactMatch) return NextResponse.json({ answer: deterministicReferenceAnswer(exactMatch, /[\u0900-\u097F]/.test(latest.content)), verified: true });
    return NextResponse.json({ error: "Savitri Sakhi's full study service is being connected. Please try again shortly." }, { status: 503 });
  }

  const vectorStoreId = process.env.SAVITRI_VECTOR_STORE_ID?.trim();
  const tools: Record<string, unknown>[] = [
    {
      type: "web_search",
      filters: {
        allowed_domains: [
          "sriaurobindoashram.org",
          "library.sriaurobindoashram.org",
          "sri-aurobindo.co.in",
          "aurosociety.org",
          "motherandsriaurobindo.in",
          "auroville.org",
        ],
      },
    },
  ];
  if (vectorStoreId) tools.unshift({ type: "file_search", vector_store_ids: [vectorStoreId], max_num_results: 8 });

  const referenceContext = formatReferenceContext(matches);
  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(55000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        reasoning: { effort: "medium" },
        instructions: `${SYSTEM_INSTRUCTIONS}\n\nVERIFIED SAVITRI REFERENCE FOR THIS TURN:\n${referenceContext}${referenceRequest && !exactMatch ? "\n\nMANDATORY ATTRIBUTION CAUTION: This is a source-identification request, but the visitor's wording was not found verbatim in the local complete Savitri index. Begin by saying that the exact wording was not verified. If you find a close authentic passage, label it explicitly as the closest related line, not as the same quotation." : ""}`,
        input: messages,
        tools,
        tool_choice: "auto",
        include: vectorStoreId ? ["file_search_call.results", "web_search_call.action.sources"] : ["web_search_call.action.sources"],
        text: { verbosity: "medium" },
        max_output_tokens: 2800,
        store: false,
      }),
    });

    const result = await openAIResponse.json() as Record<string, unknown> & { error?: { message?: string } };
    if (!openAIResponse.ok) {
      console.error("Savitri Sakhi API error", openAIResponse.status, result.error?.message || "Unknown OpenAI error");
      if (exactMatch) return NextResponse.json({ answer: deterministicReferenceAnswer(exactMatch, /[\u0900-\u097F]/.test(latest.content)), verified: true, degraded: true });
      return NextResponse.json({ error: "Savitri Sakhi could not answer just now. Please try again." }, { status: 502 });
    }

    let answer = extractAnswer(result);
    if (!answer) {
      if (exactMatch) return NextResponse.json({ answer: deterministicReferenceAnswer(exactMatch, /[\u0900-\u097F]/.test(latest.content)), verified: true, degraded: true });
      return NextResponse.json({ error: "Savitri Sakhi could not form an answer. Please add a little more context." }, { status: 502 });
    }
    if (referenceRequest && !exactMatch && !/exact wording (?:was|is) not verified/i.test(answer)) {
      const caution = /[\u0900-\u097F]/.test(latest.content)
        ? "सटीक शब्दों की पुष्टि नहीं हुई: आपके दिए हुए शब्द स्थानीय पूर्ण सावित्री अनुक्रमणिका में ज्यों-के-त्यों नहीं मिले। नीचे दिया गया कोई निकट पाठ उसी उद्धरण के रूप में नहीं, बल्कि संबंधित प्रमाणित पंक्ति के रूप में समझें।"
        : "Exact wording was not verified: the words you entered were not found verbatim in the local complete Savitri index. Any close passage below is a related authenticated line, not the same quotation.";
      answer = `${caution}\n\n${answer}`;
    }
    return NextResponse.json({ answer, verified: Boolean(exactMatch) });
  } catch (error) {
    console.error("Savitri Sakhi request failed", error);
    if (exactMatch) return NextResponse.json({ answer: deterministicReferenceAnswer(exactMatch, /[\u0900-\u097F]/.test(latest.content)), verified: true, degraded: true });
    return NextResponse.json({ error: "Savitri Sakhi is temporarily unavailable. Please try again." }, { status: 502 });
  }
}

