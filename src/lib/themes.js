// ערכות צבע — מוחלפות מפאנל הניהול. הערכים מיושמים כמשתני CSS על שורש הדף.
// ברירת המחדל "עץ חם" תואמת קיר דמוי-עץ שמאחורי המסך.

export const THEMES = {
  wood: {
    label: "עץ חם",
    desc: "משתלב עם קיר דמוי עץ — חום, קרם ופליז",
    vars: {
      "--bg": "#f3ead9",
      "--panel": "#fffaf0",
      "--ink": "#33261a",
      "--ink-soft": "#78614c",
      "--gold": "#a9762f",
      "--gold-soft": "#d9b878",
      "--line": "#e6d6bb",
      "--shadow": "0 10px 30px rgba(90, 62, 30, 0.14)",
      "--board-extra": "radial-gradient(1100px 520px at 88% -12%, rgba(196, 148, 76, 0.28), transparent 62%), repeating-linear-gradient(90deg, rgba(140, 96, 44, 0.045) 0 3px, rgba(255, 250, 240, 0) 3px 26px)",
      "--ticker-bg": "#3a2b1c",
      "--ticker-ink": "#f6ead2",
    },
  },
  cream: {
    label: "קרם-זהב",
    desc: "הערכה הקלאסית — לבן-קרם עם הדגשות זהב",
    vars: {
      "--bg": "#f7f3ea",
      "--panel": "#fffdf8",
      "--ink": "#2c2620",
      "--ink-soft": "#6d6355",
      "--gold": "#b08d3e",
      "--gold-soft": "#d8c391",
      "--line": "#e8dfcc",
      "--shadow": "0 10px 30px rgba(101, 84, 47, 0.10)",
      "--board-extra": "radial-gradient(1200px 500px at 85% -10%, rgba(216, 195, 145, 0.25), transparent 60%)",
      "--ticker-bg": "#2c2620",
      "--ticker-ink": "#f3e9d2",
    },
  },
  dark: {
    label: "ערב אלגנטי",
    desc: "כהה-חמים עם זהב — נעים לשעות הערב",
    vars: {
      "--bg": "#221b13",
      "--panel": "#2e2519",
      "--ink": "#f3e9d4",
      "--ink-soft": "#c5b393",
      "--gold": "#d9ab52",
      "--gold-soft": "#b98f45",
      "--line": "#463823",
      "--shadow": "0 12px 34px rgba(0, 0, 0, 0.45)",
      "--board-extra": "radial-gradient(1100px 520px at 85% -10%, rgba(217, 171, 82, 0.14), transparent 60%)",
      "--ticker-bg": "#161009",
      "--ticker-ink": "#f0e2c4",
    },
  },
  forest: {
    label: "ירוק יער",
    desc: "ירקרק רגוע עם נגיעות זית וזהב",
    vars: {
      "--bg": "#eef2e6",
      "--panel": "#fbfdf6",
      "--ink": "#26301f",
      "--ink-soft": "#5c6b4e",
      "--gold": "#7c8a3f",
      "--gold-soft": "#b9c47e",
      "--line": "#dbe3c8",
      "--shadow": "0 10px 30px rgba(60, 78, 40, 0.12)",
      "--board-extra": "radial-gradient(1100px 520px at 85% -10%, rgba(150, 170, 90, 0.22), transparent 60%)",
      "--ticker-bg": "#26301f",
      "--ticker-ink": "#eef4dd",
    },
  },
  navy: {
    label: "כחול מלכותי",
    desc: "כחול עמוק עם ברונזה — מראה יוקרתי",
    vars: {
      "--bg": "#eef2f7",
      "--panel": "#fbfcfe",
      "--ink": "#1e2a3d",
      "--ink-soft": "#54657f",
      "--gold": "#8a6d33",
      "--gold-soft": "#c7ad74",
      "--line": "#d9e1ec",
      "--shadow": "0 10px 30px rgba(30, 42, 61, 0.12)",
      "--board-extra": "radial-gradient(1100px 520px at 85% -10%, rgba(90, 120, 170, 0.18), transparent 60%)",
      "--ticker-bg": "#1e2a3d",
      "--ticker-ink": "#e8eef8",
    },
  },
};

export const THEME_IDS = Object.keys(THEMES);

export function applyTheme(id) {
  const theme = THEMES[id] || THEMES.wood;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  root.dataset.theme = THEMES[id] ? id : "wood";
}
