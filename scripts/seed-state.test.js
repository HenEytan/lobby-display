import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedState, canonical } from "./seed-state.js";
import { fakeBlob, putStateDoc, readStateDoc } from "../testing/fakes.js";

const SB_KEY = "sb-secret-value";
const PIN = "24681357";
const realFetch = globalThis.fetch;
let sbRows;
let redisRow;
let blob;
let outDir;
let lines;

beforeEach(() => {
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete process.env[k];
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = SB_KEY;
  sbRows = [{ data: { settings: { title: "lobby-title-xyz", pin: PIN }, ticker: [{ id: "t1" }] }, updated_at: "2026-11-05T10:00:00+00:00" }];
  redisRow = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).startsWith("https://sb.test/rest/v1/lobby_state")) {
      if (opts.headers.apikey !== SB_KEY) return new Response("{}", { status: 401 });
      return new Response(JSON.stringify(sbRows), { status: 200 });
    }
    if (String(url).startsWith("https://redis.test")) {
      return new Response(JSON.stringify({ result: redisRow ? JSON.stringify(redisRow) : null }), { status: 200 });
    }
    throw new Error("unexpected fetch " + url);
  };
  blob = fakeBlob();
  outDir = join(mkdtempSync(join(tmpdir(), "seed-test-")), "out");
  lines = [];
});
afterEach(() => { globalThis.fetch = realFetch; });

const run = (opts = {}) => seedState({ blob, outDir, log: (l) => lines.push(l), ...opts });
const output = () => lines.join("\n");

test("copies the Supabase row into Blob exactly and verifies it by sha256, whole and per key", async () => {
  assert.equal(await run(), 0, output());
  const stored = readStateDoc(blob);
  assert.deepEqual({ data: stored.data, updated_at: stored.updated_at }, sbRows[0]);
  assert.equal(stored.seededFrom, "supabase");
  const sha = output().match(/IDENTICAL sha256=([0-9a-f]{64})/);
  assert.ok(sha, output());
  assert.match(output(), /keys 2: settings sha256=[0-9a-f]{64}, ticker sha256=[0-9a-f]{64}/);
  assert.equal(canonical(sbRows[0]).sha256, sha[1]);
});

test("keeps the dump in a private directory and never prints a secret or a value", async () => {
  await run();
  assert.equal(statSync(outDir).mode & 0o777, 0o700);
  assert.equal(statSync(join(outDir, "legacy.json")).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(readFileSync(join(outDir, "legacy.json"), "utf8")).row, sbRows[0]);
  for (const secret of [PIN, SB_KEY, "lobby-title-xyz"]) assert.ok(!output().includes(secret), secret);
});

test("a rerun only re-verifies and writes nothing", async () => {
  await run();
  const puts = blob.puts.length;
  lines = [];
  assert.equal(await run(), 0);
  assert.equal(blob.puts.length, puts);
  assert.match(output(), /already holds the same state/);
});

test("takes the newer of Redis and Supabase", async () => {
  process.env.KV_REST_API_URL = "https://redis.test/";
  process.env.KV_REST_API_TOKEN = "tok";
  redisRow = { data: { settings: { title: "redis", pin: PIN } }, updated_at: "2026-11-12T08:00:00.000Z" };
  assert.equal(await run(), 0);
  assert.equal(readStateDoc(blob).data.settings.title, "redis");
  assert.equal(readStateDoc(blob).seededFrom, "redis");
});

test("a differing Blob state is newer work: exit 3, untouched, unless FORCE, which backs it up first", async () => {
  const published = { data: { settings: { title: "published", pin: PIN } }, updated_at: "2026-11-14T09:00:00.000Z" };
  await putStateDoc(blob, published);
  assert.equal(await run(), 3);
  assert.equal(readStateDoc(blob).data.settings.title, "published");
  assert.equal(await run({ force: true }), 0, output());
  assert.equal(readStateDoc(blob).data.settings.title, "lobby-title-xyz");
  assert.deepEqual(JSON.parse(readFileSync(join(outDir, "blob.before.json"), "utf8")), published);
});

test("an empty start the app already wrote is replaced without FORCE", async () => {
  await putStateDoc(blob, { data: null, updated_at: null, seededFrom: "none" });
  assert.equal(await run(), 0, output());
  assert.equal(readStateDoc(blob).data.settings.title, "lobby-title-xyz");
});

test("no legacy row: exit 2, nothing written", async () => {
  sbRows = [];
  assert.equal(await run(), 2);
  assert.equal(blob.files.size, 0);
});

test("no legacy store configured, or no Blob token: exit 1", async () => {
  delete process.env.SUPABASE_URL;
  assert.equal(await run(), 1);
  process.env.SUPABASE_URL = "https://sb.test";
  assert.equal(await run({ blob: undefined }), 1);
  assert.equal(blob.files.size, 0);
});

test("a stored copy that does not match fails verification with exit 4", async () => {
  const realPut = blob.put;
  blob.put = (p, body, opts) => realPut(p, String(body).replace('"lobby-title-xyz"', '"0ld"'), opts);
  assert.equal(await run(), 4);
  assert.match(output(), /MISMATCH.*settings/);
  assert.ok(!/IDENTICAL/.test(output()));
});
