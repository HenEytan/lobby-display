import { useEffect, useState, useRef } from "react";
import { VERSION, CHANGELOG } from "./version";
import { gregDateHe, hebrewDate, dailyGreeting, todayHoliday } from "./lib/hebrew";
import { fetchEvents, eventsThisWeek, formatEventDay, formatEventDate } from "./lib/events";
import { fetchWeather, weatherIcon, fetchNews } from "./lib/feeds";
import "./App.css";

const CYCLE = [
  { id: "home", secs: 20 },
  { id: "events", secs: 24 },
  { id: "news", secs: 18 },
  { id: "greeting", secs: 12 },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function App() {
  const now = useClock();
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [screenIdx, setScreenIdx] = useState(0);
  const [showVersion, setShowVersion] = useState(false);
  const holiday = todayHoliday(now);

  useEffect(() => {
    fetchWeather().then(setWeather);
    fetchNews().then(setNews);
    fetchEvents().then(setAllEvents);

    const wt = setInterval(() => fetchWeather().then(setWeather), 30 * 60 * 1000);
    const nt = setInterval(() => fetchNews().then(setNews), 20 * 60 * 1000);
    const et = setInterval(() => fetchEvents().then(setAllEvents), 6 * 60 * 60 * 1000);
    return () => {
      clearInterval(wt);
      clearInterval(nt);
      clearInterval(et);
    };
  }, []);

  const activeCycle = CYCLE.filter((s) => s.id !== "greeting" || holiday);
  const idxRef = useRef(0);
  useEffect(() => {
    const current = activeCycle[idxRef.current % activeCycle.length];
    const t = setTimeout(() => {
      idxRef.current = (idxRef.current + 1) % activeCycle.length;
      setScreenIdx(idxRef.current);
    }, current.secs * 1000);
    return () => clearTimeout(t);
  }, [screenIdx, activeCycle.length]);

  const current = activeCycle[screenIdx % activeCycle.length];
  const events = eventsThisWeek(now, allEvents);
  const greeting = dailyGreeting(now, holiday);

  return (
    <div className="stage" dir="rtl">
      <div className="grain" />
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="topbar">
        <div className="topbar-brand">הוד השרון</div>
        <div className="topbar-time">
          {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </div>
      </header>

      <main className="frame">
        {current.id === "home" && (
          <HomeScreen now={now} weather={weather} greeting={greeting} />
        )}
        {current.id === "events" && <EventsScreen events={events} />}
        {current.id === "news" && <NewsScreen news={news} />}
        {current.id === "greeting" && <GreetingScreen text={holiday} />}
      </main>

      {news.length > 0 && (
        <div className="ticker">
          <div className="ticker-tag">מבזקים</div>
          <div className="ticker-viewport">
            <div className="ticker-track">
              {[...news, ...news].map((n, i) => (
                <span className="ticker-item" key={i}>
                  {n.title}
                  <span className="ticker-sep">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="cyclebar">
        {activeCycle.map((s, i) => (
          <span key={s.id} className={"dot" + (i === screenIdx % activeCycle.length ? " on" : "")} />
        ))}
      </div>

      <button className="ver" onClick={() => setShowVersion((v) => !v)}>
        {VERSION}
      </button>

      {showVersion && (
        <div className="verpanel" onClick={() => setShowVersion(false)}>
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
      )}
    </div>
  );
}

const DOW_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"];

function HomeScreen({ now, weather, greeting }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <section className="screen home fade">
      <div className="home-main">
        <div className="home-greeting">{greeting}</div>
        <div className="home-clock">
          <span>{hh}</span>
          <span className="colon">:</span>
          <span>{mm}</span>
          <span className="secs">{ss}</span>
        </div>
        <div className="home-dates">
          <div className="hebdate">{hebrewDate(now)}</div>
          <div className="gregdate">{gregDateHe(now)}</div>
        </div>
      </div>

      {weather && (
        <aside className="home-side">
          <div className="wx-now">
            <span className="wx-icon">{weatherIcon(weather.current.code)}</span>
            <div className="wx-now-text">
              <span className="wx-temp">{weather.current.temp}&deg;</span>
              <span className="wx-desc">{weather.current.desc}</span>
            </div>
          </div>
          {weather.days.length > 1 && (
            <div className="wx-forecast">
              {weather.days.slice(1, 5).map((d, i) => (
                <div className="wx-day" key={i}>
                  <span className="wx-day-name">{DOW_SHORT[new Date(d.date).getDay()]}</span>
                  <span className="wx-day-icon">{weatherIcon(d.code)}</span>
                  <span className="wx-day-temp">
                    {d.max}&deg;<i>{d.min}&deg;</i>
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </section>
  );
}

function EventsScreen({ events }) {
  return (
    <section className="screen events fade">
      <div className="screen-head">
        <div>
          <div className="screen-eyebrow">אלומה · הוד השרון</div>
          <h2 className="screen-title">אירועי השבוע</h2>
        </div>
        <div className="screen-count">{events.length}</div>
      </div>

      {events.length === 0 ? (
        <p className="empty">אין אירועים מתוזמנים לשבוע זה.</p>
      ) : (
        <div className="ev-list">
          {events.slice(0, 7).map((e, i) => (
            <article className="ev-row" key={i}>
              <div className="ev-date">
                <span className="ev-date-num">{formatEventDate(e.date)}</span>
                <span className="ev-date-day">{formatEventDay(e.date)}</span>
              </div>
              <span className="ev-line" />
              <div className="ev-body">
                <div className="ev-title">{e.title}</div>
                <div className="ev-loc">{e.location}</div>
              </div>
              <span className={"ev-cat cat-" + catClass(e.category)}>{e.category}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function catClass(c) {
  switch (c) {
    case "משפחות": return "fam";
    case "קולנוע": return "cine";
    case "ידע": return "know";
    case "מוזיקה": return "music";
    case "טבע": return "nature";
    default: return "culture";
  }
}

function NewsScreen({ news }) {
  return (
    <section className="screen news fade">
      <div className="screen-head">
        <div>
          <div className="screen-eyebrow">ynet · מבזקים</div>
          <h2 className="screen-title">חדשות</h2>
        </div>
      </div>

      {news.length === 0 ? (
        <p className="empty">אין כרגע מבזקים זמינים.</p>
      ) : (
        <div className="news-list">
          {news.slice(0, 6).map((n, i) => (
            <div className="news-item" key={i}>
              <span className="news-idx">{String(i + 1).padStart(2, "0")}</span>
              <div className="news-title">{n.title}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GreetingScreen({ text }) {
  return (
    <section className="screen greeting fade">
      <div className="greeting-glow" />
      <h1 className="greeting-text">{text}</h1>
      <div className="greeting-sub">מכל דיירי הבניין</div>
    </section>
  );
}
