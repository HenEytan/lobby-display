import { useEffect, useMemo, useRef, useState } from "react";
import { VERSION, CHANGELOG } from "./version";
import { gregDateHe, hebrewDate, dailyGreeting, todayHoliday, shabbatInfo } from "./lib/hebrew";
import { eventsThisWeek, formatEventTime, CATEGORY_BG } from "./lib/events";
import { fetchWeather, weatherIcon } from "./lib/feeds";
import {
  useLobbyData, activeBanners, activeAnnouncements, urgentAnnouncement,
  isNightMode, BG_PRESETS,
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

// ═══════════════════════ תצוגת הלובי ═══════════════════════

function Display({ previewMode }) {
  const now = useClock();
  const data = useLobbyData(previewMode);
  const { settings } = data;

  const [weather, setWeather] = useState(null);
  useEffect(() => {
    fetchWeather().then(setWeather);
    const t = setInterval(() => fetchWeather().then(setWeather), 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const holiday = useMemo(() => todayHoliday(now), [now.getDate(), now.getMonth()]);
  const shabbat = useMemo(() => shabbatInfo(now), [Math.floor(now.getTime() / 60000)]);
  const events = useMemo(() => eventsThisWeek(now), [now.getDate()]);
  const anns = activeAnnouncements(data.announcements, now);
  const urgent = urgentAnnouncement(data.announcements, now);
  const night = isNightMode(settings, now);

  // ─── בניית שקופיות האזור הראשי ───
  const slides = useMemo(() => {
    const s = activeBanners(data.banners, now).map((b) => ({ type: "banner", key: b.id, banner: b }));
    if (settings.showEvents && events.length > 0) s.push({ type: "events", key: "events" });
    if (holiday) s.push({ type: "holiday", key: "holiday" });
    if (s.length === 0) s.push({ type: "welcome", key: "welcome" });
    return s;
  }, [data.rev, data.banners, events, holiday, settings.showEvents, now.getDate()]);

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
  if (night && !previewMode) return <NightScreen now={now} name={settings.buildingName} />;
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
        </div>
        <div className="head-greet">{dailyGreeting(now, holiday)}</div>
      </header>

      <div className="board-body">
        <main className="main-area">
          <MainSlide slide={slide} events={events} holiday={holiday} name={settings.buildingName} />
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

      <MusicPlayer music={data.music} night={night} />

      <button className="ver" onClick={() => setShowVersion((v) => !v)}>גרסה {VERSION}</button>
      <a className="admin-link" href="#admin">כניסת מנהל</a>

      {showVersion && <VersionPanel onClose={() => setShowVersion(false)} />}
    </div>
  );
}

// ─── האזור הראשי ───

function MainSlide({ slide, events, holiday, name }) {
  if (slide.type === "banner") return <BannerSlide banner={slide.banner} />;
  if (slide.type === "events") return <EventsSlide events={events} />;
  if (slide.type === "holiday") return <HolidaySlide text={holiday} />;
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

  const style = img
    ? { backgroundImage: `url(${img})` }
    : { background: BG_PRESETS[banner.bg] || BG_PRESETS.gold };

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
      <div className="welcome-mark">✦</div>
      <h2>ברוכים הבאים לבניין {name}</h2>
      <p>שיהיה לכם יום נעים</p>
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
              <span className="ev-cat">{e.category}</span>
            </div>
            <div className="ev-body">
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

const CAT_ICON = { "ועד": "🏛", "תחזוקה": "🔧", "קהילה": "🤝", "חגיגי": "🎉" };

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
              <span className="ann-ico">{CAT_ICON[a.category] || "📣"}</span>
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

// ─── מסכים מיוחדים ───

function NightScreen({ now, name }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="fullscreen night" dir="rtl">
      <div className="night-clock">{hh}<span className="colon">:</span>{mm}</div>
      <div className="night-name">{name}</div>
      <a className="admin-link dim" href="#admin">כניסת מנהל</a>
    </div>
  );
}

function UrgentScreen({ ann, now }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="fullscreen urgent" dir="rtl">
      <div className="urgent-badge">הודעה חשובה</div>
      <h1>{ann.title}</h1>
      <p>{ann.body}</p>
      <div className="urgent-clock">{hh}:{mm}</div>
      <a className="admin-link dim" href="#admin">כניסת מנהל</a>
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
      <a className="admin-link dim" href="#admin">כניסת מנהל</a>
    </div>
  );
}

// ─── נגן מוזיקת רקע ───
// דפדפנים חוסמים ניגון אוטומטי עם קול לפני מחוות משתמש; אם הניגון נחסם
// יוצג כפתור עדין להפעלה בנגיעה אחת (רלוונטי רק לטעינה הראשונה של המסך).

function MusicPlayer({ music, night }) {
  const audioRef = useRef(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [src, setSrc] = useState(null);

  const tracks = music.tracks || [];
  const shouldPlay = music.enabled && tracks.length > 0 && !night;

  useEffect(() => { setTrackIdx(0); }, [tracks.length]);

  useEffect(() => {
    let alive = true;
    if (!shouldPlay) { setSrc(null); return; }
    const t = tracks[trackIdx % tracks.length];
    mediaURL(t.mediaId).then((u) => alive && setSrc(u));
    return () => { alive = false; };
  }, [shouldPlay, trackIdx, tracks]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = Math.min(1, Math.max(0, music.volume ?? 0.4));
    if (shouldPlay && src) {
      a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      a.pause();
    }
  }, [shouldPlay, src, music.volume]);

  if (!shouldPlay) return null;
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
