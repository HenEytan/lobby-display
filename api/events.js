// Vercel Serverless Function — מושך אירועים חיים מאלומה (הוד השרון) בצד שרת,
// עוקף את חסימת ה-CORS של הדפדפן, מסנן לשבוע הנוכחי ומחזיר JSON אחיד.
// אין באתר אלומה API ייעודי לאירועים, לכן נמשכים פוסטים חיים מ-WordPress REST
// כמקור אמת. אם המבנה ישתנה/יתווסף יומן ייעודי — יש לעדכן את normalize().

const ALUMA = "https://alumahod.com";
const CACHE = { at: 0, data: null };
const TTL_MS = 15 * 60 * 1000; // רענון כל 15 דק׳

function decode(html = "") {
  return String(html)
    .replace(/&#8211;/g, "–").replace(/&#8217;/g, "\u2019")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&#8220;|&#8221;/g, '"').replace(/<[^>]+>/g, "").trim();
}

async function fetchAluma() {
  const url = `${ALUMA}/wp-json/wp/v2/posts?per_page=30&_fields=id,date,link,title,jetpack_featured_media_url,_links&_embed=wp:featuredmedia`;
  const res = await fetch(url, { headers: { "User-Agent": "LobbyDisplay/1.1" } });
  if (!res.ok) throw new Error(`Aluma ${res.status}`);
  const posts = await res.json();
  return posts.map((p) => {
    const media =
      p?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
      p?.jetpack_featured_media_url ||
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80";
    return {
      title: decode(p?.title?.rendered || ""),
      datetime: p?.date || null,
      location: "\u05d0\u05dc\u05d5\u05de\u05d4 \u00b7 \u05d4\u05d5\u05d3 \u05d4\u05e9\u05e8\u05d5\u05df",
      category: "\u05ea\u05e8\u05d1\u05d5\u05ea",
      image: media,
      link: p?.link || ALUMA,
    };
  }).filter((e) => e.title && e.datetime);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
  try {
    if (!CACHE.data || Date.now() - CACHE.at > TTL_MS) {
      CACHE.data = await fetchAluma();
      CACHE.at = Date.now();
    }
    res.status(200).json({ ok: true, source: "alumahod.com", count: CACHE.data.length, events: CACHE.data });
  } catch (err) {
    res.status(200).json({ ok: false, source: "error", error: String(err), events: [] });
  }
}
