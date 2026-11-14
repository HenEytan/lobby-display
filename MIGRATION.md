# Migration: Vercel team "peaku" → Vercel Hobby team "hen-projects1"

The peaku team is blocked: `https://lobby-display-theta.vercel.app` answers `402 DEPLOYMENT_DISABLED`
for every path. The app moves to a new Vercel project in **hen-projects1** (Hobby), built from the same
GitHub repo. Phase 1 (#13) prepared the move; #14 (v3.20.0) made media lossless; this phase (v3.21.0)
takes the screen state off Redis and Supabase:

- **Screen state lives in Vercel Blob**: one JSON document, `state/screen.json`, in the public Blob store
  that already holds the media ([`api/_lib/state-store.js`](api/_lib/state-store.js)). No Redis, no
  Supabase, no other service. hen-projects1 has no Redis, and creating one needs a dashboard terms click.
- **Redis and Supabase are optional legacy reads.** If their env is set and Blob holds no state yet,
  the first read copies the newer of the two into Blob, once. With none set, the screen starts from the
  app's defaults. [`scripts/seed-state.js`](scripts/seed-state.js) does the same copy by hand, with
  verification.
- **Media gets a server copy** (Vercel Blob, [`api/media.js`](api/media.js), since v3.20.0).
- **A one-time carry-over** ([`public/carry-over.js`](public/carry-over.js)) runs on the kiosk under
  the old origin and sends its media and its last-pulled state to the new host.

## Hosts

| | Host |
| - | - |
| Old (dead) | `https://lobby-display-theta.vercel.app` — 402 on every path. Kept in the code only as the CORS allow-list entry for the carry-over ([`api/_lib/state-store.js`](api/_lib/state-store.js)), which must run under that origin. |
| New | The production domain of the project `lobby-display` in `hen-projects1` (Vercel → project → Settings → Domains). Called **`NEW_HOST`** below. |

The code holds no hostname of its own: the browser calls relative `/api/*` paths, and the admin install
card builds the display URL from `window.location.origin`. Hen's decided hostnames under `upeak.io`
(coach, look, clothes, voucher, finance) do not include this app, so no custom domain is assumed. If
one is attached later (e.g. `lobby.upeak.io`), the media and state are server-side, so changing the
kiosk's Start URL is the whole move.

## Secret names

Set on the new project for **Production** and **Preview**. Values are never in the repo.

| Name | Needed | Notes |
| ---- | ------ | ----- |
| `BLOB_READ_WRITE_TOKEN` | **Yes** | Injected when the (public) Blob store is connected to the project. Holds the state and the media. Without it `/api/state` and `/api/media` answer `{ok: false, error: "… not configured"}` and the screen keeps its local data. |
| `LOBBY_ADMIN_PIN` | **Yes** | Same value as on the old project. Only used while no PIN is stored in the state; the first write it authorizes stores it, and from then on the stored PIN rules. Never logged or returned. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional, legacy | Read-only, for the one-time seed. Same for `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (wins if both are set). The old Redis on the blocked team is unreadable, so in practice: **leave unset**. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Optional, legacy | Read-only, for the one-time seed (row as of 2026-11-05). Set them if the Supabase project still answers; remove after the first `GET /api/state` (or the script) has seeded Blob. |
| `SUPABASE_ANON_KEY` | No — do not set | Legacy fallback when the service key is absent. |

A legacy store whose env is set but which fails to answer is an **error**, not an empty start: Blob is
not seeded and writes are refused until it answers or its env is removed. That keeps a passing outage
from looking like a fresh install. A URL without its key/token is ignored.

## Sign-in methods

| Method | After the move | Same account |
| ------ | -------------- | ------------ |
| Admin PIN at `/#admin` (the only one) | Unchanged. The PIN is stored inside the state (`settings.pin`), checked server-side by `checkPin` in [`api/_lib/state-store.js`](api/_lib/state-store.js) for `/api/state` and `/api/media` writes, hidden from every GET. | The seed copies the stored PIN with the state, and the carry-over never replaces it, so the existing PIN works on the new host. `LOBBY_ADMIN_PIN` is the bootstrap if no PIN was ever stored (empty start). |

There are no user accounts: no Supabase Auth, no Google/Facebook/magic link/email+password
(`grep -ri "supabase.auth\|signIn\|oauth\|/auth/v1"` finds nothing in the code). The screen itself
needs no sign-in. The admin session lives in `sessionStorage`, per origin, so a manager enters the PIN
once on the new host.

## Data, and where it lives

| Data | Lives in | How it reaches the new host |
| ---- | -------- | --------------------------- |
| Screen state (settings, banners, notices, ticker, playlist), PIN included | Old Redis `lobby_state:yesod9` on the blocked team — credentials are Vercel "sensitive" there, **unreadable** | Not directly. See the next two rows. |
| Same, as of the switch to Redis (#12, 2026-11-05) | Supabase `public.lobby_state`, row `id = 'yesod9'` | If Supabase still answers: `scripts/seed-state.js` (below), or the first `GET /api/state` with `SUPABASE_*` set. |
| Same, as of the kiosk's last pull before the block | Kiosk, old origin, `localStorage` `lobby_*` and `lobby_server_stamp` | The carry-over posts it to `/api/state`; it lands only if its stamp is newer than the server's (always, on an empty start). |
| Uploaded images and MP3s | Kiosk, old origin, IndexedDB `lobby-media`, store `files` (key = media id, value = Blob) | The carry-over uploads each one to `/api/media`. |
| Unpublished drafts, other `lobby_*` keys | Kiosk, old origin, `localStorage` | The carry-over stores them, PIN stripped, as the media item `carryover_kiosk_localstorage` (JSON) for a manual restore. |
| Media uploaded from a manager's own phone or laptop | That device, old origin | Cannot be carried over: the old origin no longer serves a page that device can open into. Only if the same device runs the carry-over the way the kiosk does (DevTools route below). Otherwise re-upload in `/#admin`. |

On the new host the state document is `state/screen.json` in Blob: `{ data, updated_at, seededFrom? }`,
with `data` exactly the shape the API always stored. An empty start is `{ data: null, updated_at: null,
seededFrom: "none" }`. It counts as "seeded", so the legacy stores are never read after it, and
`updated_at: null` lets the kiosk's carry-over land on it.

### What happens to the old state

- **Redis (old team): lost** unless the old host serves again. Nothing on the new side can read it.
  The new code would read it once if `KV_REST_API_*` pointing at it were set and it answered; it does not.
- **Supabase (2026-11-05 copy): recovered** if the project still answers and `SUPABASE_*` is set (or the
  script runs). Otherwise lost on the server side.
- **The kiosk's own copy** (last pull before the block) comes back through the carry-over from #14, which
  still applies unchanged. In practice the kiosk pulled every 60 s, so it is the newest copy there is,
  and it wins over the Supabase seed.
- **Lost without the old host:** state published after the kiosk's last pull (at most the last minute
  before the block, unless the kiosk was off). If the kiosk's local data was cleared or the carry-over
  cannot run: everything published since the Supabase copy (or all of it, if Supabase is gone too) and
  all uploaded media. Managers re-enter those in `/#admin`.

## Data migration commands (state)

Run from a shell with Node 20+ in the repo (`npm ci` first), before the new project serves the kiosk.
The values go into env vars in that shell only; the script prints names, timestamps and sha256 sums,
never a value.

```bash
export BLOB_READ_WRITE_TOKEN=…                                # the NEW project's Blob store
export SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…             # if Supabase still answers
# export KV_REST_API_URL=… KV_REST_API_TOKEN=…                # only if a readable legacy Redis exists
export OUT_DIR=~/lobby-migration                              # outside the repo: the dump holds the PIN
node scripts/seed-state.js
# → seed-state: IDENTICAL sha256=<64 hex>; keys 5: announcements sha256=…, banners sha256=…, …   (exit 0)
```

What it does, in order:

1. **Dump**: reads the legacy row (the newer of Redis and Supabase) into `$OUT_DIR/legacy.json` (dir 700,
   file 600) and prints its `updated_at`, key count and one sha256 per key.
2. **Compare**: reads `state/screen.json` from the store itself (not the CDN). An empty start counts as
   absent; an identical state skips the write; a differing one stops with exit 3.
3. **Load**: writes `{data, updated_at, seededFrom}` exactly as read: create-only if there is no
   document, else conditioned on the ETag just read.
4. **Verify**: reads it back from the store and compares the sha256 of the canonical (key-sorted)
   `{data, updated_at}` and the sha256 of each top-level key (`settings`, `banners`, `announcements`,
   `ticker`, `music`), which stand in for per-table checksums. The state is one row, so the row count is 1.

| Exit | Meaning |
| ---- | ------- |
| 0 | Verified identical (fresh seed, or a rerun that found the same state). |
| 1 | Env missing (`BLOB_READ_WRITE_TOKEN`, or no legacy store set) or an unexpected error. |
| 2 | No legacy row — nothing written. |
| 3 | Blob already holds a **different** state (published on the new host, or carried over). Nothing written: that state is newer. `FORCE=1` overwrites it, keeping the old one in `$OUT_DIR/blob.before.json`. |
| 4 | Verification failed after the write; the mismatching keys are named. |

Rerunning is safe. Run it **before** the carry-over: the carry-over then replaces the seed only with a
newer kiosk state, and a rerun of the script afterwards exits 3 instead of undoing it.

If neither legacy store is reachable, skip this step: the first `GET /api/state` writes the empty start.

Media has no server-side data to migrate: it fills from the carry-over.

## Concurrent admin writes

**Last writer wins, safely.** Every `POST /api/state` reads the document from the store itself (a
`head()` metadata call, then the blob URL with a version query, which misses the CDN cache) and writes
with `ifMatch: <that ETag>`. If another write landed in between, or the read came from a stale copy, the
ETag check fails and the request reads and writes again (up to 4 tries, 0.5 to 1.5 s apart), so the
later publish lands on top of the earlier one, never under it. The PIN merge and the carry-over stamp
check are re-evaluated on each try. If it still cannot land, the answer is `409 "state is being updated,
try again"` and nothing is written. Whole-document LWW is what the admin panel always had: it publishes
the full state.

## Blob on Hobby: why the display read is cached

Hobby includes 10,000 Blob **simple operations** a month. A read that misses the CDN cache is one, and
going over locks the store for 30 days, media included
([Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)). The display polls
`/api/state` every 60 s, about 43,000 times a month, so an uncached read per poll would lock the store
in about a week. So:

- **Display reads** (`GET /api/state`) read the blob through the CDN. The document is written with
  `cacheControlMaxAge: 3600`, so a cache miss happens at most hourly per CDN region plus once after each
  write. An overwrite reaches the CDN within 60 s
  ([Vercel Blob caching](https://vercel.com/docs/vercel-blob#caching)), so a publish shows on the screen
  within about 2 minutes (60 s propagation plus the 60 s poll).
- **Writes** read uncached (`head()` plus the version query): 2 simple ops plus 1 advanced op (the put)
  per publish. Hobby includes 2,000 advanced ops a month, shared with media uploads.
- A device that just published does not pull the previous state back while the CDN catches up
  ([`src/lib/syncStamp.js`](src/lib/syncStamp.js)).
- `/api/media` checks the PIN against the cached copy. It writes no state, and a PIN changed in the
  last minute is the only thing it could miss.

Watch it in Vercel → Observability → Blob for the first weeks. At the expected rates (one kiosk, a
few publishes a day) it stays well under both limits. Nothing here needs a paid plan.

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
   the stamp is newer than the server's `updated_at` (409 otherwise; an empty start has none, so it
   always lands). The PIN is stripped first; the server keeps its own.
5. Shows each step on screen. All done → opens `NEW_HOST/` after 15 s. Anything failed → stays, so a
   reload retries; everything is idempotent. On `NEW_HOST` itself it does nothing.

`/api/state` and `/api/media` allow CORS from `https://lobby-display-theta.vercel.app` only, for this.

On an empty start (no legacy store reachable) step 1 verifies against `LOBBY_ADMIN_PIN`, so inject
that value, which is the old PIN if Hen kept it the same.

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
(2026-11-05) if it was seeded, else with the app's defaults. Managers re-upload images/MP3s and
re-enter later changes in `/#admin`, on any device now, since state and media sync.

Check once afterwards that **Launch on Boot**, **Keep Screen On**, **Fullscreen Mode** and
**Autoplay** are still on.

## Cutover order

1. In hen-projects1, project `lobby-display`: the public Blob store is connected
   (`BLOB_READ_WRITE_TOKEN`). Set `LOBBY_ADMIN_PIN`, and `SUPABASE_*` only if Supabase still answers.
   Do not point the kiosk at it yet.
2. If Supabase answers: run [`node scripts/seed-state.js`](#data-migration-commands-state) and confirm
   `IDENTICAL`. Otherwise skip.
3. Redeploy production so it picks up the env; run the [verification checks](#verification-checks).
4. On the kiosk: [the Fully Kiosk step](#the-fully-kiosk-step).
5. Watch a full slide cycle (uploaded banner images and MP3s play), log in at `NEW_HOST/#admin` with
   the existing PIN, publish a small change, and see it on the screen within about 2 minutes.
6. Remove `SUPABASE_*` (and any `KV_*`/`UPSTASH_*`) from the project; they are never read again.
7. Give the managers the new `/#admin` address.

## Verification checks

```bash
NEW=https://<NEW_HOST>
curl -sI "$NEW/"               | grep -i '^cache-control'   # no-store, must-revalidate
curl -sI "$NEW/index.html"     | grep -i '^cache-control'   # no-store, must-revalidate
curl -sI "$NEW/admin"          | head -1                    # 200 (SPA rewrite)
curl -s  "$NEW/carry-over.js"  | head -2                    # the script, not index.html
curl -s  "$NEW/api/state"      | jq '{ok, updatedAt, keys: (.data // {} | keys), pinHidden: (.data.settings.pin == null)}'
#   ok: true; updatedAt = the seed's (or the carried-over) updated_at, or null on an empty start; pinHidden: true
curl -s  "$NEW/api/media"      | jq '{ok, n: (.ids | length)}'   # ok: true (n: 0 before the carry-over)
curl -s -X OPTIONS -H 'Origin: https://lobby-display-theta.vercel.app' -D - -o /dev/null "$NEW/api/media" \
  | grep -i '^access-control-allow-origin'                  # the theta origin
for f in weather ynet news aluma-events time; do
  printf '%-13s ' "$f"; curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "$NEW/api/$f"
done                                                         # 200 application/json for each
```

`{"ok":false,"error":"storage not configured"}` from `/api/state` means `BLOB_READ_WRITE_TOKEN` is
missing on the deployment. `ok: false` with a `legacy … read failed` error means a legacy env is set but
its store does not answer: remove that env and redeploy.

After the carry-over: `curl -s "$NEW/api/media" | jq .ids` lists the kiosk's media ids, and each id
in `/api/state`'s `banners[].image` / `music.tracks[].mediaId` has a manifest at
`$NEW/api/media?id=<id>` (`size` and per-part `sha256`).

If `curl -sI "$NEW/"` returns 401 or a Vercel login page, turn off Deployment Protection for
production (Settings → Deployment Protection).

Locally: `npm ci && npm run lint && npm run build && npm test`.

## Rollback

Nothing old is modified: Supabase and Redis are only read (`GET`), and the old project is unreachable
anyway. On the new side, `$OUT_DIR` holds the legacy dump and any Blob state the script replaced
(`blob.before.json`). To put one back, `FORCE=1` the script against it, or restore it from Vercel →
Storage → the Blob store. The carry-over only adds media and replaces the state with a newer one; its
backup item keeps the kiosk's raw localStorage. Reverting this PR brings back the Redis code, which
hen-projects1 has no database for, so roll forward instead.

## Decisions (made without Hen, 2026-11-14)

- **Blob, not Redis, for the state**: hen-projects1 has no Redis, and creating one needs a dashboard
  terms click. The Blob store is already connected and holds the media. One small JSON document is far
  below its storage allowance.
- **Concurrency: last writer wins, under an ETag check** ([above](#concurrent-admin-writes)). No
  `baseUpdatedAt` from the client: the admin panel publishes whole snapshots and the API contract stays
  as it was.
- **Display reads go through the CDN, not "no cache"** ([above](#blob-on-hobby-why-the-display-read-is-cached)):
  an uncached read per 60 s poll would exhaust the Hobby simple-operation allowance and lock the Blob
  store, media included, for 30 days. Writes are the reads that must be fresh, and they are.
- **The PIN stays in the document, as it did in Redis/Supabase.** The store is public, so anyone who
  knew the store's URL could read it. That URL never reaches a client: `/api/state` and `/api/media`
  proxy everything, and no response carries a blob URL. A private store would close this, but it means
  a new store (dashboard), and a 4-digit PIN gains nothing from hashing. Listed under Needs Hen as
  optional.
- **Empty start is written** (`data: null`), so the legacy stores are read once even when they are
  empty, and the display's poll hits a cached document instead of a miss.
- **Newer of Redis and Supabase** by `updated_at`, when both are set. Redis was seeded from Supabase,
  so it is never older unless something went wrong.
- **`scripts/seed-state.js` replaces `scripts/seed-state.sh`**: it targets Blob now, and reuses the
  API's own read/write code instead of re-implementing the Blob REST API in `curl`.
- Earlier, from #14: Blob for media, `@vercel/blob` with the `zod` override, parts through the function,
  public store proxied through `/api/media`, server copies not deleted when a draft drops a file, the
  CORS allow-list being the one known old origin, no custom domain assumed.

## Needs Hen

1. **The admin PIN value** for `LOBBY_ADMIN_PIN` (from the old project's records or Hen's password
   manager) and for the Fully snippet. If the state is seeded, the stored PIN is copied regardless.
2. **On site at the kiosk**: [the Fully Kiosk step](#the-fully-kiosk-step). Needs the Fully settings
   password if set; tells us whether the device has PLUS (else a laptop with `adb` for the DevTools
   route).
3. If the checks hit a login page: Vercel dashboard → project → Settings → Deployment Protection → off
   for production.
4. Optional: a custom hostname for this app (e.g. `lobby.upeak.io`), and whether to move the store to
   a **private** Blob store later (new store in the dashboard; the code change is `access: "private"`).
5. Update the published artifact in [`docs/artifacts.json`](docs/artifacts.json) ("Architecture &
   Review", a claude.ai artifact this session cannot edit) for Blob state, media sync and the new host,
   and bump its `asOf`.
