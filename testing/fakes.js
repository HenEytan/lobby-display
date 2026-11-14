// Test doubles shared by api/media.test.js, src/lib/media.test.js and public/carry-over.test.js.
// Not a test file itself, and kept off Vercel by .vercelignore.
import assert from "node:assert/strict";
import { Readable } from "node:stream";

class BlobError extends Error {}
class BlobNotFoundError extends BlobError {}
class BlobPreconditionFailedError extends BlobError {}

const BLOB_ORIGIN = "https://blob.test/";

// An in-memory stand-in for the @vercel/blob calls api/media.js and api/_lib/state-store.js make.
// `files` is the store itself (what head() and a cache-busted URL see); `cdn` is what a read by
// pathname sees. Set `frozenCdn` to keep the CDN copy from following writes, like the up-to-60 s
// propagation of an overwrite.
export function fakeBlob() {
  const files = new Map(); // pathname → { body: Buffer, contentType, etag, cacheControlMaxAge }
  const cdn = new Map();
  let etagSeq = 0;
  const result = (pathname, f) => ({
    statusCode: 200,
    stream: Readable.toWeb(Readable.from([f.body])),
    blob: { pathname, url: BLOB_ORIGIN + pathname, size: f.body.length, contentType: f.contentType, etag: f.etag },
  });
  const fake = {
    files,
    cdn,
    frozenCdn: false,
    puts: [],
    BlobError,
    BlobNotFoundError,
    BlobPreconditionFailedError,
    async put(pathname, body, opts) {
      assert.equal(opts.access, "public");
      assert.equal(opts.addRandomSuffix, false);
      fake.puts.push({ pathname, opts });
      const existing = files.get(pathname);
      if (opts.ifMatch !== undefined && (!existing || existing.etag !== opts.ifMatch)) throw new BlobPreconditionFailedError();
      if (existing && !opts.allowOverwrite && opts.ifMatch === undefined) throw new BlobError("This blob already exists");
      const f = { body: Buffer.from(body), contentType: opts.contentType, etag: `"e${++etagSeq}"`, cacheControlMaxAge: opts.cacheControlMaxAge };
      files.set(pathname, f);
      if (!fake.frozenCdn) cdn.set(pathname, f);
      return { pathname, url: BLOB_ORIGIN + pathname, etag: f.etag };
    },
    async head(pathname) {
      const f = files.get(pathname);
      if (!f) throw new BlobNotFoundError();
      return { pathname, url: BLOB_ORIGIN + pathname, size: f.body.length, etag: f.etag };
    },
    async get(urlOrPathname) {
      const s = String(urlOrPathname);
      // A full URL carries a version query, which misses the CDN cache and reaches the store.
      if (s.startsWith(BLOB_ORIGIN)) {
        const pathname = s.slice(BLOB_ORIGIN.length).split("?")[0];
        const f = files.get(pathname);
        return f ? result(pathname, f) : null;
      }
      const f = cdn.get(s);
      return f ? result(s, f) : null;
    },
    async list({ prefix, cursor }) {
      const all = [...files.keys()].filter((p) => p.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = all.slice(start, start + 2); // tiny pages, so pagination is exercised
      const next = start + 2 < all.length ? String(start + 2) : undefined;
      return { blobs: page.map((pathname) => ({ pathname, url: "https://blob.test/" + pathname })), cursor: next, hasMore: Boolean(next) };
    },
    async del(urls) {
      for (const u of [].concat(urls)) {
        const pathname = String(u).replace(BLOB_ORIGIN, "");
        files.delete(pathname);
        cdn.delete(pathname);
      }
    },
  };
  return fake;
}

// The state document api/_lib/state-store.js keeps in the fake store, as written (or null), and a way
// to put one there.
export const readStateDoc = (blob) => {
  const f = blob.files.get("state/screen.json");
  return f ? JSON.parse(f.body.toString("utf8")) : null;
};
export const putStateDoc = (blob, row) =>
  blob.put("state/screen.json", JSON.stringify(row), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
// The media files alone, without the state document.
export const mediaPaths = (blob) => [...blob.files.keys()].filter((p) => p.startsWith("lobby-media/"));

// A fetch that sends /api/<name> to the real Vercel handlers (with Vercel's body parsing: JSON → object,
// octet-stream → Buffer) and anything else to `fallback` (e.g. the legacy Supabase fake).
export function routeFetch({ handlers, fallback, origin = "https://new.test" }) {
  let ipSeq = 0;
  return async (input, init = {}) => {
    const url = new URL(String(input), origin);
    const handler = url.origin === new URL(origin).origin && handlers[url.pathname];
    if (!handler) return fallback(input, init);
    const headers = { "x-forwarded-for": "10.9.0." + (++ipSeq % 250) };
    for (const [k, v] of Object.entries(init.headers || {})) headers[k.toLowerCase()] = v;
    let body = init.body;
    if (body && typeof body === "object" && typeof body.arrayBuffer === "function") body = Buffer.from(await body.arrayBuffer());
    else if (typeof body === "string" && headers["content-type"] === "application/json") body = JSON.parse(body);
    const req = { method: init.method || "GET", query: Object.fromEntries(url.searchParams), headers, body, socket: {} };
    let status = 200;
    let payload = "";
    const resHeaders = {};
    const res = {
      setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
      status(c) { status = c; return this; },
      json(b) { resHeaders["content-type"] = "application/json"; payload = JSON.stringify(b); return this; },
      end(b) { payload = b === undefined ? "" : b; return this; },
    };
    await handler(req, res);
    return new Response(status === 204 ? null : payload, { status, headers: resHeaders });
  };
}

// The Supabase REST fake api/_lib/state-store.js reads and writes (one lobby_state row).
export function fakeSupabase(row) {
  const state = { row };
  state.fetch = async (input, init = {}) => {
    if (!String(input).startsWith("https://sb.test")) throw new Error("unexpected fetch " + input);
    if (init.method === "POST") {
      const [saved] = JSON.parse(init.body);
      state.row = { data: saved.data, updated_at: saved.updated_at };
      return new Response(JSON.stringify([state.row]), { status: 201 });
    }
    return new Response(JSON.stringify(state.row ? [state.row] : []), { status: 200 });
  };
  return state;
}
