import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const sourcePath = new URL("../app/bharat-uday/bharat-uday-data.ts", import.meta.url);
const outputPath = new URL("../android-app-design/qa/bharat-uday-mobile-levels.js", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const dataModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const mobileLevels = dataModule.bharatUdayLevels.map(level => ({
  number: level.number,
  title: level.title,
  realm: level.realm,
  symbol: level.symbol,
  accent: level.accent,
  coachFact: level.coachFact,
  innerPrompt: level.innerPrompt,
  quote: dataModule.lifeQuoteFor(level.number),
  questions: level.discoveries.map((discovery, index) => ({
    prompt: discovery.prompt,
    answer: discovery.answer,
    note: discovery.note,
    choices: dataModule.choicesFor(level, index, 0),
  })),
}));
const output = `/* Generated from app/bharat-uday/bharat-uday-data.ts. */\nwindow.sasBharatUdayMobileLevels=${JSON.stringify(mobileLevels)};\n`;
await writeFile(outputPath, output, "utf8");
console.log(`Wrote ${mobileLevels.length} mobile challenge levels to ${outputPath.pathname}`);
