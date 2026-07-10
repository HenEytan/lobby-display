// אירועי אלומה — הוד השרון.
// מושך נתונים חיים דרך /api/aluma-events (proxy serverless) עם fallback לדוגמאות.

const SAMPLE_EVENTS = [
  {
    title: "סרט: עד קצה העולם",
    datetime: "WEEK+1T22:00:00",
    location: "בית מקומי לתרבות",
    category: "קולנוע",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80",
  },
  {
    title: "הקול נשאר במשפחה — מחווה לנורית הירש ונעמי שמר",
    datetime: "WEEK+2T21:00:00",
    location: "מרכז האמנויות הרב תחומי",
    category: "מופעים",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80",
  },
  {
    title: "ערן זרחוביץ — מופע סטנדאפ",
    datetime: "WEEK+4T22:00:00",
    location: "בית מקומי לתרבות",
    category: "בידור",
    image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&q=80",
  },
  {
    title: "קרקס קבורקה — מופע תיאטרון-קרקס למשפחה",
    datetime: "WEEK+4T12:00:00",
    location: "פארק אקולוגי",
    category: "משפחות",
    image: "https://images.unsplash.com/photo-1543539748-a3e7ec8b0df6?w=600&q=80",
  },
  {
    title: "אירלנדיה — ערב מוזיקה אירית",
    datetime: "WEEK+3T20:30:00",
    location: "מרכז האמנויות הרב תחומי",
    category: "תרבות",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80",
  },
  {
    title: "סיור קהילתי בפארק האקולוגי",
    datetime: "WEEK+5T17:30:00",
    location: "פארק אקולוגי הוד השרון",
    category: "קהילה",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
  },
];

function expandSampleDates(now) {
  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return SAMPLE_EVENTS.map((e) => {
    const offset = parseInt(e.datetime.replace("WEEK+", ""), 10);
    const time   = e.datetime.split("T")[1];
    const [hh, mm] = time.split(":").map(Number);
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + offset);
    d.setHours(hh, mm, 0, 0);
    return { ...e, date: d };
  });
}

let _cachedEvents = null;
let _cacheTime = 0;
const CACHE_MS = 30 * 60 * 1000;

export async function fetchAlumaEvents() {
  if (_cachedEvents && Date.now() - _cacheTime < CACHE_MS) return _cachedEvents;
  try {
    const res = await fetch("/api/aluma-events");
    if (!res.ok) throw new Error("proxy error");
    const { events } = await res.json();
    if (events && events.length > 0) {
      _cachedEvents = events;
      _cacheTime = Date.now();
      return events;
    }
  } catch {
    // fall through to sample
  }
  return null;
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function eventsThisWeek(now = new Date(), liveEvents = null) {
  if (liveEvents) {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return liveEvents
      .map((e) => ({ ...e, date: e.datetime ? new Date(e.datetime) : null }))
      .filter((e) => e.date && e.date >= start && e.date < end)
      .sort((a, b) => a.date - b.date);
  }
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return expandSampleDates(now)
    .filter((e) => e.date >= start && e.date < end)
    .sort((a, b) => a.date - b.date);
}

const DOW = ["\u05d0\u05f3", "\u05d1\u05f3", "\u05d2\u05f3", "\u05d3\u05f3", "\u05d4\u05f3", "\u05d5\u05f3", "\u05e9\u05d1\u05ea"];
export function formatEventTime(date) {
  if (!date) return "\u2014";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `\u05d9\u05d5\u05dd ${DOW[date.getDay()]} \u00b7 ${date.getDate()}.${date.getMonth() + 1} \u00b7 ${hh}:${mm}`;
}
