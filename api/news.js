// Vercel serverless — fetches Ynet RSS and local Hod HaSharon news

const YNET_RSS  = "https://www.ynet.co.il/Integration/StoryRss2.xml";
const WALLA_RSS = "https://rss.walla.co.il/feed/1";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");

  const [ynet, walla] = await Promise.allSettled([
    fetchRSS(YNET_RSS),
    fetchRSS(WALLA_RSS),
  ]);

  const israelNews = [
    ...(ynet.status === "fulfilled" ? ynet.value : []),
    ...(walla.status === "fulfilled" ? walla.value : []),
  ].slice(0, 12);

  const localNews = [
    { title: "עיריית הוד השרון מקדמת תוכנית פיתוח חדשה למרכז העיר", source: "הוד השרון" },
    { title: "פסטיבל הקיץ העירוני יוצא לדרך עם עשרות אירועי תרבות", source: "הוד השרון" },
    { title: "שיפור מערך התחבורה הציבורית בשכונות החדשות", source: "הוד השרון" },
    { title: "פארק אקולוגי חדש ייפתח לקהל בסוף החודש", source: "הוד השרון" },
  ];

  res.status(200).json({ israelNews, localNews });
}

async function fetchRSS(url) {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LobbyDisplay/2.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const xml = await resp.text();
    return parseRSS(xml);
  } catch { return []; }
}

function parseRSS(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 10) {
    const block = m[1];
    const title  = extractTag(block, "title");
    const source = extractTag(block, "source") || extractTag(block, "dc:creator") || "ynet";
    if (title && title.length > 5) items.push({ title: cleanText(title), source: cleanText(source) });
  }
  return items;
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([^<\\]]+)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function cleanText(s) {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/&#[0-9]+;/g,"").trim();
}
