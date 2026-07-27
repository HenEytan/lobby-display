// מזג אוויר — Open-Meteo (ללא מפתח API), עבור הוד השרון.
// הקריאה החיצונית היחידה במערכת. בעת נפילת המקור מוחזר ערך אחרון שנשמר.

const HOD_HASHARON = { lat: 32.15, lon: 34.89 };

const WMO = {
  0: "בהיר", 1: "בהיר בעיקר", 2: "מעונן חלקית", 3: "מעונן",
  45: "ערפילי", 48: "ערפילי", 51: "טפטוף קל", 53: "טפטוף", 55: "טפטוף חזק",
  61: "גשם קל", 63: "גשם", 65: "גשם חזק", 71: "שלג קל", 80: "ממטרים",
  81: "ממטרים", 82: "ממטרים חזקים", 95: "סופת רעמים",
};

export async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOD_HASHARON.lat}&longitude=${HOD_HASHARON.lon}&current=temperature_2m,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max&timezone=Asia%2FJerusalem&forecast_days=4`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather source error");
    const d = await res.json();
    const days = d.daily.time.map((t, i) => ({
      date: t,
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      code: d.daily.weather_code[i],
    }));
    // מדד UV: העדפה לערך הנוכחי; אם חסר — שיא היום. מתעדכן בכל רענון מזג אוויר.
    let uv = d.current && typeof d.current.uv_index === "number" ? d.current.uv_index : null;
    if (uv == null && d.daily && Array.isArray(d.daily.uv_index_max)) {
      const v = d.daily.uv_index_max[0];
      if (typeof v === "number") uv = v;
    }
    const current = {
      temp: Math.round(d.current.temperature_2m),
      desc: WMO[d.current.weather_code] || "—",
      code: d.current.weather_code,
      uv: uv == null ? null : Math.round(uv * 10) / 10,
    };
    const payload = { current, days };
    localStorage.setItem("weather_cache", JSON.stringify(payload));
    return payload;
  } catch {
    const cached = localStorage.getItem("weather_cache");
    if (cached) { try { return JSON.parse(cached); } catch { /* ignore */ } }
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

// ─── מדד קרינה UV — סיווג לפי המלצות ארגון הבריאות העולמי ───
export function uvLevel(uv) {
  if (uv == null) return null;
  if (uv < 3) return { label: "נמוך", cls: "uv-low", advice: "אין צורך בהגנה" };
  if (uv < 6) return { label: "בינוני", cls: "uv-mod", advice: "מומלץ כובע ומסנן קרינה" };
  if (uv < 8) return { label: "גבוה", cls: "uv-high", advice: "הימנעו משהייה ממושכת בשמש" };
  if (uv < 11) return { label: "גבוה מאוד", cls: "uv-vhigh", advice: "הגנה מלאה — עדיף בצל" };
  return { label: "קיצוני", cls: "uv-ext", advice: "הימנעו מחשיפה לשמש" };
}
