// פונקציית שרת — אחסון מרכזי של תוכן המסך (מסמך JSON אחד ב-Vercel Blob).
// מאפשר שההגדרות יישמרו בין מכשירים: כל מסך מושך את אותו מצב.
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.

import * as vercelBlob from "@vercel/blob";
import { applyCors, createStateStore, StateConflictError, storageConfigured } from "./_lib/state-store.js";

export function createHandler(blob) {
  const store = createStateStore(blob);

  // One read → check → write pass; a StateConflictError makes withRetry run it again on a fresh read.
  // → [status, body].
  async function publish(req, body) {
    const { pin, data, carryOver } = body;
    // A write is built on what the store holds now, not on the CDN copy, so `fresh`.
    const auth = await store.checkPin(req, pin, { fresh: true });
    if (!auth.ok) return [auth.status, { ok: false, error: auth.error }];
    const { row: existing, etag, currentPin } = auth;

    // בקשת אימות בלבד: הקוד נבדק למעלה ולא נכתב דבר. זה מה שמאפשר למסך הניהול
    // לאמת קוד במכשיר שלא מכיר אותו מקומית, בלי שה-GET יחזיר אותו לעולם.
    if (body.verify === true) return [200, { ok: true, verified: true }];

    // public/carry-over.js sends the old kiosk's last-pulled state with the updatedAt it pulled. It
    // lands only when it is newer than what the server holds (the seed predates it); a manager who
    // already published on the new host wins.
    if (carryOver) {
      const stamp = Date.parse(carryOver.stamp);
      if (Number.isNaN(stamp)) return [400, { ok: false, error: "bad carry-over stamp" }];
      const serverStamp = existing ? Date.parse(existing.updated_at) : NaN;
      if (!Number.isNaN(serverStamp) && stamp <= serverStamp) {
        return [409, { ok: false, error: "server state is newer", updatedAt: existing.updated_at }];
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

    return [200, { ok: true, updatedAt: await store.writeRow(merged, etag) }];
  }

  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    if (applyCors(req, res)) return;

    if (!storageConfigured()) {
      res.status(200).json({ ok: false, error: "storage not configured" });
      return;
    }

    try {
      if (req.method === "GET") {
        const row = await store.readRow();
        // ה-PIN הוא סוד האימות לכתיבה — אסור שיחזור בתשובת קריאה ציבורית וללא אימות,
        // אחרת כל מי שפונה ל-GET הזה (ללא סיסמה) מקבל אותו כטקסט גלוי.
        let data = row ? row.data : null;
        if (data && data.settings && data.settings.pin !== undefined) {
          data = { ...data, settings: { ...data.settings, pin: undefined } };
        }
        res.status(200).json({ ok: true, data, updatedAt: row ? row.updated_at : null });
        return;
      }

      if (req.method === "POST") {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
        if (!body.data || typeof body.data !== "object") {
          res.status(400).json({ ok: false, error: "missing data" });
          return;
        }
        const [status, out] = await store.withRetry(() => publish(req, body));
        res.status(status).json(out);
        return;
      }

      res.status(405).json({ ok: false, error: "method not allowed" });
    } catch (err) {
      if (err instanceof StateConflictError) {
        res.status(409).json({ ok: false, error: "state is being updated, try again" });
        return;
      }
      res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  };
}

export default createHandler(vercelBlob);
