import { HDate, HebrewCalendar, Location, gematriya, Event, flags } from "@hebcal/core";

// שעון/תאריך לפי אזור הזמן של ישראל — בלתי תלוי בהגדרות המכשיר בלובי.
const IL_TZ = "Asia/Jerusalem";

// מחזיר { hour, minute, day, date, month, year, weekday } לפי שעון ישראל
export function ilParts(d) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: IL_TZ, hour12: false,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", weekday: "short",
  });
  const p = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const wdMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return {
    hour: p.hour, minute: p.minute,
    day: Number(p.day), month: Number(p.month), year: Number(p.year),
    weekday: wdMap[p.weekday],
  };
}

// אובייקט Date המייצג את אותו רגע אך "מיושר" לשעון ישראל (לשימוש ב-@hebcal ובלוגיקת ימים)
export function ilDate(d) {
  const p = ilParts(d);
  return new Date(p.year, p.month - 1, p.day, Number(p.hour), Number(p.minute));
}

const HE_MONTHS = [
  "בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני",
  "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר",
];
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function gregDateHe(d) {
  const p = ilParts(d);
  return `יום ${HE_DAYS[p.weekday]}, ${p.day} ${HE_MONTHS[p.month - 1]} ${p.year}`;
}

export function hebrewDate(d) {
  const hd = new HDate(ilDate(d));
  // renderGematriya מפיק תאריך עברי מלא בעברית
  return hd.renderGematriya();
}

// ברכה יומית לפי היום בשבוע ולפי חג אם קיים
export function dailyGreeting(d, holiday) {
  if (holiday) return holiday;
  const p = ilParts(d);
  const day = p.weekday;
  if (day === 6) return "שבת שלום";
  if (day === 5) return "שבת שלום וסופ״ש נעים";
  if (day === 0) return "שבוע טוב";
  const h = Number(p.hour);
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
  const il = ilDate(d);
  const events = HebrewCalendar.calendar({
    start: il, end: il, il: true, noModern: false, sedrot: false, candlelighting: false,
  });
  for (const ev of events) {
    const desc = ev.render("he");
    if (SOLEMN.test(desc)) return null;
    for (const [re, greeting] of FESTIVE_MAP) {
      if (re.test(desc)) return greeting;
    }
  }
  return null;
}
