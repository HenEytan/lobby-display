// שכבת נתונים — localStorage לנתונים טקסטואליים, עם מודל טיוטה/פרסום.
// המסך קורא תמיד את הגרסה ה"חיה" (live); פאנל הניהול עורך טיוטות (draft)
// ולחיצה על "פרסם" מעתיקה את כל הטיוטות ל-live בבת אחת.

import { useEffect, useMemo, useState } from "react";
import { ART_BG } from "./artwork.jsx";

export const KEYS = ["settings", "banners", "announcements", "ticker", "music"];
const LIVE = (k) => `lobby_${k}`;
const DRAFT = (k) => `lobby_draft_${k}`;

// ─── ברירות מחדל ───

export const DEFAULT_SETTINGS = {
  buildingName: "יסוד המעלה 9",
  city: "הוד השרון",
  theme: "wood", // ערכת צבע — ראו lib/themes.js
  rotationSecs: 15,
  showTicker: true,
  showEvents: true,
  showNews: true,     // מבזקי ynet בתחתית
  showCalendar: true, // שקופית לוח חגים ומועדים
  tickerSpeed: 45, // שניות לסיבוב מלא
  newsSpeed: 60,   // שניות לסיבוב מבזקים
  activeStart: "06:00",
  activeEnd: "23:00",
  pin: "1234",
};

export const BG_PRESETS = {
  ...ART_BG,
  gold: "linear-gradient(135deg, #f7f1e3 0%, #eaddc0 45%, #d9c194 100%)",
  summer: "linear-gradient(135deg, #fdf6e3 0%, #ffe9c2 50%, #ffd9a0 100%)",
  green: "linear-gradient(135deg, #f3f7ee 0%, #dcead0 50%, #c2d8ae 100%)",
  sky: "linear-gradient(135deg, #f0f6fa 0%, #d8e8f2 50%, #b9d4e6 100%)",
  rose: "linear-gradient(135deg, #faf2f0 0%, #f2ddd6 50%, #e6c3b8 100%)",
  night: "linear-gradient(135deg, #23283a 0%, #2e3550 60%, #3b4470 100%)",
};

const DEFAULT_BANNERS = [
  {
    id: "b_summer",
    title: "קיץ נעים ובטוח",
    subtitle: "לכל דיירי יסוד המעלה 9 — חופשה נהדרת!",
    bg: "summer", image: null,
    start: "", end: "", active: true, order: 1,
  },
  {
    id: "b_clean",
    title: "כשהבניין נקי — כולנו מרוויחים",
    subtitle: "שומרים יחד על לובי מטופח ונעים",
    bg: "green", image: null,
    start: "", end: "", active: true, order: 2,
  },
];

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "a_gizum",
    title: "פינוי גזם וגרוטאות",
    body: "פינוי גזם בימי חמישי. נא להוציא לרחוב רק ביום רביעי בערב.",
    category: "תחזוקה", pinned: false, urgent: false,
    start: "", end: "",
  },
  {
    id: "a_vaad",
    title: "אסיפת דיירים",
    body: "אסיפת הדיירים הקרובה תתקיים בלובי. פרטים במייל הוועד.",
    category: "ועד", pinned: true, urgent: false,
    start: "", end: "",
  },
];

const DEFAULT_TICKER = [
  { id: "t1", text: "ברוכים הבאים לדיירי יסוד המעלה 9, הוד השרון — שיהיה לכם יום נעים!", active: true, order: 1 },
  { id: "t2", text: "הוועד מאחל לכל הדיירים שבוע מצוין", active: true, order: 2 },
];

const DEFAULT_MUSIC = {
  enabled: false,
  volume: 0.4,
  tracks: [], // { id, name, mediaId }
};

const DEFAULTS = {
  settings: DEFAULT_SETTINGS,
  banners: DEFAULT_BANNERS,
  announcements: DEFAULT_ANNOUNCEMENTS,
  ticker: DEFAULT_TICKER,
  music: DEFAULT_MUSIC,
};

// ─── קריאה/כתיבה ───

function parse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function readLive(key) {
  const v = parse(localStorage.getItem(LIVE(key)));
  if (v == null) return structuredClone(DEFAULTS[key]);
  return key === "settings" || key === "music"
    ? { ...structuredClone(DEFAULTS[key]), ...v }
    : v;
}

export function readDraft(key) {
  const d = parse(localStorage.getItem(DRAFT(key)));
  if (d != null) {
    return key === "settings" || key === "music"
      ? { ...structuredClone(DEFAULTS[key]), ...d }
      : d;
  }
  return readLive(key);
}

function notify() {
  window.dispatchEvent(new Event("lobby-data"));
}

export function writeDraft(key, value) {
  localStorage.setItem(DRAFT(key), JSON.stringify(value));
  notify();
}

export function hasDrafts() {
  return KEYS.some((k) => localStorage.getItem(DRAFT(k)) != null);
}

export function publishAll() {
  for (const k of KEYS) {
    const d = localStorage.getItem(DRAFT(k));
    if (d != null) {
      localStorage.setItem(LIVE(k), d);
      localStorage.removeItem(DRAFT(k));
    }
  }
  notify();
}

export function discardDrafts() {
  for (const k of KEYS) localStorage.removeItem(DRAFT(k));
  notify();
}

// ─── Hook לנתוני התצוגה (חי או טיוטה-לתצוגה-מקדימה) ───

export function useLobbyData(draftMode = false) {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const bump = () => setRev((r) => r + 1);
    window.addEventListener("lobby-data", bump);
    window.addEventListener("storage", bump);
    const t = setInterval(bump, 20000); // רענון תקופתי ליתר ביטחון
    return () => {
      window.removeEventListener("lobby-data", bump);
      window.removeEventListener("storage", bump);
      clearInterval(t);
    };
  }, []);

  return useMemo(() => {
    const read = draftMode ? readDraft : readLive;
    return {
      settings: read("settings"),
      banners: read("banners"),
      announcements: read("announcements"),
      ticker: read("ticker"),
      music: read("music"),
      rev,
    };
  }, [rev, draftMode]);
}

// ─── עזרי תזמון: פריט פעיל לפי טווח תאריכים ───

export function inDateRange(item, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  if (item.start && day < item.start) return false;
  if (item.end && day > item.end) return false;
  return true;
}

export function activeBanners(banners, now = new Date()) {
  return banners
    .filter((b) => b.active && inDateRange(b, now))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function activeAnnouncements(anns, now = new Date()) {
  return anns
    .filter((a) => inDateRange(a, now))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
}

export function urgentAnnouncement(anns, now = new Date()) {
  return anns.find((a) => a.urgent && inDateRange(a, now)) || null;
}

// ─── שעות פעילות ───

function toMinutes(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isNightMode(settings, now = new Date()) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(settings.activeStart);
  const end = toMinutes(settings.activeEnd);
  if (start === end) return false;
  if (start < end) return cur < start || cur >= end;
  return cur >= end && cur < start; // טווח שחוצה חצות
}

export function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
