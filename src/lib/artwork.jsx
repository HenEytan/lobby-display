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

export const HOLIDAY_ART = Object.fromEntries(
  Object.entries(HOLIDAY_ART_DEFS).map(([k, v]) => [k, `${svgURL(holidayArtSVG(v))} center / cover no-repeat`])
);
export const HOLIDAY_ART_KEYS = Object.keys(HOLIDAY_ART_DEFS);
