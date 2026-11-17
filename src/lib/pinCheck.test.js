import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPinCheck, PIN_MESSAGES } from "./pinCheck.js";

test("a verified 200 lets the manager in", () => {
  assert.equal(classifyPinCheck(200, { ok: true, verified: true }), "ok");
});

test("a refused code is a wrong code", () => {
  assert.equal(classifyPinCheck(403, { ok: false, error: "bad pin" }), "wrong");
  assert.equal(classifyPinCheck(401, {}), "wrong");
});

test("no response at all is a network problem, not a wrong code", () => {
  assert.equal(classifyPinCheck(null, null), "offline");
});

test("a server error or a 200 without verification is a server problem", () => {
  assert.equal(classifyPinCheck(500, {}), "server");
  assert.equal(classifyPinCheck(404, {}), "server");
  assert.equal(classifyPinCheck(200, {}), "server");
  assert.equal(classifyPinCheck(200, null), "server");
});

test("every failure kind has a message", () => {
  for (const k of ["wrong", "offline", "server"]) assert.ok(PIN_MESSAGES[k]);
});
