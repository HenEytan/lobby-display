// פונקציית שרת — אחסון מרכזי של תוכן המסך (Supabase).
// מאפשר שההגדרות יישמרו בין מכשירים: כל מסך מושך את אותו מצב.
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.

const ROW_ID = "yesod9";

// ─── הגנת PIN: מגבילים ניסיונות שגויים לכל IP ───
// מונה בזיכרון התהליך בלבד (לא מבוזר בין מופעי serverless) — לא מונע ניחוש
// מבוזר על פני מופעים רבים, אך חוסם ניחוש-סדרתי מהיר על אותו מופע חם, וזול
// ליישום בלי תשתית נוספת. חלון: מקסימום 8 ניסיונות שגויים כל 5 דקות ל-IP.
const failedAttempts = new Map();
const PIN_WINDOW_MS = 5 * 60 * 1000;
const PIN_MAX_ATTEMPTS = 8;

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function isRateLimited(ip) {
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

function sbHeaders() {
  const key = process.env.SUPABASE_ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function sbUrl(path) {
  return `${process.env.SUPABASE_URL}/rest/v1/${path}`;
}

async function readRow() {
  const r = await fetch(
    sbUrl(`lobby_state?id=eq.${ROW_ID}&select=data,updated_at`),
    { headers: sbHeaders() }
  );
  if (!r.ok) throw new Error("read failed " + r.status);
  const rows = await r.json();
  return rows && rows.length ? rows[0] : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    res.status(200).json({ ok: false, error: "storage not configured" });
    return;
  }

  try {
    if (req.method === "GET") {
      const row = await readRow();
      // ה-PIN הוא סוד האימות לכתיבה — אסור שיחזור בתשובת קריאה ציבורית וללא אימות,
      // אחרת כל מי שפונה ל-GET הזה (ללא סיסמה) מקבל אותו כטקסט גלוי.
      let data = row ? row.data : null;
      if (data && data.settings && data.settings.pin !== undefined) {
        data = { ...data, settings: { ...data.settings, pin: undefined } };
      }
      res.status(200).json({
        ok: true,
        data,
        updatedAt: row ? row.updated_at : null,
      });
      return;
    }

    if (req.method === "POST") {
      const ip = clientIp(req);
      if (isRateLimited(ip)) {
        res.status(429).json({ ok: false, error: "too many attempts, try again later" });
        return;
      }

      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const { pin, data } = body;
      if (!data || typeof data !== "object") {
        res.status(400).json({ ok: false, error: "missing data" });
        return;
      }

      // אימות: הקוד הנוכחי השמור בשרת הוא המקור הקובע.
      // בכתיבה הראשונה (עוד אין נתונים) — מותר, וכך נקבע הקוד ההתחלתי.
      const existing = await readRow();
      const currentPin =
        existing && existing.data && existing.data.settings
          ? existing.data.settings.pin
          : null;
      if (currentPin != null && String(pin) !== String(currentPin)) {
        registerFailedAttempt(ip);
        res.status(403).json({ ok: false, error: "bad pin" });
        return;
      }

      // בקשת אימות בלבד: הקוד נבדק למעלה ולא נכתב דבר. זה מה שמאפשר למסך הניהול
      // לאמת קוד במכשיר שלא מכיר אותו מקומית, בלי שה-GET יחזיר אותו לעולם.
      if (body.verify === true) {
        res.status(200).json({ ok: true, verified: true });
        return;
      }

      // ה-PIN מוסתר מה-GET, ולכן מכשיר שסונכרן מהשרת פשוט לא מחזיק אותו ולא שולח
      // אותו בחזרה. בלי השורה הזו פרסום ממכשיר כזה היה מוחק את הקוד מהמסמך —
      // ומאפס אותו לכל הבניין. מה שהלקוח לא שלח, השרת שומר.
      const incoming = data.settings && typeof data.settings === "object" ? data.settings : null;
      const merged =
        incoming && incoming.pin == null && currentPin != null
          ? { ...data, settings: { ...incoming, pin: currentPin } }
          : data;

      const payload = [{ id: ROW_ID, data: merged, updated_at: new Date().toISOString() }];
      const w = await fetch(sbUrl("lobby_state"), {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(payload),
      });
      if (!w.ok) throw new Error("write failed " + w.status + " " + (await w.text()));
      const saved = await w.json();
      res.status(200).json({ ok: true, updatedAt: saved[0] ? saved[0].updated_at : null });
      return;
    }

    res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
