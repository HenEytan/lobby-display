// תמונות מקוריות למסך הראשי — SVG שנוצר מקומית (ללא מקורות חיצוניים).
// כולל איור בניין לשקופית הפתיחה ורקעי אמנות לבאנרים.

// ─── איור בניין — קווי זהב על רקע חמים ───
export function BuildingArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 520 240" role="img" aria-label="איור הבניין">
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9edd2" />
          <stop offset="1" stopColor="#f2ddb2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6a24" />
          <stop offset="0.5" stopColor="#b08d3e" />
          <stop offset="1" stopColor="#d9b968" />
        </linearGradient>
      </defs>
      <ellipse cx="260" cy="228" rx="240" ry="14" fill="url(#skyG)" />
      <circle cx="88" cy="66" r="26" fill="none" stroke="url(#goldG)" strokeWidth="3" />
      <g stroke="url(#goldG)" strokeWidth="2.4" strokeLinecap="round">
        <line x1="88" y1="26" x2="88" y2="34" /><line x1="88" y1="98" x2="88" y2="106" />
        <line x1="48" y1="66" x2="56" y2="66" /><line x1="120" y1="66" x2="128" y2="66" />
        <line x1="60" y1="38" x2="66" y2="44" /><line x1="110" y1="88" x2="116" y2="94" />
        <line x1="116" y1="38" x2="110" y2="44" /><line x1="66" y1="88" x2="60" y2="94" />
      </g>
      {/* גוף הבניין המרכזי */}
      <g fill="none" stroke="url(#goldG)" strokeWidth="3.2" strokeLinejoin="round">
        <rect x="196" y="58" width="128" height="170" rx="6" />
        <rect x="146" y="106" width="50" height="122" rx="5" />
        <rect x="324" y="106" width="50" height="122" rx="5" />
        <path d="M196 58 L260 30 L324 58" />
      </g>
      {/* חלונות */}
      <g fill="#d9b968" opacity="0.9">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={`${r}-${c}`} x={214 + c * 34} y={76 + r * 34} width="20" height="22" rx="3" />
          ))
        )}
        <rect x="158" y="122" width="26" height="18" rx="3" /><rect x="158" y="154" width="26" height="18" rx="3" />
        <rect x="158" y="186" width="26" height="18" rx="3" />
        <rect x="336" y="122" width="26" height="18" rx="3" /><rect x="336" y="154" width="26" height="18" rx="3" />
        <rect x="336" y="186" width="26" height="18" rx="3" />
      </g>
      {/* דלת כניסה */}
      <rect x="246" y="188" width="28" height="40" rx="4" fill="none" stroke="url(#goldG)" strokeWidth="3" />
      <circle cx="253" cy="209" r="2" fill="#b08d3e" />
      {/* עצים */}
      <g stroke="url(#goldG)" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <line x1="112" y1="228" x2="112" y2="196" />
        <circle cx="112" cy="182" r="17" />
        <line x1="410" y1="228" x2="410" y2="196" />
        <circle cx="410" cy="182" r="17" />
        <line x1="452" y1="228" x2="452" y2="206" />
        <circle cx="452" cy="195" r="12" />
      </g>
      {/* מספר הבניין */}
      <g>
        <circle cx="260" cy="141" r="0" />
      </g>
    </svg>
  );
}

// ─── קישוט זית — פס מפריד עדין ───
export function OliveDivider({ className }) {
  return (
    <svg className={className} viewBox="0 0 300 24" role="presentation" aria-hidden="true">
      <g stroke="#b08d3e" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M20 12 H120 M180 12 H280" />
        <path d="M138 12 q6 -8 12 0 q6 8 12 0" />
      </g>
      <g fill="#b08d3e">
        <ellipse cx="132" cy="8" rx="4" ry="2.4" transform="rotate(-30 132 8)" />
        <ellipse cx="168" cy="16" rx="4" ry="2.4" transform="rotate(30 168 16)" />
        <circle cx="150" cy="12" r="2.6" />
      </g>
    </svg>
  );
}

// ─── רקעי אמנות לבאנרים — SVG כ-data-URI (ללא רשת) ───

const svgURL = (svg) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}")`;

const SUNSET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbe9c4"/><stop offset="0.55" stop-color="#f3cf92"/><stop offset="1" stop-color="#e0a95f"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#s)"/>
  <circle cx="400" cy="300" r="90" fill="#fff3d6" opacity="0.9"/>
  <g fill="#b07f3a" opacity="0.55">
    <rect x="60" y="290" width="70" height="160"/><rect x="150" y="250" width="90" height="200"/>
    <rect x="520" y="265" width="80" height="185"/><rect x="620" y="300" width="110" height="150"/>
  </g>
  <g fill="#8a5f26" opacity="0.75">
    <rect x="250" y="220" width="110" height="230"/><rect x="430" y="235" width="80" height="215"/>
  </g>
  <rect y="430" width="800" height="20" fill="#7c541f" opacity="0.8"/>
</svg>`;

const GARDEN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f6e8"/><stop offset="1" stop-color="#d6e4bd"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#g)"/>
  <g fill="none" stroke="#7c8a3f" stroke-width="6" stroke-linecap="round" opacity="0.8">
    <path d="M120 450 C130 340 110 300 150 240"/>
    <path d="M660 450 C650 350 680 320 640 250"/>
  </g>
  <g fill="#9db35c" opacity="0.85">
    <circle cx="150" cy="215" r="46"/><circle cx="112" cy="256" r="34"/><circle cx="192" cy="258" r="30"/>
    <circle cx="640" cy="225" r="44"/><circle cx="600" cy="266" r="30"/><circle cx="682" cy="262" r="32"/>
  </g>
  <g fill="#c9a84c" opacity="0.9">
    <circle cx="330" cy="380" r="10"/><circle cx="410" cy="400" r="8"/><circle cx="480" cy="375" r="9"/>
  </g>
  <rect y="432" width="800" height="18" fill="#8fa254" opacity="0.7"/>
</svg>`;

const GEOMETRY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f6efdd"/>
  <g fill="none" stroke="#c8a75c" stroke-width="1.6" opacity="0.55">
    <path d="M0 100 L100 0 M0 200 L200 0 M0 300 L300 0 M0 400 L400 0 M100 400 L400 100 M200 400 L400 200 M300 400 L400 300"/>
    <path d="M400 100 L300 0 M400 200 L200 0 M400 300 L100 0 M300 400 L0 100 M200 400 L0 200 M100 400 L0 300"/>
  </g>
  <g fill="#b08d3e" opacity="0.5">
    <circle cx="200" cy="200" r="5"/><circle cx="100" cy="100" r="3.5"/><circle cx="300" cy="100" r="3.5"/>
    <circle cx="100" cy="300" r="3.5"/><circle cx="300" cy="300" r="3.5"/>
  </g>
</svg>`;

const POOL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cdeefc"/><stop offset="0.5" stop-color="#8fd6ee"/><stop offset="1" stop-color="#4fb8d8"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#p)"/>
  <circle cx="670" cy="80" r="46" fill="#fff3c2" opacity="0.95"/>
  <g fill="#ffffff" opacity="0.75">
    <ellipse cx="130" cy="120" rx="55" ry="20"/><ellipse cx="175" cy="130" rx="40" ry="16"/>
    <ellipse cx="560" cy="150" rx="60" ry="22"/><ellipse cx="610" cy="160" rx="38" ry="15"/>
  </g>
  <rect y="300" width="800" height="150" fill="#2f9fc4" opacity="0.55"/>
  <path d="M0 300 Q 40 285 80 300 T 160 300 T 240 300 T 320 300 T 400 300 T 480 300 T 560 300 T 640 300 T 720 300 T 800 300 V450 H0 Z" fill="#3badd0" opacity="0.5"/>
  <g>
    <line x1="120" y1="300" x2="120" y2="180" stroke="#c94f4f" stroke-width="8" stroke-linecap="round"/>
    <path d="M120 180 A70 70 0 0 1 190 250 L120 250 Z" fill="#e2665f"/>
    <path d="M120 180 A70 70 0 0 0 50 250 L120 250 Z" fill="#f2f2f2"/>
    <path d="M120 180 A70 70 0 0 1 50 180 L120 180 Z" fill="#e2665f" transform="rotate(180 120 215)"/>
  </g>
  <g fill="#e8f6fb" opacity="0.9">
    <path d="M330 320 q10 -22 20 0 q10 -22 20 0 q10 -22 20 0 v20 h-60 z"/>
    <path d="M600 340 q12 -26 24 0 q12 -26 24 0 v20 h-48 z"/>
  </g>
</svg>`;

const CLEAN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f9ee"/><stop offset="1" stop-color="#d9ead0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#c)"/>
  <g stroke="#8fae5c" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round">
    <path d="M560 90 L620 150 M600 80 L680 160 M640 100 L700 160"/>
    <path d="M120 60 L170 110 M150 50 L220 120"/>
  </g>
  <g transform="translate(330,150) rotate(-18)">
    <rect x="-8" y="0" width="16" height="180" rx="7" fill="#a9784a"/>
    <path d="M-60 170 L60 170 L40 260 L-40 260 Z" fill="#e7cf8a" stroke="#c9a84c" stroke-width="3"/>
    <g stroke="#c9a84c" stroke-width="2">
      <line x1="-46" y1="185" x2="-30" y2="255"/><line x1="-18" y1="185" x2="-10" y2="255"/>
      <line x1="10" y1="185" x2="14" y2="255"/><line x1="38" y1="185" x2="34" y2="255"/>
    </g>
  </g>
  <g fill="#c9a84c" opacity="0.85">
    <circle cx="470" cy="120" r="4"/><circle cx="500" cy="150" r="5"/><circle cx="450" cy="165" r="3.5"/>
  </g>
  <rect y="410" width="800" height="40" fill="#9db35c" opacity="0.35"/>
</svg>`;

export const ART_BG = {
  art_sunset: `${svgURL(SUNSET_SVG)} center / cover no-repeat`,
  art_garden: `${svgURL(GARDEN_SVG)} center / cover no-repeat`,
  art_geometry: `${svgURL(GEOMETRY_SVG)} center / 220px repeat`,
  art_pool: `${svgURL(POOL_SVG)} center / cover no-repeat`,
  art_clean: `${svgURL(CLEAN_SVG)} center / cover no-repeat`,
};

export const ART_LABELS = {
  art_sunset: "שקיעה עירונית",
  art_garden: "גינה פורחת",
  art_geometry: "תבנית גיאומטרית",
  art_pool: "קיץ ובריכה",
  art_clean: "ניקיון ותחזוקה",
};

// ─── אייקוני קטגוריה לאירועים — כדי שגם כרטיסי אירוע יציגו איור ───
const CATEGORY_ICON_PATHS = {
  "מופעים": (
    <>
      <path d="M9 5c0 3 2 4 3 4s3-1 3-4" />
      <path d="M9 5a3 3 0 0 1 6 0" />
      <path d="M6 11c2 2 3 2.5 6 2.5s4-0.5 6-2.5" />
      <circle cx="8.5" cy="7" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  "משפחות": (
    <>
      <circle cx="8" cy="7" r="2.2" />
      <circle cx="16" cy="7" r="2.2" />
      <path d="M4 18c0-3 1.8-5 4-5s4 2 4 5" />
      <path d="M12 18c0-3 1.8-5 4-5s4 2 4 5" />
    </>
  ),
  "תרבות": (
    <>
      <circle cx="7" cy="16" r="2.3" />
      <circle cx="16" cy="14" r="2.3" />
      <path d="M9.3 16V6l9-2v10" />
    </>
  ),
  "קהילה": (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="12" cy="13" r="2.2" />
      <path d="M4 19c0-2.6 1.7-4.4 4-4.4M20 19c0-2.6-1.7-4.4-4-4.4M8 19c0-2.6 1.8-4.4 4-4.4s4 1.8 4 4.4" />
    </>
  ),
  "default": (
    <>
      <rect x="4.5" y="5.5" width="15" height="14" rx="2" />
      <path d="M4.5 9.5h15M8 4v3M16 4v3" />
    </>
  ),
};

export function CategoryIcon({ category, className }) {
  const paths = CATEGORY_ICON_PATHS[category] || CATEGORY_ICON_PATHS.default;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

// ─── שדרוג אוטומטי: כל באנר עם רקע צבע שטוח יקבל איור תואם ───
export const LEGACY_ART_MAP = {
  gold: "art_sunset",
  summer: "art_pool",
  green: "art_clean",
  sky: "art_pool",
  rose: "art_garden",
  night: "art_geometry",
};

// ─── סבב יומי בין איורי הרקע — כדי שבאנרים ללא רקע נבחר ידנית יתחלפו מדי כמה ימים ───
export const ART_POOL = ["art_sunset", "art_garden", "art_geometry", "art_pool", "art_clean"];

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

// כל 3 ימים מתחלף האיור; ה-seed (למשל מזהה הבאנר) שומר על התחלה שונה לכל פריט.
export function rotatingArt(seed, now = new Date()) {
  const cycle = Math.floor(dayOfYear(now) / 3);
  const idx = (cycle + hashSeed(String(seed))) % ART_POOL.length;
  return ART_POOL[idx];
}

// ─── אייקוני קטגוריה להודעות דיירים ───
const ANN_ICON_PATHS = {
  "ועד": (
    <>
      <path d="M4 10.5 12 5l8 5.5" />
      <path d="M5.5 10.5V19h13v-8.5" />
      <path d="M9 19v-5h6v5" />
    </>
  ),
  "תחזוקה": (
    <>
      <path d="M14.5 6.5a3.5 3.5 0 0 1-4.6 4.6L5 16l2.5 2.5L12.4 13.6a3.5 3.5 0 0 1 4.6-4.6l-2.5 2.5-1.5-1.5 2.5-2.5z" />
    </>
  ),
  "קהילה": (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="12" cy="13" r="2.2" />
      <path d="M4 19c0-2.6 1.7-4.4 4-4.4M20 19c0-2.6-1.7-4.4-4-4.4M8 19c0-2.6 1.8-4.4 4-4.4s4 1.8 4 4.4" />
    </>
  ),
  "חגיגי": (
    <>
      <path d="M5 19 8 9l9 3-3 9z" />
      <path d="M9 10 8 6M12 8.5l1-3.5M15 10l2-3" />
      <circle cx="10.5" cy="13.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="13" cy="15" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  "default": (
    <>
      <path d="M12 4c-4 0-6 3-6 6.5V15l-1.5 2.5h15L18 15v-4.5C18 7 16 4 12 4z" />
      <path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" />
    </>
  ),
};

export function AnnouncementIcon({ category, className }) {
  const paths = ANN_ICON_PATHS[category] || ANN_ICON_PATHS.default;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

// ─── רקעי חג — תג עגול עם סמל צבעוני על גרדיאנט תואם, לכל חג בלוח השנה ───
const HOLIDAY_ART_DEFS = {
  holiday_rosh_hashana: { grad: ["#fff3d6", "#f3c463"], emoji: "🍎" },
  holiday_yom_kippur:   { grad: ["#f4f7f8", "#cfd9e0"], emoji: "🕊️" },
  holiday_sukkot:       { grad: ["#eef6df", "#bcd88e"], emoji: "🌿" },
  holiday_chanukah:     { grad: ["#1c2540", "#33406e"], emoji: "🕎", dark: true },
  holiday_purim:        { grad: ["#fde2f0", "#cf9bea"], emoji: "🎭" },
  holiday_pesach:       { grad: ["#f5f8ea", "#bfe0ab"], emoji: "🍽️" },
  holiday_shavuot:      { grad: ["#fff8e0", "#e6cf83"], emoji: "🌾" },
  holiday_atzmaut:      { grad: ["#eaf3fb", "#a9d1ee"], emoji: "🇮🇱" },
  holiday_tu_bishvat:   { grad: ["#eef7e2", "#a9d488"], emoji: "🌳" },
  holiday_lag_baomer:   { grad: ["#fff0dc", "#f3b26b"], emoji: "🔥" },
};

function holidayArtSVG({ grad, emoji, dark }) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="hg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="${grad[0]}"/>
      <stop offset="1" stop-color="${grad[1]}"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#hg)"/>
  <circle cx="400" cy="195" r="128" fill="${dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.5)"}"/>
  <circle cx="400" cy="195" r="128" fill="none" stroke="${dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.8)"}" stroke-width="3"/>
  <text x="400" y="215" font-size="120" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>`;
}

// ללא Object.fromEntries — לא קיים בדפדפני Android ישנים
export const HOLIDAY_ART = (() => {
  const out = {};
  for (const k of Object.keys(HOLIDAY_ART_DEFS)) {
    out[k] = `${svgURL(holidayArtSVG(HOLIDAY_ART_DEFS[k]))} center / cover no-repeat`;
  }
  return out;
})();
export const HOLIDAY_ART_KEYS = Object.keys(HOLIDAY_ART_DEFS);

// ─── ט״ו באב — חג האהבה: איור ייעודי עם לב, גפנים ויונים ───
const TU_BAV_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="tbg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdeef2"/>
      <stop offset="0.55" stop-color="#f9d3dd"/>
      <stop offset="1" stop-color="#f2b3c4"/>
    </linearGradient>
    <radialGradient id="tbsun" cx="50%" cy="42%" r="55%">
      <stop offset="0" stop-color="rgba(255,255,255,0.85)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#tbg)"/>
  <circle cx="400" cy="190" r="200" fill="url(#tbsun)"/>
  <!-- לבבות מרחפים -->
  <g fill="#e88aa4" opacity="0.55">
    <path d="M120 90 c-8-14 8-26 18-15 c10-11 26 1 18 15 c-6 10-18 18-18 18 s-12-8-18-18z"/>
    <path d="M660 70 c-6-11 6-20 14-12 c8-8 20 1 14 12 c-5 8-14 14-14 14 s-9-6-14-14z"/>
    <path d="M700 300 c-7-12 7-23 16-13 c9-10 23 1 16 13 c-6 9-16 16-16 16 s-10-7-16-16z"/>
    <path d="M95 320 c-6-11 6-20 14-12 c8-8 20 1 14 12 c-5 8-14 14-14 14 s-9-6-14-14z"/>
    <path d="M560 150 c-5-9 5-16 11-10 c6-6 16 1 11 10 c-4 6-11 11-11 11 s-7-5-11-11z"/>
    <path d="M215 180 c-5-9 5-16 11-10 c6-6 16 1 11 10 c-4 6-11 11-11 11 s-7-5-11-11z"/>
  </g>
  <!-- לב מרכזי -->
  <circle cx="400" cy="195" r="128" fill="rgba(255,255,255,0.55)"/>
  <circle cx="400" cy="195" r="128" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
  <path d="M400 265 c-44-32 -84-62 -84-102 c0-28 22-48 48-48 c16 0 29 8 36 20 c7-12 20-20 36-20 c26 0 48 20 48 48 c0 40-40 70-84 102z"
    fill="#e0607e" stroke="#c94b6a" stroke-width="4"/>
  <path d="M372 152 c-8 4-16 12-18 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="7" stroke-linecap="round"/>
  <!-- יונים -->
  <g stroke="#a67483" stroke-width="4" fill="none" stroke-linecap="round">
    <path d="M275 95 q10-12 22-6 q4-12 18-10"/>
    <path d="M510 100 q10-12 22-6 q4-12 18-10"/>
  </g>
  <!-- גפנים בתחתית — ריקודי הכרמים -->
  <g>
    <path d="M-10 430 q120-60 250-28 q70 16 140 6" fill="none" stroke="#7ea86b" stroke-width="7" stroke-linecap="round"/>
    <path d="M810 430 q-120-60 -250-28 q-70 16 -140 6" fill="none" stroke="#7ea86b" stroke-width="7" stroke-linecap="round"/>
    <g fill="#8fba7a">
      <ellipse cx="120" cy="392" rx="18" ry="11" transform="rotate(-24 120 392)"/>
      <ellipse cx="250" cy="382" rx="18" ry="11" transform="rotate(14 250 382)"/>
      <ellipse cx="680" cy="392" rx="18" ry="11" transform="rotate(24 680 392)"/>
      <ellipse cx="550" cy="382" rx="18" ry="11" transform="rotate(-14 550 382)"/>
    </g>
    <g fill="#9b5f86">
      <g transform="translate(180,404)"><circle r="8"/><circle cx="-11" cy="12" r="8"/><circle cx="11" cy="12" r="8"/><circle cy="24" r="8"/></g>
      <g transform="translate(620,404)"><circle r="8"/><circle cx="-11" cy="12" r="8"/><circle cx="11" cy="12" r="8"/><circle cy="24" r="8"/></g>
    </g>
  </g>
</svg>`;
HOLIDAY_ART["holiday_tu_bav"] = `${svgURL(TU_BAV_SVG)} center / cover no-repeat`;
HOLIDAY_ART_KEYS.push("holiday_tu_bav");

// ─── ימי זיכרון — איורים מאופקים: נר זיכרון, ללא צבעוניות חגיגית ───
const SHOAH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="shg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5f5f6"/><stop offset="1" stop-color="#d7d9de"/>
    </linearGradient>
    <radialGradient id="shflame" cx="50%" cy="35%" r="60%">
      <stop offset="0" stop-color="rgba(240,190,90,0.5)"/><stop offset="1" stop-color="rgba(240,190,90,0)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#shg)"/>
  <path d="M118 78 l20 34 h-40 z M118 134 l-20-34 h40 z" fill="none" stroke="#9a9da6" stroke-width="4" opacity="0.5"/>
  <circle cx="400" cy="205" r="145" fill="rgba(255,255,255,0.55)"/>
  <circle cx="400" cy="150" r="95" fill="url(#shflame)"/>
  <g>
    <rect x="368" y="170" width="64" height="150" rx="12" fill="#fdfaf2" stroke="#c9c4b4" stroke-width="3"/>
    <path d="M372 176 q10 16 4 34" fill="none" stroke="#e7e0cc" stroke-width="6" stroke-linecap="round"/>
    <rect x="396" y="150" width="8" height="24" rx="4" fill="#8f8a7a"/>
    <path d="M400 108 q16 22 0 44 q-16-22 0-44z" fill="#f2b23e" stroke="#d98f1f" stroke-width="2"/>
    <path d="M400 124 q7 11 0 22 q-7-11 0-22z" fill="#fde9b8"/>
  </g>
  <text x="400" y="382" font-size="30" text-anchor="middle" fill="#6c7078" font-family="sans-serif">יזכור</text>
</svg>`;
HOLIDAY_ART["holiday_shoah"] = `${svgURL(SHOAH_SVG)} center / cover no-repeat`;
HOLIDAY_ART_KEYS.push("holiday_shoah");

const ZIKARON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="zkg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef1f5"/><stop offset="1" stop-color="#c6cfda"/>
    </linearGradient>
    <radialGradient id="zkflame" cx="50%" cy="35%" r="60%">
      <stop offset="0" stop-color="rgba(240,190,90,0.5)"/><stop offset="1" stop-color="rgba(240,190,90,0)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#zkg)"/>
  <circle cx="400" cy="205" r="145" fill="rgba(255,255,255,0.55)"/>
  <circle cx="400" cy="150" r="95" fill="url(#zkflame)"/>
  <g>
    <rect x="368" y="170" width="64" height="150" rx="12" fill="#fdfaf2" stroke="#c2c6ce" stroke-width="3"/>
    <path d="M372 176 q10 16 4 34" fill="none" stroke="#e7e6df" stroke-width="6" stroke-linecap="round"/>
    <rect x="396" y="150" width="8" height="24" rx="4" fill="#84888f"/>
    <path d="M400 108 q16 22 0 44 q-16-22 0-44z" fill="#f2b23e" stroke="#d98f1f" stroke-width="2"/>
    <path d="M400 124 q7 11 0 22 q-7-11 0-22z" fill="#fde9b8"/>
  </g>
  <g transform="translate(505,268)">
    <path d="M0 60 q-4-34 0-60" fill="none" stroke="#6f8a5f" stroke-width="5" stroke-linecap="round"/>
    <g fill="#c0392b">
      <circle cx="0" cy="-8" r="9"/><circle cx="-10" cy="0" r="9"/><circle cx="10" cy="0" r="9"/>
      <circle cx="-6" cy="10" r="9"/><circle cx="6" cy="10" r="9"/>
    </g>
    <circle cx="0" cy="2" r="5" fill="#7d221a"/>
  </g>
  <text x="400" y="382" font-size="30" text-anchor="middle" fill="#5d6673" font-family="sans-serif">יהי זכרם ברוך</text>
</svg>`;
HOLIDAY_ART["holiday_zikaron"] = `${svgURL(ZIKARON_SVG)} center / cover no-repeat`;
HOLIDAY_ART_KEYS.push("holiday_zikaron");

// ─── באנר יום שישי — נרות שבת, חלה וגביע קידוש על רקע זהוב חם ───
const FRIDAY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="frg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdf7e7"/>
      <stop offset="0.6" stop-color="#f8e7c0"/>
      <stop offset="1" stop-color="#eccf94"/>
    </linearGradient>
    <radialGradient id="frglow" cx="50%" cy="34%" r="55%">
      <stop offset="0" stop-color="rgba(255,215,120,0.55)"/>
      <stop offset="1" stop-color="rgba(255,215,120,0)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#frg)"/>
  <g fill="#d9b45c" opacity="0.55">
    <path d="M110 84 l5 12 12 2 -9 9 2 13 -10-6 -10 6 2-13 -9-9 12-2z"/>
    <path d="M688 66 l4 10 10 2 -7 7 1 11 -8-5 -8 5 1-11 -7-7 10-2z"/>
    <path d="M660 300 l4 10 10 2 -7 7 1 11 -8-5 -8 5 1-11 -7-7 10-2z"/>
  </g>
  <circle cx="400" cy="185" r="150" fill="url(#frglow)"/>
  <circle cx="400" cy="195" r="132" fill="rgba(255,255,255,0.5)"/>
  <circle cx="400" cy="195" r="132" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="3"/>
  <!-- שני נרות שבת -->
  <g>
    <rect x="352" y="152" width="20" height="92" rx="8" fill="#fdfaf0" stroke="#d8cfae" stroke-width="2.5"/>
    <rect x="428" y="152" width="20" height="92" rx="8" fill="#fdfaf0" stroke="#d8cfae" stroke-width="2.5"/>
    <rect x="359" y="140" width="6" height="16" rx="3" fill="#8f8a7a"/>
    <rect x="435" y="140" width="6" height="16" rx="3" fill="#8f8a7a"/>
    <path d="M362 104 q13 18 0 36 q-13-18 0-36z" fill="#f2b23e" stroke="#d98f1f" stroke-width="2"/>
    <path d="M438 104 q13 18 0 36 q-13-18 0-36z" fill="#f2b23e" stroke="#d98f1f" stroke-width="2"/>
    <path d="M362 117 q5 8 0 16 q-5-8 0-16z" fill="#fde9b8"/>
    <path d="M438 117 q5 8 0 16 q-5-8 0-16z" fill="#fde9b8"/>
    <!-- פמוטים -->
    <path d="M344 244 h36 l-6 14 h-24 z" fill="#c9a84c"/>
    <path d="M420 244 h36 l-6 14 h-24 z" fill="#c9a84c"/>
  </g>
  <!-- גביע קידוש -->
  <g transform="translate(297,238)">
    <path d="M-20 0 h40 q0 26 -20 30 q-20-4 -20-30z" fill="#c9a84c" stroke="#a9884a" stroke-width="2.5"/>
    <rect x="-3.5" y="28" width="7" height="18" fill="#a9884a"/>
    <path d="M-14 48 h28 l4 8 h-36 z" fill="#c9a84c"/>
    <path d="M-13 6 q13 7 26 0" fill="none" stroke="#8c2f39" stroke-width="5" stroke-linecap="round"/>
  </g>
  <!-- חלה קלועה -->
  <g transform="translate(500,268)">
    <ellipse cx="0" cy="14" rx="62" ry="24" fill="#d99a4e" stroke="#b57733" stroke-width="3"/>
    <path d="M-52 10 q10-16 24-2 q10-16 26-2 q10-16 26-2 q8-10 20 0" fill="none" stroke="#b57733" stroke-width="4" stroke-linecap="round"/>
    <g fill="#f6e3b8"><circle cx="-30" cy="4" r="2.4"/><circle cx="-8" cy="0" r="2.4"/><circle cx="16" cy="2" r="2.4"/><circle cx="36" cy="6" r="2.4"/></g>
  </g>
</svg>`;
HOLIDAY_ART["friday_shabbat"] = `${svgURL(FRIDAY_SVG)} center / cover no-repeat`;
HOLIDAY_ART_KEYS.push("friday_shabbat");

// ─── באנר מוצאי שבת — נר הבדלה, גביע ובשמים על שמי לילה זרועי כוכבים ───
const MOTZASH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="mzsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a3160"/>
      <stop offset="0.42" stop-color="#6b5fa8"/>
      <stop offset="0.72" stop-color="#d98aa2"/>
      <stop offset="1" stop-color="#ffc97c"/>
    </linearGradient>
    <radialGradient id="mzsun" cx="50%" cy="100%" r="70%">
      <stop offset="0" stop-color="rgba(255,220,140,0.9)"/>
      <stop offset="0.5" stop-color="rgba(255,190,110,0.35)"/>
      <stop offset="1" stop-color="rgba(255,190,110,0)"/>
    </radialGradient>
    <linearGradient id="mzhillA" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3f5f7d"/><stop offset="1" stop-color="#2c4560"/>
    </linearGradient>
    <linearGradient id="mzhillB" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b4258"/><stop offset="1" stop-color="#1f3245"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#mzsky)"/>
  <!-- כוכבים אחרונים של הלילה -->
  <g fill="#ffffff">
    <circle cx="90" cy="60" r="2.2" opacity="0.85"/><circle cx="200" cy="110" r="1.7" opacity="0.6"/>
    <circle cx="320" cy="52" r="2" opacity="0.75"/><circle cx="470" cy="86" r="1.6" opacity="0.55"/>
    <circle cx="600" cy="48" r="2.2" opacity="0.8"/><circle cx="716" cy="104" r="1.8" opacity="0.6"/>
    <circle cx="150" cy="170" r="1.5" opacity="0.4"/><circle cx="660" cy="170" r="1.5" opacity="0.4"/>
  </g>
  <g fill="#ffe9b8">
    <path d="M120 96 l4 10 10 2 -7 7 1 11 -8-5 -8 5 1-11 -7-7 10-2z" opacity="0.85"/>
    <path d="M680 66 l3 8 8 1 -6 6 1 9 -6-4 -6 4 1-9 -6-6 8-1z" opacity="0.7"/>
  </g>
  <!-- הילת זריחה -->
  <rect width="800" height="450" fill="url(#mzsun)"/>
  <!-- שמש עולה -->
  <g>
    <circle cx="400" cy="332" r="64" fill="#ffd98c"/>
    <circle cx="400" cy="332" r="64" fill="none" stroke="#fff3d0" stroke-width="4" opacity="0.8"/>
    <g stroke="#ffd98c" stroke-width="6" stroke-linecap="round" opacity="0.85">
      <line x1="400" y1="216" x2="400" y2="242"/>
      <line x1="306" y1="252" x2="325" y2="270"/>
      <line x1="494" y1="252" x2="475" y2="270"/>
      <line x1="272" y1="330" x2="298" y2="330"/>
      <line x1="528" y1="330" x2="502" y2="330"/>
    </g>
  </g>
  <!-- ציפורים -->
  <g fill="none" stroke="#2f3a55" stroke-width="4" stroke-linecap="round">
    <path d="M232 160 q12 -12 24 0 q12 -12 24 0"/>
    <path d="M540 132 q10 -10 20 0 q10 -10 20 0"/>
    <path d="M330 108 q8 -8 16 0 q8 -8 16 0"/>
  </g>
  <!-- עננים רכים -->
  <g fill="#ffffff" opacity="0.35">
    <ellipse cx="160" cy="236" rx="66" ry="15"/><ellipse cx="205" cy="224" rx="42" ry="12"/>
    <ellipse cx="632" cy="216" rx="72" ry="16"/><ellipse cx="586" cy="204" rx="40" ry="11"/>
  </g>
  <!-- גבעות -->
  <path d="M0 356 q120 -64 260 -20 q150 46 320 -8 q120 -36 220 16 v106 h-800z" fill="url(#mzhillA)"/>
  <path d="M0 402 q170 -52 350 -12 q200 44 450 -6 v66 h-800z" fill="url(#mzhillB)"/>
  <!-- ניצוצות של שבוע חדש -->
  <g fill="#ffe9b8">
    <circle cx="352" cy="250" r="2.6" opacity="0.9"/>
    <circle cx="452" cy="244" r="2.2" opacity="0.8"/>
    <circle cx="400" cy="200" r="2.4" opacity="0.7"/>
  </g>
</svg>`;
HOLIDAY_ART["motzash"] = `${svgURL(MOTZASH_SVG)} center / cover no-repeat`;
HOLIDAY_ART_KEYS.push("motzash");

// ─── רקע תזכורת דמי ועד — לוח שנה עם מטבעות, מופיע ביום האחרון של החודש ───
const VAAD_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdf6e6"/><stop offset="1" stop-color="#eddcb4"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#vg)"/>
  <g opacity="0.5" stroke="#c9a84c" stroke-width="2" fill="none">
    <circle cx="690" cy="80" r="34"/><circle cx="740" cy="140" r="20"/><circle cx="640" cy="150" r="14"/>
    <circle cx="110" cy="360" r="26"/><circle cx="60" cy="300" r="16"/>
  </g>
  <g transform="translate(400,225)">
    <rect x="-118" y="-104" width="236" height="208" rx="20" fill="#fffdf8" stroke="#c9a84c" stroke-width="4"/>
    <rect x="-118" y="-104" width="236" height="52" rx="20" fill="#c9a84c"/>
    <rect x="-118" y="-74" width="236" height="22" fill="#c9a84c"/>
    <rect x="-74" y="-124" width="16" height="40" rx="8" fill="#a9884a"/>
    <rect x="58" y="-124" width="16" height="40" rx="8" fill="#a9884a"/>
    <g fill="#e3d6b4">
      <rect x="-92" y="-30" width="34" height="26" rx="5"/><rect x="-42" y="-30" width="34" height="26" rx="5"/>
      <rect x="8" y="-30" width="34" height="26" rx="5"/><rect x="58" y="-30" width="34" height="26" rx="5"/>
      <rect x="-92" y="8" width="34" height="26" rx="5"/><rect x="-42" y="8" width="34" height="26" rx="5"/>
      <rect x="8" y="8" width="34" height="26" rx="5"/>
    </g>
    <rect x="58" y="8" width="34" height="26" rx="5" fill="#d97b57"/>
    <g fill="#e3d6b4">
      <rect x="-92" y="46" width="34" height="26" rx="5"/><rect x="-42" y="46" width="34" height="26" rx="5"/>
    </g>
  </g>
  <g transform="translate(578,318)">
    <ellipse cx="0" cy="34" rx="62" ry="17" fill="#b8912f" opacity="0.28"/>
    <circle cx="-22" cy="6" r="34" fill="#e8c65f" stroke="#b8912f" stroke-width="3.5"/>
    <text x="-22" y="14" font-size="34" text-anchor="middle" fill="#8a6c1f" font-weight="bold">₪</text>
    <circle cx="30" cy="18" r="26" fill="#f0d582" stroke="#b8912f" stroke-width="3"/>
    <text x="30" y="27" font-size="26" text-anchor="middle" fill="#8a6c1f" font-weight="bold">₪</text>
  </g>
</svg>`;

export const VAAD_BG = `${svgURL(VAAD_SVG)} center / cover no-repeat`;

// ─── רקע "המקום מוגן במצלמות" — מצלמת אבטחה עם חרוט שדה ראייה ומגן ───
const CAMERA_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef3f8"/><stop offset="1" stop-color="#c9d7e4"/>
    </linearGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#cg)"/>
  <g stroke="#93a8bd" stroke-width="1.5" opacity="0.3">
    <path d="M0 120 H800 M0 210 H800 M0 300 H800"/>
  </g>
  <g transform="translate(210,110)">
    <path d="M28 26 L300 190 L74 268 Z" fill="url(#cone)"/>
    <rect x="-14" y="-16" width="20" height="86" rx="8" fill="#7b8ea3"/>
    <rect x="-40" y="-30" width="72" height="20" rx="8" fill="#5f7286"/>
    <g transform="rotate(28)">
      <rect x="0" y="0" width="128" height="52" rx="16" fill="#4a5c6f"/>
      <rect x="10" y="9" width="72" height="34" rx="10" fill="#67798c"/>
      <circle cx="122" cy="26" r="24" fill="#2f3d4c"/>
      <circle cx="122" cy="26" r="13" fill="#8fd2f0"/>
      <circle cx="117" cy="21" r="5" fill="#ffffff" opacity="0.85"/>
      <circle cx="22" cy="-8" r="6" fill="#e05a4f"/>
    </g>
  </g>
  <g transform="translate(596,268)">
    <path d="M0 -66 L58 -42 V6 C58 44 30 68 0 78 C-30 68 -58 44 -58 6 V-42 Z"
          fill="#ffffff" fill-opacity="0.9" stroke="#5f7286" stroke-width="5"/>
    <path d="M-24 4 L-6 24 L26 -18" fill="none" stroke="#3f9d6a" stroke-width="11"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

export const CAMERA_BG = `${svgURL(CAMERA_SVG)} center / cover no-repeat`;

// ─── רקע פינוי גזם וגרוטאות — פח ירוק, ענפים גזומים ומזמרה ───
const GIZUM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="gz" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f7ea"/><stop offset="1" stop-color="#d3e3c2"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#gz)"/>
  <rect y="360" width="800" height="90" fill="#a8c188" opacity="0.45"/>

  <g stroke="#7fa055" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9">
    <path d="M120 360 C 150 300, 130 260, 165 215"/>
    <path d="M150 300 C 185 288, 200 262, 205 238"/>
    <path d="M137 268 C 108 258, 96 236, 92 214"/>
  </g>
  <g fill="#8fb862">
    <ellipse cx="205" cy="232" rx="26" ry="13" transform="rotate(-28 205 232)"/>
    <ellipse cx="92" cy="208" rx="24" ry="12" transform="rotate(28 92 208)"/>
    <ellipse cx="166" cy="208" rx="22" ry="11" transform="rotate(-8 166 208)"/>
  </g>

  <g transform="translate(520,196)">
    <rect x="-104" y="-26" width="208" height="34" rx="12" fill="#4f7a3a"/>
    <rect x="-20" y="-42" width="40" height="20" rx="8" fill="#3f6630"/>
    <path d="M-92 10 L92 10 L74 176 L-74 176 Z" fill="#5f8f45"/>
    <g stroke="#4f7a3a" stroke-width="6" stroke-linecap="round">
      <line x1="-46" y1="34" x2="-56" y2="152"/>
      <line x1="0" y1="34" x2="0" y2="152"/>
      <line x1="46" y1="34" x2="56" y2="152"/>
    </g>
    <rect x="-96" y="176" width="30" height="16" rx="6" fill="#3f6630"/>
    <rect x="66" y="176" width="30" height="16" rx="6" fill="#3f6630"/>
  </g>

  <g transform="translate(300,352) rotate(-14)">
    <path d="M0 0 L58 -30" stroke="#b0563f" stroke-width="11" stroke-linecap="round"/>
    <path d="M0 10 L58 40" stroke="#b0563f" stroke-width="11" stroke-linecap="round"/>
    <path d="M52 -34 L104 -50" stroke="#9aa3ab" stroke-width="13" stroke-linecap="round"/>
    <path d="M52 44 L104 30" stroke="#9aa3ab" stroke-width="13" stroke-linecap="round"/>
    <circle cx="34" cy="5" r="9" fill="#7c8890"/>
  </g>

  <g stroke="#8a6a3f" stroke-width="6" stroke-linecap="round" opacity="0.75">
    <path d="M600 392 L692 380"/>
    <path d="M614 408 L682 402"/>
  </g>
</svg>`;

export const GIZUM_BG = `${svgURL(GIZUM_SVG)} center / cover no-repeat`;

// ─── סצנת שבת למסך המלא: אור זהוב רך, גבעות, יונים ושולחן שבת ───
// עיצוב כללי וחם שמתאים לכל שעות השבת — מהערב ועד צאתה.
export function ShabbatSceneArt({ className = "" }) {
  const sparks = [
    [150, 130, 10], [420, 80, 8], [1180, 100, 10], [1460, 170, 8],
    [280, 260, 7], [1330, 290, 7], [700, 70, 8], [980, 150, 9],
  ];
  return (
    <svg className={className} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="shb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdfaf0" />
          <stop offset="0.5" stopColor="#f8edd2" />
          <stop offset="1" stopColor="#efdcb0" />
        </linearGradient>
        <radialGradient id="shb-light" cx="50%" cy="30%" r="60%">
          <stop offset="0" stopColor="rgba(244,205,115,0.5)" />
          <stop offset="1" stopColor="rgba(244,205,115,0)" />
        </radialGradient>
        <radialGradient id="shb-candleglow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="rgba(240,180,80,0.38)" />
          <stop offset="1" stopColor="rgba(240,180,80,0)" />
        </radialGradient>
        <linearGradient id="shb-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf8ea" />
          <stop offset="1" stopColor="#e5d6ae" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#shb-sky)" />
      <circle cx="800" cy="240" r="560" fill="url(#shb-light)" />
      {/* ניצוצות זהב עדינים */}
      {sparks.map(([x, y, s], i) => (
        <path key={i} className="shb-star"
          d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`}
          fill="#d9b45c" opacity="0.5" style={{ animationDelay: `${(i % 5) * 0.8}s` }} />
      ))}
      {/* ענפי זית מסגרת בפינות העליונות */}
      <g stroke="#9aa06f" strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M-20 60 q120 30 210 130" />
        <path d="M1620 60 q-120 30 -210 130" />
      </g>
      <g fill="#a8ae7c">
        <ellipse cx="70" cy="86" rx="20" ry="9" transform="rotate(24 70 86)" />
        <ellipse cx="130" cy="118" rx="20" ry="9" transform="rotate(38 130 118)" />
        <ellipse cx="178" cy="164" rx="20" ry="9" transform="rotate(52 178 164)" />
        <ellipse cx="1530" cy="86" rx="20" ry="9" transform="rotate(-24 1530 86)" />
        <ellipse cx="1470" cy="118" rx="20" ry="9" transform="rotate(-38 1470 118)" />
        <ellipse cx="1422" cy="164" rx="20" ry="9" transform="rotate(-52 1422 164)" />
      </g>
      <g fill="#6f7a4e">
        <circle cx="98" cy="104" r="6" /><circle cx="152" cy="144" r="6" />
        <circle cx="1502" cy="104" r="6" /><circle cx="1448" cy="144" r="6" />
      </g>
      {/* יונים */}
      <g fill="#ffffff" stroke="#c9bfa2" strokeWidth="3" strokeLinejoin="round">
        <path d="M560 190 q28-30 54-10 q30-26 20 8 q34-6 10 20 q-40 22 -74 4 q-18-10 -10-22z" />
        <path d="M1000 250 q22-24 43-8 q24-21 16 6 q27-5 8 16 q-32 18 -59 3 q-14-8 -8-17z" transform="scale(0.85) translate(180,60)" />
      </g>
      {/* גבעות רכות */}
      <path d="M0 620 q260-90 520-40 q280 54 560 6 q260-44 520 34 V900 H0 z" fill="#e2d5a4" opacity="0.85" />
      <path d="M0 680 q300-64 640-24 q340 40 960 -6 V900 H0 z" fill="#d5c58e" opacity="0.9" />
      {/* עצים על הגבעות */}
      <g>
        <rect x="455" y="578" width="12" height="48" rx="4" fill="#8a6b3f" />
        <circle cx="461" cy="552" r="40" fill="#a3b075" />
        <circle cx="430" cy="574" r="26" fill="#93a264" />
        <circle cx="494" cy="572" r="26" fill="#b0bd83" />
        <rect x="1148" y="602" width="10" height="42" rx="4" fill="#8a6b3f" />
        <circle cx="1153" cy="580" r="32" fill="#a3b075" />
        <circle cx="1130" cy="598" r="20" fill="#93a264" />
        <circle cx="1178" cy="596" r="20" fill="#b0bd83" />
      </g>
      {/* עפיפון בשמיים */}
      <g>
        <g transform="translate(332,206) rotate(16)">
          <path d="M0 -48 L36 0 L0 48 L-36 0 Z" fill="#d76f5a" stroke="#b25443" strokeWidth="4" strokeLinejoin="round" />
          <path d="M0 -48 V48 M-36 0 H36" stroke="#fbe9cd" strokeWidth="3" />
        </g>
        <path d="M318 252 q-16 26 -40 30 q22 12 10 34" fill="none" stroke="#b25443" strokeWidth="3" opacity="0.8" />
        <path d="M334 254 Q322 440 292 612" fill="none" stroke="#a5977a" strokeWidth="3" />
      </g>
      {/* הורה וילד מעיפים עפיפון */}
      <g>
        <g transform="translate(196,668)">
          <circle cx="0" cy="-78" r="15" fill="#eac9a2" />
          <path d="M-16 -62 h32 l-5 52 h-22 z" fill="#a2603f" />
          <path d="M-9 -10 l-3 34 M9 -10 l3 34" stroke="#5a4a33" strokeWidth="7" strokeLinecap="round" />
          <path d="M14 -54 L42 -36" stroke="#eac9a2" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g transform="translate(262,678)">
          <circle cx="0" cy="-56" r="12" fill="#eac9a2" />
          <path d="M-13 -44 h26 l-4 38 h-18 z" fill="#7c8fae" />
          <path d="M-7 -6 l-2 26 M7 -6 l2 26" stroke="#5a4a33" strokeWidth="6" strokeLinecap="round" />
          <path d="M10 -38 L29 -62" stroke="#eac9a2" strokeWidth="6" strokeLinecap="round" />
        </g>
      </g>
      {/* פיקניק משפחתי על הגבעה */}
      <g transform="translate(1330,630)">
        <ellipse cx="0" cy="34" rx="160" ry="30" fill="#8c6d43" opacity="0.25" />
        <ellipse cx="0" cy="30" rx="152" ry="26" fill="#d7666f" />
        <ellipse cx="0" cy="30" rx="110" ry="17" fill="#e2848b" />
        <g transform="translate(-84,6)">
          <circle cx="0" cy="-52" r="14" fill="#eac9a2" />
          <path d="M-15 -38 h30 q8 30 0 40 h-30 q-8 -10 0 -40z" fill="#8c6d43" />
          <path d="M13 -30 L44 -12" stroke="#eac9a2" strokeWidth="6" strokeLinecap="round" />
        </g>
        <g transform="translate(-32,16)">
          <circle cx="0" cy="-42" r="11" fill="#eac9a2" />
          <path d="M-12 -30 h24 q5 22 0 28 h-24 q-5 -6 0 -28z" fill="#7f8a52" />
        </g>
        <g transform="translate(62,4)">
          <circle cx="0" cy="-54" r="15" fill="#eac9a2" />
          <path d="M-16 -40 h32 q8 32 0 42 h-32 q-8 -10 0 -42z" fill="#6f7a4e" />
        </g>
        <g transform="translate(122,12)">
          <path d="M-24 0 h48 l-8 24 h-32 z" fill="#c19a45" stroke="#9a7a34" strokeWidth="3" />
          <path d="M-14 0 q14 -20 28 0" fill="none" stroke="#9a7a34" strokeWidth="4" />
        </g>
      </g>
      {/* כדור משחק */}
      <g transform="translate(1128,678)">
        <circle cx="0" cy="0" r="14" fill="#d3ab53" stroke="#a9884a" strokeWidth="3" />
        <path d="M-14 0 q14 -10 28 0" fill="none" stroke="#a9884a" strokeWidth="3" />
      </g>
      {/* זוהר הנרות */}
      <ellipse cx="800" cy="600" rx="430" ry="240" fill="url(#shb-candleglow)" />
      {/* שולחן השבת */}
      <path d="M0 730 q400 -34 800 -34 t800 34 V900 H0 z" fill="url(#shb-cloth)" />
      <path d="M0 748 q400 -30 800 -30 t800 30" fill="none" stroke="#c6b283" strokeWidth="3" opacity="0.7" />
      <g transform="translate(568,660)">
        <ellipse cx="0" cy="88" rx="52" ry="10" fill="#b9a26b" opacity="0.45" />
        <path d="M-34 0 h68 q0 42 -34 50 q-34 -8 -34 -50z" fill="#d3ab53" stroke="#a9884a" strokeWidth="4" />
        <path d="M-22 10 q22 12 44 0" fill="none" stroke="#8c2f39" strokeWidth="8" strokeLinecap="round" />
        <rect x="-6" y="48" width="12" height="28" fill="#b3924e" />
        <path d="M-24 78 h48 l6 12 h-60 z" fill="#d3ab53" stroke="#a9884a" strokeWidth="3" />
      </g>
      <g>
        <path d="M712 806 h56 l-9 -20 h-38 z" fill="#c9a24e" />
        <rect x="731" y="716" width="18" height="72" rx="6" fill="#b3924e" />
        <rect x="722" y="606" width="36" height="116" rx="10" fill="#fdf8ea" stroke="#cfc19a" strokeWidth="3" />
        <rect x="736" y="588" width="8" height="22" rx="4" fill="#8f8a7a" />
        <ellipse cx="740" cy="560" rx="34" ry="44" fill="url(#shb-candleglow)" />
        <path className="shb-flame" d="M740 528 q20 26 0 54 q-20 -28 0 -54z" fill="#f0a92e" stroke="#cf8318" strokeWidth="3" />
        <path className="shb-flame" d="M740 548 q8 12 0 24 q-8 -12 0 -24z" fill="#fde3a6" />
        <path d="M832 806 h56 l-9 -20 h-38 z" fill="#c9a24e" />
        <rect x="851" y="716" width="18" height="72" rx="6" fill="#b3924e" />
        <rect x="842" y="606" width="36" height="116" rx="10" fill="#fdf8ea" stroke="#cfc19a" strokeWidth="3" />
        <rect x="856" y="588" width="8" height="22" rx="4" fill="#8f8a7a" />
        <ellipse cx="860" cy="560" rx="34" ry="44" fill="url(#shb-candleglow)" />
        <path className="shb-flame f2" d="M860 528 q20 26 0 54 q-20 -28 0 -54z" fill="#f0a92e" stroke="#cf8318" strokeWidth="3" />
        <path className="shb-flame f2" d="M860 548 q8 12 0 24 q-8 -12 0 -24z" fill="#fde3a6" />
      </g>
      <g transform="translate(1035,700)">
        <ellipse cx="0" cy="86" rx="118" ry="14" fill="#b9a26b" opacity="0.4" />
        <path d="M-96 60 q-14 -64 44 -78 q10 -26 52 -26 q42 0 52 26 q58 14 44 78 q-8 26 -96 26 t-96 -26z" fill="#fbf4e2" stroke="#cdbc92" strokeWidth="4" />
        <path d="M-88 44 q88 26 176 0" fill="none" stroke="#c19a45" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
        <path d="M-60 66 q60 16 120 0" fill="none" stroke="#d6c79d" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="22" r="9" fill="none" stroke="#c19a45" strokeWidth="4" opacity="0.8" />
      </g>
    </svg>
  );
}

