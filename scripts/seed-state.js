#!/usr/bin/env node
// Copy the screen state from the legacy stores (Redis lobby_state:yesod9 and/or Supabase
// public.lobby_state id=yesod9, the newer of the two) into the Vercel Blob document state/screen.json,
// then read it back from the store and verify it: sha256 of the whole canonical {data, updated_at}
// and one per top-level key (settings, banners, …), the state's counterpart of per-table checksums.
//
// The API does the same copy on its first read; this script does it ahead of the cutover, with proof.
// Idempotent: a rerun against an identical Blob state only re-verifies. A differing Blob state (managers
// published, or the kiosk carried over) is never overwritten unless FORCE=1.
//
// Env (names only; values come from the shell, never from the repo):
//   BLOB_READ_WRITE_TOKEN                                  the new project's Blob store
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY               and/or
//   KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
//   OUT_DIR  optional; where the dump goes (default: a new private temp dir). It holds the PIN.
//   FORCE=1  optional; overwrite a differing Blob state (kept in OUT_DIR/blob.before.json first).
//
// Exit: 0 verified identical, 1 usage/env error, 2 no legacy row, 3 Blob differs (no FORCE),
//       4 verification failed after the write.

import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createStateStore, readLegacyRow } from "../api/_lib/state-store.js";

const legacyConfigured = () =>
  Boolean(
    (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) ||
      ((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
        (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN))
  );

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// → { json, sha256, keys: { <top-level data key>: sha256 } } of a row's {data, updated_at}.
export function canonical(row) {
  const json = JSON.stringify(sortKeys({ data: row.data, updated_at: row.updated_at }));
  const data = row.data && typeof row.data === "object" ? row.data : {};
  const keys = Object.fromEntries(Object.keys(data).sort().map((k) => [k, sha256(JSON.stringify(sortKeys(data[k])))]));
  return { json, sha256: sha256(json), keys };
}

const keyLine = (c) => `keys ${Object.keys(c.keys).length}: ` + Object.entries(c.keys).map(([k, h]) => `${k} sha256=${h}`).join(", ");

function writePrivate(dir, name, value) {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
  chmodSync(file, 0o600);
}

// `blob` is the @vercel/blob module (a fake in tests). → the exit code.
export async function seedState({ blob, outDir, force = false, log = console.log }) {
  const say = (l) => log("seed-state: " + l);
  if (!blob) { say("BLOB_READ_WRITE_TOKEN is not set"); return 1; }
  if (!legacyConfigured()) { say("set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and/or KV_REST_API_URL + KV_REST_API_TOKEN"); return 1; }

  const dir = outDir || mkdtempSync(join(tmpdir(), "lobby-seed-"));
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  say(`backup dir ${dir}`);
  const store = createStateStore(blob);

  // 1. Dump the legacy row.
  const legacy = await readLegacyRow();
  if (!legacy) { say("no legacy row id=yesod9"); return 2; }
  writePrivate(dir, "legacy.json", legacy);
  const source = canonical(legacy.row);
  say(`source ${legacy.source}, updated_at ${legacy.row.updated_at}, ${keyLine(source)}`);

  // 2. Compare with what Blob holds now. An empty start (data null) is the app's placeholder, not work.
  const before = await store.readStored();
  let write = true;
  if (before && before.row.data != null) {
    writePrivate(dir, "blob.before.json", before.row);
    if (canonical(before.row).sha256 === source.sha256) {
      say("Blob already holds the same state");
      write = false;
    } else if (force) {
      say(`Blob differs (updated_at ${before.row.updated_at}); FORCE=1, overwriting — old state kept in blob.before.json`);
    } else {
      say(`Blob differs from the legacy row (Blob updated_at ${before.row.updated_at}). Not overwriting; rerun with FORCE=1 to replace it`);
      return 3;
    }
  }

  // 3. Write: create-only when there is no document, else conditioned on the ETag just read.
  if (write) {
    const row = { data: legacy.row.data, updated_at: legacy.row.updated_at, seededFrom: legacy.source };
    await store.writeDocument(row, before ? before.etag : undefined);
  }

  // 4. Read back from the store itself (not the CDN) and compare.
  const after = await store.readStored();
  const got = after ? canonical(after.row) : null;
  if (!got || got.sha256 !== source.sha256) {
    const bad = got ? Object.keys(source.keys).filter((k) => source.keys[k] !== got.keys[k]) : ["(no document)"];
    say(`MISMATCH after write: ${bad.join(", ")}`);
    return 4;
  }
  say(`IDENTICAL sha256=${got.sha256}; ${keyLine(got)}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const blob = process.env.BLOB_READ_WRITE_TOKEN ? await import("@vercel/blob") : undefined;
  seedState({ blob, outDir: process.env.OUT_DIR, force: process.env.FORCE === "1" })
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("seed-state: " + (err && err.message ? err.message : err));
      process.exit(1);
    });
}
