// מזג אוויר — Open-Meteo (ללא מפתח API), עבור הוד השרון.

const HOD_HASHARON = { lat: 32.15, lon: 34.89 };

const WMO = {
  0: "\u05d1\u05d4\u05d9\u05e8", 1: "\u05d1\u05d4\u05d9\u05e8 \u05d1\u05e2\u05d9\u05e7\u05e8", 2: "\u05de\u05e2\u05d5\u05e0\u05df \u05d7\u05dc\u05e7\u05d9\u05ea", 3: "\u05de\u05e2\u05d5\u05e0\u05df",
  45: "\u05e2\u05e8\u05e4\u05d9\u05dc\u05d9", 48: "\u05e2\u05e8\u05e4\u05d9\u05dc\u05d9", 51: "\u05d8\u05e4\u05d8\u05d5\u05e3 \u05e7\u05dc", 53: "\u05d8\u05e4\u05d8\u05d5\u05e3", 55: "\u05d8\u05e4\u05d8\u05d5\u05e3 \u05d7\u05d6\u05e7",
  61: "\u05d2\u05e9\u05dd \u05e7\u05dc", 63: "\u05d2\u05e9\u05dd", 65: "\u05d2\u05e9\u05dd \u05d7\u05d6\u05e7", 71: "\u05e9\u05dc\u05d2 \u05e7\u05dc", 80: "\u05de\u05de\u05d8\u05e8\u05d9\u05dd",
  81: "\u05de\u05de\u05d8\u05e8\u05d9\u05dd", 82: "\u05de\u05de\u05d8\u05e8\u05d9\u05dd \u05d7\u05d6\u05e7\u05d9\u05dd", 95: "\u05e1\u05d5\u05e4\u05ea \u05e8\u05e2\u05de\u05d9\u05dd",
};

export async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOD_HASHARON.lat}&longitude=${HOD_HASHARON.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FJerusalem&forecast_days=4`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather source error");
    const d = await res.json();
    const days = d.daily.time.map((t, i) => ({
      date: new Date(t),
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      desc: WMO[d.daily.weather_code[i]] || "\u2014",
      code: d.daily.weather_code[i],
    }));
    const current = {
      temp: Math.round(d.current.temperature_2m),
      desc: WMO[d.current.weather_code] || "\u2014",
      code: d.current.weather_code,
    };
    const payload = { current, days };
    try { localStorage.setItem("weather_cache", JSON.stringify(payload)); } catch {}
    return payload;
  } catch {
    try {
      const cached = localStorage.getItem("weather_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return { current: { temp: 28, desc: "\u05d1\u05d4\u05d9\u05e8", code: 0 }, days: [] };
  }
}

export function weatherIcon(code) {
  if (code === 0 || code === 1) return "\u2600";
  if (code === 2) return "\u26c5";
  if (code === 3 || code === 45 || code === 48) return "\u2601";
  if (code >= 51 && code <= 65) return "\ud83c\udf27";
  if (code >= 71 && code <= 82) return "\ud83c\udf26";
  if (code >= 95) return "\u26c8";
  return "\u2600";
}

const LOCAL_FALLBACK = [
  { title: "\u05e2\u05d9\u05e8\u05d9\u05d9\u05ea \u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df \u05de\u05e7\u05d3\u05de\u05ea \u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05e4\u05d9\u05ea\u05d5\u05d7 \u05d7\u05d3\u05e9\u05d4 \u05dc\u05de\u05e8\u05db\u05d6 \u05d4\u05e2\u05d9\u05e8", source: "\u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df" },
  { title: "\u05e4\u05e1\u05d8\u05d9\u05d1\u05dc \u05d4\u05e7\u05d9\u05e5 \u05d4\u05e2\u05d9\u05e8\u05d5\u05e0\u05d9 \u05d9\u05d5\u05e6\u05d0 \u05dc\u05d3\u05e8\u05da \u05e2\u05dd \u05e2\u05e9\u05e8\u05d5\u05ea \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9 \u05ea\u05e8\u05d1\u05d5\u05ea", source: "\u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df" },
  { title: "\u05e9\u05d9\u05e4\u05d5\u05e8 \u05de\u05e2\u05e8\u05da \u05d4\u05ea\u05d7\u05d1\u05d5\u05e8\u05d4 \u05d4\u05e6\u05d9\u05d1\u05d5\u05e8\u05d9\u05ea \u05d1\u05e9\u05db\u05d5\u05e0\u05d5\u05ea \u05d4\u05d7\u05d3\u05e9\u05d5\u05ea", source: "\u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df" },
  { title: "\u05e4\u05d0\u05e8\u05e7 \u05d0\u05e7\u05d5\u05dc\u05d5\u05d2\u05d9 \u05d7\u05d3\u05e9 \u05d9\u05d9\u05e4\u05ea\u05d7 \u05dc\u05e7\u05d4\u05dc \u05d1\u05e1\u05d5\u05e3 \u05d4\u05d7\u05d5\u05d3\u05e9", source: "\u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df" },
];

const ISRAEL_FALLBACK = [
  { title: "\u05de\u05d6\u05d2 \u05d4\u05d0\u05d5\u05d5\u05d9\u05e8 \u05d1\u05d9\u05e9\u05e8\u05d0\u05dc: \u05d7\u05dd \u05d5\u05d9\u05e6\u05d9\u05d1, \u05e2\u05dd \u05d8\u05de\u05e4\u05e8\u05d8\u05d5\u05e8\u05d5\u05ea \u05de\u05e2\u05dc \u05d4\u05de\u05de\u05d5\u05e6\u05e2", source: "ynet" },
  { title: "\u05d4\u05db\u05e0\u05e1\u05ea \u05d0\u05d9\u05e9\u05e8\u05d4 \u05ea\u05e7\u05e6\u05d9\u05d1 \u05d4\u05de\u05d3\u05d9\u05e0\u05d4 \u05dc\u05e9\u05e0\u05ea 2026", source: "ynet" },
  { title: "\u05db\u05dc\u05db\u05dc\u05ea \u05d9\u05e9\u05e8\u05d0\u05dc \u05de\u05e6\u05d9\u05d2\u05d4 \u05e6\u05de\u05d9\u05d7\u05d4 \u05e9\u05dc 3.5 \u05d0\u05d7\u05d5\u05d6\u05d9\u05dd \u05d1\u05e8\u05d1\u05e2\u05d5\u05df \u05d4\u05d0\u05d7\u05e8\u05d5\u05df", source: "ynet" },
  { title: "\u05d2\u05dc \u05d7\u05d5\u05dd \u05e6\u05e4\u05d5\u05d9: \u05d4\u05d8\u05de\u05e4\u05e8\u05d8\u05d5\u05e8\u05d5\u05ea \u05d9\u05d6\u05e0\u05e7\u05d5 \u05dc\u05e9\u05d9\u05d0 \u05d4\u05e7\u05d9\u05e5", source: "ynet" },
];

let _newsCache = null;
let _newsCacheTime = 0;
const NEWS_CACHE_MS = 10 * 60 * 1000;

export async function fetchNews() {
  if (_newsCache && Date.now() - _newsCacheTime < NEWS_CACHE_MS) return _newsCache;
  try {
    const res = await fetch("/api/news");
    if (!res.ok) throw new Error("news proxy error");
    const data = await res.json();
    const result = {
      local:  data.localNews?.length  ? data.localNews  : LOCAL_FALLBACK,
      israel: data.israelNews?.length ? data.israelNews : ISRAEL_FALLBACK,
    };
    _newsCache = result;
    _newsCacheTime = Date.now();
    return result;
  } catch {
    return { local: LOCAL_FALLBACK, israel: ISRAEL_FALLBACK };
  }
}

export const NEWS_HEADLINES = LOCAL_FALLBACK;
