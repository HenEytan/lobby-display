import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHandler } from "../api/media.js";
import stateHandler from "../api/state.js";
import { downloadMedia } from "../src/lib/media.js";
import { fakeBlob, fakeSupabase, routeFetch } from "../testing/fakes.js";

// carry-over.js runs in a sandbox posing as the old origin's page, against the real api/state and
// api/media handlers of the new host.
const SCRIPT = readFileSync(new URL("./carry-over.js", import.meta.url), "utf8");
const NEW = "https://new.test";
const realFetch = globalThis.fetch;
let blob;
let sb;

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
  process.env.SUPABASE_URL = "https://sb.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svc";
  blob = fakeBlob();
  // The new server, seeded from the Supabase copy as of the Redis switch.
  sb = fakeSupabase({ data: { settings: { pin: "2468", buildingName: "seeded" }, ticker: [] }, updated_at: "2026-11-05T10:00:00+00:00" });
  globalThis.fetch = routeFetch({ handlers: { "/api/media": createHandler(blob), "/api/state": stateHandler }, fallback: sb.fetch, origin: NEW });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

function fakeLocalStorage(entries) {
  const m = new Map(Object.entries(entries));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

// The slice of IndexedDB carry-over.js uses; `files` null means the database was never created.
function fakeIndexedDB(files) {
  const later = (fn) => setTimeout(fn, 0);
  const request = (result) => { const r = {}; later(() => { r.result = result; if (r.onsuccess) r.onsuccess(); }); return r; };
  return {
    created: false,
    open() {
      const req = {};
      later(() => {
        if (!files) {
          req.transaction = { abort: () => { req.error = new Error("AbortError"); later(() => { if (req.onerror) req.onerror(); }); } };
          if (req.onupgradeneeded) req.onupgradeneeded();
          return;
        }
        req.result = {
          objectStoreNames: { contains: (n) => n === "files" },
          transaction: () => ({ objectStore: () => ({ getAllKeys: () => request([...files.keys()]), get: (k) => request(files.get(k)) }) }),
        };
        req.onsuccess();
      });
      return req;
    },
  };
}

async function runCarryOver({ localStorage, files = null, pin, origin = "https://lobby-display-theta.vercel.app" }) {
  const shown = [];
  const sandbox = {
    LOBBY_NEW_ORIGIN: NEW,
    LOBBY_CARRY_OVER_MANUAL: true,
    LOBBY_PIN: pin,
    localStorage,
    indexedDB: fakeIndexedDB(files),
    location: { origin, replace() { shown.redirected = true; } },
    fetch: globalThis.fetch,
    Blob, URL, setTimeout,
    document: {
      currentScript: null,
      getElementById: () => shown.el || null,
      createElement: () => ({ style: {}, setAttribute() {}, set textContent(t) { shown.push(t); }, get textContent() { return shown.at(-1); } }),
      body: { appendChild(el) { shown.el = el; } },
    },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(SCRIPT, sandbox);
  const result = await sandbox.lobbyCarryOver();
  return { result, screen: shown.at(-1) || "" };
}

const oldKiosk = (extra = {}) => fakeLocalStorage({
  lobby_settings: JSON.stringify({ buildingName: "from kiosk", pin: null }),
  lobby_banners: JSON.stringify([{ id: "b1", image: "img_1_a" }]),
  lobby_music: JSON.stringify({ tracks: [{ id: "t", mediaId: "aud_2_b" }] }),
  lobby_server_stamp: "2026-11-12T08:00:00.000Z",
  lobby_draft_ticker: JSON.stringify([{ id: "t9", text: "draft" }]),
  unrelated: "x",
  ...extra,
});
const oldMedia = () => new Map([
  ["img_1_a", new Blob(["jpeg-bytes"], { type: "image/jpeg" })],
  ["aud_2_b", new Blob([new Uint8Array(3 * 1024 * 1024 + 5).fill(7)], { type: "audio/mpeg" })],
]);

test("carries the kiosk's media, newer state and a localStorage backup to the new host", async () => {
  const { result, screen } = await runCarryOver({ localStorage: oldKiosk(), files: oldMedia(), pin: "2468" });
  assert.equal(result.ok, true, screen);
  const img = await downloadMedia("img_1_a");
  assert.equal(await img.text(), "jpeg-bytes");
  assert.equal((await downloadMedia("aud_2_b")).size, 3 * 1024 * 1024 + 5);
  assert.equal(sb.row.data.settings.buildingName, "from kiosk");
  assert.equal(sb.row.data.settings.pin, "2468", "the server keeps its PIN");
  const backup = JSON.parse(await (await downloadMedia("carryover_kiosk_localstorage")).text());
  assert.equal(backup.origin, "https://lobby-display-theta.vercel.app");
  assert.ok(backup.localStorage.lobby_draft_ticker, "drafts are in the backup");
  assert.equal(backup.localStorage.unrelated, undefined);
  assert.ok(!JSON.stringify(backup).includes("2468"));
});

test("a second run uploads nothing new and leaves the state alone", async () => {
  await runCarryOver({ localStorage: oldKiosk(), files: oldMedia(), pin: "2468" });
  const afterFirst = sb.row.updated_at;
  const parts = [...blob.files.keys()].length;
  const { result, screen } = await runCarryOver({ localStorage: oldKiosk(), files: oldMedia(), pin: "2468" });
  assert.equal(result.ok, true, screen);
  assert.equal(sb.row.updated_at, afterFirst);
  assert.equal([...blob.files.keys()].length, parts);
  assert.match(screen, /חדש יותר/);
});

test("an older kiosk state never replaces what the server holds", async () => {
  const { result } = await runCarryOver({ localStorage: oldKiosk({ lobby_server_stamp: "2026-10-01T00:00:00.000Z" }), files: oldMedia(), pin: "2468" });
  assert.equal(result.ok, true);
  assert.equal(sb.row.data.settings.buildingName, "seeded");
});

test("without a PIN the server accepts, nothing is written and the screen says why", async () => {
  const { result, screen } = await runCarryOver({ localStorage: oldKiosk(), files: oldMedia(), pin: "0000" });
  assert.equal(result.ok, false);
  assert.match(screen, /PIN/);
  assert.equal(blob.files.size, 0);
  assert.equal(sb.row.data.settings.buildingName, "seeded");
});

test("the PIN the kiosk kept locally is enough when none is injected", async () => {
  const ls = oldKiosk({ lobby_settings: JSON.stringify({ buildingName: "from kiosk", pin: "2468" }) });
  const { result } = await runCarryOver({ localStorage: ls, files: oldMedia() });
  assert.equal(result.ok, true);
});

test("on the new host itself it does nothing, so a left-over injection cannot loop the kiosk", async () => {
  const { result, screen } = await runCarryOver({ localStorage: oldKiosk(), files: oldMedia(), pin: "2468", origin: NEW });
  assert.equal(result.skipped, true);
  assert.equal(screen, "");
  assert.equal(blob.files.size, 0);
});

test("an origin that never stored media still carries its state", async () => {
  const { result, screen } = await runCarryOver({ localStorage: oldKiosk(), files: null, pin: "2468" });
  assert.equal(result.ok, true, screen);
  assert.match(screen, /מדיה במכשיר: 0/);
  assert.equal(sb.row.data.settings.buildingName, "from kiosk");
});
