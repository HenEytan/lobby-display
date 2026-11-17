import test from "node:test";
import assert from "node:assert/strict";
import { dailyGreeting } from "./hebrew.js";

// 17.11.2026 הוא יום שלישי — יום חול בלי חג
const at = (h, m = 0) => new Date(2026, 10, 17, h, m);

test("after midnight the screen says good night, not good morning", () => {
  assert.equal(dailyGreeting(at(0, 30)), "לילה טוב");
  assert.equal(dailyGreeting(at(2, 27)), "לילה טוב");
  assert.equal(dailyGreeting(at(4, 59)), "לילה טוב");
});

test("weekday greetings follow the time of day", () => {
  assert.equal(dailyGreeting(at(5)), "בוקר טוב");
  assert.equal(dailyGreeting(at(11, 59)), "בוקר טוב");
  assert.equal(dailyGreeting(at(12)), "צהריים טובים");
  assert.equal(dailyGreeting(at(18)), "ערב טוב");
  assert.equal(dailyGreeting(at(23, 59)), "ערב טוב");
});

test("a holiday greeting wins over the time of day", () => {
  assert.equal(dailyGreeting(at(2), "חג שמח"), "חג שמח");
});
