// אירועי אלומה — נמשכים דרך /api/aluma-events (proxy בצד השרת).

export async function fetchEvents() {
  try {
    const res = await fetch("/api/aluma-events");
    const d = await res.json();
    if (!d.ok || !d.events.length) throw new Error("events empty");
    localStorage.setItem("events_cache", JSON.stringify(d.events));
    return d.events;
  } catch {
    const cached = localStorage.getItem("events_cache");
    return cached ? JSON.parse(cached) : [];
  }
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

// אירועי השבוע הנוכחי (א׳–ש׳). אם אין — מוחזרים הקרובים הבאים.
export function eventsThisWeek(now, events) {
  if (!events || !events.length) return [];
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const mapped = events.map((e) => ({ ...e, date: new Date(e.datetime) }));
  const week = mapped
    .filter((e) => e.date >= start && e.date < end)
    .sort((a, b) => a.date - b.date);

  if (week.length) return week;
  return mapped.filter((e) => e.date >= start).sort((a, b) => a.date - b.date).slice(0, 8);
}

const DOW = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function formatEventDay(date) {
  return `יום ${DOW[date.getDay()]}`;
}

export function formatEventDate(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}
