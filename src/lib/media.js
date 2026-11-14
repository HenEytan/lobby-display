// שכבת מדיה — IndexedDB לקבצים כבדים (תמונות ואודיו), עם עותק בשרת (/api/media, Vercel Blob).
// localStorage מוגבל ל-~5MB ולכן משמש רק לנתונים טקסטואליים;
// קבצי מדיה נשמרים כ-Blob ב-IndexedDB (מכסה של מאות MB) כמטמון מקומי. כל העלאה נשלחת גם לשרת,
// ומכשיר שאין לו קובץ מקומית מוריד אותו משם — כך תמונות ו-MP3 שורדים מעבר כתובת ומגיעים לכל מסך.
// שגיאות רשת נבלעות: המסך ממשיך עם מה שיש לו, וסבב הסנכרון הבא משלים.

const DB_NAME = "lobby-media";
const STORE = "files";
const API = "/api/media";
// Under the 4 MB part limit of api/media.js, itself under Vercel's 4.5 MB request body cap.
export const PART_BYTES = 3 * 1024 * 1024;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const out = fn(store);
        t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
        t.onerror = () => reject(t.error);
      })
  );
}

// Stores locally, then sends the server copy without waiting for it: a failed upload is retried by
// syncLocalMedia on the next load of the admin panel or the screen.
export async function putMedia(id, blob) {
  await tx("readwrite", (s) => s.put(blob, id));
  const pin = knownPin();
  if (pin) uploadMedia({ id, blob, pin }).catch(() => {});
  return id;
}

function localIds() {
  let keys = [];
  return tx("readonly", (s) => {
    const r = s.getAllKeys();
    r.onsuccess = () => { keys = r.result || []; };
    return r;
  }).then(() => keys.map(String));
}

// The PIN this session was admitted with, else the one this device knows from before the GET hid it.
export function knownPin() {
  try {
    const session = sessionStorage.getItem("lobby_admin_pin");
    if (session) return session;
    const settings = JSON.parse(localStorage.getItem("lobby_settings") || "null");
    return settings && settings.pin != null ? String(settings.pin) : null;
  } catch {
    return null;
  }
}

// ─── עותק השרת ───

async function apiJson(res) {
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.ok) throw new Error(d.error || "media request failed " + res.status);
  return d;
}

// → true once the server holds the whole file (parts uploaded, manifest committed).
export async function uploadMedia({ id, blob, pin }) {
  const parts = Math.max(1, Math.ceil(blob.size / PART_BYTES));
  const q = `${API}?id=${encodeURIComponent(id)}`;
  for (let n = 0; n < parts; n++) {
    await apiJson(await fetch(`${q}&part=${n}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "X-Lobby-Pin": pin },
      body: blob.slice(n * PART_BYTES, (n + 1) * PART_BYTES),
    }));
  }
  await apiJson(await fetch(`${q}&commit=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Lobby-Pin": pin },
    body: JSON.stringify({ type: blob.type || "application/octet-stream", size: blob.size, parts }),
  }));
  return true;
}

// → the file as a Blob, or null when the server does not have it (or cannot be reached).
export async function downloadMedia(id) {
  try {
    const q = `${API}?id=${encodeURIComponent(id)}`;
    const m = await apiJson(await fetch(q, { cache: "no-store" }));
    const parts = [];
    for (let n = 0; n < m.parts.length; n++) {
      const r = await fetch(`${q}&part=${n}`);
      if (!r.ok) return null;
      parts.push(await r.blob());
    }
    const blob = new Blob(parts, { type: m.type });
    return blob.size === m.size ? blob : null;
  } catch {
    return null;
  }
}

export async function serverMediaIds() {
  const d = await apiJson(await fetch(API, { cache: "no-store" }));
  return d.ids;
}

// Uploads every file this device holds that the server lacks: media uploaded before the server copy
// existed, or whose upload failed. Without a PIN it does nothing; the admin panel runs it after login.
// → { uploaded, failed } ids, or null when it could not run.
export async function syncLocalMedia({ pin = knownPin(), local = { ids: localIds, get: getMedia } } = {}) {
  if (!pin) return null;
  try {
    const onServer = new Set(await serverMediaIds());
    const out = { uploaded: [], failed: [] };
    for (const id of await local.ids()) {
      if (onServer.has(id)) continue;
      const blob = await local.get(id);
      if (!blob) continue;
      try {
        await uploadMedia({ id, blob, pin });
        out.uploaded.push(id);
      } catch {
        out.failed.push(id);
      }
    }
    return out;
  } catch {
    return null;
  }
}

export async function getMedia(id) {
  let result = null;
  await tx("readonly", (s) => {
    const r = s.get(id);
    r.onsuccess = () => { result = r.result || null; };
    return r;
  });
  return result;
}

export async function deleteMedia(id) {
  revokeURL(id);
  await tx("readwrite", (s) => s.delete(id));
}

// מטמון Object URLs — כדי לא לייצר URL חדש בכל רינדור
const urlCache = new Map();
// One download per id even when several components ask at once.
const downloads = new Map();

function fetchToLocal(id) {
  if (!downloads.has(id)) {
    downloads.set(id, downloadMedia(id).then(async (blob) => {
      downloads.delete(id);
      if (blob) await tx("readwrite", (s) => s.put(blob, id)).catch(() => {});
      return blob;
    }));
  }
  return downloads.get(id);
}

export async function mediaURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = (await getMedia(id).catch(() => null)) || (await fetchToLocal(id));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

function revokeURL(id) {
  if (urlCache.has(id)) {
    URL.revokeObjectURL(urlCache.get(id));
    urlCache.delete(id);
  }
}

// דחיסת תמונה בצד לקוח: הקטנה לרוחב מקסימלי + JPEG איכות 0.82
export function compressImage(file, maxW = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(src);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error("image load failed")); };
    img.src = src;
  });
}

export function newMediaId(prefix = "m") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// מד ניצול אחסון של הדפדפן
export async function storageInfo() {
  try {
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

export function fmtBytes(n) {
  if (!n) return "0MB";
  const mb = n / (1024 * 1024);
  if (mb < 1) return `${Math.round(n / 1024)}KB`;
  if (mb < 1024) return `${mb.toFixed(1)}MB`;
  return `${(mb / 1024).toFixed(2)}GB`;
}
