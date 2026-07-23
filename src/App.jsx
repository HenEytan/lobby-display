import { useEffect, useMemo, useRef, useState } from "react";
import { VERSION, CHANGELOG } from "./version";
import { gregDateHe, hebrewDate, dailyGreeting, todayHoliday, shabbatInfo, yearEvents, holidayBannerSchedule } from "./lib/hebrew";
import { eventsThisWeek, formatEventTime, CATEGORY_BG } from "./lib/events";
import { fetchWeather, weatherIcon } from "./lib/feeds";
import { fetchNews, NEWS_REFRESH_MS } from "./lib/news";
import { applyTheme } from "./lib/themes";
import { BuildingArt, OliveDivider, CategoryIcon, AnnouncementIcon, rotatingArt } from "./lib/artwork.jsx";
import {
  useLobbyData, activeBanners, activeAnnouncements, urgentAnnouncement,
  BG_PRESETS,
} from "./lib/store";
import { mediaURL } from "./lib/media";
import Admin from "./admin/Admin.jsx";
import "./App.css";

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

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
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
  const events = useMemo(() => eventsThisWeek(now), [now.getDate()]);
  const anns = activeAnnouncements(data.announcements, now);
  const urgent = urgentAnnouncement(data.announcements, now);

  // ─── מוזיקת רקע — מצב משותף כדי שגם שקופייה ייעודית תדע מה מתנגן ───
  const musicSource = data.music.source || "youtube";
  const musicTracks = data.music.tracks || [];
  const musicOn = data.music.enabled && (
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
  const slides = useMemo(() => {
    const regular = activeBanners(data.banners, now).map((b) => ({ type: "banner", key: b.id, banner: b }));
    const holidayNow = activeBanners(holidayBanners, now).map((b) => ({ type: "banner", key: b.id, banner: b }));
    const s = [...regular, ...holidayNow];
    if (settings.showEvents && events.length > 0) s.push({ type: "events", key: "events" });
    if (settings.showCalendar) s.push({ type: "calendar", key: "calendar" });
    if (holiday) s.push({ type: "holiday", key: "holiday" });
    if (musicOn) s.push({ type: "music", key: "music" });
    if (s.length === 0) s.push({ type: "welcome", key: "welcome" });
    return s;
  }, [data.rev, data.banners, holidayBanners, events, holiday, settings.showEvents, settings.showCalendar, musicOn, now.getDate()]);

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

  // ─── מצבים שתופסים את המסך המלא ───
  if (urgent) return <UrgentScreen ann={urgent} now={now} />;
  if (shabbat?.active) return <ShabbatScreen shabbat={shabbat} name={settings.buildingName} />;

  return (
    <div className="board" dir="rtl">
      {previewMode && (
        <div className="preview-bar">
          מצב תצוגה מקדימה — כך ייראה המסך לאחר פרסום
          <a href="#admin">חזרה לניהול</a>
        </div>
      )}

      <header className="board-head">
        <div className="head-welcome">
          <span className="head-hello">ברוכים הבאים</span>
          <span className="head-name">{settings.buildingName}</span>
          {settings.city && <span className="head-city">{settings.city}</span>}
        </div>
        <div className="head-greet">{dailyGreeting(now, holiday)}</div>
      </header>

      <div className="board-body">
        <main className="main-area">
          <MainSlide slide={slide} events={events} holiday={holiday} name={settings.buildingName} currentTrack={currentTrack} />
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

      {settings.showTicker && <Ticker lines={data.ticker} speed={settings.tickerSpeed} now={now} name={settings.buildingName} />}
      {settings.showNews && news.items.length > 0 && <NewsTicker items={news.items} speed={settings.newsSpeed} />}

      <MusicPlayer music={data.music} trackIdx={trackIdx} setTrackIdx={setTrackIdx} />

      {(() => {
        const tickerVh = (settings.showTicker ? 6 : 0) + (settings.showNews && news.items.length > 0 ? 6.2 : 0);
        const floatStyle = tickerVh > 0 ? { bottom: `calc(${tickerVh}vh + 10px)` } : undefined;
        return (
          <button className="ver" style={floatStyle} onClick={() => setShowVersion((v) => !v)}>גרסה {VERSION}</button>
        );
      })()}

      {showVersion && <VersionPanel onClose={() => setShowVersion(false)} />}
    </div>
  );
}

// ─── האזור הראשי ───

function MainSlide({ slide, events, holiday, name, currentTrack }) {
  if (slide.type === "banner") return <BannerSlide banner={slide.banner} />;
  if (slide.type === "events") return <EventsSlide events={events} />;
  if (slide.type === "calendar") return <CalendarSlide />;
  if (slide.type === "holiday") return <HolidaySlide text={holiday} />;
  if (slide.type === "music") return <MusicSlide track={currentTrack} />;
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

  const bgKey = banner.bg && (banner.bg.startsWith("art_") || banner.bg.startsWith("holiday_")) ? banner.bg : rotatingArt(banner.id || banner.title);
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

function MusicSlide({ track }) {
  return (
    <div className="slide music-slide fade">
      <div className="music-eq" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}
      </div>
      <div className="slide-eyebrow">מנגן כעת</div>
      <h2>{track ? track.name : "מוזיקת רקע"}</h2>
      <p>מוזיקת רקע נעימה ללובי הבניין</p>
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

function EventsSlide({ events }) {
  return (
    <div className="slide events-slide fade">
      <div className="slide-eyebrow">אלומה · הוד השרון</div>
      <h3>אירועי השבוע</h3>
      <div className="ev-grid">
        {events.slice(0, 6).map((e, i) => (
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
    </div>
  );
}

const YEAR_TYPE = {
  chag: { label: "חג", cls: "chag" },
  tzom: { label: "צום", cls: "tzom" },
  memorial: { label: "יום זיכרון", cls: "memorial" },
};

function CalendarSlide() {
  const items = useMemo(() => yearEvents(new Date()), []);
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
      <div className="slide-eyebrow">לוח השנה העברי · השנה הקרובה</div>
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
        <div className="ticker-track" style={{ animationDuration: `${Math.max(20, speed)}s` }}>
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
      <div className="shabbat-glow" />
      <div className="shabbat-candles">🕯🕯</div>
      <h1>שבת שלום</h1>
      <p>לכל דיירי {name} ומשפחותיהם</p>
      <div className="shabbat-meta">
        הדלקת נרות {shabbat.candles} · צאת השבת {shabbat.havdalah}
      </div>
    </div>
  );
}

// ─── נגן מוזיקת רקע ───
// דפדפנים חוסמים ניגון אוטומטי עם קול לפני מחוות משתמש; אם הניגון נחסם
// יוצג כפתור עדין להפעלה בנגיעה אחת (רלוונטי רק לטעינה הראשונה של המסך).

function MusicPlayer({ music, trackIdx, setTrackIdx }) {
  const audioRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [src, setSrc] = useState(null);
  const [ytKey, setYtKey] = useState(0);

  const source = music.source || "youtube";
  const tracks = music.tracks || [];
  const hasYoutube = source === "youtube" && !!music.youtubeId;
  const hasUpload = source === "upload" && tracks.length > 0;
  const shouldPlay = music.enabled && (hasYoutube || hasUpload);

  useEffect(() => {
    let alive = true;
    if (!hasUpload || !music.enabled) { setSrc(null); return; }
    const t = tracks[trackIdx % tracks.length];
    mediaURL(t.mediaId).then((u) => alive && setSrc(u));
    return () => { alive = false; };
  }, [hasUpload, music.enabled, trackIdx, tracks]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hasUpload) return;
    a.volume = Math.min(1, Math.max(0, music.volume ?? 0.4));
    if (music.enabled && src) {
      a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      a.pause();
    }
  }, [hasUpload, music.enabled, src, music.volume]);

  if (!shouldPlay) return null;

  if (hasYoutube) {
    const embedUrl =
      `https://www.youtube.com/embed/${music.youtubeId}` +
      `?autoplay=1&loop=1&playlist=${music.youtubeId}` +
      `&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&fs=0`;
    return (
      <>
        <iframe
          key={ytKey}
          title="lobby-music"
          src={embedUrl}
          allow="autoplay; encrypted-media"
          className="yt-audio-frame"
        />
        <button className="music-unblock" onClick={() => setYtKey((k) => k + 1)}>
          🎵 הפעל מוזיקה
        </button>
      </>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={src || undefined}
        onEnded={() => setTrackIdx((i) => (i + 1) % tracks.length)}
      />
      {blocked && (
        <button
          className="music-unblock"
          onClick={() => {
            const a = audioRef.current;
            if (a) a.play().then(() => setBlocked(false)).catch(() => {});
          }}
        >
          🎵 הפעל מוזיקה
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
