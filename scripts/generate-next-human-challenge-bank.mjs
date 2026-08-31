import { readFile, writeFile } from "node:fs/promises";

const input = new URL("../android-app-design/qa/bharat-uday-mobile-levels.js", import.meta.url);
const output = new URL("../server/next-human-challenge-bank.mjs", import.meta.url);
const source = await readFile(input, "utf8");
const match = source.match(/window\.sasBharatUdayMobileLevels=(\[[\s\S]*\]);\s*$/u);
if (!match) throw new Error("The mobile challenge question data could not be read.");

const levels = JSON.parse(match[1]);
const questions = levels.flatMap(level => level.questions.map((question, index) => ({
  id: `catalog-${String(level.number).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
  subject: level.realm,
  prompt: question.prompt,
  choices: question.choices,
  correctAnswer: question.answer,
  note: question.note,
  source: "curated",
})));

const body = `// Generated from the curated 30-level Bharat Uday bank.\n// All 30 administrator-controlled levels intentionally mix subjects.\nexport const CHALLENGE_LEVEL_COUNT = 30;\nexport const CHALLENGE_QUESTION_COUNT = 10;\nexport const CHALLENGE_POOL_SIZE = 20;\n\nexport const NEXT_HUMAN_CHALLENGE_QUESTIONS = ${JSON.stringify(questions, null, 2)};\n\nexport function defaultQuestionPoolForLevel(level) {\n  const safeLevel = Math.min(CHALLENGE_LEVEL_COUNT, Math.max(1, Number(level) || 1));\n  const start = ((safeLevel - 1) * 11) % NEXT_HUMAN_CHALLENGE_QUESTIONS.length;\n  const stride = 7;\n  return Array.from({ length: CHALLENGE_POOL_SIZE }, (_, index) => NEXT_HUMAN_CHALLENGE_QUESTIONS[(start + index * stride) % NEXT_HUMAN_CHALLENGE_QUESTIONS.length]);\n}\n`;

await writeFile(output, body, "utf8");
console.log(`Wrote ${questions.length} curated questions to ${output.pathname}`);
