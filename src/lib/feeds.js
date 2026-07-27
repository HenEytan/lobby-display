// מזג אוויר — נמשך דרך פונקציית השרת ‎/api/weather‎.
// הקריאה ל-Open-Meteo מתבצעת בשרת, כך שכל המסכים מציגים בדיוק אותם נתונים
// וגם מכשירים ישנים (עם מאגר תעודות SSL מיושן) מקבלים מידע מלא.

const CACHE_KEY = "weather_cache";

export async function fetchWeather() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res;
    try {
      res = await fetch("/api/weather", { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error("weather source error");
    const d = await res.json();
    if (!d.ok || !d.current) throw new Error("weather unavailable");

    const payload = { current: d.current, days: Array.isArray(d.days) ? d.days : [] };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
    return payload;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return null; // אין נתונים — הכרטיס פשוט לא יוצג, בלי להמציא מספרים
  }
}

export function weatherIcon(code) {
  if (code === 0 || code === 1) return "☀";
  if (code === 2) return "⛅";
  if (code === 3 || code === 45 || code === 48) return "☁";
  if (code >= 51 && code <= 65) return "🌧";
  if (code >= 71 && code <= 82) return "🌦";
  if (code >= 95) return "⛈";
  return "☀";
}

// ─── מדד קרינה UV — סיווג לפי המלצות ארגון הבריאות העולמי ───
export function uvLevel(uv) {
  if (uv == null) return null;
  if (uv < 3) return { label: "נמוך", cls: "uv-low", advice: "אין צורך בהגנה" };
  if (uv < 6) return { label: "בינוני", cls: "uv-mod", advice: "מומלץ כובע ומסנן קרינה" };
  if (uv < 8) return { label: "גבוה", cls: "uv-high", advice: "הימנעו משהייה ממושכת בשמש" };
  if (uv < 11) return { label: "גבוה מאוד", cls: "uv-vhigh", advice: "הגנה מלאה — עדיף בצל" };
  return { label: "קיצוני", cls: "uv-ext", advice: "הימנעו מחשיפה לשמש" };
}
