import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createHandler, PART_MAX_BYTES } from "./media.js";
import { fakeBlob, mediaPaths, putStateDoc } from "../testing/fakes.js";

const realFetch = globalThis.fetch;
let blob;
let handler;
let ipSeq = 0;
beforeEach(async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
  delete process.env.LOBBY_ADMIN_PIN;
  globalThis.fetch = async (url) => { throw new Error("unexpected fetch " + url); };
  blob = fakeBlob();
  // The stored state the PIN is checked against, in the same store.
  await putStateDoc(blob, { data: { settings: { pin: "2468" } }, updated_at: "t" });
  handler = createHandler(blob);
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

async function call({ method = "GET", query = {}, body, pin, origin }) {
  const out = { headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; if (!out.status) out.status = 200; return this; },
    end(b) { out.raw = b; if (!out.status) out.status = 200; return this; },
  };
  const headers = { "x-forwarded-for": "10.1.0." + ++ipSeq };
  if (pin !== undefined) headers["x-lobby-pin"] = pin;
  if (origin) headers.origin = origin;
  await handler({ method, query, body, headers, socket: {} }, res);
  return out;
}

async function upload(id, bytes, { type = "image/jpeg", pin = "2468", partSize = 4 } = {}) {
  const parts = Math.ceil(bytes.length / partSize);
  for (let n = 0; n < parts; n++) {
    const r = await call({ method: "POST", query: { id, part: String(n) }, body: bytes.subarray(n * partSize, (n + 1) * partSize), pin });
    if (r.status !== 200) return r;
  }
  return call({ method: "POST", query: { id, commit: "1" }, body: { type, size: bytes.length, parts }, pin });
}

test("an uploaded file comes back part by part with its manifest", async () => {
  const bytes = Buffer.from("0123456789");
  const c = await upload("img_1_a", bytes);
  assert.equal(c.status, 200, JSON.stringify(c.body));
  const m = await call({ query: { id: "img_1_a" } });
  assert.deepEqual({ type: m.body.type, size: m.body.size, parts: m.body.parts.length }, { type: "image/jpeg", size: 10, parts: 3 });
  assert.match(m.body.parts[0].sha256, /^[0-9a-f]{64}$/);
  const got = [];
  for (let n = 0; n < 3; n++) got.push((await call({ query: { id: "img_1_a", part: String(n) } })).raw);
  assert.equal(Buffer.concat(got).toString(), "0123456789");
});

test("the list of stored ids covers every page and only committed files", async () => {
  await upload("img_1_a", Buffer.from("aaaa"));
  await upload("aud_2_b", Buffer.from("bbbbbbbb"), { type: "audio/mpeg" });
  await call({ method: "POST", query: { id: "img_3_c", part: "0" }, body: Buffer.from("cc"), pin: "2468" });
  const r = await call({});
  assert.deepEqual(r.body.ids.sort(), ["aud_2_b", "img_1_a"]);
});

test("every write needs the stored PIN", async () => {
  const r = await call({ method: "POST", query: { id: "img_1_a", part: "0" }, body: Buffer.from("x"), pin: "0000" });
  assert.equal(r.status, 403);
  assert.equal(mediaPaths(blob).length, 0);
  const d = await call({ method: "DELETE", query: { id: "img_1_a" } });
  assert.equal(d.status, 403);
});

test("a commit whose parts do not add up is refused and serves nothing", async () => {
  await call({ method: "POST", query: { id: "img_1_a", part: "0" }, body: Buffer.from("abcd"), pin: "2468" });
  const c = await call({ method: "POST", query: { id: "img_1_a", commit: "1" }, body: { type: "image/jpeg", size: 8, parts: 2 }, pin: "2468" });
  assert.equal(c.status, 400);
  assert.equal((await call({ query: { id: "img_1_a" } })).status, 404);
  assert.equal((await call({ query: { id: "img_1_a", part: "0" } })).status, 404);
});

test("rejects ids that could reach outside the media folder, bad types and oversized parts", async () => {
  for (const id of ["../x", "a/b", "", "x".repeat(200)]) {
    assert.equal((await call({ method: "POST", query: { id, part: "0" }, body: Buffer.from("x"), pin: "2468" })).status, 400, id);
  }
  assert.equal((await call({ method: "POST", query: { id: "img_1", part: "0" }, body: Buffer.alloc(PART_MAX_BYTES + 1), pin: "2468" })).status, 413);
  await call({ method: "POST", query: { id: "img_1", part: "0" }, body: Buffer.from("x"), pin: "2468" });
  const c = await call({ method: "POST", query: { id: "img_1", commit: "1" }, body: { type: "text/html", size: 1, parts: 1 }, pin: "2468" });
  assert.equal(c.status, 400);
});

test("delete removes the manifest and every part", async () => {
  await upload("img_1_a", Buffer.from("0123456789"));
  const d = await call({ method: "DELETE", query: { id: "img_1_a" }, pin: "2468" });
  assert.equal(d.status, 200);
  assert.equal(mediaPaths(blob).length, 0);
});

test("reads a part body from the request stream when no parsed body is given", async () => {
  const req = Readable.from([Buffer.from("ab"), Buffer.from("cd")]);
  Object.assign(req, { method: "POST", query: { id: "img_9", part: "0" }, headers: { "x-lobby-pin": "2468", "x-forwarded-for": "10.2.0.1" }, socket: {} });
  const out = {};
  const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await handler(req, res);
  assert.equal(out.status, 200);
  assert.equal(blob.files.get("lobby-media/img_9/0").body.toString(), "abcd");
});

test("without BLOB_READ_WRITE_TOKEN it says so instead of failing", async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const r = await call({ query: { id: "img_1" } });
  assert.deepEqual(r.body, { ok: false, error: "media storage not configured" });
});

test("the old kiosk origin may call in for the carry-over", async () => {
  const r = await call({ method: "OPTIONS", origin: "https://lobby-display-theta.vercel.app" });
  assert.equal(r.status, 204);
  assert.equal(r.headers["access-control-allow-origin"], "https://lobby-display-theta.vercel.app");
});
