import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../../api/media.js";
import { fakeBlob, fakeSupabase, routeFetch } from "../../testing/fakes.js";
import { uploadMedia, downloadMedia, syncLocalMedia, serverMediaIds, PART_BYTES } from "./media.js";

// The client code runs against the real api/media.js handler, over a fetch that routes to it.
const realFetch = globalThis.fetch;
let blob;
beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  blob = fakeBlob();
  const sb = fakeSupabase({ data: { settings: { pin: "2468" } }, updated_at: "t" });
  globalThis.fetch = routeFetch({ handlers: { "/api/media": createHandler(blob) }, fallback: sb.fetch });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// A file over one part, so the split and the reassembly both run; byte values vary, so order matters.
function bigFile(type = "audio/mpeg") {
  const bytes = new Uint8Array(PART_BYTES * 2 + 17);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31) % 251;
  return new Blob([bytes], { type });
}

test("a file uploaded in parts downloads byte for byte with its type", async () => {
  const file = bigFile();
  assert.equal(await uploadMedia({ id: "aud_1_x", blob: file, pin: "2468" }), true);
  const back = await downloadMedia("aud_1_x");
  assert.equal(back.type, "audio/mpeg");
  assert.deepEqual(new Uint8Array(await back.arrayBuffer()), new Uint8Array(await file.arrayBuffer()));
});

test("an upload with a wrong PIN throws and leaves nothing to download", async () => {
  await assert.rejects(uploadMedia({ id: "img_1", blob: new Blob(["x"], { type: "image/jpeg" }), pin: "0000" }));
  assert.equal(await downloadMedia("img_1"), null);
});

test("a download of a missing id, or with the server down, is null rather than an error", async () => {
  assert.equal(await downloadMedia("img_missing"), null);
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.equal(await downloadMedia("img_missing"), null);
});

test("sync uploads only what the server lacks, and reports per-file failures", async () => {
  await uploadMedia({ id: "img_on_server", blob: new Blob(["s"], { type: "image/jpeg" }), pin: "2468" });
  const local = new Map([
    ["img_on_server", new Blob(["s"], { type: "image/jpeg" })],
    ["img_local_only", new Blob(["l"], { type: "image/jpeg" })],
    ["bad_type", new Blob(["<p>"], { type: "text/html" })],
  ]);
  const out = await syncLocalMedia({ pin: "2468", local: { ids: async () => [...local.keys()], get: async (id) => local.get(id) } });
  assert.deepEqual(out, { uploaded: ["img_local_only"], failed: ["bad_type"] });
  assert.deepEqual((await serverMediaIds()).sort(), ["img_local_only", "img_on_server"]);
});

test("sync without a PIN does nothing", async () => {
  const out = await syncLocalMedia({ pin: null, local: { ids: async () => ["x"], get: async () => new Blob(["x"]) } });
  assert.equal(out, null);
  assert.equal(blob.files.size, 0);
});
