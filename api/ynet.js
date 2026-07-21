// פונקציית שרת — מתווך RSS של מבזקי ynet (עוקף CORS של הדפדפן).
// אין להוסיף export const config עם runtime — Vercel מזהה Node אוטומטית.

const FEEDS = [
  "https://www.ynet.co.il/Integration/StoryRss1854.xml", // מבזקים
  "https://www.ynet.co.il/Integration/StoryRss2.xml",    // חדשות
];

function extractTitles(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) && items.length < 20) {
    const block = m[1];
    const t = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(block);
    if (t && t[1]) {
      const title = t[1]
        .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .trim();
      if (title) items.push({ title });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");

  for (const url of FEEDS) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (lobby-display)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      // ynet מגיש לעיתים ב-windows-1255 — ננסה UTF-8 ואם יש תווים שבורים ננסה 1255
      let xml = new TextDecoder("utf-8").decode(buf);
      if (xml.includes("\uFFFD")) {
        try { xml = new TextDecoder("windows-1255").decode(buf); } catch { /* ignore */ }
      }
      const items = extractTitles(xml);
      if (items.length > 0) {
        return res.status(200).json({ ok: true, source: "ynet", updated: Date.now(), items });
      }
    } catch { /* ננסה את המקור הבא */ }
  }
  return res.status(200).json({ ok: false, items: [] });
}
