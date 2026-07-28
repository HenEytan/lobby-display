// מסך מלא אוטומטי — הדפדפן חוסם כניסה למסך מלא ללא מחוות משתמש,
// לכן: כל נגיעה/קליק בכל מקום במסך מחזירה למסך מלא אם יצאנו ממנו (למשל אחרי reload של עדכון).
// אין צורך לאתר את כפתור ההגדלה — נגיעה אחת בכל נקודה מספיקה.
// להפעלה ללא מגע בכלל: להריץ את Chrome במצב kiosk (ראו README).

function enterFullscreen() {
  if (document.fullscreenElement) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    try {
      const p = req.call(el);
      if (p && p.catch) p.catch(() => {});
    } catch { /* נחסם — ננסה בנגיעה הבאה */ }
  }
}

window.addEventListener("pointerdown", enterFullscreen, { passive: true });
window.addEventListener("keydown", enterFullscreen);
