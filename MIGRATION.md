# Migration: Vercel team "peaku" → Vercel Hobby team "hen-projects1"

The peaku team is blocked: `https://lobby-display-theta.vercel.app` answers `402 DEPLOYMENT_DISABLED`
for every path. The app moves to a new Vercel project in **hen-projects1**, built from the same GitHub
repo. Phase 1 (#13) prepared the move; this phase (v3.20.0) makes it lossless:

- **Media gets a server copy** (Vercel Blob, [`api/media.js`](api/media.js)). Until now uploaded images
  and MP3s lived only in the IndexedDB of the device that uploaded them.
- **Supabase is read once.** [`api/state.js`](api/state.js) copies the Supabase row into Redis on the
  first read and marks it done; [`scripts/seed-state.sh`](scripts/seed-state.sh) does the same copy by
  hand, with verification.
- **A one-time carry-over** ([`public/carry-over.js`](public/carry-over.js)) runs on the kiosk under
  the old origin and sends its media and its last-pulled state to the new host.

## Hosts

| | Host |
| - | - |
| Old (dead) | `https://lobby-display-theta.vercel.app` — 402 on every path. Kept in the code only as the CORS allow-list entry for the carry-over ([`api/_lib/state-store.js`](api/_lib/state-store.js)). |
| New | The production domain of the project `lobby-display` in `hen-projects1` (Vercel → project → Settings → Domains). Called **`NEW_HOST`** below. |

The code holds no hostname of its own: the browser calls relative `/api/*` paths, and the admin install
card builds the display URL from `window.location.origin`. Hen's decided hostnames under `upeak.io`
(coach, look, clothes, voucher, finance) do not include this app, so no custom domain is assumed. If
one is attached later (e.g. `lobby.upeak.io`), the media and state are server-side now, so changing
the kiosk's Start URL is the whole move.

## Secret names

Set on the new project for **Production** and **Preview**. Values are never in the repo.

| Name | Needed | Notes |
| ---- | ------ | ----- |
| `UPSTASH_REDIS_REST_URL` | Yes (or the `KV_*` pair) | Redis that holds `lobby_state:yesod9`. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes (or the `KV_*` pair) | Read-write token. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Alternative | Injected when the Upstash database is connected through the Vercel Marketplace. `UPSTASH_*` wins if both are set. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Injected when a Vercel Blob store is connected to the project. Create the store with **public** access: `api/media.js` writes with `access: "public"`. |
| `LOBBY_ADMIN_PIN` | Yes | Same value as on the old project. Only used while no PIN is stored in the state; after the seed, the stored PIN rules. |
| `SUPABASE_URL` | Until the seed has run | Supabase → Project Settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Until the seed has run | Secret key. Can be removed once `lobby_state_seeded:yesod9` exists in Redis. |
| `SUPABASE_ANON_KEY` | No — do not set | Legacy fallback; the table has no anon policies. |

`scripts/seed-state.sh` reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the Redis pair from the
shell it runs in.

## Sign-in methods

| Method | After the move | Same account |
| ------ | -------------- | ------------ |
| Admin PIN at `/#admin` (the only one) | Unchanged. The PIN is stored inside the state (`settings.pin`), checked server-side by [`checkPin`](api/_lib/state-store.js) for `/api/state` and `/api/media` writes, hidden from every GET. | The seed copies the stored PIN with the state, so the existing PIN works on the new host. `LOBBY_ADMIN_PIN` is the bootstrap if no PIN was ever stored. |

There are no user accounts: no Supabase Auth, no Google/Facebook/magic link/email+password
(`grep -ri "supabase.auth\|signIn\|oauth\|/auth/v1"` finds nothing in the code). The screen itself
needs no sign-in. The admin session lives in `sessionStorage`, per origin, so a manager enters the PIN
once on the new host.

## Data, and where it lives

| Data | Lives in | How it reaches the new host |
| ---- | -------- | --------------------------- |
| Screen state (settings, banners, notices, ticker, playlist), PIN included | Old Redis `lobby_state:yesod9` — credentials are Vercel "sensitive" on the blocked team, **unreadable** | Not directly. See the next two rows. |
| Same, as of the switch to Redis (#12, 2026-11-05) | Supabase `public.lobby_state`, row `id = 'yesod9'` | `scripts/seed-state.sh` (below), or the first `GET /api/state`. |
| Same, as of the kiosk's last pull before the block | Kiosk, old origin, `localStorage` `lobby_*` and `lobby_server_stamp` | The carry-over posts it to `/api/state`; it lands only if its stamp is newer than the server's. |
| Uploaded images and MP3s | Kiosk, old origin, IndexedDB `lobby-media`, store `files` (key = media id, value = Blob) | The carry-over uploads each one to `/api/media`. |
| Unpublished drafts, other `lobby_*` keys | Kiosk, old origin, `localStorage` | The carry-over stores them, PIN stripped, as the media item `carryover_kiosk_localstorage` (JSON) for a manual restore. |
| Media uploaded from a manager's own phone or laptop | That device, old origin | Cannot be carried over: the old origin no longer serves a page that device can open into. Only if the same device runs the carry-over the way the kiosk does (DevTools route below). Otherwise re-upload in `/#admin`. |

After the move every upload goes to the server as well, and a device that lacks a file locally
downloads it, so this table never has to be redone.

### What cannot be recovered without the old host

- **State published after the kiosk's last pull** that only the old Redis holds. In practice the kiosk
  pulled every 60 s, so this is at most the last minute before the block, unless the kiosk was off.
- If the kiosk's local data was cleared, or the carry-over cannot run on it: everything published
  between 2026-11-05 (the Supabase copy) and the block, and all uploaded media. Managers re-enter
  those in `/#admin`.

## Data migration commands (state)

Run from a shell with `bash`, `curl`, `jq` and `shasum`, before the new project serves the kiosk. The
values go into env vars in that shell only.

```bash
export SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…
export UPSTASH_REDIS_REST_URL=… UPSTASH_REDIS_REST_TOKEN=…   # the NEW Redis
export OUT_DIR=~/lobby-migration                              # outside the repo: the backup holds the PIN
./scripts/seed-state.sh
# → seed-state: IDENTICAL sha256=<64 hex>   (exit 0)
```

What it does, in order: dumps the Supabase row to `$OUT_DIR/supabase.json`; compares it with what Redis
holds; writes `lobby_state:yesod9` (the same `{data, updated_at}` JSON string `api/state.js` stores);
reads it back and checks **`diff` of the sorted JSON (`jq -S`)** and the **sha256** of both canonical
forms; sets `lobby_state_seeded:yesod9`, after which the API never reads Supabase again.

| Exit | Meaning |
| ---- | ------- |
| 0 | Verified identical (fresh seed, or a rerun that found the same value). |
| 2 | No Supabase row — nothing written. |
| 3 | Redis already holds a **different** value (published on the new host, or carried over). Nothing written: that value is newer. `FORCE=1` overwrites it, keeping the old one in `$OUT_DIR/redis.before.canonical.json`. |
| 4 | Verification failed after the write; the marker is not set. |

Rerunning is safe. Run it **before** the carry-over: the carry-over then replaces the seed only with a
newer kiosk state, and a rerun of the script afterwards exits 3 instead of undoing it.

Media has no server-side data to migrate: the Blob store is new and fills from the carry-over.

## Carry-over (on the kiosk)

The old page is dead, but a page served by the old host (even the 402 text) still runs with the old
**origin**, and only that origin can read the kiosk's old IndexedDB and localStorage. `carry-over.js`,
loaded into that page from `NEW_HOST`:

1. Verifies a PIN against `NEW_HOST/api/state` (`window.LOBBY_PIN` from the injection, else the PIN
   the kiosk kept locally). Without a verified PIN it stops and writes nothing.
2. Uploads the localStorage backup (`carryover_kiosk_localstorage`, PIN removed).
3. Uploads every IndexedDB `lobby-media` file the server does not hold yet (3 MB parts, then a commit
   that re-hashes the stored parts and checks the total size).
4. Posts the kiosk's last-pulled state with its `lobby_server_stamp`; `/api/state` takes it only when
   the stamp is newer than the server's `updated_at` (409 otherwise). The PIN is stripped first; the
   server keeps its own.
5. Shows each step on screen. All done → opens `NEW_HOST/` after 15 s. Anything failed → stays, so a
   reload retries; everything is idempotent. On `NEW_HOST` itself it does nothing.

`/api/state` and `/api/media` allow CORS from `https://lobby-display-theta.vercel.app` only, for this.

## The Fully Kiosk step

On the kiosk (Fully Kiosk Browser on the Android TV / MX box). Fully settings: swipe from the left
edge or the remote's menu key → Settings; the Fully settings password if one is set.

**With Fully PLUS** (Inject JavaScript is a PLUS feature):

1. **Advanced Web Settings → Inject JavaScript** — paste, with the two values filled in:

   ```js
   window.LOBBY_PIN='<admin PIN>';var s=document.createElement('script');s.src='https://<NEW_HOST>/carry-over.js';(document.head||document.documentElement).appendChild(s);
   ```

2. Leave the Start URL as is (the old address). Back out → menu → **Reload Start URL**. The screen
   lists each step; when it says it is done it opens the new address by itself.
3. **Web Content Settings → Start URL** → `https://<NEW_HOST>/`. Clear **Inject JavaScript**. Reload.

**Without PLUS:** the same snippet in a DevTools console. Fully → **Advanced Web Settings → Enable
Remote Debugging** (WebView contents debugging; the label may differ by Fully version), connect a
laptop with `adb connect <kiosk IP>`, open `chrome://inspect` in Chrome, **inspect** the old page,
paste the snippet into the console. Then step 3.

**If neither is possible:** step 3 alone. The screen comes back with the Supabase copy of the state
(2026-11-05); managers re-upload images/MP3s and re-enter later changes in `/#admin` — on any
device now, since media syncs.

Check once afterwards that **Launch on Boot**, **Keep Screen On**, **Fullscreen Mode** and
**Autoplay** are still on.

## Cutover order

1. Create the project in hen-projects1, connect an Upstash Redis database and a **public** Vercel
   Blob store, set the [secrets](#secret-names). Do not point the kiosk at it yet.
2. Run [`scripts/seed-state.sh`](#data-migration-commands-state); confirm `IDENTICAL`.
3. Redeploy production so it picks up the env; run the [verification checks](#verification-checks).
4. On the kiosk: [the Fully Kiosk step](#the-fully-kiosk-step).
5. Watch a full slide cycle (uploaded banner images and MP3s play), log in at `NEW_HOST/#admin` with
   the existing PIN.
6. Give the managers the new `/#admin` address.

## Verification checks

```bash
NEW=https://<NEW_HOST>
curl -sI "$NEW/"               | grep -i '^cache-control'   # no-store, must-revalidate
curl -sI "$NEW/index.html"     | grep -i '^cache-control'   # no-store, must-revalidate
curl -sI "$NEW/admin"          | head -1                    # 200 (SPA rewrite)
curl -s  "$NEW/carry-over.js"  | head -2                    # the script, not index.html
curl -s  "$NEW/api/state"      | jq '{ok, updatedAt, keys: (.data | keys), pinHidden: (.data.settings.pin == null)}'
#   ok: true, updatedAt = the seed's (or the carried-over) updated_at, pinHidden: true
curl -s  "$NEW/api/media"      | jq '{ok, n: (.ids | length)}'   # ok: true (n: 0 before the carry-over)
curl -s -X OPTIONS -H 'Origin: https://lobby-display-theta.vercel.app' -D - -o /dev/null "$NEW/api/media" \
  | grep -i '^access-control-allow-origin'                  # the theta origin
for f in weather ynet news aluma-events time; do
  printf '%-13s ' "$f"; curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$NEW/api/$f"
done                                                         # 200 application/json for each
```

After the carry-over: `curl -s "$NEW/api/media" | jq .ids` lists the kiosk's media ids, and each id
in `/api/state`'s `banners[].image` / `music.tracks[].mediaId` has a manifest at
`$NEW/api/media?id=<id>` (`size` and per-part `sha256`).

If `curl -sI "$NEW/"` returns 401 or a Vercel login page, turn off Deployment Protection for
production (Settings → Deployment Protection).

Locally: `npm ci && npm run lint && npm run build && npm test`.

## Rollback

Nothing old is modified: Supabase is only read, the old Redis and old project are unreachable anyway.
On the new side, `$OUT_DIR` holds the Supabase dump and any Redis value the script replaced
(`redis.before.canonical.json`; to put it back, `SET lobby_state:yesod9` to that file's contents in
the Upstash console). The carry-over only adds media and replaces the state with a newer one; its
backup item keeps the kiosk's raw localStorage. Reverting this PR's code keeps state working (Redis
as before) but stops media sync; the Blob store can stay.

## Decisions (made without Hen, 2026-11-14)

- **Vercel Blob over Redis for media**: MP3s run to several MB, a poor fit for a free Redis
  database's request and storage limits. Blob sits in the same Vercel account and is included in Hobby
  within its storage/transfer allowance; a handful of images and MP3s is far below it.
- **New dependency `@vercel/blob`** (server only; the browser code uses plain `fetch`). Its transitive
  `zod@4.1.11` has a high advisory (GHSA-mrhx-c7xc-m3w5); `package.json` overrides it to `^4.6.6`
  (`npm audit --omit=dev`: 0 vulnerabilities).
- **Parts through the function, not client uploads**: Vercel caps a function body at 4.5 MB; client
  uploads need `@vercel/blob/client` in the browser, which is not checked against the Chrome 61
  build target and cannot be used from the old-origin page. 3 MB parts work everywhere.
- **Public store, served through `/api/media`**: the images are on a lobby screen; the proxy avoids
  depending on Blob CORS headers and keeps the store host out of the client.
- **Server copies are not deleted when a draft drops a file**: the published state may still point at
  it. Orphans are small; `DELETE /api/media?id=…` (PIN) removes one by hand.
- **CORS allow-list is the one known old origin**, from the facts given; every write still needs the PIN.
- **No custom domain assumed** (see [Hosts](#hosts)).

## Needs Hen

1. **Vercel dashboard, hen-projects1, project `lobby-display`**: Storage → create a **Blob** store
   with **public** access and connect it (injects `BLOB_READ_WRITE_TOKEN`), and an Upstash Redis
   database if the orchestrator has not created them. Turn off Deployment Protection for production
   if the checks hit a login page.
2. **The admin PIN value** for `LOBBY_ADMIN_PIN` and for the Fully snippet (from the old project's
   records or Hen's password manager; the stored PIN is copied by the seed regardless).
3. **On site at the kiosk**: [the Fully Kiosk step](#the-fully-kiosk-step). Needs the Fully settings
   password if set; tells us whether the device has PLUS (else a laptop with `adb` for the DevTools
   route).
4. Optional: decide whether this app gets a custom hostname (e.g. `lobby.upeak.io`).
5. Update the published artifact in [`docs/artifacts.json`](docs/artifacts.json) ("Architecture &
   Review", a claude.ai artifact this session cannot edit) for media sync and the new host, and bump
   its `asOf`.
