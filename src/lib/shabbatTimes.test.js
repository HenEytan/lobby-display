import test from "node:test";
import assert from "node:assert/strict";
import { nextShabbatTimes } from "./hebrew.js";

const HHMM = /^\d{2}:\d{2}$/;

test("on a weekday the header shows this week's shabbat times", () => {
  const tue = nextShabbatTimes(new Date(2026, 10, 17, 10, 0));
  const fri = nextShabbatTimes(new Date(2026, 10, 20, 10, 0));
  assert.match(tue.candles, HHMM);
  assert.match(tue.havdalah, HHMM);
  assert.equal(tue.isToday, false);
  assert.equal(fri.isToday, true);
  assert.deepEqual([tue.candles, tue.havdalah], [fri.candles, fri.havdalah]);
});

test("after havdalah the header moves on to next week's shabbat", () => {
  const thisWeek = nextShabbatTimes(new Date(2026, 10, 20, 10, 0));
  const motzash = nextShabbatTimes(new Date(2026, 10, 21, 23, 0));
  const nextTue = nextShabbatTimes(new Date(2026, 10, 24, 10, 0));
  assert.deepEqual(motzash, nextTue);
  assert.notDeepEqual([motzash.candles, motzash.havdalah], [thisWeek.candles, thisWeek.havdalah]);
});
