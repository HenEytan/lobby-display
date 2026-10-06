import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import handler from "./state.js";

const realFetch = globalThis.fetch;
let stored; // the lobby_state row as Supabase would return it, or null
let writes;
let ipSeq = 0;

beforeEach(() => {
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_ANON_KEY = "anon";
  delete process.env.LOBBY_ADMIN_PIN;
  stored = null;
  writes = [];
  globalThis.fetch = async (url, opts = {}) => {
    if (opts.method === "POST") {
      const [row] = JSON.parse(opts.body);
      writes.push(row);
      return new Response(JSON.stringify([{ updated_at: row.updated_at }]), { status: 201 });
    }
    return new Response(JSON.stringify(stored ? [stored] : []), { status: 200 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

// Each call gets its own IP so the per-IP failed-attempt limiter never carries over.
async function post(body) {
  const out = {};
  const res = {
    setHeader() {},
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; return this; },
  };
  await handler({ method: "POST", body, headers: { "x-forwarded-for": "10.0.0." + ++ipSeq }, socket: {} }, res);
  return out;
}

const screen = (settings) => ({ settings: { title: "x", ...settings } });

test("rejects a write when no row exists and no admin PIN is configured", async () => {
  const r = await post({ pin: "anything", data: screen({ pin: "9999" }) });
  assert.equal(r.status, 403);
  assert.equal(writes.length, 0);
});

test("rejects a write when the stored settings have no PIN", async () => {
  stored = { data: screen({}), updated_at: "t" };
  const r = await post({ data: screen({ title: "defaced" }) });
  assert.equal(r.status, 403);
  assert.equal(writes.length, 0);
});

test("does not verify any PIN when none is set", async () => {
  stored = { data: screen({}), updated_at: "t" };
  const r = await post({ verify: true, pin: "x", data: {} });
  assert.equal(r.status, 403);
});

test("LOBBY_ADMIN_PIN bootstraps the first write and is stored as the PIN", async () => {
  process.env.LOBBY_ADMIN_PIN = "4321";
  const r = await post({ pin: "4321", data: screen({}) });
  assert.equal(r.status, 200);
  assert.equal(writes[0].data.settings.pin, "4321");
});

test("LOBBY_ADMIN_PIN does not admit a wrong PIN", async () => {
  process.env.LOBBY_ADMIN_PIN = "4321";
  const r = await post({ pin: "0000", data: screen({}) });
  assert.equal(r.status, 403);
  assert.equal(writes.length, 0);
});

test("accepts the stored PIN and keeps it when the client omits it", async () => {
  stored = { data: screen({ pin: "2468" }), updated_at: "t" };
  const r = await post({ pin: "2468", data: screen({ title: "new" }) });
  assert.equal(r.status, 200);
  assert.equal(writes[0].data.settings.pin, "2468");
});

test("rejects a wrong PIN when one is stored", async () => {
  stored = { data: screen({ pin: "2468" }), updated_at: "t" };
  const r = await post({ pin: "1111", data: screen({}) });
  assert.equal(r.status, 403);
});
