// מקורות נתונים — מזג אוויר (Open-Meteo ישירות), חדשות ואירועים (דרך /api).

const HOD_HASHARON = { lat: 32.15, lon: 34.89 };

const WMO = {
  0: "בהיר", 1: "בהיר בעיקר", 2: "מעונן חלקית", 3: "מעונן",
  45: "ערפילי", 48: "ערפילי", 51: "טפטוף קל", 53: "טפטוף", 55: "טפטוף חזק",
  61: "גשם קל", 63: "גשם", 65: "גשם חזק", 71: "שלג קל", 80: "ממטרים",
  81: "ממטרים", 82: "ממטרים חזקים", 95: "סופת רעמים",
};

export async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOD_HASHARON.lat}&longitude=${HOD_HASHARON.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FJerusalem&forecast_days=5`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather");
    const d = await res.json();
    const days = d.daily.time.map((t, i) => ({
      date: new Date(t),
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      desc: WMO[d.daily.weather_code[i]] || "—",
      code: d.daily.weather_code[i],
    }));
    const current = {
      temp: Math.round(d.current.temperature_2m),
      desc: WMO[d.current.weather_code] || "—",
      code: d.current.weather_code,
    };
    const payload = { current, days };
    localStorage.setItem("weather_cache", JSON.stringify(payload));
    return payload;
  } catch {
    const cached = localStorage.getItem("weather_cache");
    if (cached) {
      const p = JSON.parse(cached);
      p.days = (p.days || []).map((d) => ({ ...d, date: new Date(d.date) }));
      return p;
    }
    return { current: { temp: 28, desc: "בהיר", code: 0 }, days: [] };
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

// חדשות — Ynet דרך serverless proxy, עם cache מקומי כגיבוי.
export async function fetchNews() {
  try {
    const res = await fetch("/api/news");
    const d = await res.json();
    if (!d.ok || !d.items.length) throw new Error("news empty");
    localStorage.setItem("news_cache", JSON.stringify(d.items));
    return d.items;
  } catch {
    const cached = localStorage.getItem("news_cache");
    return cached ? JSON.parse(cached) : [];
  }
}
