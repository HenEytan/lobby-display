// אחסון מצב המסך ואימות ה-PIN — משותף ל-api/state.js ול-api/media.js.
// התיקייה מתחילה בקו תחתון ולכן Vercel לא הופך אותה לפונקציה.
//
// The state is one JSON document in the public Vercel Blob store: { data, updated_at, seededFrom? }.
// Supabase and Redis are only read, once, to seed it (see readRow).

const ROW_ID = "yesod9";
export const STATE_PATH = "state/screen.json";
const LEGACY_REDIS_KEY = `lobby_state:${ROW_ID}`;
// A display polls GET /api/state every minute, and Blob on Hobby includes 10,000 simple operations a
// month (a CDN cache MISS is one; going over locks the store for 30 days, media included). So the poll
// reads through the CDN, and this max age only bounds a MISS to once an hour. An overwrite reaches the
// CDN within 60 s regardless of it (Vercel Blob docs, "Caching").
const STATE_CACHE_MAX_AGE = 60 * 60;
// A write that keeps losing the ETag race to other writes gives up after this many tries.
const WRITE_ATTEMPTS = 4;
const RETRY_DELAY_MS = 500;

// ─── הגנת PIN: מגבילים ניסיונות שגויים לכל IP ───
// מונה בזיכרון התהליך בלבד (לא מבוזר בין מופעי serverless) — לא מונע ניחוש
// מבוזר על פני מופעים רבים, אך חוסם ניחוש-סדרתי מהיר על אותו מופע חם, וזול
// ליישום בלי תשתית נוספת. חלון: מקסימום 8 ניסיונות שגויים כל 5 דקות ל-IP.
const failedAttempts = new Map();
const PIN_WINDOW_MS = 5 * 60 * 1000;
const PIN_MAX_ATTEMPTS = 8;

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

export function isRateLimited(ip) {
  const rec = failedAttempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.windowStart > PIN_WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return rec.count >= PIN_MAX_ATTEMPTS;
}

function registerFailedAttempt(ip) {
  const now = Date.now();
  const rec = failedAttempts.get(ip);
  if (!rec || now - rec.windowStart > PIN_WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, windowStart: now });
  } else {
    rec.count += 1;
  }
}

// ─── CORS: only for the one-time carry-over ───
// The old deployment answers 402, but a page it serves still runs with the old origin, whose
// IndexedDB and localStorage hold the kiosk's media and last-pulled state. public/carry-over.js runs
// there and posts to this host, so that origin, and only it, may call in. Every write still needs the PIN.
const CARRY_OVER_ORIGINS = ["https://lobby-display-theta.vercel.app"];

// → true when the request was a preflight and has been answered.
export function applyCors(req, res) {
  const origin = req.headers && req.headers.origin;
  if (CARRY_OVER_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Lobby-Pin");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method !== "OPTIONS") return false;
  res.status(204).end();
  return true;
}

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// ─── Legacy stores: read-only, for the one-time seed ───
// The service key when set; the anon key is a fallback for a project that never set it.
function supabaseConfig() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

// The names Vercel's Upstash integration sets; UPSTASH_* wins when both are set.
function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}

async function readSupabaseRow(cfg) {
  const r = await fetch(`${cfg.url}/rest/v1/lobby_state?id=eq.${ROW_ID}&select=data,updated_at`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!r.ok) throw new Error("legacy supabase read failed " + r.status);
  const rows = await r.json();
  return rows && rows.length ? rows[0] : null;
}

async function readRedisRow(cfg) {
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["GET", LEGACY_REDIS_KEY]),
  });
  if (!r.ok) throw new Error("legacy redis read failed " + r.status);
  const out = await r.json();
  if (out.error) throw new Error("legacy redis read failed");
  return out.result ? JSON.parse(out.result) : null;
}

const stampOf = (row) => {
  const t = Date.parse(row.updated_at);
  return Number.isNaN(t) ? -Infinity : t;
};

// → the newest legacy row as { row, source }, or null when no legacy store holds one. A configured
// store that fails throws: a passing outage must not look like a fresh install.
export async function readLegacyRow() {
  const found = [];
  const redis = redisConfig();
  if (redis) {
    const row = await readRedisRow(redis);
    if (row) found.push({ row, source: "redis" });
  }
  const sb = supabaseConfig();
  if (sb) {
    const row = await readSupabaseRow(sb);
    if (row) found.push({ row, source: "supabase" });
  }
  if (!found.length) return null;
  return found.reduce((a, b) => (stampOf(b.row) > stampOf(a.row) ? b : a));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function streamText(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}

export class StateConflictError extends Error {}

// `blob` is the @vercel/blob module (a fake in tests).
export function createStateStore(blob) {
  const putOpts = (extra) => ({
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: STATE_CACHE_MAX_AGE,
    ...extra,
  });

  // The CDN copy: cheap, up to 60 s behind a write. For display reads and PIN checks that write nothing.
  async function readCached() {
    const got = await blob.get(STATE_PATH, { access: "public" });
    return got && got.statusCode === 200 ? { row: JSON.parse(await streamText(got.stream)), etag: got.blob.etag } : null;
  }

  // The store's own copy: head() is a metadata call, not cached, and a version query misses the CDN.
  // The ETag returned is the one of the bytes read, so a write conditioned on it can never be built on
  // a stale copy: if the CDN still served the old one, the write fails its ETag check and retries.
  async function readFresh() {
    let meta;
    try {
      meta = await blob.head(STATE_PATH);
    } catch (err) {
      if (err instanceof blob.BlobNotFoundError) return null;
      throw err;
    }
    const got = await blob.get(`${meta.url}?v=${Date.now()}`, { access: "public" });
    if (!got || got.statusCode !== 200) throw new StateConflictError("state is being updated");
    return { row: JSON.parse(await streamText(got.stream)), etag: got.blob.etag };
  }

  // The first read that finds no document seeds it, once: from the newest legacy row if a legacy store
  // is set, else as the empty state (data null), which the app fills with its defaults. Either way a
  // document now exists, so the legacy stores are never read again. Create-only: a document another
  // request wrote first wins over the seed.
  // `legacy` is readLegacyRow()'s result when the caller already has it (scripts/seed-state.js).
  async function seed(legacy) {
    if (legacy === undefined) legacy = await readLegacyRow();
    const row = legacy
      ? { data: legacy.row.data, updated_at: legacy.row.updated_at, seededFrom: legacy.source }
      : { data: null, updated_at: null, seededFrom: "none" };
    try {
      await writeDocument(row);
    } catch (err) {
      const now = await readFresh();
      if (now) return now;
      throw err;
    }
    return readFresh();
  }

  // → { row, etag } or null; `fresh` for a read that a write depends on.
  async function readDoc({ fresh = false } = {}) {
    const found = fresh ? await readFresh() : (await readCached()) || (await readFresh());
    return found || seed();
  }

  // → the stored row ({ data, updated_at }) or null when nothing was ever published.
  async function readRow(opts) {
    const found = await readDoc(opts);
    return found && found.row.data != null ? found.row : null;
  }

  // אימות: הקוד השמור בשרת הוא המקור הקובע. כשאין קוד שמור — נכשלים סגור:
  // אחרת כל אחד יכול לכתוב (ולקבוע קוד משלו). הקוד ההתחלתי מגיע רק מסוד השרת
  // LOBBY_ADMIN_PIN, והכתיבה הראשונה שמאומתת מולו שומרת אותו במסמך.
  // → { ok: true, row, etag, currentPin } or { ok: false, status, error }.
  async function checkPin(req, pin, { fresh = false } = {}) {
    const ip = clientIp(req);
    if (isRateLimited(ip)) return { ok: false, status: 429, error: "too many attempts, try again later" };
    const found = await readDoc({ fresh });
    const row = found && found.row.data != null ? found.row : null;
    const storedPin = row && row.data.settings ? row.data.settings.pin : null;
    const currentPin = storedPin != null ? storedPin : process.env.LOBBY_ADMIN_PIN || null;
    if (currentPin == null) return { ok: false, status: 403, error: "no admin pin configured" };
    if (String(pin) !== String(currentPin)) {
      registerFailedAttempt(ip);
      return { ok: false, status: 403, error: "bad pin" };
    }
    return { ok: true, row, etag: found ? found.etag : undefined, currentPin };
  }

  // Writes the whole document only if it is still the one read (etag), or only if there is none yet
  // (no etag). Either way a write that lost a race throws StateConflictError instead of landing.
  async function writeDocument(row, etag) {
    const cond = etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false };
    try {
      await blob.put(STATE_PATH, JSON.stringify(row), putOpts(cond));
    } catch (err) {
      if (err instanceof blob.BlobPreconditionFailedError || (!etag && err instanceof blob.BlobError)) {
        throw new StateConflictError("state changed during the write");
      }
      throw err;
    }
  }

  // → the new updated_at.
  async function writeRow(data, etag) {
    const row = { data, updated_at: new Date().toISOString() };
    await writeDocument(row, etag);
    return row.updated_at;
  }

  // Runs read → check → write until the write's ETag check passes. Last writer wins: each attempt
  // re-reads, so a write that lost the race lands on top of the winner, never under it.
  async function withRetry(attempt) {
    for (let n = 1; ; n++) {
      try {
        return await attempt();
      } catch (err) {
        if (!(err instanceof StateConflictError) || n >= WRITE_ATTEMPTS) throw err;
        await sleep(RETRY_DELAY_MS * n);
      }
    }
  }

  return { readRow, checkPin, writeRow, withRetry, readStored: readFresh, writeDocument, seed };
}
