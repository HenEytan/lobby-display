import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "./state.js";
import { STATE_PATH } from "./_lib/state-store.js";
import { fakeBlob } from "../testing/fakes.js";

const LEGACY_ENV = [
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN",
];
const realFetch = globalThis.fetch;
let blob;
let handler;
let legacy;
let ipSeq = 0;

// The legacy stores, behind fetch: a Supabase lobby_state row and the Redis value of lobby_state:yesod9.
function legacyStores({ sbRow = null, redisRow = null, sbFails = false, redisFails = false } = {}) {
  const state = { sbReads: 0, redisReads: 0, writes: 0, redisAuth: null };
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).startsWith("https://redis.test")) {
      state.redisReads += 1;
      state.redisAuth = opts.headers.Authorization;
      const [cmd, key] = JSON.parse(opts.body);
      if (cmd !== "GET") { state.writes += 1; throw new Error("legacy Redis must only be read"); }
      if (redisFails) return new Response("down", { status: 503 });
      return new Response(JSON.stringify({ result: key === "lobby_state:yesod9" && redisRow ? JSON.stringify(redisRow) : null }), { status: 200 });
    }
    if (String(url).startsWith("https://sb.test")) {
      if (opts.method && opts.method !== "GET") { state.writes += 1; throw new Error("legacy Supabase must only be read"); }
      state.sbReads += 1;
      if (sbFails) return new Response("down", { status: 503 });
      return new Response(JSON.stringify(sbRow ? [sbRow] : []), { status: 200 });
    }
    throw new Error("unexpected fetch " + url);
  };
  return state;
}
const supabaseEnv = () => { process.env.SUPABASE_URL = "https://sb.test"; process.env.SUPABASE_SERVICE_ROLE_KEY = "svc"; };
const redisEnv = () => { process.env.KV_REST_API_URL = "https://redis.test/"; process.env.KV_REST_API_TOKEN = "tok"; };

beforeEach(() => {
  for (const k of LEGACY_ENV) delete process.env[k];
  delete process.env.LOBBY_ADMIN_PIN;
  process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
  blob = fakeBlob();
  handler = createHandler(blob);
  legacy = legacyStores();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  for (const k of LEGACY_ENV) delete process.env[k];
});

function call(method, body) {
  const out = { headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; return this; },
    end() { return this; },
  };
  // Each call gets its own IP so the per-IP failed-attempt limiter never carries over.
  const req = { method, body, headers: { "x-forwarded-for": "10.0.0." + (++ipSeq % 250) }, socket: {} };
  return handler(req, res).then(() => out);
}
const get = () => call("GET");
const post = (body) => call("POST", body);
const doc = () => (blob.files.has(STATE_PATH) ? JSON.parse(blob.files.get(STATE_PATH).body.toString("utf8")) : null);
const putDoc = (row) => blob.put(STATE_PATH, JSON.stringify(row), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
const screen = (settings) => ({ settings: { title: "x", ...settings } });

// ── Missing env: never a crash ──
test("without BLOB_READ_WRITE_TOKEN every call answers 'storage not configured', legacy env or not", async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  supabaseEnv();
  redisEnv();
  process.env.LOBBY_ADMIN_PIN = "4321";
  for (const r of [await get(), await post({ pin: "4321", data: screen({}) })]) {
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: false, error: "storage not configured" });
  }
  assert.equal(legacy.sbReads + legacy.redisReads, 0);
  assert.equal(blob.files.size, 0);
});

test("a Supabase URL without a key, or a Redis URL without a token, is ignored rather than called", async () => {
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.KV_REST_API_URL = "https://redis.test/";
  const r = await get();
  assert.equal(r.body.ok, true);
  assert.equal(legacy.sbReads + legacy.redisReads, 0);
});

// ── Empty start ──
test("with no legacy store set, the first read starts from an empty state the app fills with its defaults", async () => {
  const r = await get();
  assert.deepEqual(r.body, { ok: true, data: null, updatedAt: null });
  assert.deepEqual(doc(), { data: null, updated_at: null, seededFrom: "none" });
  assert.equal(legacy.sbReads + legacy.redisReads, 0);
});

test("an empty start refuses writes until LOBBY_ADMIN_PIN is set, then stores that PIN", async () => {
  assert.equal((await post({ pin: "anything", data: screen({ pin: "9999" }) })).status, 403);
  assert.equal(doc().data, null);
  process.env.LOBBY_ADMIN_PIN = "4321";
  assert.equal((await post({ pin: "0000", data: screen({}) })).status, 403);
  const ok = await post({ pin: "4321", data: screen({}) });
  assert.equal(ok.status, 200);
  assert.equal(doc().data.settings.pin, "4321");
});

// ── Write / read round trip ──
test("a published state reads back as written, PIN hidden, with the write's updatedAt", async () => {
  process.env.LOBBY_ADMIN_PIN = "4321";
  const data = { settings: { title: "lobby", pin: "2468" }, banners: [{ id: "b1", image: "img_1" }], ticker: ["שלום"] };
  const w = await post({ pin: "4321", data });
  assert.equal(w.status, 200, JSON.stringify(w.body));
  const r = await get();
  assert.equal(r.body.ok, true);
  assert.equal(r.body.updatedAt, w.body.updatedAt);
  assert.deepEqual(JSON.parse(JSON.stringify(r.body.data)), { ...data, settings: { title: "lobby" } });
  assert.equal(doc().data.settings.pin, "2468", "the new PIN is stored, server-side only");
  assert.equal(r.headers["cache-control"], "no-store, max-age=0");
});

test("the document is one JSON object at a fixed path, overwritten in place under an ETag check", async () => {
  process.env.LOBBY_ADMIN_PIN = "4321";
  await post({ pin: "4321", data: screen({}) });
  await post({ pin: "4321", data: screen({ title: "second" }) });
  const writes = blob.puts.filter((p) => p.pathname === STATE_PATH && p.opts.ifMatch !== undefined);
  assert.equal(STATE_PATH, "state/screen.json");
  assert.equal(writes.length, 2);
  for (const { opts } of writes) {
    assert.equal(opts.addRandomSuffix, false);
    assert.equal(opts.allowOverwrite, true);
    assert.equal(opts.contentType, "application/json");
    assert.ok(Number.isInteger(opts.cacheControlMaxAge) && opts.cacheControlMaxAge >= 60);
  }
  assert.equal(blob.files.size, 1);
});

test("the stored PIN guards writes and is kept when the client omits it", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "2026-11-05T10:00:00Z" });
  assert.equal((await post({ pin: "1111", data: screen({ title: "defaced" }) })).status, 403);
  assert.equal(doc().data.settings.title, "x");
  const ok = await post({ pin: "2468", data: screen({ title: "new" }) });
  assert.equal(ok.status, 200);
  assert.equal(doc().data.settings.title, "new");
  assert.equal(doc().data.settings.pin, "2468");
});

test("a stored state with no PIN refuses every write and every verify", async () => {
  await putDoc({ data: screen({}), updated_at: "t" });
  assert.equal((await post({ data: screen({ title: "defaced" }) })).status, 403);
  assert.equal((await post({ verify: true, pin: "x", data: {} })).status, 403);
  assert.equal(doc().data.settings.title, "x");
});

test("verify checks the PIN and writes nothing", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "t" });
  const before = blob.puts.length;
  const r = await post({ verify: true, pin: "2468", data: {} });
  assert.deepEqual(r.body, { ok: true, verified: true });
  assert.equal(blob.puts.length, before);
});

// ── Reads stay cheap: the display's poll is served through the Blob CDN ──
test("a display read uses the cached path and no metadata call; a write reads the store itself", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "t" });
  const calls = [];
  for (const m of ["get", "head"]) { const real = blob[m]; blob[m] = (...a) => { calls.push([m, String(a[0])]); return real(...a); }; }
  await get();
  assert.deepEqual(calls, [["get", STATE_PATH]]);
  calls.length = 0;
  await post({ pin: "2468", data: screen({ title: "new" }) });
  assert.equal(calls[0][0], "head");
  assert.match(calls[1][1], /^https:\/\/blob\.test\/state\/screen\.json\?v=/);
});

// ── Concurrency: last writer wins, and no write is built on a stale read ──
test("a write right after another, while the CDN still serves the old copy, keeps the PIN of the newest", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "t" });
  blob.frozenCdn = true;
  assert.equal((await post({ pin: "2468", data: screen({ title: "first", pin: "1357" }) })).status, 200);
  assert.equal((await post({ pin: "2468", data: screen({ title: "stale pin" }) })).status, 403, "the old PIN no longer works");
  assert.equal((await post({ pin: "1357", data: screen({ title: "second" }) })).status, 200);
  assert.equal(doc().data.settings.title, "second");
  assert.equal(doc().data.settings.pin, "1357");
});

test("a write that loses the ETag race re-reads and lands on top of the other one", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "t" });
  const realPut = blob.put;
  let raced = false;
  let refused = 0;
  blob.put = async (p, body, opts) => {
    if (!raced && opts.ifMatch !== undefined) {
      raced = true;
      await realPut(p, JSON.stringify({ data: screen({ pin: "2468", title: "other manager" }), updated_at: "t2" }), { access: "public", addRandomSuffix: false, allowOverwrite: true });
    }
    try { return await realPut(p, body, opts); } catch (err) { refused += 1; throw err; }
  };
  const r = await post({ pin: "2468", data: screen({ title: "mine" }) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(refused, 1, "the first write was refused by the ETag check");
  assert.equal(doc().data.settings.title, "mine");
  assert.equal(doc().data.settings.pin, "2468");
});

test("a write that keeps losing the race gives up with 409 instead of overwriting blind", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "t" });
  blob.put = async () => { throw new blob.BlobPreconditionFailedError(); };
  const r = await post({ pin: "2468", data: screen({ title: "mine" }) });
  assert.equal(r.status, 409);
  assert.equal(r.body.ok, false);
});

// ── Seed once from the legacy stores ──
test("the first read copies the Supabase row into Blob, PIN included, and hides the PIN", async () => {
  supabaseEnv();
  legacy = legacyStores({ sbRow: { data: screen({ pin: "2468", title: "old" }), updated_at: "2026-11-05T10:00:00+00:00" } });
  const r = await get();
  assert.equal(r.body.data.settings.title, "old");
  assert.equal(r.body.data.settings.pin, undefined);
  assert.equal(r.body.updatedAt, "2026-11-05T10:00:00+00:00");
  assert.deepEqual(doc(), { data: screen({ pin: "2468", title: "old" }), updated_at: "2026-11-05T10:00:00+00:00", seededFrom: "supabase" });
  await get();
  await post({ pin: "2468", data: screen({ title: "new" }) });
  assert.equal(legacy.sbReads, 1, "Supabase is read once, never again");
  assert.equal(legacy.writes, 0);
});

test("the seed reads Redis under either set of names and takes the newer of Redis and Supabase", async () => {
  supabaseEnv();
  for (const names of [["KV_REST_API_URL", "KV_REST_API_TOKEN"], ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]]) {
    blob = fakeBlob();
    handler = createHandler(blob);
    for (const k of ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete process.env[k];
    process.env[names[0]] = "https://redis.test/";
    process.env[names[1]] = "tok";
    legacy = legacyStores({
      sbRow: { data: screen({ title: "supabase" }), updated_at: "2026-11-05T10:00:00+00:00" },
      redisRow: { data: screen({ title: "redis" }), updated_at: "2026-11-12T08:00:00.000Z" },
    });
    const r = await get();
    assert.equal(r.body.data.settings.title, "redis", names[0]);
    assert.equal(doc().seededFrom, "redis");
    assert.equal(legacy.redisAuth, "Bearer tok");
  }
  legacy = legacyStores({
    sbRow: { data: screen({ title: "supabase" }), updated_at: "2026-11-13T00:00:00+00:00" },
    redisRow: { data: screen({ title: "redis" }), updated_at: "2026-11-12T08:00:00.000Z" },
  });
  blob = fakeBlob();
  handler = createHandler(blob);
  assert.equal((await get()).body.data.settings.title, "supabase");
});

test("empty legacy stores still count as seeded: the empty state is written and they are not read again", async () => {
  supabaseEnv();
  redisEnv();
  await get();
  await get();
  assert.equal(legacy.sbReads, 1);
  assert.equal(legacy.redisReads, 1);
  assert.deepEqual(doc(), { data: null, updated_at: null, seededFrom: "none" });
});

test("a failed legacy read is an error, never a fresh start: nothing is written and the PIN bootstrap is refused", async () => {
  supabaseEnv();
  redisEnv();
  process.env.LOBBY_ADMIN_PIN = "4321";
  for (const fails of [{ sbFails: true }, { redisFails: true }]) {
    legacy = legacyStores(fails);
    const r = await get();
    assert.equal(r.body.ok, false);
    const w = await post({ pin: "4321", data: screen({}) });
    assert.equal(w.body.ok, false);
    assert.equal(doc(), null);
  }
  legacy = legacyStores();
  assert.equal((await get()).body.ok, true, "the next read after the outage seeds");
});

test("the seed never overwrites a state another request wrote first", async () => {
  supabaseEnv();
  legacy = legacyStores({ sbRow: { data: screen({ title: "old" }), updated_at: "2026-11-05T10:00:00+00:00" } });
  const realGet = blob.get;
  let first = true;
  blob.get = async (p) => {
    const got = await realGet(p);
    if (first) { first = false; await putDoc({ data: screen({ title: "published meanwhile" }), updated_at: "2026-11-14T00:00:00.000Z" }); }
    return got;
  };
  const r = await get();
  assert.equal(r.body.data.settings.title, "published meanwhile");
  assert.equal(doc().data.settings.title, "published meanwhile");
});

// ── Carry-over: the old kiosk's last-pulled state can be newer than the seed ──
test("a carry-over write lands only when its stamp is newer than the server's", async () => {
  await putDoc({ data: screen({ pin: "2468", title: "seeded" }), updated_at: "2026-11-05T10:00:00.000+00:00" });
  const older = await post({ pin: "2468", carryOver: { stamp: "2026-11-01T00:00:00.000Z" }, data: screen({ title: "kiosk-old" }) });
  assert.equal(older.status, 409);
  assert.equal(doc().data.settings.title, "seeded");
  const newer = await post({ pin: "2468", carryOver: { stamp: "2026-11-12T08:00:00.000Z" }, data: screen({ title: "kiosk-new", pin: null }) });
  assert.equal(newer.status, 200);
  assert.equal(doc().data.settings.title, "kiosk-new");
  assert.equal(doc().data.settings.pin, "2468");
});

test("a carry-over lands on an empty start, whose state has no updatedAt", async () => {
  process.env.LOBBY_ADMIN_PIN = "4321";
  await get();
  const r = await post({ pin: "4321", carryOver: { stamp: "2026-11-12T08:00:00.000Z" }, data: screen({ title: "kiosk" }) });
  assert.equal(r.status, 200);
  assert.equal(doc().data.settings.title, "kiosk");
});

test("a carry-over write without a valid stamp is refused", async () => {
  await putDoc({ data: screen({ pin: "2468" }), updated_at: "2026-11-05T10:00:00Z" });
  const r = await post({ pin: "2468", carryOver: { stamp: "not a date" }, data: screen({}) });
  assert.equal(r.status, 400);
  assert.equal(doc().data.settings.title, "x");
});

test("a POST without data is refused", async () => {
  const r = await post({ pin: "x" });
  assert.equal(r.status, 400);
});

// ── CORS: only the dead old origin may call in, for the one-time carry-over ──
async function preflight(origin) {
  const out = { headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    status(c) { out.status = c; return this; },
    json() { return this; },
    end() { return this; },
  };
  await handler({ method: "OPTIONS", headers: { origin }, socket: {} }, res);
  return out;
}

test("CORS admits the old kiosk origin and no other", async () => {
  const ok = await preflight("https://lobby-display-theta.vercel.app");
  assert.equal(ok.status, 204);
  assert.equal(ok.headers["access-control-allow-origin"], "https://lobby-display-theta.vercel.app");
  const other = await preflight("https://evil.example");
  assert.equal(other.headers["access-control-allow-origin"], undefined);
});
