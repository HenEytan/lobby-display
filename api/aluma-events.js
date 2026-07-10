// Vercel serverless — scrapes alumahod.com monthly events page

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");

  const URL = "https://alumahod.com/%d7%94%d7%97%d7%95%d7%93%d7%a9-%d7%91%d7%90%d7%9c%d7%95%d7%9e%d7%94/";

  try {
    const resp = await fetch(URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LobbyDisplay/2.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    const events = parseAlumaEvents(html);
    return res.status(200).json({ events, source: "live", fetchedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(200).json({ events: [], source: "error", error: err.message });
  }
}

function parseAlumaEvents(html) {
  const events = [];
  const articleRe = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let article;
  while ((article = articleRe.exec(html)) !== null) {
    const block = article[1];
    const titleM = block.match(/<h[23][^>]*>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h[23]>/i)
      || block.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
    if (!titleM) continue;
    const title = decodeHTML(titleM[1].trim());
    if (!title || title.length < 4) continue;
    const timeM = block.match(/<time[^>]*datetime="([^"]+)"/i)
      || block.match(/datetime="([^"]+)"/i)
      || block.match(/data-date="([^"]+)"/i);
    const datetime = timeM ? timeM[1] : null;
    const imgM = block.match(/<img[^>]*src="([^"]+)"/i);
    const image = imgM ? imgM[1] : "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80";
    const linkM = block.match(/href="(https?:\/\/alumahod\.com\/[^"]+)"/i);
    const link = linkM ? linkM[1] : "https://alumahod.com";
    const catM = block.match(/rel="category[^"]*"[^>]*>([^<]+)<\/a>/i);
    const category = catM ? decodeHTML(catM[1].trim()) : "אירועים";
    const locM = block.match(/class="[^"]*location[^"]*"[^>]*>([^<]+)</i);
    const location = locM ? decodeHTML(locM[1].trim()) : "אלומה — הוד השרון";
    events.push({ title, datetime, image, link, category, location });
  }
  return events.slice(0, 12);
}

function decodeHTML(s) {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).trim();
}
