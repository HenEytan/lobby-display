// פונקציית שרת — אחסון מרכזי של תוכן המסך (Supabase).
// מאפשר שההגדרות יישמרו בין מכשירים: כל מסך מושך את אותו מצב.
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.

const ROW_ID = "yesod9";

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
      res.status(200).json({
        ok: true,
        data: row ? row.data : null,
        updatedAt: row ? row.updated_at : null,
      });
      return;
    }

    if (req.method === "POST") {
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
        res.status(403).json({ ok: false, error: "bad pin" });
        return;
      }

      const payload = [{ id: ROW_ID, data, updated_at: new Date().toISOString() }];
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
