import { HDate, HebrewCalendar, Location } from "@hebcal/core";

// hebcal מחזיר מחרוזות עם ניקוד — מסירים אותו לפני התאמת ביטויים
const stripNiqqud = (s) => s.replace(/[\u0591-\u05C7]/g, "");

const HE_MONTHS = [
  "בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני",
  "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר",
];
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function gregDateHe(d) {
  return `יום ${HE_DAYS[d.getDay()]}, ${d.getDate()} ${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function hebrewDate(d) {
  const hd = new HDate(d);
  return hd.renderGematriya();
}

// ברכה יומית לפי היום בשבוע ולפי חג אם קיים
export function dailyGreeting(d, holiday) {
  if (holiday) return holiday;
  const day = d.getDay();
  if (day === 6) return "שבת שלום";
  if (day === 5) return "שבת שלום וסופ״ש נעים";
  if (day === 0) return "שבוע טוב";
  const h = d.getHours();
  if (h < 12) return "בוקר טוב";
  if (h < 18) return "צהריים טובים";
  return "ערב טוב";
}

// זיהוי חג/מועד ישראלי להיום — מחזיר שם ברכה מתאים או null.
// ימי צום ויום הזיכרון לא מקבלים ברכה חגיגית (מוחזר null).
const SOLEMN = /צום|תענית|תשעה באב|יום הזיכרון|יום השואה|עשרה בטבת|שבעה עשר בתמוז/;

const FESTIVE_MAP = [
  [/ראש השנה/, "שנה טובה ומתוקה"],
  [/יום כיפור/, "גמר חתימה טובה"],
  [/סוכות|שמחת תורה|שמיני עצרת/, "חג שמח"],
  [/חנוכה/, "חנוכה שמח"],
  [/פורים/, "פורים שמח"],
  [/פסח/, "חג פסח שמח"],
  [/שבועות/, "חג שמח"],
  [/יום העצמאות/, "יום עצמאות שמח"],
  [/ט״ו בשבט|טו בשבט/, "חג אילנות שמח"],
  [/ל״ג בעומר|לג בעומר/, "ל״ג בעומר שמח"],
];

export function todayHoliday(d) {
  try {
    const events = HebrewCalendar.calendar({
      start: d, end: d, il: true, noModern: false, sedrot: false, candlelighting: false,
    });
    for (const ev of events) {
      const desc = stripNiqqud(ev.render("he"));
      if (SOLEMN.test(desc)) return null;
      for (const [re, greeting] of FESTIVE_MAP) {
        if (re.test(desc)) return greeting;
      }
    }
  } catch { /* חישוב לוח נכשל — אין ברכה */ }
  return null;
}

// ─── מצב שבת ───
// חלון שבת: מהדלקת נרות בשישי ועד הבדלה במוצ״ש, לפי חישוב מקומי (הוד השרון).
// אם חישוב הזמנים נכשל — fallback לחלון קבוע: שישי 17:30 עד שבת 20:45.

const HOD_HASHARON = new Location(32.15, 34.89, true, "Asia/Jerusalem", "Hod HaSharon", "IL");

function fridayOf(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + (5 - x.getDay()));
  return x;
}

function shabbatWindow(d) {
  // שישי של השבוע הנוכחי (או של אתמול אם היום שבת)
  const base = new Date(d);
  if (base.getDay() === 6) base.setDate(base.getDate() - 1);
  const fri = fridayOf(base);
  const sat = new Date(fri);
  sat.setDate(fri.getDate() + 1);

  let candles = null;
  let havdalah = null;
  try {
    const events = HebrewCalendar.calendar({
      start: fri, end: sat, il: true,
      candlelighting: true, location: HOD_HASHARON,
      sedrot: false, noHolidays: false,
    });
    for (const ev of events) {
      const desc = stripNiqqud(ev.render("he"));
      const time = ev.eventTime ? new Date(ev.eventTime) : null;
      if (!time) continue;
      if (/הדלקת נרות/.test(desc) && time.getDay() === 5) candles = time;
      if (/הבדלה/.test(desc)) havdalah = time;
    }
  } catch { /* fallback למטה */ }

  if (!candles) { candles = new Date(fri); candles.setHours(17, 30, 0, 0); }
  if (!havdalah) { havdalah = new Date(sat); havdalah.setHours(20, 45, 0, 0); }
  return { candles, havdalah };
}

const HE_TIME = (t) =>
  `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;

// מחזיר null כשלא שבת, או אובייקט עם פרטי המסך כשמצב שבת פעיל
export function shabbatInfo(now = new Date()) {
  const day = now.getDay();
  if (day !== 5 && day !== 6) return null;
  const { candles, havdalah } = shabbatWindow(now);
  if (now >= candles && now <= havdalah) {
    return {
      active: true,
      candles: HE_TIME(candles),
      havdalah: HE_TIME(havdalah),
    };
  }
  // בשישי לפני הכניסה — נחזיר את הזמנים לתצוגה מקדימה בעמודת המידע
  if (day === 5) {
    return { active: false, candles: HE_TIME(candles), havdalah: HE_TIME(havdalah) };
  }
  return null;
}

// ─── לוח חגים, מועדים וצומות לשנה הקרובה ───
// חישוב מקומי מלא (ללא רשת) עבור 12 החודשים הבאים, לפי מנהג ישראל.

const SKIP_YEAR = new RegExp([
  "ערב ", "חול המועד", "אסרו חג", "שושן פורים", "פורים קטן", "ראש חודש",
  "פסח שני", "סליחות", "למעשר", "לבהמ", "סיגד", "בן.?גוריון", "הרצל",
  "רבין", "ז'בוטינסקי", "טרומפלדור", "יום העליה", "יום המשפחה",
  "השפה העברית", "חג הבנות", "יום ירושלים ל", "שחרור והצלה",
].join("|"));

const FAST_RE = /צום|תענית|תשעה באב|עשרה בטבת|שבעה עשר בתמוז|י"ז בתמוז/;
const MEMORIAL_RE = /יום הזכרון|יום הזיכרון|יום השואה/;

function classifyYearEvent(desc) {
  if (FAST_RE.test(desc)) return "tzom";
  if (MEMORIAL_RE.test(desc)) return "memorial";
  return "chag";
}

// איחוד ימי מועד מרובי-ימים לרשומה אחת ושמות תצוגה נקיים
function normalizeName(desc) {
  if (/חנוכה/.test(desc)) return "חנוכה";
  if (/^ס(ו)?כות/.test(desc)) return "סוכות";
  if (desc.startsWith("פסח")) return "פסח";
  if (/ראש השנה/.test(desc)) return "ראש השנה";
  if (/שמיני עצרת/.test(desc)) return "שמיני עצרת ושמחת תורה";
  if (/יום כי?פור/.test(desc)) return "יום כיפור";
  if (/יום הזכרון$|יום הזיכרון$/.test(desc)) return "יום הזיכרון לחללי מערכות ישראל";
  if (/יום השואה/.test(desc)) return "יום הזיכרון לשואה ולגבורה";
  return desc.replace(/\s*\(.*?\)\s*/g, "").trim();
}

export function yearEvents(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  let raw = [];
  try {
    raw = HebrewCalendar.calendar({
      start, end, il: true,
      noModern: false, sedrot: false, omer: false,
      noRoshChodesh: true, noSpecialShabbat: true,
      candlelighting: false,
    });
  } catch { return []; }

  const out = [];
  const lastByName = new Map();
  for (const ev of raw) {
    const desc = stripNiqqud(ev.render("he"));
    if (SKIP_YEAR.test(desc)) continue;
    const name = normalizeName(desc);
    const date = ev.getDate().greg();
    // רק היום הראשון של מועד מרובה-ימים (איחוד רצפים עד 45 יום)
    const prev = lastByName.get(name);
    lastByName.set(name, date);
    if (prev && (date - prev) / 86400000 < 45) continue;
    out.push({
      name,
      type: classifyYearEvent(desc),
      date,
      greg: `${date.getDate()}.${date.getMonth() + 1}.${String(date.getFullYear()).slice(2)}`,
      heb: new HDate(date).renderGematriya().replace(/ [\u05D4]?׳?תש.*$/u, ""),
      dow: HE_DAYS[date.getDay()],
    });
  }
  out.sort((a, b) => a.date - b.date);
  return out;
}

// ─── באנרים לחגים לאורך השנה ───
// מוכן ומעודכן תמיד לפי הלוח העברי — אין צורך לתחזק תאריכים ידנית.
// כל באנר מופיע החל מיום לפני תחילת החג ועד סופו (כולל ימי חוה"מ).

const HOLIDAY_BANNER_DEFS = [
  { key: "rosh_hashana", re: /ראש השנה/, title: "שנה טובה ומתוקה", subtitle: "לכל דיירי הבניין — שנה של בריאות, שמחה ושלווה", bg: "holiday_rosh_hashana" },
  { key: "yom_kippur", re: /יום כי?פור/, title: "גמר חתימה טובה", subtitle: "צום קל וגמר חתימה טובה לכל דיירי הבניין", bg: "holiday_yom_kippur" },
  { key: "sukkot", re: /^ס(ו)?כות|שמיני עצרת|שמחת תורה/, title: "חג סוכות שמח", subtitle: "מועדים לשמחה לכל דיירי הבניין", bg: "holiday_sukkot" },
  { key: "chanukah", re: /חנוכה/, title: "חנוכה שמח", subtitle: "אור וחום לכל בתי הבניין", bg: "holiday_chanukah" },
  { key: "purim", re: /^פורים(?! קטן)/, title: "פורים שמח", subtitle: "חג שמח ומחופש לכל המשפחה", bg: "holiday_purim" },
  { key: "pesach", re: /^פסח(?! שני)/, title: "חג פסח שמח", subtitle: "חג כשר ושמח לכל דיירי הבניין", bg: "holiday_pesach" },
  { key: "shavuot", re: /שבועות/, title: "חג שבועות שמח", subtitle: "חג מתן תורה שמח לכולם", bg: "holiday_shavuot" },
  { key: "atzmaut", re: /יום העצמאות/, title: "יום עצמאות שמח", subtitle: "חוגגים ביחד את עצמאות ישראל", bg: "holiday_atzmaut" },
  { key: "tu_bishvat", re: /ט״ו בשבט|טו בשבט/, title: "ט״ו בשבט שמח", subtitle: "חג האילנות — נטיעות ופריחה", bg: "holiday_tu_bishvat" },
  { key: "lag_baomer", re: /ל״ג בעומר|לג בעומר/, title: "ל״ג בעומר שמח", subtitle: "מדורות ושמחה לכל המשפחה", bg: "holiday_lag_baomer" },
];

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function holidayBannerSchedule(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  let raw = [];
  try {
    raw = HebrewCalendar.calendar({
      start, end, il: true, noModern: false, sedrot: false, omer: false,
      noRoshChodesh: true, noSpecialShabbat: true, candlelighting: false,
    });
  } catch { return []; }

  const ranges = new Map();
  for (const ev of raw) {
    const desc = stripNiqqud(ev.render("he"));
    for (const def of HOLIDAY_BANNER_DEFS) {
      if (!def.re.test(desc)) continue;
      const date = ev.getDate().greg();
      const r = ranges.get(def.key);
      if (!r) ranges.set(def.key, { first: date, last: date });
      else {
        if (date < r.first) r.first = date;
        if (date > r.last) r.last = date;
      }
      break;
    }
  }

  const out = [];
  for (const def of HOLIDAY_BANNER_DEFS) {
    const r = ranges.get(def.key);
    if (!r) continue;
    const startDate = new Date(r.first);
    startDate.setDate(startDate.getDate() - 1);
    out.push({
      id: `hb_${def.key}`,
      title: def.title,
      subtitle: def.subtitle,
      bg: def.bg,
      image: null,
      start: ymdLocal(startDate),
      end: ymdLocal(r.last),
      active: true,
      firstDate: r.first,
    });
  }
  out.sort((a, b) => a.firstDate - b.firstDate);
  return out.map(({ firstDate, ...rest }) => rest);
}
