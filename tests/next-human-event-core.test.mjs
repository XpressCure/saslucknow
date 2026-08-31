import test from "node:test";
import assert from "node:assert/strict";
import {
  NEXT_HUMAN_DAYS,
  bookingAmount,
  defaultNextHumanEvent,
  pathwayForDateOfBirth,
  seatsForDay,
  validateNextHumanApplication,
} from "../server/next-human-event-core.mjs";

test("NEXT HUMAN contains seven days and exactly 21 Moments", () => {
  assert.equal(NEXT_HUMAN_DAYS.length, 7);
  assert.equal(NEXT_HUMAN_DAYS.flatMap(day => day.moments).length, 21);
  assert.equal(NEXT_HUMAN_DAYS[0].date, "2026-12-20");
  assert.equal(NEXT_HUMAN_DAYS[6].date, "2026-12-26");
});

test("age chooses Challenge below 40 and Fellowship at 40", () => {
  assert.equal(pathwayForDateOfBirth("1990-12-20"), "challenge");
  assert.equal(pathwayForDateOfBirth("1986-12-20"), "fellowship");
  assert.equal(pathwayForDateOfBirth("2010-12-21"), null);
});

test("each day has 500 independently priced seats", () => {
  const event = defaultNextHumanEvent();
  assert.equal(seatsForDay(event.days[0]).length, 500);
  assert.equal(seatsForDay(event.days[6]).length, 500);
  event.days[0].rows[0].priceRupees = 2222;
  assert.equal(seatsForDay(event.days[0])[0].priceRupees, 2222);
  assert.notEqual(seatsForDay(event.days[1])[0].priceRupees, 2222);
});

test("a day booking allows one participant and at most two companions", () => {
  const day = defaultNextHumanEvent().days[0];
  assert.equal(bookingAmount(day, ["A01", "A02", "A03"]).ok, true);
  assert.equal(bookingAmount(day, ["A01", "A02", "A03", "A04"]).ok, false);
});

test("submitted application requires all five thoughtful answers", () => {
  const event = defaultNextHumanEvent();
  const short = validateNextHumanApplication({ dateOfBirth: "1990-01-01", answers: ["short"] }, event);
  assert.equal(short.ok, false);
  const answer = "I wish to explore conscious evolution with sincerity, discipline, openness and practical service.";
  const complete = validateNextHumanApplication({ dateOfBirth: "1990-01-01", answers: Array(5).fill(answer) }, event);
  assert.equal(complete.ok, true);
  assert.equal(complete.value.pathway, "challenge");
});
