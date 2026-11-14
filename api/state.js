// פונקציית שרת — אחסון מרכזי של תוכן המסך (Upstash Redis, או Supabase עד המעבר).
// מאפשר שההגדרות יישמרו בין מכשירים: כל מסך מושך את אותו מצב.
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.

import { applyCors, checkPin, readRow, storageConfigured, writeRow } from "./_lib/state-store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (applyCors(req, res)) return;

  if (!storageConfigured()) {
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
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const { pin, data, carryOver } = body;
      if (!data || typeof data !== "object") {
        res.status(400).json({ ok: false, error: "missing data" });
        return;
      }

      const auth = await checkPin(req, pin);
      if (!auth.ok) {
        res.status(auth.status).json({ ok: false, error: auth.error });
        return;
      }
      const { row: existing, currentPin } = auth;

      // בקשת אימות בלבד: הקוד נבדק למעלה ולא נכתב דבר. זה מה שמאפשר למסך הניהול
      // לאמת קוד במכשיר שלא מכיר אותו מקומית, בלי שה-GET יחזיר אותו לעולם.
      if (body.verify === true) {
        res.status(200).json({ ok: true, verified: true });
        return;
      }

      // public/carry-over.js sends the old kiosk's last-pulled state with the updatedAt it pulled. It
      // lands only when it is newer than what the server holds (the Supabase seed predates the Redis
      // switch); a manager who already published on the new host wins.
      if (carryOver) {
        const stamp = Date.parse(carryOver.stamp);
        if (Number.isNaN(stamp)) {
          res.status(400).json({ ok: false, error: "bad carry-over stamp" });
          return;
        }
        const serverStamp = existing ? Date.parse(existing.updated_at) : NaN;
        if (!Number.isNaN(serverStamp) && stamp <= serverStamp) {
          res.status(409).json({ ok: false, error: "server state is newer", updatedAt: existing.updated_at });
          return;
        }
      }

      // ה-PIN מוסתר מה-GET, ולכן מכשיר שסונכרן מהשרת פשוט לא מחזיק אותו ולא שולח
      // אותו בחזרה. בלי השורה הזו פרסום ממכשיר כזה היה מוחק את הקוד מהמסמך —
      // ומאפס אותו לכל הבניין. מה שהלקוח לא שלח, השרת שומר.
      const incoming = data.settings && typeof data.settings === "object" ? data.settings : null;
      const merged =
        incoming && incoming.pin == null && currentPin != null
          ? { ...data, settings: { ...incoming, pin: currentPin } }
          : data;

      res.status(200).json({ ok: true, updatedAt: await writeRow(merged) });
      return;
    }

    res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
