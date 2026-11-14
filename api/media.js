// פונקציית שרת — עותק שרת של התמונות וקבצי ה-MP3 שהועלו בפאנל הניהול (Vercel Blob).
// עד גרסה 3.20 הקבצים חיו רק ב-IndexedDB של המכשיר שהעלה אותם, ולכן אבדו במעבר כתובת.
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.
//
// A file is stored as parts (a function body is capped at 4.5 MB on Vercel, and MP3s are bigger) under
// lobby-media/<id>/<n>, then committed by writing lobby-media/<id>/manifest.json. A file without a
// manifest is an unfinished upload and is never served.
//
//   GET    /api/media                      → { ok, ids }          committed media ids
//   GET    /api/media?id=…                 → { ok, type, size, parts: [{ size, sha256 }] }
//   GET    /api/media?id=…&part=n          → the part's bytes
//   POST   /api/media?id=…&part=n          body: the part's bytes (application/octet-stream)
//   POST   /api/media?id=…&commit=1        body: { type, size, parts }
//   DELETE /api/media?id=…
// Writes carry the admin PIN in X-Lobby-Pin, checked exactly as /api/state checks it.

import { createHash } from "node:crypto";
import * as vercelBlob from "@vercel/blob";
import { applyCors, createStateStore } from "./_lib/state-store.js";

const PREFIX = "lobby-media/";
export const PART_MAX_BYTES = 4 * 1024 * 1024;
const MAX_PARTS = 40;
const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
// Images and MP3s from the admin panel, and the JSON backup public/carry-over.js writes.
const TYPE_RE = /^(image\/[\w.+-]+|audio\/[\w.+-]+|application\/json)$/;
const PART_CACHE = "public, max-age=31536000, immutable";

const partPath = (id, n) => `${PREFIX}${id}/${n}`;
const manifestPath = (id) => `${PREFIX}${id}/manifest.json`;

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > PART_MAX_BYTES) return null;
    chunks.push(Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

function partIndex(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < MAX_PARTS && String(n) === String(raw) ? n : null;
}

export function createHandler(blob) {
  // The PIN is checked against the state document in the same Blob store; a media write changes no
  // state, so the cached copy is enough.
  const { checkPin } = createStateStore(blob);
  const opts = (contentType) => ({ access: "public", addRandomSuffix: false, allowOverwrite: true, contentType });

  async function readManifest(id) {
    const got = await blob.get(manifestPath(id), { access: "public", useCache: false });
    if (!got || got.statusCode !== 200) return null;
    return JSON.parse((await streamToBuffer(got.stream)).toString("utf8"));
  }

  async function listIds() {
    const ids = [];
    let cursor;
    do {
      const page = await blob.list({ prefix: PREFIX, cursor });
      for (const b of page.blobs) {
        const m = b.pathname.slice(PREFIX.length).match(/^([^/]+)\/manifest\.json$/);
        if (m) ids.push(m[1]);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return ids;
  }

  async function handleGet(req, res, id) {
    if (!id) {
      res.status(200).json({ ok: true, ids: await listIds() });
      return;
    }
    const manifest = await readManifest(id);
    if (!manifest) {
      res.status(404).json({ ok: false, error: "not found" });
      return;
    }
    if (req.query.part === undefined) {
      res.status(200).json({ ok: true, ...manifest });
      return;
    }
    const n = partIndex(req.query.part);
    if (n === null || n >= manifest.parts.length) {
      res.status(404).json({ ok: false, error: "not found" });
      return;
    }
    const got = await blob.get(partPath(id, n), { access: "public" });
    if (!got || got.statusCode !== 200) {
      res.status(404).json({ ok: false, error: "not found" });
      return;
    }
    const bytes = await streamToBuffer(got.stream);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", PART_CACHE);
    res.status(200).end(bytes);
  }

  async function handlePart(req, res, id) {
    const n = partIndex(req.query.part);
    if (n === null) {
      res.status(400).json({ ok: false, error: "bad part" });
      return;
    }
    const bytes = await rawBody(req);
    if (!bytes || bytes.length > PART_MAX_BYTES) {
      res.status(413).json({ ok: false, error: "part too large" });
      return;
    }
    await blob.put(partPath(id, n), bytes, opts("application/octet-stream"));
    res.status(200).json({ ok: true, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }

  async function handleCommit(req, res, id) {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { type, size, parts } = body;
    if (!TYPE_RE.test(String(type)) || !Number.isInteger(size) || !Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
      res.status(400).json({ ok: false, error: "bad manifest" });
      return;
    }
    // Re-hash what the store holds, so the manifest describes the stored bytes, not the client's claim.
    const list = [];
    for (let n = 0; n < parts; n++) {
      const got = await blob.get(partPath(id, n), { access: "public", useCache: false });
      if (!got || got.statusCode !== 200) {
        res.status(400).json({ ok: false, error: `part ${n} missing` });
        return;
      }
      const bytes = await streamToBuffer(got.stream);
      list.push({ size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
    const total = list.reduce((s, p) => s + p.size, 0);
    if (total !== size) {
      res.status(400).json({ ok: false, error: `size mismatch: parts hold ${total}, expected ${size}` });
      return;
    }
    const manifest = { id, type, size, parts: list, committedAt: new Date().toISOString() };
    await blob.put(manifestPath(id), JSON.stringify(manifest), opts("application/json"));
    res.status(200).json({ ok: true, ...manifest });
  }

  async function handleDelete(res, id) {
    const urls = [];
    let cursor;
    do {
      const page = await blob.list({ prefix: `${PREFIX}${id}/`, cursor });
      for (const b of page.blobs) urls.push(b.url);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    if (urls.length) await blob.del(urls);
    res.status(200).json({ ok: true, deleted: urls.length });
  }

  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    if (applyCors(req, res)) return;
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(200).json({ ok: false, error: "media storage not configured" });
      return;
    }
    const query = req.query || {};
    req.query = query;
    const id = query.id === undefined ? null : String(query.id);
    if (id !== null && !ID_RE.test(id)) {
      res.status(400).json({ ok: false, error: "bad id" });
      return;
    }

    try {
      if (req.method === "GET") {
        await handleGet(req, res, id);
        return;
      }
      if ((req.method !== "POST" && req.method !== "DELETE") || !id) {
        res.status(405).json({ ok: false, error: "method not allowed" });
        return;
      }
      const auth = await checkPin(req, req.headers["x-lobby-pin"]);
      if (!auth.ok) {
        res.status(auth.status).json({ ok: false, error: auth.error });
        return;
      }
      if (req.method === "DELETE") await handleDelete(res, id);
      else if (query.commit === "1") await handleCommit(req, res, id);
      else await handlePart(req, res, id);
    } catch (err) {
      res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  };
}

export default createHandler(vercelBlob);
