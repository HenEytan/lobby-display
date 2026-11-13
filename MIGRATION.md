# Migration: Vercel team "peaku" → personal Vercel account "hen"

The Vercel team **peaku** is blocked ("Account is blocked"), so the `lobby-display` project there can no
longer deploy. The app stays on Vercel; it moves to Hen's personal account **hen** as a new project
built from the same GitHub repo. Phase 1 (this PR) prepares the move; nothing is deployed, no data is
touched, no DNS changes.

The code needs no platform change: every browser call is a relative `/api/*` path, the admin
install card builds the display URL from `window.location.origin` (`src/admin/Admin.jsx`), and
`vercel.json` moves as-is. What this PR adds:

- [`vercel.config.test.js`](vercel.config.test.js): fails `npm test` if `vercel.json` loses
  `Cache-Control: no-store` on `/` or `/index.html` (the kiosk auto-update in
  [`src/lib/autoUpdate.js`](src/lib/autoUpdate.js) depends on it), the SPA rewrite starts swallowing
  `/api/*`, or the build output changes.
- [`.env.example`](.env.example): every env var name the code reads, no values.
- This file.

## Current setup (peaku)

| Piece | Where |
| ----- | ----- |
| Hosting | Vercel team `peaku`, project `lobby-display`, Git-connected to `github.com/HenEytan/lobby-display` (`main` → production). Production URL: whatever is in the kiosk's Fully Kiosk **Start URL** (most likely `https://lobby-display.vercel.app/`, not verified from here). |
| Build | `npm run build` → `dist/` (Vite, target `es2015`/`chrome61`/`safari11`) |
| Functions | `api/state.js`, `api/weather.js`, `api/ynet.js`, `api/news.js`, `api/aluma-events.js`, `api/time.js` (Node, auto-detected; no `export const config`) |
| Headers / routing | `vercel.json`: `no-store, must-revalidate` on `/` and `/index.html`; rewrite `/((?!api/).*)` → `/` |
| Screen state | `api/state.js`: Upstash Redis key `lobby_state:yesod9` when `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` is set (since #12); otherwise Supabase table `public.lobby_state`, row `id = 'yesod9'`. On the first read with Redis configured and the key missing, the Supabase row is copied into Redis; after that **Redis is the only copy that gets writes and Supabase goes stale.** |
| Device-local data | On each kiosk, per origin: `localStorage` `lobby_*` / `lobby_draft_*`, IndexedDB `lobby-media` (uploaded images and MP3s, **never synced to the server**) |

## Target setup (hen)

| Piece | Where |
| ----- | ----- |
| Hosting | Vercel personal account `hen`, new project `lobby-display`, imported from the same GitHub repo, production branch `main`, Framework preset **Vite** (or "Other" — `vercel.json` sets build command and output dir either way). Node version: project default. |
| Production URL | A new `*.vercel.app` hostname (`lobby-display.vercel.app` stays held by the peaku project while it exists, so the new project gets a different one, e.g. `lobby-display-hen.vercel.app`). **Recommended:** attach a custom domain Hen owns (e.g. `lobby.<domain>`), so a future move never touches the kiosk again. |
| Screen state | Upstash Redis key `lobby_state:yesod9` — see [Storage decision](#storage-decision). |
| Supabase | Left as is, untouched, as a cold backup of the pre-Redis state. Not wired to the new project unless Redis is not used. |

## Env vars

Only `api/state.js` reads env (`grep -rn process.env api src`). `weather`, `ynet`, `news`,
`aluma-events` and `time` need nothing. Set on the new project for **Production** and **Preview**.

| Name | Needed | Value comes from |
| ---- | ------ | ---------------- |
| `UPSTASH_REDIS_REST_URL` | Yes (or the `KV_*` pair) | Upstash console → database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (or the `KV_*` pair) | same place (the read-write token, not the read-only one) |
| `KV_REST_API_URL` | Alternative to the above | injected automatically when the Upstash database is connected through the Vercel Marketplace integration |
| `KV_REST_API_TOKEN` | Alternative to the above | same; `KV_REST_API_READ_ONLY_TOKEN` / `KV_URL` / `REDIS_URL` may also be injected and are unused |
| `LOBBY_ADMIN_PIN` | Recommended | Same value as on the peaku project. Only used while no PIN is stored in the state; with the state copied it is a safety net, not the live PIN. |
| `SUPABASE_URL` | Only if Redis is not used | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Only if Redis is not used | Supabase → Project Settings → API keys (secret / service_role) |
| `SUPABASE_ANON_KEY` | No — do not set | Legacy fallback; the table has no anon policies (`docs/supabase.sql`) |

If both `UPSTASH_*` and `KV_*` are set, `UPSTASH_*` wins.

## Storage decision

The state is one JSON value under one Redis key. Whichever database holds it, the move is: **copy the
key before the new project serves its first request.** Order matters: if the new project has
Supabase vars and an empty Redis, its first `GET /api/state` copies the stale Supabase row into Redis.

1. **Find out where the live state is.** In the peaku project's env vars (if the dashboard still
   opens), `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` present → Redis. Otherwise: if the old URL still
   serves, `curl -s https://<old-host>/api/state | jq .updatedAt` and compare with Supabase
   `select updated_at from public.lobby_state where id = 'yesod9';` — a newer value from the API means
   Redis is live.
2. **Who owns the Redis database?**
   - Created at console.upstash.com under Hen's own login → **keep it.** Put its URL/token on the new
     project; no data moves.
   - Created through the Vercel Marketplace inside peaku (env names `KV_REST_API_*`, database visible
     in Upstash only via "Open in Upstash" from Vercel) → its lifetime is tied to the blocked team.
     **Copy it** into a new database owned by `hen` (Marketplace integration in the new account, or
     directly on console.upstash.com), with the commands below.
3. **Redis never configured** → create a Redis database for `hen` anyway (free tier is ample) and seed
   it from Supabase (below), or, simpler but leaving the anon-key question open, run on Supabase
   alone with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Data migration commands

Run from a shell with `curl` and `jq`, **outside the repo** (the backup holds the admin PIN). Paste
the credentials into env vars in that shell; nothing is written to the repo.

```bash
mkdir -p ~/lobby-migration && cd ~/lobby-migration
export OLD_URL='<old Upstash REST URL>' OLD_TOKEN='<old token>'
export NEW_URL='<new Upstash REST URL>' NEW_TOKEN='<new read-write token>'
KEY='lobby_state:yesod9'

# 1. Back up the live value (from Redis).
curl -sf "$OLD_URL/get/$KEY" -H "Authorization: Bearer $OLD_TOKEN" > state.redis.json
jq -r '.result' state.redis.json | jq '{updated_at, keys: (.data | keys)}'   # sanity: non-null, keys like settings, banners…

# 2. Write it into the new database (SET overwrites; the value is the same JSON string).
jq -c --arg k "$KEY" '["SET", $k, .result]' state.redis.json \
  | curl -sf -X POST "$NEW_URL" -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" -d @-
# → {"result":"OK"}

# 3. Read it back and compare.
curl -sf "$NEW_URL/get/$KEY" -H "Authorization: Bearer $NEW_TOKEN" | jq -r '.result' | jq -S . > new.json
jq -r '.result' state.redis.json | jq -S . > old.json
diff old.json new.json && echo IDENTICAL
```

Seeding from Supabase instead (state never in Redis, or Redis lost):

```bash
export SUPABASE_URL='<url>' SB_KEY='<service_role key>'
curl -sf "$SUPABASE_URL/rest/v1/lobby_state?id=eq.yesod9&select=data,updated_at" \
  -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY" > state.supabase.json
jq '.[0] | {updated_at, keys: (.data | keys)}' state.supabase.json
jq -c --arg k "$KEY" '["SET", $k, (.[0] | tojson)]' state.supabase.json \
  | curl -sf -X POST "$NEW_URL" -H "Authorization: Bearer $NEW_TOKEN" -H "Content-Type: application/json" -d @-
```

Equivalent without curl: Supabase SQL editor `select data, updated_at from public.lobby_state where
id = 'yesod9';`, then in the Upstash console CLI `SET lobby_state:yesod9 '<{"data":…,"updated_at":"…"}>'`.

If neither the old Redis nor the old deployment is reachable, the newest surviving copy is the
Supabase row (state as of the Redis switch, #12); anything changed since is re-entered in `/#admin`.

## The kiosk screen URL

The URL changes (new `*.vercel.app` or a custom domain), and **browser storage is per origin**, so
on the new URL the display device starts with empty storage:

- Text content (settings, banners, notices, ticker, playlist, holidays toggle) comes back on its
  own: the screen pulls `/api/state` on load and every 60 s.
- **Uploaded images and MP3 files do not come back.** They live in IndexedDB `lobby-media` on the
  device and are not synced (`src/lib/store.js`). Before cutover, note which banners use an uploaded
  photo and which uploaded tracks are in the playlist, and have the files at hand; after cutover
  re-upload them **on the kiosk device itself** through `/#admin` (media uploaded elsewhere stays on
  that other device). YouTube background music and the built-in SVG artwork need nothing.
- The admin PIN is not stored locally on the new origin; the admin gate verifies it against the
  server, so the existing PIN keeps working.

What must be changed on the physical display (Fully Kiosk Browser on the Android TV / MX box):

1. Fully Kiosk → **Settings** (swipe from the left edge, or the remote's menu; enter the Fully
   settings password if one is set) → **Web Content Settings** → **Start URL** → the new production
   URL with a trailing `/` (e.g. `https://lobby-display-hen.vercel.app/`). No `#admin`.
   If Fully Remote Admin / Fully Cloud is enabled on the device, the same field can be changed there
   remotely.
2. Back out of settings → menu → **Reload Start URL** (or reboot the box).
3. Confirm **Launch on Boot**, **Keep Screen On**, **Fullscreen Mode** and **Autoplay** are still on
   (they are device settings and do not change, but check once).
4. Re-upload device-local media (above).
5. Update any bookmarks the building managers keep for `/#admin` and `/#preview`.

## Cutover steps (phase 2)

1. Hen does the [Needs Hen](#needs-hen) items 1–4 (new Vercel project, Redis, env vars) — **do not
   let the new project serve the kiosk yet.** Creating the project triggers a first production build;
   that is fine as long as no device points at it and the Redis key is copied before anyone opens
   `/api/state`. Safer: set env vars and copy data first, then click **Redeploy**.
2. Run the [data migration commands](#data-migration-commands); confirm `IDENTICAL`.
3. Redeploy production on the new project (Deployments → latest → Redeploy) so it picks up the env.
4. Run the [verification checks](#verification-checks) against the new URL.
5. Freeze edits: tell the managers not to publish from `/#admin` on the old URL from now on. If
   anything was published on the old URL after step 2, repeat step 2.
6. Change the kiosk Start URL and re-upload media ([above](#the-kiosk-screen-url)).
7. Watch the screen for a full slide cycle; open `/#admin` on the new URL and log in with the
   existing PIN.
8. After a week stable: update the published artifact in `docs/artifacts.json` (hosting/setup
   changed) and bump its `asOf`; decide on deleting the peaku project and the old Redis (phase 3,
   not part of this PR).

## Verification checks

```bash
NEW=https://<new-host>
curl -sI "$NEW/"            | grep -i '^cache-control'   # no-store, must-revalidate
curl -sI "$NEW/index.html"  | grep -i '^cache-control'   # no-store, must-revalidate
curl -sI "$NEW/admin"       | head -1                    # 200 (SPA rewrite)
curl -s  "$NEW/api/state"   | jq '{ok, updatedAt, keys: (.data | keys), pinHidden: (.data.settings.pin == null)}'
#   ok: true, updatedAt equal to the backup's updated_at, pinHidden: true
for f in weather ynet news aluma-events time; do
  printf '%-13s ' "$f"; curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$NEW/api/$f"
done                                                      # 200 application/json for each
```

- The response is the app, not a Vercel login page: if `curl -sI "$NEW/"` returns `401` or redirects
  to `vercel.com/login`, turn off Deployment Protection for production (Settings → Deployment
  Protection; "Standard Protection" protects previews only, which is fine).
- Admin login at `$NEW/#admin` with the existing PIN succeeds, and a publish (e.g. toggle a ticker
  line and back) shows up on the screen within a minute.
- Auto-update: after the next merge to `main`, the kiosk reloads on its own within ~4 minutes
  (version badge in the corner shows the new `VERSION`).
- Locally, before cutover: `npm ci && npm run lint && npm run build && npm test`.

## Rollback

Nothing on the old side is modified: the peaku project, its Redis database and the Supabase row
are only read.

- Kiosk: set Fully Kiosk Start URL back to the old URL (only useful while the old deployment still
  serves — a blocked team may stop serving at any time). The old origin's storage, media included,
  is still on the device.
- State: if managers published on the new URL and you roll back, copy the key the other way (swap
  `OLD_*` and `NEW_*` in the commands above) — only if the old Redis still accepts writes.
- Code: this PR only adds a test, `.env.example` and docs; reverting it changes no behavior.

## Needs Hen

In order:

1. **Log in to Vercel as `hen`** (personal account). Confirm the plan: Hobby is free but for
   non-commercial use only; a building's lobby screen is personal/non-commercial in spirit, otherwise
   Pro.
2. **Import the GitHub repo** `HenEytan/lobby-display` into `hen` (Add New → Project; grant the
   Vercel GitHub app access to the repo if asked). Project name `lobby-display`, preset Vite, root
   `./`, production branch `main`. Note the production URL it gets.
3. **Redis:** check in console.upstash.com (and in the peaku project's Storage tab, if it opens)
   who owns the database holding `lobby_state:yesod9`. Either keep it (Upstash-owned) or create a new
   one for `hen` (Vercel → Storage → Upstash for Redis, or console.upstash.com, region close to the
   functions, e.g. `eu-central-1`/Frankfurt). Get both old and new REST URL + read-write token.
4. **Env vars** on the new project (Production + Preview): the Redis pair and `LOBBY_ADMIN_PIN`
   (value from the old project, or from Hen's password manager). See [Env vars](#env-vars).
5. **Copy the state** with the [data migration commands](#data-migration-commands), then **Redeploy**
   production and run the [verification checks](#verification-checks).
6. Optional but recommended: **custom domain** — Settings → Domains on the new project, then add the
   DNS record the dashboard shows at the domain's registrar/DNS host. Use that as the kiosk URL.
7. **Ensure production is not behind Deployment Protection** (Settings → Deployment Protection).
8. **On-site at the building:** change the Fully Kiosk Start URL, reload, re-upload device-local
   images/MP3s through `/#admin` on the device ([details](#the-kiosk-screen-url)). Needs the Fully
   settings password if one is set.
9. Tell the building managers the new `/#admin` address.
10. Later (phase 3): once stable, decide about the peaku project, the old Redis database, and the
    Supabase project/table; update the published artifact in `docs/artifacts.json`.
