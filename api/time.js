// פונקציית שרת — מקור זמן אמין לשעון המסך.
// מכשירי תצוגה ישנים (למשל קופסאות אנדרואיד) לרוב מציגים שעה שגויה,
// ולכן המסך מסתנכרן מול השרת ולא מול שעון המכשיר.

function tzOffsetMinutes(date, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

export default function handler(req, res) {
  const now = new Date();
  let offsetMinutes = 180; // ברירת מחדל: שעון קיץ ישראל, אם Intl נכשל
  try {
    offsetMinutes = tzOffsetMinutes(now, "Asia/Jerusalem");
  } catch { /* ignore */ }

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    ok: true,
    epoch: now.getTime(),      // זמן UTC אמיתי במילישניות
    offsetMinutes,             // הפרש ישראל מ-UTC בדקות (180 בקיץ, 120 בחורף)
  });
}
