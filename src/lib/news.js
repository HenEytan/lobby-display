// מבזקי חדשות ynet — נמשכים דרך פונקציית השרת ‎/api/ynet‎ (ללא CORS).
// עם מטמון מקומי לנפילות; בפיתוח מקומי (ללא ‎/api‎) פשוט לא יוצגו מבזקים.

const CACHE_KEY = "ynet_cache";
const REFRESH_MS = 10 * 60 * 1000; // רענון כל 10 דקות

export async function fetchNews() {
  try {
    // AbortController במקום AbortSignal.timeout — נתמך גם בדפדפני טלוויזיה/מכשירים ישנים
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res;
    try {
      res = await fetch("/api/ynet", { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error("news source error");
    const d = await res.json();
    if (d.ok && Array.isArray(d.items) && d.items.length > 0) {
      const payload = { items: d.items, updated: d.updated || Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      return payload;
    }
    throw new Error("empty feed");
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return { items: [], updated: 0 };
  }
}

export const NEWS_REFRESH_MS = REFRESH_MS;
