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

// The anon key let anyone who held it skip the PIN and read the stored one, because the table had to
// grant anon read and write. With the service key the table grants anon nothing (docs/supabase.sql).
test("uses the service key when it is set, the anon key only until then", async () => {
  const keys = [];
  globalThis.fetch = async (url, opts = {}) => { keys.push(opts.headers && opts.headers.apikey); return new Response("[]", { status: 200 }); };
  const get = async () => { const res = { setHeader() {}, status() { return this; }, json() { return this; } }; await handler({ method: "GET", headers: {}, socket: {} }, res); };
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  try { await get(); } finally { delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
  await get();
  assert.deepEqual(keys, ["svc", "anon"]);
});

test("with only the service key set, storage counts as configured", async () => {
  delete process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  let body;
  try {
    await handler({ method: "GET", headers: {}, socket: {} }, { setHeader() {}, status() { return this; }, json(b) { body = b; return this; } });
  } finally { delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
  assert.notEqual(body && body.error, "storage not configured");
});

// ── Redis: one JSON value instead of a table, copied from Supabase on the first read ──
function redisEnv(prefix = "UPSTASH_REDIS_REST") {
  process.env[prefix === "KV" ? "KV_REST_API_URL" : prefix + "_URL"] = "https://redis.test/";
  process.env[prefix === "KV" ? "KV_REST_API_TOKEN" : prefix + "_TOKEN"] = "tok";
}
function clearRedisEnv() {
  for (const k of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) delete process.env[k];
}
// A fake of both stores: `redis` maps key → value (`redisValue` is the state key's); a Supabase call
// is counted, and fails on demand.
const STATE_KEY = "lobby_state:yesod9";
const SEEDED_KEY = "lobby_state_seeded:yesod9";
function bothStores({ redisValue = null, sbRow = null, sbFails = false, redis = {} } = {}) {
  const state = {
    redis: { ...redis },
    sbReads: 0, sbWrites: 0, redisCalls: [],
    get redisValue() { return this.redis[STATE_KEY] ?? null; },
  };
  if (redisValue != null) state.redis[STATE_KEY] = redisValue;
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).startsWith("https://redis.test")) {
      const [cmd, key, value, flag] = JSON.parse(opts.body);
      state.redisCalls.push({ url: String(url), cmd, key, flag, auth: opts.headers.Authorization });
      let result = "OK";
      if (cmd === "GET") result = state.redis[key] ?? null;
      else if (cmd === "SET" && flag === "NX" && state.redis[key] != null) result = null;
      else if (cmd === "SET") state.redis[key] = value;
      return new Response(JSON.stringify({ result }), { status: 200 });
    }
    if (opts.method === "POST") { state.sbWrites += 1; return new Response("[]", { status: 201 }); }
    state.sbReads += 1;
    if (sbFails) return new Response("down", { status: 503 });
    return new Response(JSON.stringify(sbRow ? [sbRow] : []), { status: 200 });
  };
  return state;
}
async function getState() {
  const out = {};
  const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await handler({ method: "GET", headers: {}, socket: {} }, res);
  return out;
}

test("the first read copies the Supabase row to Redis, keeps the PIN there, and hides it from GET", async () => {
  redisEnv();
  try {
    const s = bothStores({ sbRow: { data: screen({ pin: "2468", title: "old" }), updated_at: "t" } });
    const r = await getState();
    assert.equal(r.body.ok, true);
    assert.equal(r.body.data.settings.title, "old");
    assert.equal(r.body.data.settings.pin, undefined);
    assert.equal(r.body.updatedAt, "t");
    assert.equal(JSON.parse(s.redisValue).data.settings.pin, "2468");
    await getState();
    assert.equal(s.sbReads, 1, "Supabase is not read once Redis holds the value");
  } finally { clearRedisEnv(); }
});

test("with Redis, the copied PIN still guards writes and a write never reaches Supabase", async () => {
  redisEnv();
  try {
    const s = bothStores({ sbRow: { data: screen({ pin: "2468" }), updated_at: "t" } });
    assert.equal((await post({ pin: "1111", data: screen({ title: "defaced" }) })).status, 403);
    assert.equal(JSON.parse(s.redisValue).data.settings.title, "x");
    const ok = await post({ pin: "2468", data: screen({ title: "new" }) });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.updatedAt);
    const saved = JSON.parse(s.redisValue);
    assert.equal(saved.data.settings.title, "new");
    assert.equal(saved.data.settings.pin, "2468", "kept when the client omits it");
    assert.equal(s.sbWrites, 0);
    assert.equal(s.redisCalls[0].auth, "Bearer tok");
    assert.equal(s.redisCalls[0].url, "https://redis.test");
    assert.equal(s.redisCalls[0].key, "lobby_state:yesod9");
  } finally { clearRedisEnv(); }
});

test("a failed Supabase read with Redis empty is an error, never a fresh install", async () => {
  redisEnv();
  process.env.LOBBY_ADMIN_PIN = "4321";
  try {
    const s = bothStores({ sbFails: true });
    const r = await post({ pin: "4321", data: screen({}) });
    assert.equal(r.body.ok, false);
    assert.equal(s.redisValue, null, "the bootstrap PIN wrote nothing");
  } finally { clearRedisEnv(); }
});

test("Redis alone counts as configured, under either set of variable names", async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  for (const prefix of ["UPSTASH_REDIS_REST", "KV"]) {
    redisEnv(prefix);
    try {
      const s = bothStores();
      const r = await getState();
      assert.equal(r.body.ok, true);
      assert.equal(r.body.data, null);
      assert.equal(s.sbReads, 0);
    } finally { clearRedisEnv(); }
  }
});

// ── The Supabase copy is a one-time seed: once Redis has been seeded, Supabase is never read again ──
test("the seed runs once: a later empty Redis key does not bring the stale Supabase row back", async () => {
  redisEnv();
  try {
    const s = bothStores({ sbRow: { data: screen({ pin: "2468", title: "old" }), updated_at: "t" } });
    await getState();
    delete s.redis[STATE_KEY];
    const r = await getState();
    assert.equal(r.body.ok, true);
    assert.equal(r.body.data, null);
    assert.equal(s.sbReads, 1);
  } finally { clearRedisEnv(); }
});

test("an empty Supabase table still marks the seed as done", async () => {
  redisEnv();
  try {
    const s = bothStores();
    await getState();
    await getState();
    assert.equal(s.sbReads, 1);
    assert.ok(s.redis[SEEDED_KEY]);
  } finally { clearRedisEnv(); }
});

test("a marker left by scripts/seed-state.sh skips the Supabase read entirely", async () => {
  redisEnv();
  try {
    const s = bothStores({ sbRow: { data: screen({ title: "old" }), updated_at: "t" }, redis: { [SEEDED_KEY]: "script" } });
    const r = await getState();
    assert.equal(r.body.data, null);
    assert.equal(s.sbReads, 0);
  } finally { clearRedisEnv(); }
});

test("the seed is written with NX, so it never overwrites a value another request wrote first", async () => {
  redisEnv();
  try {
    const s = bothStores({ sbRow: { data: screen({ title: "old" }), updated_at: "t" } });
    await getState();
    const seedSet = s.redisCalls.find((c) => c.cmd === "SET" && c.key === STATE_KEY);
    assert.equal(seedSet.flag, "NX");
  } finally { clearRedisEnv(); }
});

// ── Carry-over: the old kiosk's last-pulled state can be newer than the seeded Supabase copy ──
test("a carry-over write lands only when its stamp is newer than the server's", async () => {
  redisEnv();
  try {
    const s = bothStores({ redisValue: JSON.stringify({ data: screen({ pin: "2468", title: "seeded" }), updated_at: "2026-11-05T10:00:00.000+00:00" }) });
    const older = await post({ pin: "2468", carryOver: { stamp: "2026-11-01T00:00:00.000Z" }, data: screen({ title: "kiosk-old" }) });
    assert.equal(older.status, 409);
    assert.equal(JSON.parse(s.redisValue).data.settings.title, "seeded");
    const newer = await post({ pin: "2468", carryOver: { stamp: "2026-11-12T08:00:00.000Z" }, data: screen({ title: "kiosk-new", pin: null }) });
    assert.equal(newer.status, 200);
    const saved = JSON.parse(s.redisValue);
    assert.equal(saved.data.settings.title, "kiosk-new");
    assert.equal(saved.data.settings.pin, "2468");
  } finally { clearRedisEnv(); }
});

test("a carry-over write without a valid stamp is refused", async () => {
  stored = { data: screen({ pin: "2468" }), updated_at: "2026-11-05T10:00:00Z" };
  const r = await post({ pin: "2468", carryOver: { stamp: "not a date" }, data: screen({}) });
  assert.equal(r.status, 400);
  assert.equal(writes.length, 0);
});

// ── CORS: only the dead old origin may call in, for the one-time carry-over ──
async function preflight(origin) {
  const headers = {};
  const out = {};
  const res = {
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    status(c) { out.status = c; return this; },
    json() { return this; },
    end() { return this; },
  };
  await handler({ method: "OPTIONS", headers: { origin }, socket: {} }, res);
  return { ...out, headers };
}

test("CORS admits the old kiosk origin and no other", async () => {
  const ok = await preflight("https://lobby-display-theta.vercel.app");
  assert.equal(ok.status, 204);
  assert.equal(ok.headers["access-control-allow-origin"], "https://lobby-display-theta.vercel.app");
  const other = await preflight("https://evil.example");
  assert.equal(other.headers["access-control-allow-origin"], undefined);
});
