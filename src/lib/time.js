// סנכרון שעון מול השרת — כדי שהמסך יציג תמיד שעון ישראל נכון,
// גם כשהשעון של מכשיר התצוגה שגוי לחלוטין.

let skewMs = 0;           // הפרש בין שעון השרת לשעון המכשיר
let offsetMinutes = null; // הפרש ישראל מ-UTC; null = טרם סונכרן
let synced = false;

export const TIME_SYNC_MS = 30 * 60 * 1000; // סנכרון מחדש כל חצי שעה

export async function syncTime() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const t0 = Date.now();
    let res;
    try {
      res = await fetch("/api/time", { signal: ctrl.signal, cache: "no-store" });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error("time source error");
    const d = await res.json();
    if (!d.ok || typeof d.epoch !== "number") throw new Error("bad payload");

    // תיקון לזמן הרשת: מניחים שחצי מזמן הנסיעה חלף עד שהשרת ענה
    const rtt = Date.now() - t0;
    skewMs = d.epoch + rtt / 2 - Date.now();
    offsetMinutes = typeof d.offsetMinutes === "number" ? d.offsetMinutes : null;
    synced = true;
    return true;
  } catch {
    return false;
  }
}

export function isSynced() {
  return synced;
}

// מחזיר Date שקריאת השדות המקומיים שלו (getHours/getDate/getDay) מציגה שעון ישראל.
// אם הסנכרון נכשל — נופלים בחזרה לשעון המכשיר, כדי שהמסך לעולם לא ייתקע.
export function israelNow() {
  const utcMs = Date.now() + skewMs;
  if (offsetMinutes == null) return new Date(utcMs);
  const probe = new Date(utcMs);
  const deviceOffsetMin = probe.getTimezoneOffset(); // דקות להוספה כדי להגיע ל-UTC
  return new Date(utcMs + (offsetMinutes + deviceOffsetMin) * 60000);
}
