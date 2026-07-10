import { useEffect, useState, useRef } from "react";
import { VERSION, CHANGELOG } from "./version";
import { gregDateHe, hebrewDate, dailyGreeting, todayHoliday } from "./lib/hebrew";
import { fetchAlumaEvents, eventsThisWeek, formatEventTime } from "./lib/events";
import { fetchWeather, weatherIcon, fetchNews } from "./lib/feeds";
import "./App.css";

const CYCLE = [
  { id: "home",     secs: 18 },
  { id: "events",   secs: 22 },
  { id: "greeting", secs: 10 },
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
  const [screenIdx, setScreenIdx] = useState(0);
  const [showVersion, setShowVersion] = useState(false);
  const [liveEvents, setLiveEvents] = useState(null);
  const [tickerItems, setTickerItems] = useState([]);
  const holiday = todayHoliday(now);

  useEffect(() => {
    fetchWeather().then(setWeather);
    const t = setInterval(() => fetchWeather().then(setWeather), 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () => fetchAlumaEvents().then(e => { if (e) setLiveEvents(e); });
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      const news = await fetchNews();
      const items = [
        ...news.local.map(n => ({ ...n, tag: "הוד השרון" })),
        ...news.israel.map(n => ({ ...n, tag: "ישראל" })),
      ];
      setTickerItems(items);
    };
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
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

  const current  = activeCycle[screenIdx % activeCycle.length];
  const events   = eventsThisWeek(now, liveEvents);
  const greeting = dailyGreeting(now, holiday);

  return (
    <div className="stage" dir="rtl">
      <div className="ambient" />
      <div className="frame">
        {current.id === "home"     && <HomeScreen now={now} weather={weather} greeting={greeting} />}
        {current.id === "events"   && <EventsScreen events={events} />}
        {current.id === "greeting" && <GreetingScreen text={holiday} />}
      </div>

      <div className="cyclebar">
        {activeCycle.map((s, i) => (
          <span key={s.id} className={"dot" + (i === screenIdx % activeCycle.length ? " on" : "")} />
        ))}
      </div>

      {tickerItems.length > 0 && <NewsTicker items={tickerItems} />}

      <button className="ver" onClick={() => setShowVersion((v) => !v)}>
        גרסה {VERSION}
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
                <div className="verrow-top"><b>v{c.version}</b><span>{c.date}</span></div>
                <ul>{c.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeScreen({ now, weather, greeting }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div className="screen home fade">
      <div className="home-greeting">{greeting}</div>
      <div className="home-clock">
        <span>{hh}</span><span className="colon">:</span><span>{mm}</span>
      </div>
      <div className="home-dates">
        <div className="hebdate">{hebrewDate(now)}</div>
        <div className="gregdate">{gregDateHe(now)}</div>
      </div>
      {weather && (
        <div className="home-weather">
          <div className="wx-now">
            <span className="wx-icon">{weatherIcon(weather.current.code)}</span>
            <span className="wx-temp">{weather.current.temp}&deg;</span>
            <span className="wx-desc">{weather.current.desc}</span>
          </div>
          {weather.days.length > 0 && (
            <div className="wx-forecast">
              {weather.days.slice(1, 4).map((d, i) => (
                <div className="wx-day" key={i}>
                  <span className="wx-day-name">
                    {["\u05d0\u05f3","\u05d1\u05f3","\u05d2\u05f3","\u05d3\u05f3","\u05d4\u05f3","\u05d5\u05f3","\u05e9\u05d1\u05ea"][d.date.getDay()]}
                  </span>
                  <span className="wx-day-icon">{weatherIcon(d.code)}</span>
                  <span className="wx-day-temp">{d.max}&deg; / {d.min}&deg;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventsScreen({ events }) {
  return (
    <div className="screen events fade">
      <div className="screen-eyebrow">אלומה · הוד השרון</div>
      <h2 className="screen-title">אירועי השבוע</h2>
      {events.length === 0 ? (
        <p className="empty">אין אירועים מתוזמנים לשבוע זה.</p>
      ) : (
        <div className="ev-grid">
          {events.slice(0, 6).map((e, i) => (
            <div className="ev-card" key={i}>
              <div className="ev-img" style={{ backgroundImage: `url(${e.image})` }}>
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
      )}
    </div>
  );
}

function GreetingScreen({ text }) {
  return (
    <div className="screen greeting fade">
      <div className="greeting-glow" />
      <h1 className="greeting-text">{text}</h1>
      <div className="greeting-sub">מכל דיירי הבניין</div>
    </div>
  );
}

function NewsTicker({ items }) {
  const all = [...items, ...items];
  return (
    <div className="ticker-wrap" dir="rtl">
      <div className="ticker-label">מבזקים</div>
      <div className="ticker-track">
        <div className="ticker-content">
          {all.map((item, i) => (
            <span className="ticker-item" key={i}>
              <span className="ticker-tag">{item.tag}</span>
              {item.title}
              <span className="ticker-sep">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
