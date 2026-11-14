// אחסון מצב המסך ואימות ה-PIN — משותף ל-api/state.js ול-api/media.js.
// התיקייה מתחילה בקו תחתון ולכן Vercel לא הופך אותה לפונקציה.

const ROW_ID = "yesod9";
const REDIS_KEY = `lobby_state:${ROW_ID}`;
// Set once the Supabase row has been copied into Redis (or found empty), by the first read or by
// scripts/seed-state.sh. From then on Supabase is never read again: a Redis key that goes missing
// later must not bring the stale pre-Redis copy back to the screen.
export const SEEDED_KEY = `lobby_state_seeded:${ROW_ID}`;

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

// The service key when set: the table then grants the anon role nothing (docs/supabase.sql), so the
// PIN check here is the only way in. The anon key needs read+write policies for anon, and anyone
// holding it skips the PIN and can read the stored one. Anon stays as a fallback until the service
// key is configured.
function sbKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
}

function sbHeaders() {
  const key = sbKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function sbUrl(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

// Redis when configured: the names Vercel's Upstash integration sets. The state is one JSON value, so
// it needs no database of its own, and the service-key and policy questions above stop applying.
function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  return url && token ? { url, token } : null;
}

async function redis(cfg, command) {
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error("redis failed " + r.status);
  const out = await r.json();
  if (out.error) throw new Error("redis failed");
  return out.result;
}

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && sbKey());
}

export function storageConfigured() {
  return Boolean(redisConfig() || supabaseConfigured());
}

async function readSupabaseRow() {
  const r = await fetch(
    sbUrl(`lobby_state?id=eq.${ROW_ID}&select=data,updated_at`),
    { headers: sbHeaders() }
  );
  if (!r.ok) throw new Error("read failed " + r.status);
  const rows = await r.json();
  return rows && rows.length ? rows[0] : null;
}

// The first read after Redis is configured copies the Supabase row across, stored PIN included, and
// only that first read. A failed Supabase read throws rather than counting as empty, so a passing
// outage cannot look like a fresh install. NX: a write that landed in between wins over the seed.
export async function readRow() {
  const cfg = redisConfig();
  if (!cfg) return readSupabaseRow();
  const raw = await redis(cfg, ["GET", REDIS_KEY]);
  if (raw) return JSON.parse(raw);
  if (!supabaseConfigured() || (await redis(cfg, ["GET", SEEDED_KEY]))) return null;
  const row = await readSupabaseRow();
  if (row) await redis(cfg, ["SET", REDIS_KEY, JSON.stringify(row), "NX"]);
  await redis(cfg, ["SET", SEEDED_KEY, new Date().toISOString()]);
  if (!row) return null;
  const now = await redis(cfg, ["GET", REDIS_KEY]);
  return now ? JSON.parse(now) : row;
}

// → the saved row's updated_at.
export async function writeRow(data) {
  const row = { data, updated_at: new Date().toISOString() };
  const cfg = redisConfig();
  if (cfg) {
    await redis(cfg, ["SET", REDIS_KEY, JSON.stringify(row)]);
    return row.updated_at;
  }
  const w = await fetch(sbUrl("lobby_state"), {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{ id: ROW_ID, ...row }]),
  });
  if (!w.ok) throw new Error("write failed " + w.status + " " + (await w.text()));
  const saved = await w.json();
  return saved[0] ? saved[0].updated_at : null;
}

// אימות: הקוד השמור בשרת הוא המקור הקובע. כשאין קוד שמור — נכשלים סגור:
// אחרת כל אחד יכול לכתוב (ולקבוע קוד משלו). הקוד ההתחלתי מגיע רק מסוד השרת
// LOBBY_ADMIN_PIN, והכתיבה הראשונה שמאומתת מולו שומרת אותו במסמך.
// → { ok: true, row, currentPin } or { ok: false, status, error }.
export async function checkPin(req, pin) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) return { ok: false, status: 429, error: "too many attempts, try again later" };
  const row = await readRow();
  const storedPin = row && row.data && row.data.settings ? row.data.settings.pin : null;
  const currentPin = storedPin != null ? storedPin : process.env.LOBBY_ADMIN_PIN || null;
  if (currentPin == null) return { ok: false, status: 403, error: "no admin pin configured" };
  if (String(pin) !== String(currentPin)) {
    registerFailedAttempt(ip);
    return { ok: false, status: 403, error: "bad pin" };
  }
  return { ok: true, row, currentPin };
}
