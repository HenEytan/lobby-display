// אלומה — "החודש באלומה". נמשך בצד השרת ונפרס לרשימת אירועים מובנית.
// פורמט השורה בדף: DD.MM  כותרת  מיקום  לפרטים / לרכישה

const PAGE = "https://alumahod.com/" + encodeURIComponent("החודש-באלומה") + "/";

const VENUES = [
  "מרכז האמנויות הרב תחומי",
  "בית מקומי לתרבות",
  "פארק אקולוגי הוד השרון",
  "מתחם 'הדב הירוק', הפארק האקולוגי",
  "הפארק האקולוגי",
  "פארק ארבע עונות",
  "בית לגיל הרך",
  "אלומה | בית היוצר",
  "אלומה | הברנש",
  "אלומה | גיורא",
  "אלומה | גולן",
  "אלומה | האבסטייר",
  "הספרייה העירונית",
  "גינת מגדיאל",
  "פארק השחר",
];

function categorize(title, venue) {
  const t = title + " " + venue;
  if (/בית לגיל הרך|משחקי|תיאטרון החלומות|בייבי|שעת סיפור|ילד/.test(t)) return "משפחות";
  if (/סרט|הקרנת|קולנוע/.test(t)) return "קולנוע";
  if (/הרצאה|מכללת|סדנת|קורס|מיתוג/.test(t)) return "ידע";
  if (/DJ|מוזיק|מופע|זמר|שירה|תיפוף|רביעיית/.test(t)) return "מוזיקה";
  if (/סיור|טיול|טבע|תצפית|שקיעה/.test(t)) return "טבע";
  return "תרבות";
}

function parseRow(text, href) {
  const m = text.match(/^(\d{2})\.(\d{2})\s+([\s\S]+)$/);
  if (!m) return null;
  const [, dd, mm] = m;
  let rest = m[3].replace(/לפרטים\s*\/\s*לרכישה\s*$/, "").trim();

  let venue = "";
  for (const v of VENUES) {
    if (rest.endsWith(v)) {
      venue = v;
      rest = rest.slice(0, -v.length).trim();
      break;
    }
  }

  const now = new Date();
  let year = now.getFullYear();
  const month = parseInt(mm, 10) - 1;
  if (month < now.getMonth() - 6) year += 1;
  const date = new Date(year, month, parseInt(dd, 10), 0, 0, 0);

  return {
    title: rest,
    location: venue || "הוד השרון",
    datetime: date.toISOString(),
    category: categorize(rest, venue),
    link: href,
  };
}

export default async function handler(req, res) {
  try {
    const r = await fetch(PAGE, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LobbyDisplay/3.0)" },
    });
    if (!r.ok) throw new Error(`aluma ${r.status}`);
    const html = await r.text();

    const events = [];
    const seen = new Set();
    const anchors = html.match(/<a[^>]+href="[^"]*alumahod\.com\/(?:event|culture|class)\/[^"]*"[^>]*>[\s\S]*?<\/a>/g) || [];

    for (const a of anchors) {
      const href = (a.match(/href="([^"]+)"/) || [])[1] || "";
      const text = a
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      const ev = parseRow(text, href);
      if (!ev || !ev.title) continue;
      const key = ev.datetime + "|" + ev.title;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(ev);
    }

    events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
    res.status(200).json({ ok: true, events, fetchedAt: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ ok: false, events: [], error: String(e.message || e) });
  }
}
