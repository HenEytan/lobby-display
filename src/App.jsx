import { useEffect, useMemo, useRef, useState } from "react";
import { VERSION, CHANGELOG } from "./version";
import { gregDateHe, hebrewDate, dailyGreeting, todayHoliday, shabbatInfo, upcomingHolidays, holidayBannerSchedule } from "./lib/hebrew";
import { eventsThisWeek, formatEventTime, fetchAlumaEvents, EVENTS_REFRESH_MS, CATEGORY_BG } from "./lib/events";
import { fetchWeather, weatherIcon, uvLevel } from "./lib/feeds";
import { syncTime, israelNow, TIME_SYNC_MS } from "./lib/time";
import { fetchNews, NEWS_REFRESH_MS } from "./lib/news";
import { applyTheme } from "./lib/themes";
import { BuildingArt, OliveDivider, CategoryIcon, AnnouncementIcon, rotatingArt, ShabbatSceneArt } from "./lib/artwork.jsx";
import {
  useLobbyData, activeBanners, activeAnnouncements, urgentAnnouncement,
  BG_PRESETS, pullFromServer, SYNC_POLL_MS, isMusicHour,
} from "./lib/store";
import { mediaURL } from "./lib/media";
import Admin from "./admin/Admin.jsx";
import "./App.css";

// ─── מסך מלא — תמיכה חוצת-דפדפנים (Chrome/Edge, Firefox, Safari, ומכשירים ישנים) ───
function fsElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function fsSupported() {
  if (typeof document === "undefined") return false;
  const el = document.documentElement;
  return !!(
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen
  );
}

function useFullscreen() {
  const [isFs, setIsFs] = useState(() => !!fsElement());
  const supported = useMemo(() => fsSupported(), []);

  useEffect(() => {
    const onChange = () => setIsFs(!!fsElement());
    const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
    events.forEach((e) => document.addEventListener(e, onChange));
    return () => events.forEach((e) => document.removeEventListener(e, onChange));
  }, []);

  const toggle = () => {
    const el = document.documentElement;
    if (fsElement()) {
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (exit) Promise.resolve(exit.call(document)).catch(() => {});
    } else {
      const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.webkitRequestFullScreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      // navigationUI מוסתר היכן שנתמך; דפדפנים שלא מכירים אותו פשוט מתעלמים
      if (req) Promise.resolve(req.call(el, { navigationUI: "hide" })).catch(() => {});
    }
  };

  // קיצור מקלדת: F או F11 (שימושי עם שלט/מקלדת אלחוטית מחוברת למסך)
  useEffect(() => {
    if (!supported) return;
    const onKey = (e) => {
      if (e.key === "f" || e.key === "F" || e.key === "F11") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [supported]);

  return { isFs, supported, toggle };
}

// ─── ניתוב לפי hash: ‎#admin — פאנל ניהול, ‎#preview — תצוגה מקדימה של טיוטות ───
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return hash.replace("#", "");
}

// שעון מסונכרן מול השרת (שעון ישראל) — לא תלוי בשעון המכשיר, שלעיתים שגוי.
function useClock() {
  const [now, setNow] = useState(() => israelNow());
  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) setNow(israelNow()); };
    syncTime().then(tick);
    const t = setInterval(tick, 1000);
    const s = setInterval(() => { syncTime().then(tick); }, TIME_SYNC_MS);
    return () => { alive = false; clearInterval(t); clearInterval(s); };
  }, []);
  return now;
}

export default function App() {
  const route = useHashRoute();
  if (route === "admin") return <Admin />;
  return <Display previewMode={route === "preview"} />;
}

// ═══════════════════════ תצוגת הלובי ══════════════════════

function Display({ previewMode }) {
  const now = useClock();
  const data = useLobbyData(previewMode);
  const { settings } = data;

  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);

  // משיכת תוכן מהשרת — כך שכל מסך מציג את אותן הגדרות, מכל מכשיר שנערכו
  useEffect(() => {
    pullFromServer();
    const t = setInterval(pullFromServer, SYNC_POLL_MS);
    return () => clearInterval(t);
  }, []);

  const [weather, setWeather] = useState(null);
  useEffect(() => {
    fetchWeather().then(setWeather);
    const t = setInterval(() => fetchWeather().then(setWeather), 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const [news, setNews] = useState({ items: [] });
  useEffect(() => {
    if (!settings.showNews) return;
    fetchNews().then(setNews);
    const t = setInterval(() => fetchNews().then(setNews), NEWS_REFRESH_MS);
    return () => clearInterval(t);
  }, [settings.showNews]);

  const holiday = useMemo(() => todayHoliday(now), [now.getDate(), now.getMonth()]);
  const shabbat = useMemo(() => shabbatInfo(now), [Math.floor(now.getTime() / 60000)]);
  // אירועי אלומה — נטענים מה-API החי ומתרעננים כל כמה שעות
  const [alumaEvents, setAlumaEvents] = useState(null);
  useEffect(() => {
    if (!settings.showEvents) return;
    fetchAlumaEvents().then(setAlumaEvents);
    const t = setInterval(() => fetchAlumaEvents().then(setAlumaEvents), EVENTS_REFRESH_MS);
    return () => clearInterval(t);
  }, [settings.showEvents]);
  const events = useMemo(
    () => eventsThisWeek(now, alumaEvents || undefined),
    [now.getDate(), alumaEvents]
  );
  const monthHolidays = useMemo(() => upcomingHolidays(now, 30), [now.getDate()]);
  const anns = activeAnnouncements(data.announcements, now);
  const urgent = urgentAnnouncement(data.announcements, now);

  // ─── מוזיקת רקע — מצב משותף כדי שגם שקופייה ייעודית תדע מה מתנגן ───
  const musicSource = data.music.source || "youtube";
  const musicTracks = data.music.tracks || [];
  // המוזיקה מנוגנת רק בתוך חלון השעות שהוגדר בניהול
  const musicHoursOk = isMusicHour(settings, now);
  const musicOn = data.music.enabled && musicHoursOk && (
    (musicSource === "youtube" && !!data.music.youtubeId) ||
    (musicSource === "upload" && musicTracks.length > 0)
  );
  const [trackIdx, setTrackIdx] = useState(0);
  useEffect(() => { setTrackIdx(0); }, [musicTracks.length]);
  const currentTrack = !musicOn ? null
    : musicSource === "youtube" ? { name: data.music.youtubeTitle || "פלייליסט יוטיוב" }
    : musicTracks[trackIdx % musicTracks.length];

  // ─── בניית שקופיות האזור הראשי ───
  const holidayBanners = useMemo(
    () => (settings.showHolidayBanners ? holidayBannerSchedule(now) : []),
    [settings.showHolidayBanners, now.getDate()]
  );
  // מוצאי שבת — אחרי ההבדלה עולה באנר "שבוע טוב" שמוביל את הסבב עד חצות
  const isMotzash = now.getDay() === 6 && !shabbat?.active;

  // תזכורת דמי ועד — שלושת הימים האחרונים של כל חודש, במקום השני בסבב
  const showVaadBanner = useMemo(() => {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() >= last - 2 && settings.showVaadReminder !== false;
  }, [now.getDate(), now.getMonth(), now.getFullYear(), settings.showVaadReminder]);

  const slides = useMemo(() => {
    const regular = activeBanners(data.banners, now).map((b) => ({ type: "banner", key: b.id, banner: b }));
    const holidayNow = activeBanners(holidayBanners, now).map((b) => ({ type: "banner", key: b.id, banner: b }));
    // יום שישי — באנר סופ״ש ושבת שלום, תמיד ראשון בסבב
    const fridayNow = now.getDay() === 5 ? [{
      type: "banner", key: "b_friday",
      banner: {
        id: "b_friday",
        title: "סוף שבוע טוב ושבת שלום",
        subtitle: `לכל דיירי ${settings.buildingName} — שבת של מנוחה ושלווה`,
        bg: "friday_shabbat", image: null,
      },
    }] : [];
    // מוצאי שבת — באנר "שבוע טוב" לכל הדיירים, תמיד ראשון בסבב
    const motzashNow = isMotzash ? [{
      type: "banner", key: "b_motzash",
      banner: {
        id: "b_motzash",
        title: "שבוע טוב ומבורך",
        subtitle: `לכל דיירי ${settings.buildingName} — שבוע של בריאות, הצלחה ושמחה`,
        bg: "motzash", image: null,
      },
    }] : [];
    const s = [...fridayNow, ...motzashNow, ...holidayNow, ...regular]; // שישי/מוצ״ש ראשונים, אחריהם חגים
    // תזכורת דמי ועד — נכנסת במקום השני בסבב
    if (showVaadBanner) {
      s.splice(Math.min(1, s.length), 0, {
        type: "banner", key: "b_vaad",
        banner: {
          id: "b_vaad",
          title: "תזכורת: תשלום דמי ועד",
          subtitle: "נא להסדיר את התשלום עד סוף החודש — תודה רבה!",
          bg: "vaad", image: null,
        },
      });
    }
    if (settings.showEvents && events.length > 0) s.push({ type: "events", key: "events" });
    if (settings.showCalendar && monthHolidays.length > 0) s.push({ type: "calendar", key: "calendar" });
    if (holiday) s.push({ type: "holiday", key: "holiday" });
    if (s.length === 0) s.push({ type: "welcome", key: "welcome" });
    return s;
  }, [data.rev, data.banners, holidayBanners, events, holiday, monthHolidays, settings.showEvents, settings.showCalendar, isMotzash, showVaadBanner, settings.buildingName, musicOn, now.getDate()]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(
      () => setIdx((i) => (i + 1) % slides.length),
      Math.max(5, settings.rotationSecs) * 1000
    );
    return () => clearTimeout(t);
  }, [idx, slides.length, settings.rotationSecs]);
  const slide = slides[idx % slides.length];

  const [showVersion, setShowVersion] = useState(false);
  const { isFs, supported: fsOk, toggle: toggleFs } = useFullscreen();

  // ─── מצבים שתופסים את המסך המלא ───
  if (urgent) return <UrgentScreen ann={urgent} now={now} />;
  if (shabbat?.active) return <ShabbatScreen shabbat={shabbat} name={settings.buildingName} />;

  return (
    <div
      className="board"
      dir="rtl"
      style={{
        paddingBottom: `max(${(settings.showTicker ? 6 : 0) + (settings.showNews && news.items.length > 0 ? 7.2 : 0)}vh, ${(settings.showTicker ? 44 : 0) + (settings.showNews && news.items.length > 0 ? 56 : 0)}px)`,
      }}
    >
      {previewMode && (
        <div className="preview-bar">
          מצב תצוגה מקדימה — כך ייראה המסך לאחר פרסום
          <a href="#admin">חזרה לניהול</a>
        </div>
      )}

      <header className="board-head">
        <div className="head-brand">
          <span className="head-hello">ברוכים הבאים</span>
          <div className="head-title">
            <h1 className="head-name">{settings.buildingName}</h1>
            {settings.city && <span className="head-city">{settings.city}</span>}
          </div>
        </div>
        <div className="head-greet">
          <span className="head-greet-text">{dailyGreeting(now, holiday)}</span>
          <OliveDivider className="head-divider" />
        </div>
      </header>

      <div className="board-body">
        <main className="main-area">
          <MainSlide slide={slide} events={events} holiday={holiday} name={settings.buildingName} currentTrack={currentTrack} isSaturday={now.getDay() === 6} monthHolidays={monthHolidays} />
          {slides.length > 1 && (
            <div className="slide-dots">
              {slides.map((s, i) => (
                <span key={s.key} className={"dot" + (i === idx % slides.length ? " on" : "")} />
              ))}
            </div>
          )}
        </main>

        <aside className="side">
          <ClockCard now={now} shabbat={shabbat} />
          <WeatherCard weather={weather} />
          <AnnouncementsCard anns={anns} />
        </aside>
      </div>

      {/* הרצועות מעוגנות לתחתית המסך — כך שגובה התוכן לעולם לא יכול לדחוף אותן החוצה */}
      <div className="board-strips">
        {settings.showTicker && <Ticker lines={data.ticker} speed={settings.tickerSpeed} now={now} name={settings.buildingName} />}
        {settings.showNews && news.items.length > 0 && <NewsTicker items={news.items} speed={settings.newsSpeed} />}
      </div>

      <MusicPlayer music={data.music} trackIdx={trackIdx} setTrackIdx={setTrackIdx} allowed={musicHoursOk} />

      {(() => {
        const tickerVh = (settings.showTicker ? 6 : 0) + (settings.showNews && news.items.length > 0 ? 7.2 : 0);
        const floatStyle = tickerVh > 0 ? { bottom: `calc(${tickerVh}vh + 10px)` } : undefined;
        return (
          <>
            <button className="ver" style={floatStyle} onClick={() => setShowVersion((v) => !v)}>גרסה {VERSION}</button>
            {fsOk && (
              <button
                className="fs-btn"
                style={floatStyle}
                onClick={toggleFs}
                title={isFs ? "יציאה ממסך מלא (F)" : "מסך מלא — הסתרת סרגלי הדפדפן (F)"}
                aria-label={isFs ? "יציאה ממסך מלא" : "מסך מלא"}
              >
                {isFs ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
                  </svg>
                )}
              </button>
            )}
          </>
        );
      })()}

      {showVersion && <VersionPanel onClose={() => setShowVersion(false)} />}
    </div>
  );
}

// ─── האזור הראשי ───

function MainSlide({ slide, events, holiday, name, currentTrack, isSaturday, monthHolidays }) {
  if (slide.type === "banner") return <BannerSlide banner={slide.banner} />;
  if (slide.type === "events") return <EventsSlide events={events} />;
  if (slide.type === "calendar") return <CalendarSlide items={monthHolidays} />;
  if (slide.type === "holiday") return <HolidaySlide text={holiday} />;
  if (slide.type === "vaad") return <VaadSlide />;
  if (slide.type === "weekend") return <WeekendSlide isSaturday={isSaturday} />;
  return <WelcomeSlide name={name} />;
}

function BannerSlide({ banner }) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    let alive = true;
    setImg(null);
    if (banner.image) mediaURL(banner.image).then((u) => alive && setImg(u));
    return () => { alive = false; };
  }, [banner.image]);

  const LEGACY_FLAT = new Set(["gold", "summer", "green", "sky", "rose", "night"]);
  const chosen = banner.bg && !LEGACY_FLAT.has(banner.bg) && BG_PRESETS[banner.bg] ? banner.bg : null;
  const bgKey = chosen || rotatingArt(banner.id || banner.title);
  const style = img
    ? { backgroundImage: `url(${img})` }
    : { background: BG_PRESETS[bgKey] || BG_PRESETS.art_sunset };

  return (
    <div className={"slide banner-slide fade" + (img ? " has-img" : "")} style={style}>
      <div className="banner-text">
        <h2>{banner.title}</h2>
        {banner.subtitle && <p>{banner.subtitle}</p>}
      </div>
    </div>
  );
}

function WelcomeSlide({ name }) {
  return (
    <div className="slide welcome-slide fade">
      <BuildingArt className="welcome-art" />
      <h2>ברוכים הבאים לדיירי {name}</h2>
      <div className="welcome-city">הוד השרון</div>
      <OliveDivider className="welcome-divider" />
      <p>הוועד מאחל לכם יום נעים ומוצלח</p>
    </div>
  );
}


function HolidaySlide({ text }) {
  return (
    <div className="slide holiday-slide fade">
      <div className="holiday-glow" />
      <h2>{text}</h2>
      <p>מכל דיירי הבניין</p>
    </div>
  );
}

function VaadSlide() {
  const now = new Date();
  const monthName = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][now.getMonth()];
  return (
    <div className="slide vaad-slide fade" style={{ background: BG_PRESETS.vaad }}>
      <div className="vaad-text">
        <div className="vaad-eyebrow">תזכורת · סוף חודש {monthName}</div>
        <h2>תשלום דמי ועד הבית</h2>
        <p>נשמח שתסדירו את התשלום החודשי — תודה על שיתוף הפעולה!</p>
      </div>
    </div>
  );
}

function WeekendSlide({ isSaturday }) {
  return (
    <div className="slide weekend-slide fade">
      <div className="weekend-glow" />
      <div className="weekend-candles" aria-hidden="true">🕯️ 🕯️</div>
      <h2>שבת שלום</h2>
      <p>{isSaturday ? "סוף שבוע נעים ומרגיע לכל דיירי הבניין" : "לכולנו — סוף שבוע מהנה ושבת שלום"}</p>
      <OliveDivider className="weekend-divider" />
    </div>
  );
}

function EventsSlide({ events }) {
  // דפדוף אוטומטי — כל האירועים מוצגים, 6 בכל עמוד
  const PAGE = 6;
  const pages = Math.max(1, Math.ceil(events.length / PAGE));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), 7000);
    return () => clearInterval(t);
  }, [pages]);
  const shown = events.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE);

  return (
    <div className="slide events-slide fade">
      <div className="slide-eyebrow">אלומה · הוד השרון</div>
      <h3>אירועי השבוע</h3>
      <div className="ev-grid fade" key={page}>
        {shown.map((e, i) => (
          <div className="ev-card" key={i}>
            <div className="ev-band" style={{ background: CATEGORY_BG[e.category] || CATEGORY_BG.default }}>
              <CategoryIcon category={e.category} className="ev-icon" />
              <span className="ev-cat">{e.category}</span>
            </div>
            <div className="ev-body">
              <CategoryIcon category={e.category} className="ev-body-icon" />
              <div className="ev-title">{e.title}</div>
              <div className="ev-meta">{formatEventTime(e.date)}</div>
              <div className="ev-loc">{e.location}</div>
            </div>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="cal-pages">
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={"dot small" + (i === page % pages ? " on" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}

const YEAR_TYPE = {
  chag: { label: "חג", cls: "chag" },
  tzom: { label: "צום", cls: "tzom" },
  memorial: { label: "יום זיכרון", cls: "memorial" },
};

function CalendarSlide({ items = [] }) {
  const PAGE = 8;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), 7000);
    return () => clearInterval(t);
  }, [pages]);

  const shown = items.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE);
  return (
    <div className="slide calendar-slide fade">
      <div className="slide-eyebrow">לוח השנה העברי · החודש הקרוב</div>
      <h3>חגים, מועדים וצומות</h3>
      <div className="cal-grid fade" key={page}>
        {shown.map((e, i) => (
          <div className={"cal-card " + YEAR_TYPE[e.type].cls} key={i}>
            <div className="cal-badge">{YEAR_TYPE[e.type].label}</div>
            <div className="cal-name">{e.name}</div>
            <div className="cal-dates">
              <span className="cal-heb">{e.heb}</span>
              <span className="cal-greg">יום {e.dow} · {e.greg}</span>
            </div>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="cal-pages">
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={"dot small" + (i === page % pages ? " on" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── עמודת המידע ───

function ClockCard({ now, shabbat }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="card clock-card">
      <div className="clock">
        <span>{hh}</span><span className="colon">:</span><span>{mm}</span>
      </div>
      <div className="hebdate">{hebrewDate(now)}</div>
      <div className="gregdate">{gregDateHe(now)}</div>
      {shabbat && !shabbat.active && (
        <div className="shabbat-times">
          🕯 הדלקת נרות {shabbat.candles} · הבדלה {shabbat.havdalah}
        </div>
      )}
    </div>
  );
}

function WeatherCard({ weather }) {
  if (!weather) return null;
  const dayName = (iso) => ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"][new Date(iso).getDay()];
  return (
    <div className="card wx-card">
      <div className="wx-now">
        <span className="wx-icon">{weatherIcon(weather.current.code)}</span>
        <span className="wx-temp">{weather.current.temp}°</span>
        <span className="wx-desc">{weather.current.desc}</span>
      </div>
      {(() => {
        const uv = weather.current.uv;
        const lvl = uvLevel(uv);
        if (!lvl) return null;
        return (
          <div className={"wx-uv " + lvl.cls}>
            <span className="uv-tag">UV</span>
            <span className="uv-val">{uv}</span>
            <span className="uv-label">{lvl.label}</span>
            <span className="uv-advice">{lvl.advice}</span>
          </div>
        );
      })()}
      {weather.days.length > 1 && (
        <div className="wx-forecast">
          {weather.days.slice(1, 4).map((d, i) => (
            <div className="wx-day" key={i}>
              <span>{dayName(d.date)}</span>
              <span className="wx-day-icon">{weatherIcon(d.code)}</span>
              <span>{d.max}°/{d.min}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsCard({ anns }) {
  const PAGE = 3;
  const pages = Math.max(1, Math.ceil(anns.length / PAGE));
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (pages <= 1) { setPage(0); return; }
    const t = setInterval(() => setPage((p) => (p + 1) % pages), 9000);
    return () => clearInterval(t);
  }, [pages]);

  const shown = anns.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE);
  return (
    <div className="card anns-card">
      <div className="card-title">📌 הודעות לדיירים</div>
      {anns.length === 0 ? (
        <div className="anns-empty">אין הודעות חדשות</div>
      ) : (
        <div className="anns-list fade" key={page}>
          {shown.map((a) => (
            <div className={"ann" + (a.pinned ? " pinned" : "")} key={a.id}>
              <span className="ann-ico"><AnnouncementIcon category={a.category} className="ann-icon-svg" /></span>
              <div>
                <div className="ann-title">{a.title}</div>
                <div className="ann-body">{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="anns-pages">
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={"dot small" + (i === page % pages ? " on" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── טיקר תחתון ───

function Ticker({ lines, speed, now, name }) {
  const active = lines.filter((l) => l.active).sort((a, b) => (a.order || 0) - (b.order || 0));
  const text = active.map((l) => l.text).join("   ✦   ");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  if (!text) return null;
  return (
    <footer className="ticker">
      <div className="ticker-brand">{name} · {hh}:{mm}</div>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(10, speed)}s` }}>
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
    </footer>
  );
}

// טיקר מבזקי ynet — שורה נפרדת בתחתית המסך
function NewsTicker({ items, speed }) {
  const text = items.map((i) => i.title).join("   •   ");
  if (!text) return null;
  return (
    <footer className="news-ticker">
      <div className="news-brand">מבזקים · ynet</div>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(90, speed || 140)}s` }}>
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── מסכים מיוחדים ───

function UrgentScreen({ ann, now }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="fullscreen urgent" dir="rtl">
      <div className="urgent-badge">הודעה חשובה</div>
      <h1>{ann.title}</h1>
      <p>{ann.body}</p>
      <div className="urgent-clock">{hh}:{mm}</div>
    </div>
  );
}

function ShabbatScreen({ shabbat, name }) {
  return (
    <div className="fullscreen shabbat" dir="rtl">
      <ShabbatSceneArt className="shabbat-scene" />
      <div className="shabbat-content">
        <h1>שבת שלום</h1>
        <svg className="shabbat-orn" viewBox="0 0 320 24" aria-hidden="true">
          <line x1="10" y1="12" x2="132" y2="12" stroke="#b8934a" strokeWidth="2" opacity="0.8" />
          <rect x="152" y="4" width="16" height="16" transform="rotate(45 160 12)" fill="none" stroke="#b8934a" strokeWidth="2" />
          <line x1="188" y1="12" x2="310" y2="12" stroke="#b8934a" strokeWidth="2" opacity="0.8" />
        </svg>
        <p>לכל דיירי {name} ומשפחותיהם — שבת של מנוחה ושלווה</p>
        <div className="shabbat-times-row">
          <div className="sh-chip">
            <span className="sh-label">הדלקת נרות</span>
            <span className="sh-val">{shabbat.candles}</span>
          </div>
          <div className="sh-chip">
            <span className="sh-label">צאת השבת</span>
            <span className="sh-val">{shabbat.havdalah}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── נגן מוזיקת רקע ───
// דפדפנים חוסמים ניגון אוטומטי עם קול לפני מחוות משתמש; אם הניגון נחסם
// יוצג כפתור עדין להפעלה בנגיעה אחת (רלוונטי רק לטעינה הראשונה של המסך).

function MusicPlayer({ music, trackIdx, setTrackIdx, allowed = true }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState(null);
  const [ytApiFailed, setYtApiFailed] = useState(false);
  const [ytKey, setYtKey] = useState(0);
  const ytHostRef = useRef(null);
  const ytPlayerRef = useRef(null);

  const source = music.source || "youtube";
  const tracks = music.tracks || [];
  const hasYoutube = source === "youtube" && !!music.youtubeId;
  const hasUpload = source === "upload" && tracks.length > 0;
  const shouldPlay = allowed && music.enabled && (hasYoutube || hasUpload);
  const vol100 = () => Math.round(Math.min(1, Math.max(0, music.volume == null ? 0.4 : music.volume)) * 100);

  // ─── קבצים שהועלו ───
  useEffect(() => {
    let alive = true;
    if (!allowed || !hasUpload || !music.enabled) { setSrc(null); return; }
    const t = tracks[trackIdx % tracks.length];
    mediaURL(t.mediaId).then((u) => alive && setSrc(u));
    return () => { alive = false; };
  }, [allowed, hasUpload, music.enabled, trackIdx, tracks]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hasUpload) return;
    a.volume = Math.min(1, Math.max(0, music.volume == null ? 0.4 : music.volume));
    if (allowed && music.enabled && src) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }, [allowed, hasUpload, music.enabled, src, music.volume]);

  // ─── יוטיוב דרך IFrame Player API, עם נפילה חלקה ל-iframe רגיל ───
  useEffect(() => {
    if (!allowed || !hasYoutube || !music.enabled || ytApiFailed) return;
    let cancelled = false;

    // אם ה-API של יוטיוב לא נטען (רשת איטית/חסימה) — עוברים ל-embed פשוט
    const failTimer = setTimeout(() => {
      if (!cancelled && !ytPlayerRef.current) setYtApiFailed(true);
    }, 8000);

    function loadApi() {
      return new Promise((resolve) => {
        if (window.YT && window.YT.Player) { resolve(); return; }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
          if (typeof prev === "function") prev();
          resolve();
        };
        if (!document.getElementById("yt-iframe-api")) {
          const s = document.createElement("script");
          s.id = "yt-iframe-api";
          s.src = "https://www.youtube.com/iframe_api";
          s.onerror = () => { if (!cancelled) setYtApiFailed(true); };
          document.head.appendChild(s);
        }
      });
    }

    loadApi().then(() => {
      if (cancelled || !ytHostRef.current) return;
      const host = document.createElement("div");
      ytHostRef.current.appendChild(host);
      try {
        ytPlayerRef.current = new window.YT.Player(host, {
          videoId: music.youtubeId,
          playerVars: {
            autoplay: 1, loop: 1, playlist: music.youtubeId,
            controls: 0, disablekb: 1, modestbranding: 1,
            playsinline: 1, rel: 0, iv_load_policy: 3, fs: 0,
          },
          events: {
            onReady: (ev) => {
              try { ev.target.unMute(); } catch { /* ignore */ }
              try { ev.target.setVolume(vol100()); } catch { /* ignore */ }
              try { ev.target.playVideo(); } catch { /* ignore */ }
            },
            onStateChange: (ev) => {
              if (ev.data === 1) setPlaying(true);
              if (ev.data === 2) setPlaying(false);
              if (ev.data === 0) { try { ev.target.playVideo(); } catch { /* ignore */ } }
            },
            onError: () => setYtApiFailed(true),
          },
        });
      } catch { setYtApiFailed(true); }
    });

    return () => {
      cancelled = true;
      clearTimeout(failTimer);
      try { if (ytPlayerRef.current) ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
      if (ytHostRef.current) ytHostRef.current.innerHTML = "";
    };
  }, [allowed, hasYoutube, music.enabled, music.youtubeId, ytApiFailed]);

  useEffect(() => {
    const p = ytPlayerRef.current;
    if (p && typeof p.setVolume === "function") {
      try { p.setVolume(vol100()); } catch { /* ignore */ }
    }
  }, [music.volume]);

  const start = () => {
    const p = ytPlayerRef.current;
    if (p && typeof p.playVideo === "function") {
      try { p.unMute(); } catch { /* ignore */ }
      try { p.setVolume(vol100()); } catch { /* ignore */ }
      try { p.playVideo(); } catch { /* ignore */ }
      setPlaying(true);
      return;
    }
    if (hasYoutube) { setYtKey((k) => k + 1); setPlaying(true); return; }
    const a = audioRef.current;
    if (a) a.play().then(() => setPlaying(true)).catch(() => { /* ignore */ });
  };

  // מוזיקה סומנה כפעילה אך אין מקור מוגדר — חיווי במקום שקט בלי הסבר
  if (allowed && music.enabled && !hasYoutube && !hasUpload) {
    return <div className="music-chip warn">♪ מוזיקה מופעלת — לא הוגדר מקור בניהול</div>;
  }

  if (!shouldPlay) return null;

  const fallbackUrl =
    `https://www.youtube.com/embed/${music.youtubeId}` +
    `?autoplay=1&loop=1&playlist=${music.youtubeId}` +
    `&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&fs=0`;

  return (
    <>
      {hasYoutube && !ytApiFailed && <div className="yt-audio-frame" ref={ytHostRef} />}
      {hasYoutube && ytApiFailed && (
        <iframe
          key={ytKey}
          title="lobby-music"
          src={fallbackUrl}
          allow="autoplay; encrypted-media"
          className="yt-audio-frame"
        />
      )}
      {hasUpload && (
        <audio
          ref={audioRef}
          src={src || undefined}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setTrackIdx((i) => (i + 1) % tracks.length)}
        />
      )}
      {!playing && (
        <button className="music-unblock" onClick={start}>
          🎵 לחצו להפעלת המוזיקה
        </button>
      )}
    </>
  );
}

// ─── פאנל גרסאות ───

function VersionPanel({ onClose }) {
  return (
    <div className="verpanel" onClick={onClose}>
      <div className="verpanel-inner" onClick={(e) => e.stopPropagation()}>
        <div className="verpanel-head">
          <span>יומן גרסאות</span>
          <span className="verpanel-now">גרסה נוכחית · {VERSION}</span>
        </div>
        {CHANGELOG.map((c) => (
          <div className="verrow" key={c.version}>
            <div className="verrow-top">
              <b>v{c.version}</b>
              <span>{c.date}</span>
            </div>
            <ul>
              {c.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
