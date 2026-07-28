// אירועי אלומה — הוד השרון.
// ללא תמונות חיצוניות: לכל קטגוריה רקע גרדיאנט מקומי.
// המקור החי נטען דרך /api/aluma-events (proxy בצד השרת); הנתונים כאן הם גיבוי בלבד.

export const CATEGORY_BG = {
  "מופעים": "linear-gradient(135deg, #efe6f7 0%, #dcc8ee 100%)",
  "משפחות": "linear-gradient(135deg, #fdf0e0 0%, #f6d9b4 100%)",
  "תרבות": "linear-gradient(135deg, #e4eef7 0%, #c4dbee 100%)",
  "קהילה": "linear-gradient(135deg, #e8f3e4 0%, #cbe4c0 100%)",
  "default": "linear-gradient(135deg, #f3efe6 0%, #e3d7bd 100%)",
};

const SAMPLE_EVENTS = [
  {
    title: "סרט: עד קצה העולם",
    datetime: "2026-07-22T22:00:00",
    location: "בית מקומי לתרבות",
    category: "מופעים",
  },
  {
    title: "הקול נשאר במשפחה — מחווה לנורית הירש ונעמי שמר",
    datetime: "2026-07-23T21:00:00",
    location: "מרכז האמנויות הרב תחומי",
    category: "מופעים",
  },
  {
    title: "ערן זרחוביץ — מופע סטנדאפ",
    datetime: "2026-07-25T22:00:00",
    location: "בית מקומי לתרבות",
    category: "מופעים",
  },
  {
    title: "קרקס קבורקה — מופע תיאטרון-קרקס למשפחה",
    datetime: "2026-07-25T12:00:00",
    location: "פארק אקולוגי",
    category: "משפחות",
  },
  {
    title: "אירלנדיה — ערב מוזיקה אירית",
    datetime: "2026-07-24T20:30:00",
    location: "מרכז האמנויות הרב תחומי",
    category: "תרבות",
  },
  {
    title: "סיור קהילתי בפארק האקולוגי",
    datetime: "2026-07-26T17:30:00",
    location: "פארק אקולוגי הוד השרון",
    category: "קהילה",
  },
];

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // ראשון
  return x;
}

export const EVENTS_REFRESH_MS = 3 * 60 * 60 * 1000; // רענון אירועים חיים כל 3 שעות

// שליפת אירועי אלומה מה-proxy בצד השרת; נפילה חיננית לנתוני הדוגמה המקומיים.
export async function fetchAlumaEvents() {
  try {
    const res = await fetch("/api/aluma-events", { cache: "no-store" });
    const d = await res.json();
    if (d.ok && Array.isArray(d.events) && d.events.length) return d.events;
  } catch { /* אין רשת — נשארים על הגיבוי המקומי */ }
  return SAMPLE_EVENTS;
}

// אירועי שבעת הימים הקרובים (מהיום ואילך), ממוינים לפי זמן.
export function eventsThisWeek(now = new Date(), events = SAMPLE_EVENTS) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return events
    .map((e) => ({ ...e, date: new Date(e.datetime) }))
    .filter((e) => e.date >= start && e.date < end)
    .sort((a, b) => a.date - b.date);
}

const DOW = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"];
export function formatEventTime(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `יום ${DOW[date.getDay()]} · ${date.getDate()}.${date.getMonth() + 1} · ${hh}:${mm}`;
}
