// \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9 \u05d0\u05dc\u05d5\u05de\u05d4 \u2014 \u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df.
// \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05e0\u05de\u05e9\u05db\u05d9\u05dd \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea \u05de-/api/events (\u05e9\u05e8\u05ea \u05d1\u05d9\u05e0\u05d9\u05d9\u05dd \u05e9\u05e2\u05d5\u05e7\u05e3 CORS).
// \u05d0\u05dd \u05d4\u05e9\u05e8\u05ea \u05dc\u05d0 \u05d6\u05de\u05d9\u05df \u2014 \u05e0\u05e4\u05d9\u05dc\u05d4 \u05d7\u05dc\u05e7\u05d4 \u05dc\u05e0\u05ea\u05d5\u05e0\u05d9 \u05d3\u05d5\u05d2\u05de\u05d4 (\u05ea\u05d0\u05e8\u05d9\u05db\u05d9\u05dd \u05d3\u05d9\u05e0\u05d0\u05de\u05d9\u05d9\u05dd).
// \u05e9\u05d3\u05d5\u05ea \u05db\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2: title, datetime (ISO), location, image, category

const IL_TZ = "Asia/Jerusalem";

// \u05d1\u05d5\u05e0\u05d4 \u05ea\u05d0\u05e8\u05d9\u05da ISO \u05d9\u05d7\u05e1\u05d9 \u05dc\u05d9\u05d5\u05dd \u05d1\u05e9\u05d1\u05d5\u05e2 \u05d4\u05e0\u05d5\u05db\u05d7\u05d9 (\u05dc\u05e0\u05ea\u05d5\u05e0\u05d9 \u05d2\u05d9\u05d1\u05d5\u05d9)
function relISO(dowOffset, hh, mm) {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
  d.setDate(d.getDate() - d.getDay() + dowOffset);
  return d.toISOString();
}

function sampleEvents() {
  return [
    { title: "\u05e1\u05e8\u05d8: \u05e2\u05d3 \u05e7\u05e6\u05d4 \u05d4\u05e2\u05d5\u05dc\u05dd", datetime: relISO(3, 22, 0), location: "\u05d1\u05d9\u05ea \u05de\u05e7\u05d5\u05de\u05d9 \u05dc\u05ea\u05e8\u05d1\u05d5\u05ea", category: "\u05de\u05d5\u05e4\u05e2\u05d9\u05dd", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80" },
    { title: "\u05d4\u05e7\u05d5\u05dc \u05e0\u05e9\u05d0\u05e8 \u05d1\u05de\u05e9\u05e4\u05d7\u05d4 \u2014 \u05de\u05d7\u05d5\u05d5\u05d4 \u05dc\u05e0\u05d5\u05e8\u05d9\u05ea \u05d4\u05d9\u05e8\u05e9", datetime: relISO(4, 21, 0), location: "\u05de\u05e8\u05db\u05d6 \u05d4\u05d0\u05de\u05e0\u05d5\u05d9\u05d5\u05ea \u05d4\u05e8\u05d1 \u05ea\u05d7\u05d5\u05de\u05d9", category: "\u05de\u05d5\u05e4\u05e2\u05d9\u05dd", image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80" },
    { title: "\u05e2\u05e8\u05df \u05d6\u05e8\u05d7\u05d5\u05d1\u05d9\u05e5 \u2014 \u05de\u05d5\u05e4\u05e2 \u05e1\u05d8\u05e0\u05d3\u05d0\u05e4", datetime: relISO(6, 22, 0), location: "\u05d1\u05d9\u05ea \u05de\u05e7\u05d5\u05de\u05d9 \u05dc\u05ea\u05e8\u05d1\u05d5\u05ea", category: "\u05de\u05d5\u05e4\u05e2\u05d9\u05dd", image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&q=80" },
    { title: "\u05e7\u05e8\u05e7\u05e1 \u05e7\u05d1\u05d5\u05e8\u05e7\u05d4 \u2014 \u05de\u05d5\u05e4\u05e2 \u05dc\u05de\u05e9\u05e4\u05d7\u05d4", datetime: relISO(6, 12, 0), location: "\u05e4\u05d0\u05e8\u05e7 \u05d0\u05e7\u05d5\u05dc\u05d5\u05d2\u05d9", category: "\u05de\u05e9\u05e4\u05d7\u05d5\u05ea", image: "https://images.unsplash.com/photo-1543539748-a3e7ec8b0df6?w=600&q=80" },
    { title: "\u05d0\u05d9\u05e8\u05dc\u05e0\u05d3\u05d9\u05d4 \u2014 \u05e2\u05e8\u05d1 \u05de\u05d5\u05d6\u05d9\u05e7\u05d4 \u05d0\u05d9\u05e8\u05d9\u05ea", datetime: relISO(5, 20, 30), location: "\u05de\u05e8\u05db\u05d6 \u05d4\u05d0\u05de\u05e0\u05d5\u05d9\u05d5\u05ea \u05d4\u05e8\u05d1 \u05ea\u05d7\u05d5\u05de\u05d9", category: "\u05ea\u05e8\u05d1\u05d5\u05ea", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80" },
    { title: "\u05e1\u05d9\u05d5\u05e8 \u05e7\u05d4\u05d9\u05dc\u05ea\u05d9 \u05d1\u05e4\u05d0\u05e8\u05e7 \u05d4\u05d0\u05e7\u05d5\u05dc\u05d5\u05d2\u05d9", datetime: relISO(0, 17, 30), location: "\u05e4\u05d0\u05e8\u05e7 \u05d0\u05e7\u05d5\u05dc\u05d5\u05d2\u05d9 \u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df", category: "\u05e7\u05d4\u05d9\u05dc\u05d4", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80" },
  ];
}

// \u05de\u05d5\u05e9\u05da \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05d7\u05d9\u05d9\u05dd \u05de\u05d4-proxy; \u05d1\u05db\u05e9\u05dc\u05d5\u05df \u2014 \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d3\u05d5\u05d2\u05de\u05d4.
export async function loadEvents() {
  try {
    const res = await fetch("/api/events", { cache: "no-store" });
    if (!res.ok) throw new Error("proxy " + res.status);
    const data = await res.json();
    if (data && data.ok && Array.isArray(data.events) && data.events.length) {
      return data.events;
    }
  } catch (err) {
    // \u05e0\u05d5\u05e4\u05dc\u05d9\u05dd \u05dc\u05d3\u05d5\u05d2\u05de\u05d4
  }
  return sampleEvents();
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // \u05e8\u05d0\u05e9\u05d5\u05df
  return x;
}

// \u05e1\u05d9\u05e0\u05d5\u05df \u05dc\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9 \u05d4\u05e9\u05d1\u05d5\u05e2 \u05d4\u05e0\u05d5\u05db\u05d7\u05d9 (\u05d0\u05f3\u2013\u05e9\u05f3), \u05de\u05de\u05d5\u05d9\u05df \u05dc\u05e4\u05d9 \u05d6\u05de\u05df.
export function eventsThisWeek(now = new Date(), events) {
  const list = events && events.length ? events : sampleEvents();
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return list
    .map((e) => ({ ...e, date: new Date(e.datetime) }))
    .filter((e) => !isNaN(e.date) && e.date >= start && e.date < end)
    .sort((a, b) => a.date - b.date);
}

const DOW = ["\u05d0\u05f3", "\u05d1\u05f3", "\u05d2\u05f3", "\u05d3\u05f3", "\u05d4\u05f3", "\u05d5\u05f3", "\u05e9\u05d1\u05ea"];
export function formatEventTime(date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: IL_TZ, hour12: false, weekday: "short",
    day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const p = {};
  for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return `\u05d9\u05d5\u05dd ${DOW[wdMap[p.weekday]]} \u00b7 ${p.day}.${p.month} \u00b7 ${p.hour}:${p.minute}`;
}
