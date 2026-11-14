import { test } from "node:test";
import assert from "node:assert/strict";
import { isOlderStamp } from "./syncStamp.js";

test("a pulled state older than the one the device holds is older", () => {
  assert.equal(isOlderStamp("2026-11-14T10:00:00.000Z", "2026-11-14T10:00:30.000Z"), true);
});

test("a newer or equal pulled state is not older", () => {
  assert.equal(isOlderStamp("2026-11-14T10:00:30.000Z", "2026-11-14T10:00:00.000Z"), false);
  assert.equal(isOlderStamp("2026-11-14T10:00:00.000Z", "2026-11-14T10:00:00.000Z"), false);
});

test("stamps compare as times, not text: Supabase's +00:00 form against an ISO Z one", () => {
  assert.equal(isOlderStamp("2026-11-05T10:00:00+00:00", "2026-11-05T09:00:00.000Z"), false);
  assert.equal(isOlderStamp("2026-11-05T08:00:00+00:00", "2026-11-05T09:00:00.000Z"), true);
});

test("a missing or unreadable stamp on either side is never older, so the pull applies", () => {
  for (const [remote, local] of [[null, "2026-11-14T10:00:00.000Z"], ["2026-11-14T10:00:00.000Z", null], ["junk", "2026-11-14T10:00:00.000Z"], [undefined, undefined]]) {
    assert.equal(isOlderStamp(remote, local), false, `${remote} vs ${local}`);
  }
});
