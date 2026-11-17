// תוצאת אימות קוד הכניסה מול השרת. ההבחנה חשובה למנהל: "קוד שגוי" כשבעצם
// אין רשת שולח אותו לנסות קודים אחרים במקום לבדוק את החיבור.
// status — קוד ה-HTTP, או null כשהבקשה לא הגיעה לשרת כלל.

export const PIN_MESSAGES = {
  empty: "הקלידו את קוד הכניסה ואז לחצו על הכפתור",
  wrong: "הקוד שגוי — נסו שוב",
  offline: "אין חיבור לאינטרנט — בדקו את הרשת ונסו שוב",
  server: "השרת לא זמין כרגע — נסו שוב בעוד דקה",
};

export function classifyPinCheck(status, body) {
  if (status == null) return "offline";
  if (status === 200 && body && body.verified) return "ok";
  // 401/403: השרת ענה וסירב לקוד
  if (status === 401 || status === 403) return "wrong";
  return "server";
}
