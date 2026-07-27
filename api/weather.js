// פונקציית שרת — מתווך מזג אוויר (Open-Meteo).
// הקריאה מתבצעת מהשרת ולא מהדפדפן, כדי שמכשירי תצוגה ישנים
// (שמאגר תעודות ה-SSL שלהם מיושן) יקבלו נתונים זהים לכל שאר המכשירים.
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.

const HOD_HASHARON = { lat: 32.15, lon: 34.89 };

const WMO = {
  0: "בהיר", 1: "בהיר בעיקר", 2: "מעונן חלקית", 3: "מעונן",
  45: "ערפילי", 48: "ערפילי", 51: "טפטוף קל", 53: "טפטוף", 55: "טפטוף חזק",
  61: "גשם קל", 63: "גשם", 65: "גשם חזק", 71: "שלג קל", 80: "ממטרים",
  81: "ממטרים", 82: "ממטרים חזקים", 95: "סופת רעמים",
};

export default async function handler(req, res) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${HOD_HASHARON.lat}` +
    `&longitude=${HOD_HASHARON.lon}` +
    `&current=temperature_2m,weather_code,uv_index` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max` +
    `&timezone=Asia%2FJerusalem&forecast_days=4`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("upstream " + r.status);
    const d = await r.json();

    const days = (d.daily?.time || []).map((t, i) => ({
      date: t,
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      code: d.daily.weather_code[i],
    }));

    let uv = typeof d.current?.uv_index === "number" ? d.current.uv_index : null;
    if (uv == null && Array.isArray(d.daily?.uv_index_max)) {
      const v = d.daily.uv_index_max[0];
      if (typeof v === "number") uv = v;
    }

    const current = {
      temp: Math.round(d.current.temperature_2m),
      desc: WMO[d.current.weather_code] || "—",
      code: d.current.weather_code,
      uv: uv == null ? null : Math.round(uv * 10) / 10,
    };

    // מטמון קצר בקצה — מקטין קריאות ומאיץ תגובה למסכים
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    res.status(200).json({ ok: true, updated: Date.now(), current, days });
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
