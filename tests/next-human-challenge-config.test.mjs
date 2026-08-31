import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CHALLENGE_LEVEL_COUNT,
  CHALLENGE_LEVEL_ONE_OPENS_ON,
  CHALLENGE_LEVEL_ONE_QUESTION_IDS,
  CHALLENGE_POOL_SIZE,
  CHALLENGE_QUESTION_COUNT,
  CHALLENGE_UNSCHEDULED_OPENS_ON,
  defaultQuestionPoolForLevel,
} from "../server/next-human-challenge-bank.mjs";
import { normaliseChallengeAttempt } from "../server/next-human-challenge-api.mjs";

test("The Next Human Challenge retains all thirty levels", () => {
  assert.equal(CHALLENGE_LEVEL_COUNT, 30);
  assert.equal(CHALLENGE_POOL_SIZE, 20);
  assert.equal(CHALLENGE_QUESTION_COUNT, 10);
  for (let level = 1; level <= CHALLENGE_LEVEL_COUNT; level += 1) {
    const pool = defaultQuestionPoolForLevel(level);
    assert.equal(pool.length, 20);
    assert.ok(new Set(pool.map(question => question.subject)).size > 1);
  }
});

test("Level 1 opens on 31 August 2026 with ten mixed launch questions", () => {
  assert.equal(CHALLENGE_LEVEL_ONE_OPENS_ON, "2026-08-31");
  assert.equal(CHALLENGE_UNSCHEDULED_OPENS_ON, "2099-12-31");
  assert.equal(CHALLENGE_LEVEL_ONE_QUESTION_IDS.length, 10);
  assert.equal(new Set(CHALLENGE_LEVEL_ONE_QUESTION_IDS).size, 10);
  const levelOnePool = defaultQuestionPoolForLevel(1);
  const lookup = new Map(levelOnePool.map(question => [question.id, question]));
  const launchQuestions = CHALLENGE_LEVEL_ONE_QUESTION_IDS.map(id => lookup.get(id));
  assert.ok(launchQuestions.every(Boolean));
  assert.equal(new Set(launchQuestions.map(question => question.subject)).size, 10);
});

test("each completed ten-question level scores from zero to one hundred without a pass gate", () => {
  const questions = Array.from({ length: 10 }, (_, index) => ({
    prompt: `Question ${index + 1}`,
    selectedAnswer: index < 7 ? "Correct" : "Other",
    correctAnswer: "Correct",
    note: "Explanation",
  }));
  const result = normaliseChallengeAttempt({ level: 30, questions });
  assert.equal(result.score, 70);
  assert.equal(result.passed, true);
  assert.equal(result.questions.length, 10);
});

test("administrator controls support closed levels and calendar-based releases", async () => {
  const [api, studio, mobile] = await Promise.all([
    readFile(new URL("../server/next-human-challenge-api.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/next-human-challenge-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/mobile-app/sas-mobile-challenge-v2.js", import.meta.url), "utf8"),
  ]);
  assert.match(api, /releaseMode === "closed"/);
  assert.match(api, /CHALLENGE_UNSCHEDULED_OPENS_ON/);
  assert.match(studio, /Member access/);
  assert.match(studio, /Release on date/);
  assert.match(studio, /type="date"/);
  assert.match(mobile, /openLevels = levels\.filter/);
  assert.match(mobile, /Only Level 1 is open/);
});
