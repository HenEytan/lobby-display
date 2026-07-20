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
