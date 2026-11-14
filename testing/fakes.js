// Test doubles shared by api/media.test.js, src/lib/media.test.js and public/carry-over.test.js.
// Not a test file itself, and kept off Vercel by .vercelignore.
import assert from "node:assert/strict";
import { Readable } from "node:stream";

// An in-memory stand-in for the @vercel/blob calls api/media.js makes.
export function fakeBlob() {
  const files = new Map(); // pathname → { body: Buffer, contentType }
  return {
    files,
    async put(pathname, body, opts) {
      assert.equal(opts.access, "public");
      assert.equal(opts.addRandomSuffix, false);
      files.set(pathname, { body: Buffer.from(body), contentType: opts.contentType });
      return { pathname, url: "https://blob.test/" + pathname };
    },
    async get(pathname) {
      const f = files.get(pathname);
      if (!f) return null;
      return { statusCode: 200, stream: Readable.toWeb(Readable.from([f.body])), blob: { size: f.body.length, contentType: f.contentType } };
    },
    async list({ prefix, cursor }) {
      const all = [...files.keys()].filter((p) => p.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = all.slice(start, start + 2); // tiny pages, so pagination is exercised
      const next = start + 2 < all.length ? String(start + 2) : undefined;
      return { blobs: page.map((pathname) => ({ pathname, url: "https://blob.test/" + pathname })), cursor: next, hasMore: Boolean(next) };
    },
    async del(urls) {
      for (const u of [].concat(urls)) files.delete(String(u).replace("https://blob.test/", ""));
    },
  };
}

// A fetch that sends /api/<name> to the real Vercel handlers (with Vercel's body parsing: JSON → object,
// octet-stream → Buffer) and anything else to `fallback` (e.g. the Supabase / Redis fakes).
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
