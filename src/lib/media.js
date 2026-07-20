// שכבת מדיה — IndexedDB לקבצים כבדים (תמונות ואודיו).
// localStorage מוגבל ל-~5MB ולכן משמש רק לנתונים טקסטואליים;
// קבצי מדיה נשמרים כ-Blob ב-IndexedDB (מכסה של מאות MB), ללא שום שרת.

const DB_NAME = "lobby-media";
const STORE = "files";

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

export async function putMedia(id, blob) {
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
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

export async function mediaURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getMedia(id);
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
