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

export const ART_BG = {
  art_sunset: `${svgURL(SUNSET_SVG)} center / cover no-repeat`,
  art_garden: `${svgURL(GARDEN_SVG)} center / cover no-repeat`,
  art_geometry: `${svgURL(GEOMETRY_SVG)} center / 220px repeat`,
};

export const ART_LABELS = {
  art_sunset: "שקיעה עירונית",
  art_garden: "גינה פורחת",
  art_geometry: "תבנית גיאומטרית",
};
