import { HDate, HebrewCalendar, Location, flags } from "@hebcal/core";

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

// זמני hebcal (הדלקה/הבדלה) הם רגעים אמיתיים (UTC). שעון המכשיר עלול להיות
// באזור זמן שגוי, לכן ממירים כל זמן ל"תאריך מוזז" שקריאת השדות המקומיים שלו
// (getHours/getDay) נותנת שעון ישראל — אותה מוסכמה של israelNow(), כך
// שההשוואות מול now והתצוגה תמיד נכונות, בלי תלות באזור הזמן של המכשיר.
const IL_PARTS_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});
function toIsraelLocal(t) {
  try {
    const p = {};
    for (const part of IL_PARTS_FMT.formatToParts(t)) p[part.type] = part.value;
    return new Date(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  } catch {
    return t;
  }
}

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
      const time = ev.eventTime ? toIsraelLocal(new Date(ev.eventTime)) : null;
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

function computeHolidayList(start, end) {
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

export function yearEvents(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return computeHolidayList(start, end);
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
  { key: "atzmaut", re: /יום העצמאות/, title: "יום עצמאות שמח", subtitle: "חוגגים ביחד את עצמאות ישראל", bg: "holiday_atzmaut", noEve: true },
  { key: "tu_bishvat", re: /ט״ו בשבט|טו בשבט/, title: "ט״ו בשבט שמח", subtitle: "חג האילנות — נטיעות ופריחה", bg: "holiday_tu_bishvat" },
  { key: "lag_baomer", re: /ל״ג בעומר|לג בעומר/, title: "ל״ג בעומר שמח", subtitle: "מדורות ושמחה לכל המשפחה", bg: "holiday_lag_baomer" },
  { key: "tu_bav", re: /ט״ו באב|טו באב|Tu B'Av/, title: "ט״ו באב שמח", subtitle: "חג האהבה — הרבה אהבה ושמחה לכל דיירי הבניין", bg: "holiday_tu_bav" },
  { key: "shoah", re: /יום השואה/, title: "יום הזיכרון לשואה ולגבורה", subtitle: "זוכרים את השישה מיליון — יהי זכרם ברוך", bg: "holiday_shoah", noEve: true },
  { key: "zikaron", re: /יום הזכרון|יום הזיכרון/, title: "יום הזיכרון לחללי מערכות ישראל", subtitle: "זוכרים ומוקירים את הנופלים ואת נפגעי פעולות האיבה — יהי זכרם ברוך", bg: "holiday_zikaron" },
];

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// מועדים שנושאים שם דומה לחג אמיתי אך אינם החג עצמו — אסור שיקבעו את גבולות
// הבאנר. בלעדיהם ״ראש השנה למעשר בהמה״ (אלול הבא) ו״יום הזכרון ליצחק רבין״
// (חשוון) נדבקו לחג עצמו והבאנר נמתח על פני חודשים שלמים.
const BANNER_SKIP = new RegExp([
  "ערב ", "למעשר", "לבהמ", "רבין", "הרצל", "בן.?גוריון", "ז'בוטינסקי",
  "טרומפלדור", "יום העליה", "יום המשפחה", "סיגד", "פורים קטן", "שושן פורים",
].join("|"));

// הבאנר עולה שלושה ימים לפני תחילת החג (למעט מועדים המסומנים noEve — הם
// מוצגים ביום עצמו בלבד, כדי לא לחגוג בזמן יום הזיכרון וכדומה).
const BANNER_LEAD_DAYS = 3;
// פער מקסימלי בימים בין תאריכים שנחשבים לאותו מופע של החג (חנוכה — 8 ימים,
// סוכות עד שמחת תורה — 8 ימים). פער גדול יותר פירושו מופע של השנה הבאה.
const SAME_OCCURRENCE_GAP_DAYS = 30;
const DAY_MS = 86400000;

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

  const hits = new Map();
  for (const ev of raw) {
    const desc = stripNiqqud(ev.render("he"));
    if (BANNER_SKIP.test(desc)) continue;
    for (const def of HOLIDAY_BANNER_DEFS) {
      if (!def.re.test(desc)) continue;
      const list = hits.get(def.key) || [];
      list.push(ev.getDate().greg());
      hits.set(def.key, list);
      break;
    }
  }

  const out = [];
  for (const def of HOLIDAY_BANNER_DEFS) {
    const dates = (hits.get(def.key) || []).sort((a, b) => a - b);
    if (dates.length === 0) continue;

    // פיצול לרצפים — כל רצף הוא מופע אחד של החג. חלון החישוב הוא שנה שלמה,
    // כך שחג שנופל גם בתחילתו וגם בסופו מקבל שני רצפים נפרדים.
    const runs = [];
    for (const date of dates) {
      const last = runs[runs.length - 1];
      if (last && (date - last.last) / DAY_MS <= SAME_OCCURRENCE_GAP_DAYS) last.last = date;
      else runs.push({ first: date, last: date });
    }
    // המופע הקרוב שעדיין לא הסתיים
    const r = runs.find((run) => run.last >= start) || runs[0];

    const startDate = new Date(r.first);
    if (!def.noEve) startDate.setDate(startDate.getDate() - BANNER_LEAD_DAYS);
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

// ─── ימים טובים — מסך מלא סטטי, בדיוק כמו בשבת ───
// החלון נפתח בהדלקת הנרות שלפני החג ונסגר בהבדלה בצאתו. חגים רב-יומיים
// (ראש השנה) וחג שנצמד לשבת מקבלים חלון אחד רצוף — למשל ראש השנה תשפ״ז,
// שנמשך משישי בערב עד מוצאי יום ראשון. ימי חול המועד אינם ימי שבתון ולכן
// אינם נכללים, והמסך חוזר בהם לתצוגה הרגילה.
export function yomTovInfo(now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() - 8);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + 4);

  let raw = [];
  try {
    raw = HebrewCalendar.calendar({
      start, end, il: true,
      candlelighting: true, location: HOD_HASHARON,
      sedrot: false, noHolidays: false,
    });
  } catch { return null; }

  const lighting = [];   // הדלקות נרות
  const ending = [];     // הבדלות
  const chagDays = [];   // ימי שבתון בלבד (דגל CHAG של hebcal)
  for (const ev of raw) {
    const desc = stripNiqqud(ev.render("he"));
    if (ev.eventTime) {
      const t = toIsraelLocal(new Date(ev.eventTime));
      if (/הדלקת נרות/.test(desc)) lighting.push(t);
      else if (/הבדלה/.test(desc)) ending.push(t);
      continue;
    }
    if (ev.getFlags() & flags.CHAG) chagDays.push({ date: ev.getDate().greg(), desc });
  }
  lighting.sort((a, b) => a - b);
  ending.sort((a, b) => a - b);

  // החלון הפתוח כרגע נמדד מההבדלה האחרונה שהושלמה: ההדלקה הראשונה שאחריה היא
  // כניסת החג, וההבדלה הבאה היא צאתו. הדלקות ביניים (ליל יום שני של ראש השנה)
  // אינן סוגרות את החלון ואינן מזיזות את שעת הכניסה — ולכן החלון רצוף.
  const lastEnd = ending.filter((t) => t <= now).pop();
  const opened = lighting.find((t) => t <= now && (!lastEnd || t > lastEnd));
  if (!opened) return null;
  const closes = ending.find((t) => t > opened);
  if (!closes || now > closes) return null;

  // רק חלון שיש בו יום שבתון. שבת רגילה אינה מסומנת CHAG ונשארת ל-shabbatInfo.
  const from = new Date(opened); from.setHours(0, 0, 0, 0);
  const to = new Date(closes); to.setHours(23, 59, 59, 999);
  const covered = chagDays.filter((c) => c.date >= from && c.date <= to);
  const def = covered.map((c) => HOLIDAY_BANNER_DEFS.find((d) => d.re.test(c.desc))).find(Boolean);
  if (!def) return null;

  // שמיני עצרת ושמחת תורה חולקים הגדרה עם סוכות — אך הם חג בפני עצמו,
  // ו״חג סוכות שמח״ אינו הברכה הנכונה עבורם
  const atzeret = covered.some((c) => /שמיני עצרת|שמחת תורה/.test(c.desc));
  const title = atzeret ? "חג שמח" : def.title;
  const subtitle = atzeret
    ? "שמיני עצרת ושמחת תורה — מועדים לשמחה לכל דיירי הבניין"
    : def.subtitle;

  // הדלקת נרות נוספת בתוך החג — רלוונטית לדיירים, מוצגת כל עוד לא עברה
  const next = lighting.find((t) => t > now && t < closes);

  return {
    active: true,
    key: def.key,
    title,
    subtitle,
    bg: def.bg,
    candles: HE_TIME(opened),
    havdalah: HE_TIME(closes),
    nextCandles: next ? HE_TIME(next) : null,
  };
}
