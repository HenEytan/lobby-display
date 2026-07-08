// אירועי אלומה — הוד השרון.
// המקור החי (alumahod.com) חסום מדפדפן בשל CORS, לכן במערכת הייצור מומלץ
// שירות רקע (proxy) שמושך יומית מאלומה, מסנן לשבוע הנוכחי ושומר cache.
// כאן נעשה שימוש בנתוני דוגמה בפורמט זהה למה שאותו proxy יספק.
//
// שדות כל אירוע: title, datetime (ISO), location, image, category

const SAMPLE_EVENTS = [
  {
    title: "סרט: עד קצה העולם",
    datetime: "2026-07-08T22:00:00",
    location: "בית מקומי לתרבות",
    category: "מופעים",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80",
  },
  {
    title: "הקול נשאר במשפחה — מחווה לנורית הירש ונעמי שמר",
    datetime: "2026-07-09T21:00:00",
    location: "מרכז האמנויות הרב תחומי",
    category: "מופעים",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80",
  },
  {
    title: "ערן זרחוביץ — מופע סטנדאפ",
    datetime: "2026-07-11T22:00:00",
    location: "בית מקומי לתרבות",
    category: "מופעים",
    image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&q=80",
  },
  {
    title: "קרקס קבורקה — מופע תיאטרון-קרקס למשפחה",
    datetime: "2026-07-11T12:00:00",
    location: "פארק אקולוגי",
    category: "משפחות",
    image: "https://images.unsplash.com/photo-1543539748-a3e7ec8b0df6?w=600&q=80",
  },
  {
    title: "אירלנדיה — ערב מוזיקה אירית",
    datetime: "2026-07-10T20:30:00",
    location: "מרכז האמנויות הרב תחומי",
    category: "תרבות",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80",
  },
  {
    title: "סיור קהילתי בפארק האקולוגי",
    datetime: "2026-07-12T17:30:00",
    location: "פארק אקולוגי הוד השרון",
    category: "קהילה",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
  },
];

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // ראשון
  return x;
}

// סינון לאירועי השבוע הנוכחי (א׳–ש׳), ממוין לפי זמן.
export function eventsThisWeek(now = new Date(), events = SAMPLE_EVENTS) {
  const start = startOfWeek(now);
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
