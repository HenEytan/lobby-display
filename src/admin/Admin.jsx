import { useEffect, useRef, useState } from "react";
import {
  readDraft, writeDraft, publishAll, discardDrafts, hasDrafts,
  useLobbyData, BG_PRESETS, newId,
} from "../lib/store";
import {
  putMedia, deleteMedia, mediaURL, compressImage, newMediaId,
  storageInfo, fmtBytes,
} from "../lib/media";
import { VERSION } from "../version";
import { THEMES, THEME_IDS, applyTheme } from "../lib/themes";
import "./admin.css";

// ═══════════════ כניסת מנהל (PIN) ═══════════════

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("lobby_admin") === "1");
  if (!authed) return <PinGate onOk={() => { sessionStorage.setItem("lobby_admin", "1"); setAuthed(true); }} />;
  return <AdminPanel onLogout={() => { sessionStorage.removeItem("lobby_admin"); setAuthed(false); }} />;
}

function PinGate({ onOk }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const check = () => {
    const settings = readDraft("settings");
    if (pin === String(settings.pin)) onOk();
    else { setErr(true); setPin(""); }
  };
  return (
    <div className="admin-root pin-screen" dir="rtl">
      <div className="pin-card">
        <div className="pin-logo">✦</div>
        <h1>כניסת מנהל</h1>
        <p>הזינו קוד PIN לניהול מסך הלובי</p>
        <input
          type="password" inputMode="numeric" autoFocus
          value={pin}
          onChange={(e) => { setPin(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="••••"
        />
        {err && <div className="pin-err">קוד שגוי — נסו שוב</div>}
        <button className="btn primary" onClick={check}>כניסה</button>
        <a className="pin-back" href="#">→ חזרה למסך</a>
      </div>
    </div>
  );
}

// ═══════════════ הפאנל ═══════════════

const TABS = [
  ["banners", "🖼 באנרים"],
  ["announcements", "📢 הודעות"],
  ["ticker", "📰 טיקר"],
  ["music", "🎵 מוזיקה"],
  ["settings", "🔧 הגדרות"],
];

function AdminPanel({ onLogout }) {
  const data = useLobbyData(true); // תמיד עובדים על טיוטות
  const [tab, setTab] = useState("banners");
  const [store, setStore] = useState(null);
  const dirty = hasDrafts();

  useEffect(() => {
    storageInfo().then(setStore);
  }, [data.rev]);

  return (
    <div className="admin-root" dir="rtl">
      <header className="admin-head">
        <div className="admin-brand">
          <span className="admin-logo">✦</span>
          <div>
            <b>ניהול מסך הלובי</b>
            <small>{data.settings.buildingName} · גרסה {VERSION}</small>
          </div>
        </div>
        <div className="admin-head-actions">
          {store && store.quota > 0 && (
            <div className="storage-meter" title="ניצול אחסון הדפדפן">
              <div className="storage-bar">
                <div style={{ width: `${Math.min(100, (store.usage / store.quota) * 100)}%` }} />
              </div>
              <span>{fmtBytes(store.usage)} / {fmtBytes(store.quota)}</span>
            </div>
          )}
          <a className="btn ghost" href="#preview">👁 תצוגה מקדימה</a>
          <a className="btn ghost" href="#">מסך חי</a>
          <button className="btn ghost" onClick={onLogout}>יציאה</button>
        </div>
      </header>

      <nav className="admin-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {tab === "banners" && <BannersTab data={data} />}
        {tab === "announcements" && <AnnouncementsTab data={data} />}
        {tab === "ticker" && <TickerTab data={data} />}
        {tab === "music" && <MusicTab data={data} />}
        {tab === "settings" && <SettingsTab data={data} />}
      </main>

      {dirty && (
        <div className="publish-bar">
          <span>יש שינויים שטרם פורסמו — המסך בלובי עדיין מציג את הגרסה הקודמת</span>
          <div>
            <button className="btn ghost" onClick={() => { if (confirm("לבטל את כל השינויים שלא פורסמו?")) discardDrafts(); }}>
              בטל שינויים
            </button>
            <button className="btn primary" onClick={publishAll}>🚀 פרסם שינויים</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ באנרים ═══════════════

function BannersTab({ data }) {
  const banners = [...data.banners].sort((a, b) => (a.order || 0) - (b.order || 0));
  const save = (list) => writeDraft("banners", list);

  const addBanner = () => {
    save([...banners, {
      id: newId("b"), title: "באנר חדש", subtitle: "", bg: "gold", image: null,
      start: "", end: "", active: true, order: banners.length + 1,
    }]);
  };

  const update = (id, patch) => save(banners.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = async (b) => {
    if (!confirm(`למחוק את הבאנר "${b.title}"?`)) return;
    if (b.image) await deleteMedia(b.image);
    save(banners.filter((x) => x.id !== b.id));
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= banners.length) return;
    const list = [...banners];
    [list[i], list[j]] = [list[j], list[i]];
    save(list.map((b, k) => ({ ...b, order: k + 1 })));
  };

  return (
    <section>
      <div className="sec-head">
        <div>
          <h2>באנרים — האזור הראשי</h2>
          <p>גררו תמונה או בחרו רקע, קבעו תזמון — והבאנר מסתובב באזור הראשי של המסך.</p>
        </div>
        <button className="btn primary" onClick={addBanner}>+ באנר חדש</button>
      </div>
      <div className="cards">
        {banners.map((b, i) => (
          <BannerCard key={b.id} banner={b} onChange={(p) => update(b.id, p)} onDelete={() => remove(b)}
            onUp={() => move(i, -1)} onDown={() => move(i, 1)} />
        ))}
        {banners.length === 0 && <div className="empty">אין באנרים — הוסיפו את הראשון</div>}
      </div>
    </section>
  );
}

function BannerCard({ banner, onChange, onDelete, onUp, onDown }) {
  const [img, setImg] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setImg(null);
    if (banner.image) mediaURL(banner.image).then((u) => alive && setImg(u));
    return () => { alive = false; };
  }, [banner.image]);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const blob = await compressImage(file);
      const id = newMediaId("img");
      await putMedia(id, blob);
      if (banner.image) await deleteMedia(banner.image);
      onChange({ image: id });
    } catch {
      alert("העלאת התמונה נכשלה — נסו קובץ אחר");
    }
  };

  const previewStyle = img
    ? { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: BG_PRESETS[banner.bg] || BG_PRESETS.gold };

  return (
    <div className={"item-card" + (banner.active ? "" : " off")}>
      <div
        className={"thumb" + (drag ? " drag" : "")}
        style={previewStyle}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        title="גררו תמונה לכאן או לחצו לבחירה"
      >
        {!img && <span className="thumb-hint">גררו תמונה<br />או לחצו</span>}
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      <div className="item-fields">
        <input className="f-title" value={banner.title} placeholder="כותרת"
          onChange={(e) => onChange({ title: e.target.value })} />
        <input value={banner.subtitle || ""} placeholder="כותרת משנה (לא חובה)"
          onChange={(e) => onChange({ subtitle: e.target.value })} />
        <div className="f-row">
          <label>רקע:
            <select value={banner.bg || "art_sunset"} onChange={(e) => onChange({ bg: e.target.value })}>
              <option value="art_sunset">🖼 שקיעה עירונית</option>
              <option value="art_garden">🖼 גינה פורחת</option>
              <option value="art_geometry">🖼 תבנית גיאומטרית</option>
              <option value="art_pool">🖼 קיץ ובריכה</option>
              <option value="art_clean">🖼 ניקיון ותחזוקה</option>
            </select>
          </label>
          {banner.image && (
            <button className="btn tiny ghost" onClick={async () => { await deleteMedia(banner.image); onChange({ image: null }); }}>
              הסר תמונה
            </button>
          )}
        </div>
        <div className="f-row">
          <label>מתאריך: <input type="date" value={banner.start || ""} onChange={(e) => onChange({ start: e.target.value })} /></label>
          <label>עד: <input type="date" value={banner.end || ""} onChange={(e) => onChange({ end: e.target.value })} /></label>
        </div>
      </div>

      <div className="item-actions">
        <label className="switch">
          <input type="checkbox" checked={banner.active} onChange={(e) => onChange({ active: e.target.checked })} />
          <span>פעיל</span>
        </label>
        <div className="order-btns">
          <button onClick={onUp} title="הקדם">▲</button>
          <button onClick={onDown} title="אחר">▼</button>
        </div>
        <button className="btn tiny danger" onClick={onDelete}>מחק</button>
      </div>
    </div>
  );
}

// ═══════════════ הודעות ═══════════════

const CATEGORIES = ["ועד", "תחזוקה", "קהילה", "חגיגי"];

function AnnouncementsTab({ data }) {
  const anns = data.announcements;
  const save = (list) => writeDraft("announcements", list);
  const add = () => save([{
    id: newId("a"), title: "הודעה חדשה", body: "", category: "ועד",
    pinned: false, urgent: false, start: "", end: "",
  }, ...anns]);
  const update = (id, patch) => save(anns.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (a) => confirm(`למחוק את ההודעה "${a.title}"?`) && save(anns.filter((x) => x.id !== a.id));

  return (
    <section>
      <div className="sec-head">
        <div>
          <h2>הודעות לדיירים</h2>
          <p>כותבים הודעה — וכבר על המסך. תזמון, נעיצה, והודעה דחופה שתופסת את המסך המלא.</p>
        </div>
        <button className="btn primary" onClick={add}>+ הודעה חדשה</button>
      </div>
      <div className="cards">
        {anns.map((a) => (
          <div className="item-card ann-card" key={a.id}>
            <div className="item-fields">
              <input className="f-title" value={a.title} placeholder="כותרת ההודעה"
                onChange={(e) => update(a.id, { title: e.target.value })} />
              <textarea rows={2} value={a.body} placeholder="תוכן ההודעה"
                onChange={(e) => update(a.id, { body: e.target.value })} />
              <div className="f-row">
                <label>קטגוריה:
                  <select value={a.category} onChange={(e) => update(a.id, { category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>מתאריך: <input type="date" value={a.start || ""} onChange={(e) => update(a.id, { start: e.target.value })} /></label>
                <label>עד: <input type="date" value={a.end || ""} onChange={(e) => update(a.id, { end: e.target.value })} /></label>
              </div>
            </div>
            <div className="item-actions">
              <label className="switch">
                <input type="checkbox" checked={a.pinned} onChange={(e) => update(a.id, { pinned: e.target.checked })} />
                <span>📌 נעוץ</span>
              </label>
              <label className="switch urgent-switch">
                <input type="checkbox" checked={a.urgent} onChange={(e) => update(a.id, { urgent: e.target.checked })} />
                <span>🚨 דחוף (מסך מלא)</span>
              </label>
              <button className="btn tiny danger" onClick={() => remove(a)}>מחק</button>
            </div>
          </div>
        ))}
        {anns.length === 0 && <div className="empty">אין הודעות</div>}
      </div>
    </section>
  );
}

// ═══════════════ טיקר ═══════════════

function TickerTab({ data }) {
  const lines = [...data.ticker].sort((a, b) => (a.order || 0) - (b.order || 0));
  const save = (list) => writeDraft("ticker", list);
  const add = () => save([...lines, { id: newId("t"), text: "", active: true, order: lines.length + 1 }]);
  const update = (id, patch) => save(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id) => save(lines.filter((l) => l.id !== id).map((l, i) => ({ ...l, order: i + 1 })));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= lines.length) return;
    const list = [...lines];
    [list[i], list[j]] = [list[j], list[i]];
    save(list.map((l, k) => ({ ...l, order: k + 1 })));
  };

  return (
    <section>
      <div className="sec-head">
        <div>
          <h2>טיקר תחתון</h2>
          <p>שורות טקסט שרצות ברצף בתחתית המסך. מהירות הגלילה — בלשונית ההגדרות.</p>
        </div>
        <button className="btn primary" onClick={add}>+ שורה חדשה</button>
      </div>
      <div className="cards">
        {lines.map((l, i) => (
          <div className="item-card ticker-row" key={l.id}>
            <input value={l.text} placeholder="טקסט לטיקר..."
              onChange={(e) => update(l.id, { text: e.target.value })} />
            <div className="item-actions">
              <label className="switch">
                <input type="checkbox" checked={l.active} onChange={(e) => update(l.id, { active: e.target.checked })} />
                <span>פעיל</span>
              </label>
              <div className="order-btns">
                <button onClick={() => move(i, -1)}>▲</button>
                <button onClick={() => move(i, 1)}>▼</button>
              </div>
              <button className="btn tiny danger" onClick={() => remove(l.id)}>מחק</button>
            </div>
          </div>
        ))}
        {lines.length === 0 && <div className="empty">אין שורות טיקר</div>}
      </div>
    </section>
  );
}

// ═══════════════ מוזיקה ═══════════════

function MusicTab({ data }) {
  const music = data.music;
  const save = (patch) => writeDraft("music", { ...music, ...patch });
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files) => {
    const audio = [...files].filter((f) => f.type.startsWith("audio/"));
    if (audio.length === 0) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of audio) {
        const id = newMediaId("aud");
        await putMedia(id, f);
        added.push({ id: newId("trk"), name: f.name.replace(/\.[^.]+$/, ""), mediaId: id });
      }
      save({ tracks: [...music.tracks, ...added] });
    } catch {
      alert("העלאת קובץ נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const removeTrack = async (t) => {
    if (!confirm(`להסיר את "${t.name}" מהפלייליסט?`)) return;
    await deleteMedia(t.mediaId);
    save({ tracks: music.tracks.filter((x) => x.id !== t.id) });
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= music.tracks.length) return;
    const list = [...music.tracks];
    [list[i], list[j]] = [list[j], list[i]];
    save({ tracks: list });
  };

  return (
    <section>
      <div className="sec-head">
        <div>
          <h2>מוזיקת רקע</h2>
          <p>העלו קבצי אודיו (MP3) לפלייליסט — מתנגן ברצף במסך הלובי, ללא שום שרת. הקבצים נשמרים על מכשיר המסך.</p>
        </div>
        <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "מעלה..." : "+ העלאת קבצים"}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="music-controls item-card">
        <label className="switch big">
          <input type="checkbox" checked={music.enabled} onChange={(e) => save({ enabled: e.target.checked })} />
          <span>{music.enabled ? "🎵 מוזיקה פעילה" : "🔇 מוזיקה כבויה"}</span>
        </label>
        <label className="vol">
          עוצמה
          <input type="range" min="0" max="1" step="0.05" value={music.volume}
            onChange={(e) => save({ volume: Number(e.target.value) })} />
          <b>{Math.round(music.volume * 100)}%</b>
        </label>
      </div>

      <div className="cards">
        {music.tracks.map((t, i) => (
          <div className="item-card ticker-row" key={t.id}>
            <span className="trk-name">🎵 {t.name}</span>
            <div className="item-actions">
              <div className="order-btns">
                <button onClick={() => move(i, -1)}>▲</button>
                <button onClick={() => move(i, 1)}>▼</button>
              </div>
              <button className="btn tiny danger" onClick={() => removeTrack(t)}>הסר</button>
            </div>
          </div>
        ))}
        {music.tracks.length === 0 && <div className="empty">הפלייליסט ריק — העלו קבצי אודיו</div>}
      </div>

      <p className="hint">
        💡 המוזיקה מכבדת את שעות הפעילות (נפסקת במצב לילה). בטעינה ראשונה של המסך ייתכן
        שהדפדפן ידרוש נגיעה אחת במסך להפעלת הקול — יופיע כפתור "הפעל מוזיקה".
      </p>
    </section>
  );
}

// ═══════════════ הגדרות ═══════════════

function SettingsTab({ data }) {
  const s = data.settings;
  const save = (patch) => writeDraft("settings", { ...s, ...patch });

  return (
    <section>
      <div className="sec-head">
        <div>
          <h2>הגדרות מסך</h2>
          <p>תצוגה, תזמונים, שעות פעילות וקוד הכניסה.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="item-card theme-card">
          <h3>🎨 ערכת צבע</h3>
          <p className="hint">בחרו ערכה שמתאימה לקיר ולתאורה בלובי. השינוי נכנס לתוקף בפרסום.</p>
          <div className="theme-grid">
            {THEME_IDS.map((id) => (
              <button
                key={id}
                className={"theme-swatch" + ((s.theme || "wood") === id ? " on" : "")}
                onClick={() => { save({ theme: id }); applyTheme(id); }}
                title={THEMES[id].desc}
              >
                <span className="sw-colors">
                  <i style={{ background: THEMES[id].vars["--bg"] }} />
                  <i style={{ background: THEMES[id].vars["--gold"] }} />
                  <i style={{ background: THEMES[id].vars["--ticker-bg"] }} />
                </span>
                <b>{THEMES[id].label}</b>
                <small>{THEMES[id].desc}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="item-card">
          <h3>כללי</h3>
          <label>שם הבניין
            <input value={s.buildingName} onChange={(e) => save({ buildingName: e.target.value })} />
          </label>
          <label>עיר (מוצגת בכותרת)
            <input value={s.city || ""} onChange={(e) => save({ city: e.target.value })} />
          </label>
          <label>זמן רוטציה של האזור הראשי (שניות)
            <input type="number" min="5" max="120" value={s.rotationSecs}
              onChange={(e) => save({ rotationSecs: Number(e.target.value) || 15 })} />
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.showEvents} onChange={(e) => save({ showEvents: e.target.checked })} />
            <span>הצגת אירועי אלומה ברוטציה</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.showCalendar !== false} onChange={(e) => save({ showCalendar: e.target.checked })} />
            <span>שקופית לוח חגים ומועדים לשנה הקרובה</span>
          </label>
        </div>

        <div className="item-card">
          <h3>טיקר</h3>
          <label className="switch">
            <input type="checkbox" checked={s.showTicker} onChange={(e) => save({ showTicker: e.target.checked })} />
            <span>הצגת טיקר תחתון</span>
          </label>
          <label>מהירות טיקר (שניות לסיבוב — נמוך = מהיר)
            <input type="number" min="10" max="180" value={s.tickerSpeed}
              onChange={(e) => save({ tickerSpeed: Number(e.target.value) || 45 })} />
          </label>
          <label className="switch">
            <input type="checkbox" checked={s.showNews !== false} onChange={(e) => save({ showNews: e.target.checked })} />
            <span>שורת מבזקי ynet בתחתית המסך</span>
          </label>
          <label>מהירות מבזקים (שניות לסיבוב)
            <input type="number" min="20" max="240" value={s.newsSpeed || 60}
              onChange={(e) => save({ newsSpeed: Number(e.target.value) || 60 })} />
          </label>
        </div>

        <div className="item-card">
          <h3>שעות פעילות</h3>
          <p className="hint">מחוץ לשעות אלו המסך עובר למצב לילה מעומעם והמוזיקה נפסקת.</p>
          <label>התחלה
            <input type="time" value={s.activeStart} onChange={(e) => save({ activeStart: e.target.value })} />
          </label>
          <label>סיום
            <input type="time" value={s.activeEnd} onChange={(e) => save({ activeEnd: e.target.value })} />
          </label>
        </div>

        <div className="item-card">
          <h3>אבטחה</h3>
          <label>קוד PIN לכניסת מנהל
            <input value={s.pin} onChange={(e) => save({ pin: e.target.value })} />
          </label>
          <p className="hint">שינוי הקוד נכנס לתוקף לאחר פרסום.</p>
        </div>
      </div>
    </section>
  );
}
