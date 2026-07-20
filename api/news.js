// Ynet RSS proxy — נמשך בצד השרת כדי לעקוף CORS.

const FEED = "https://www.ynet.co.il/Integration/StoryRss1854.xml";

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decode(m[1]) : "";
}

export default async function handler(req, res) {
  try {
    const r = await fetch(FEED, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LobbyDisplay/3.0)" },
    });
    if (!r.ok) throw new Error(`ynet ${r.status}`);
    const xml = await r.text();

    const items = [];
    const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    for (const b of blocks) {
      const title = pick(b, "title");
      if (!title) continue;
      items.push({
        title,
        link: pick(b, "link"),
        date: pick(b, "pubDate"),
        source: "ynet",
      });
      if (items.length >= 20) break;
    }

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.status(200).json({ ok: true, items, fetchedAt: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ ok: false, items: [], error: String(e.message || e) });
  }
}
