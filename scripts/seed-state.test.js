import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A fake of Supabase REST and Upstash REST on one local port; the script runs for real against it.
const SB_KEY = "sb-secret-value";
const REDIS_TOKEN = "redis-secret-value";
let sbRows;
let redis;
let corruptSet;
let server;
let base;

before(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url.startsWith("/rest/v1/lobby_state")) {
        if (req.headers.apikey !== SB_KEY) { res.statusCode = 401; res.end("{}"); return; }
        res.end(JSON.stringify(sbRows));
        return;
      }
      if (req.headers.authorization !== `Bearer ${REDIS_TOKEN}`) { res.statusCode = 401; res.end("{}"); return; }
      const [cmd, key, value] = JSON.parse(body);
      if (cmd === "GET") { res.end(JSON.stringify({ result: redis[key] ?? null })); return; }
      redis[key] = corruptSet && key === "lobby_state:yesod9" ? value.replace("old", "0ld") : value;
      res.end(JSON.stringify({ result: "OK" }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => {
  sbRows = [{ data: { settings: { title: "old", pin: "2468" }, ticker: [{ id: "t1" }] }, updated_at: "2026-11-05T10:00:00+00:00" }];
  redis = {};
  corruptSet = false;
});

function run(extraEnv = {}) {
  const env = {
    PATH: process.env.PATH,
    SUPABASE_URL: base,
    SUPABASE_SERVICE_ROLE_KEY: SB_KEY,
    UPSTASH_REDIS_REST_URL: base + "/",
    UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN,
    OUT_DIR: mkdtempSync(join(tmpdir(), "seed-test-")),
    ...extraEnv,
  };
  return new Promise((resolve) => {
    execFile("bash", [new URL("./seed-state.sh", import.meta.url).pathname], { env }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, out: stdout + stderr });
    });
  });
}

const stored = () => JSON.parse(redis["lobby_state:yesod9"]);

test("seeds an empty Redis, verifies it and sets the seeded marker", async () => {
  const r = await run();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /IDENTICAL sha256=[0-9a-f]{64}/);
  assert.deepEqual(stored(), sbRows[0]);
  assert.ok(redis["lobby_state_seeded:yesod9"]);
});

test("a rerun is idempotent and only re-verifies", async () => {
  await run();
  const first = redis["lobby_state:yesod9"];
  const r = await run();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /already holds the same value/);
  assert.equal(redis["lobby_state:yesod9"], first);
});

test("never overwrites a differing Redis value without FORCE", async () => {
  redis["lobby_state:yesod9"] = JSON.stringify({ data: { settings: { title: "newer" } }, updated_at: "2026-11-14T00:00:00Z" });
  const r = await run();
  assert.equal(r.code, 3, r.out);
  assert.equal(stored().data.settings.title, "newer");
  assert.equal(redis["lobby_state_seeded:yesod9"], undefined);
});

test("FORCE=1 replaces a differing value", async () => {
  redis["lobby_state:yesod9"] = JSON.stringify({ data: { settings: { title: "newer" } }, updated_at: "2026-11-14T00:00:00Z" });
  const r = await run({ FORCE: "1" });
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(stored(), sbRows[0]);
});

test("fails verification when what Redis holds differs from the source", async () => {
  corruptSet = true;
  const r = await run();
  assert.equal(r.code, 4, r.out);
  assert.match(r.out, /verification failed/);
  assert.equal(redis["lobby_state_seeded:yesod9"], undefined);
});

test("exits 2 when Supabase has no row, and writes nothing", async () => {
  sbRows = [];
  const r = await run();
  assert.equal(r.code, 2, r.out);
  assert.deepEqual(redis, {});
});

test("never prints a secret or the PIN", async () => {
  const r = await run();
  for (const secret of [SB_KEY, REDIS_TOKEN, "2468"]) assert.ok(!r.out.includes(secret), secret);
});
