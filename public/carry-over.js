/*
 * העברה חד-פעמית מהכתובת הישנה (lobby-display-theta.vercel.app) לכתובת החדשה.
 *
 * The old deployment answers 402, but the page it serves still runs with the old origin, and only
 * that origin can read what the kiosk kept there: the uploaded images and MP3s (IndexedDB
 * "lobby-media") and the last state it pulled (localStorage lobby_*, newer than the Supabase copy the
 * new server was seeded from). Fully Kiosk's "Inject JavaScript" (or a DevTools console) loads this
 * file into that page; it sends everything to the new host and then opens the new host.
 *
 * Idempotent: media the server already holds is skipped; the state lands only if it is newer than the
 * server's. Served as-is from public/ (not built), so it is written for the kiosk's old WebView.
 *
 * Optional globals, set before loading: LOBBY_PIN (when the kiosk does not know the PIN itself),
 * LOBBY_NEW_ORIGIN (when not loaded from the new host), LOBBY_CARRY_OVER_MANUAL (tests: do not run).
 */
(function () {
  "use strict";

  var PART_BYTES = 3 * 1024 * 1024; // same as src/lib/media.js
  var KEYS = ["settings", "banners", "announcements", "ticker", "music"]; // same as src/lib/store.js
  var BACKUP_ID = "carryover_kiosk_localstorage";
  var REDIRECT_MS = 15000;

  function newOrigin() {
    if (window.LOBBY_NEW_ORIGIN) return String(window.LOBBY_NEW_ORIGIN).replace(/\/$/, "");
    var s = document.currentScript && document.currentScript.src;
    return s ? new URL(s).origin : null;
  }

  function show(lines) {
    var el = document.getElementById("lobby-carry-over");
    if (!el) {
      el = document.createElement("pre");
      el.id = "lobby-carry-over";
      el.setAttribute("dir", "rtl");
      el.style.cssText = "position:fixed;top:0;right:0;bottom:0;left:0;margin:0;padding:4vh 4vw;background:#111;color:#eee;font:3vh/1.5 sans-serif;white-space:pre-wrap;z-index:2147483647";
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = lines.join("\n");
  }

  function parse(raw) {
    // A catch binding is required: optional catch binding needs Chrome 66, the kiosk WebView is older.
    // oxlint-disable-next-line no-unused-vars
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function withoutPin(settings) {
    if (!settings || typeof settings !== "object") return settings;
    var copy = {};
    for (var k in settings) if (k !== "pin") copy[k] = settings[k];
    return copy;
  }

  function api(base, path, opts) {
    return fetch(base + path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) { return { status: res.status, body: d }; });
    });
  }

  // The first PIN the new server accepts: the one injected for this run, else what the kiosk knew.
  function findPin(base, ls) {
    var candidates = [];
    function add(p) { if (p != null && p !== "" && candidates.indexOf(String(p)) < 0) candidates.push(String(p)); }
    add(window.LOBBY_PIN);
    var live = parse(ls.getItem("lobby_settings"));
    var draft = parse(ls.getItem("lobby_draft_settings"));
    add(live && live.pin);
    add(draft && draft.pin);
    var i = 0;
    function next() {
      if (i >= candidates.length) return Promise.resolve(null);
      var pin = candidates[i++];
      return api(base, "/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin, verify: true, data: {} }),
      }).then(function (r) { return r.body && r.body.verified ? pin : next(); });
    }
    return next();
  }

  function uploadBlob(base, id, blob, pin) {
    var parts = Math.max(1, Math.ceil(blob.size / PART_BYTES));
    var q = "/api/media?id=" + encodeURIComponent(id);
    var n = 0;
    function check(r) {
      if (r.status !== 200 || !r.body.ok) throw new Error(r.body.error || "HTTP " + r.status);
      return r;
    }
    function nextPart() {
      if (n >= parts) {
        return api(base, q + "&commit=1", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Lobby-Pin": pin },
          body: JSON.stringify({ type: blob.type || "application/octet-stream", size: blob.size, parts: parts }),
        }).then(check);
      }
      var part = n++;
      return api(base, q + "&part=" + part, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-Lobby-Pin": pin },
        body: blob.slice(part * PART_BYTES, (part + 1) * PART_BYTES),
      }).then(check).then(nextPart);
    }
    return nextPart();
  }

  // → [{ id, blob }] from the old origin's IndexedDB, or [] when the kiosk never stored media here.
  function readLocalMedia(idb) {
    return new Promise(function (resolve, reject) {
      var req = idb.open("lobby-media", 1);
      // No database yet: nothing was ever uploaded on this origin. Do not create one.
      req.onupgradeneeded = function () { req.transaction.abort(); };
      req.onerror = function () { resolve([]); };
      req.onsuccess = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("files")) { resolve([]); return; }
        var store = db.transaction("files", "readonly").objectStore("files");
        var keysReq = store.getAllKeys();
        keysReq.onerror = function () { reject(keysReq.error); };
        keysReq.onsuccess = function () {
          var keys = keysReq.result || [];
          var out = [];
          var i = 0;
          (function next() {
            if (i >= keys.length) { resolve(out); return; }
            var key = keys[i++];
            var t = db.transaction("files", "readonly").objectStore("files").get(key);
            t.onerror = function () { reject(t.error); };
            t.onsuccess = function () {
              if (t.result) out.push({ id: String(key), blob: t.result });
              next();
            };
          })();
        };
      };
    });
  }

  function run() {
    var base = newOrigin();
    var ls = window.localStorage;
    var log = ["העברת נתוני המסך לכתובת החדשה", "יעד: " + base, ""];
    var failed = 0;
    function say() { for (var a = 0; a < arguments.length; a++) log.push(arguments[a]); show(log); }
    // Fully injects on every page, the new host included once the kiosk lands there: nothing to do.
    if (base === location.origin) return Promise.resolve({ ok: true, skipped: true });
    show(log);
    if (!base) { say("✗ לא נמצאה כתובת יעד"); return Promise.resolve({ ok: false }); }

    var pin;
    return findPin(base, ls).then(function (p) {
      pin = p;
      if (!pin) throw new Error("PIN לא אומת מול השרת החדש — הוסיפו window.LOBBY_PIN לקוד ההזרקה");
      say("✓ PIN אומת");

      // 1. A copy of everything this origin kept in localStorage, minus the PIN, for manual restore.
      var dump = { origin: location.origin, at: new Date().toISOString(), localStorage: {} };
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k.indexOf("lobby_") !== 0) continue;
        var v = ls.getItem(k);
        if (/settings$/.test(k)) v = JSON.stringify(withoutPin(parse(v)));
        dump.localStorage[k] = v;
      }
      var json = new Blob([JSON.stringify(dump)], { type: "application/json" });
      return uploadBlob(base, BACKUP_ID, json, pin).then(function () {
        say("✓ גיבוי localStorage (" + Object.keys(dump.localStorage).length + " מפתחות)");
      });
    }).then(function () {
      // 2. Media the server does not hold yet.
      return Promise.all([readLocalMedia(window.indexedDB), api(base, "/api/media", {})]);
    }).then(function (both) {
      var local = both[0];
      var onServer = (both[1].body && both[1].body.ids) || [];
      if (!both[1].body || !both[1].body.ok) throw new Error("אחסון המדיה בשרת החדש אינו זמין: " + (both[1].body && both[1].body.error));
      say("מדיה במכשיר: " + local.length + ", כבר בשרת: " + local.filter(function (m) { return onServer.indexOf(m.id) >= 0; }).length);
      var i = 0;
      function next() {
        if (i >= local.length) return Promise.resolve();
        var m = local[i++];
        if (onServer.indexOf(m.id) >= 0) return next();
        return uploadBlob(base, m.id, m.blob, pin).then(function () {
          say("✓ " + m.id + " (" + Math.round(m.blob.size / 1024) + "KB)");
        }, function (e) {
          failed++;
          say("✗ " + m.id + ": " + e.message);
        }).then(next);
      }
      return next();
    }).then(function () {
      // 3. The last state this kiosk pulled, if newer than the server's.
      var stamp = ls.getItem("lobby_server_stamp");
      if (!stamp) { say("– אין חותמת סנכרון במכשיר; תוכן המסך נשאר כפי שבשרת"); return; }
      var data = {};
      for (var j = 0; j < KEYS.length; j++) {
        var val = parse(ls.getItem("lobby_" + KEYS[j]));
        if (val != null) data[KEYS[j]] = KEYS[j] === "settings" ? withoutPin(val) : val;
      }
      return api(base, "/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin, carryOver: { stamp: stamp }, data: data }),
      }).then(function (r) {
        if (r.status === 200 && r.body.ok) say("✓ תוכן המסך מהמכשיר (" + stamp + ") שוחזר לשרת");
        else if (r.status === 409) say("– השרת מחזיק תוכן חדש יותר (" + r.body.updatedAt + "); נשמר כפי שהוא");
        else { failed++; say("✗ תוכן המסך: " + (r.body.error || "HTTP " + r.status)); }
      });
    }).then(function () {
      if (failed) { say("", "✗ " + failed + " פריטים נכשלו — המסך נשאר כאן. טענו מחדש כדי לנסות שוב."); return { ok: false }; }
      say("", "✓ הסתיים. עוברים לכתובת החדשה בעוד " + REDIRECT_MS / 1000 + " שניות…");
      if (!window.LOBBY_CARRY_OVER_MANUAL) setTimeout(function () { location.replace(base + "/"); }, REDIRECT_MS);
      return { ok: true };
    }).catch(function (e) {
      say("", "✗ " + e.message);
      return { ok: false, error: e.message };
    });
  }

  window.lobbyCarryOver = run;
  if (!window.LOBBY_CARRY_OVER_MANUAL) run();
})();
