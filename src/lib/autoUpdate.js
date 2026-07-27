// עדכון אוטומטי — זיהוי פריסת גרסה חדשה וריענון המסך ללא מגע יד.
// כל build של Vite מייצר שמות bundle עם hash חדש ב-index.html.
// דוגמים את index.html החי כל 4 דקות; אם ה-hash השתנה — הגרסה החדשה עלתה ל-Vercel
// והמסך מבצע location.reload() אוטומטי. שגיאות רשת נבלעות בשקט (kiosk 24/7).

const CHECK_MS = 4 * 60 * 1000;
let baseline = null;

async function bundleSignature() {
  const res = await fetch(`/index.html?_=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/\/assets\/[\w.-]+\.js/g);
  return m ? [...new Set(m)].sort().join("|") : null;
}

async function checkForUpdate() {
  try {
    const sig = await bundleSignature();
    if (!sig) return;
    if (baseline === null) { baseline = sig; return; }
    if (sig !== baseline) location.reload();
  } catch { /* offline או שגיאה זמנית — ננסה שוב בסבב הבא */ }
}

checkForUpdate();
setInterval(checkForUpdate, CHECK_MS);
