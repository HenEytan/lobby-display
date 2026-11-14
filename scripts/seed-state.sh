#!/usr/bin/env bash
# Copy the screen state from Supabase (public.lobby_state, id = yesod9) into Redis (lobby_state:yesod9),
# verify it, and mark the seed as done so api/state.js never reads Supabase again.
#
# Idempotent: a rerun against an identical Redis value only re-verifies. A Redis value that differs
# (managers published after the seed) is never overwritten unless FORCE=1.
#
# Env (names only; values come from the shell, never from the repo):
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (or KV_REST_API_URL + KV_REST_API_TOKEN)
#   OUT_DIR  optional; where the backup files go (default: a new private temp dir). They hold the PIN.
#   FORCE=1  optional; overwrite a differing Redis value (the old one is kept in OUT_DIR first).
#
# Exit: 0 verified identical, 1 usage/env error, 2 no Supabase row, 3 Redis differs (no FORCE),
#       4 verification failed after the write.
set -euo pipefail

KEY='lobby_state:yesod9'
SEEDED_KEY='lobby_state_seeded:yesod9'

die() { echo "seed-state: $1" >&2; exit "${2:-1}"; }
for bin in curl jq shasum; do command -v "$bin" >/dev/null || die "$bin is required"; done

: "${SUPABASE_URL:?SUPABASE_URL is not set}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is not set}"
REDIS_URL="${UPSTASH_REDIS_REST_URL:-${KV_REST_API_URL:-}}"
REDIS_TOKEN="${UPSTASH_REDIS_REST_TOKEN:-${KV_REST_API_TOKEN:-}}"
[ -n "$REDIS_URL" ] && [ -n "$REDIS_TOKEN" ] || die "set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN"
REDIS_URL="${REDIS_URL%/}"

OUT_DIR="${OUT_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/lobby-seed.XXXXXX")}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
umask 077

# Secrets go to curl as a config on a file descriptor, so they never appear in argv (ps) or in output.
sb_get() {
  curl -sSf --config <(printf 'header = "apikey: %s"\nheader = "Authorization: Bearer %s"\n' \
    "$SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY") "$SUPABASE_URL/rest/v1/$1"
}
# $1: a file holding a JSON array command, e.g. ["GET","key"]. Prints the result field as JSON.
redis_cmd() {
  local out
  out="$(curl -sSf --config <(printf 'header = "Authorization: Bearer %s"\n' "$REDIS_TOKEN") \
    -H 'Content-Type: application/json' --data-binary "@$1" "$REDIS_URL")"
  if [ "$(jq -r 'has("error")' <<<"$out")" = "true" ]; then die "redis error: $(jq -r .error <<<"$out")"; fi
  jq -c '.result' <<<"$out"
}
redis_get() { jq -nc --arg k "$1" '["GET",$k]' >"$OUT_DIR/cmd.json"; redis_cmd "$OUT_DIR/cmd.json"; }
# The stored value is a JSON string; print it as canonical (sorted, compact) JSON, or nothing if unset.
canonical_redis_value() { redis_get "$KEY" | jq -r 'if . == null then empty else . end' | jq -cS . ; }

echo "seed-state: backup dir $OUT_DIR"

# 1. Dump the Supabase row.
sb_get "lobby_state?id=eq.yesod9&select=data,updated_at" >"$OUT_DIR/supabase.json"
[ "$(jq 'length' "$OUT_DIR/supabase.json")" -ge 1 ] || die "no Supabase row id=yesod9" 2
jq -cS '.[0] | {data, updated_at}' "$OUT_DIR/supabase.json" >"$OUT_DIR/source.canonical.json"
echo "seed-state: source updated_at $(jq -r .updated_at "$OUT_DIR/source.canonical.json"), keys $(jq -c '.data | keys' "$OUT_DIR/source.canonical.json")"

# 2. Compare with what Redis holds now.
canonical_redis_value >"$OUT_DIR/redis.before.canonical.json" || true
write=1
if [ -s "$OUT_DIR/redis.before.canonical.json" ]; then
  if diff -q "$OUT_DIR/source.canonical.json" "$OUT_DIR/redis.before.canonical.json" >/dev/null; then
    echo "seed-state: Redis already holds the same value"
    write=0
  elif [ "${FORCE:-0}" = "1" ]; then
    echo "seed-state: Redis differs (updated_at $(jq -r .updated_at "$OUT_DIR/redis.before.canonical.json")); FORCE=1, overwriting — old value kept in redis.before.canonical.json"
  else
    die "Redis differs from Supabase (Redis updated_at $(jq -r .updated_at "$OUT_DIR/redis.before.canonical.json")). Not overwriting; rerun with FORCE=1 to replace it" 3
  fi
fi

# 3. Write (the value is the JSON string api/state.js stores).
if [ "$write" = "1" ]; then
  jq -c --arg k "$KEY" '["SET", $k, (. | tojson)]' "$OUT_DIR/source.canonical.json" >"$OUT_DIR/cmd.json"
  [ "$(redis_cmd "$OUT_DIR/cmd.json")" = '"OK"' ] || die "SET did not return OK" 4
fi

# 4. Read back and verify: diff of sorted JSON, then sha256 of both canonical forms.
canonical_redis_value >"$OUT_DIR/redis.after.canonical.json"
diff "$OUT_DIR/source.canonical.json" "$OUT_DIR/redis.after.canonical.json" >/dev/null \
  || die "verification failed: Redis value differs from the Supabase row after the write" 4
src_sum="$(shasum -a 256 <"$OUT_DIR/source.canonical.json" | cut -d' ' -f1)"
dst_sum="$(shasum -a 256 <"$OUT_DIR/redis.after.canonical.json" | cut -d' ' -f1)"
[ "$src_sum" = "$dst_sum" ] || die "verification failed: checksum mismatch" 4

# 5. Mark the seed done, so the API never falls back to Supabase again.
jq -nc --arg k "$SEEDED_KEY" --arg v "seed-state.sh $(date -u +%FT%TZ)" '["SET",$k,$v]' >"$OUT_DIR/cmd.json"
[ "$(redis_cmd "$OUT_DIR/cmd.json")" = '"OK"' ] || die "marker SET did not return OK" 4
rm -f "$OUT_DIR/cmd.json"

echo "seed-state: IDENTICAL sha256=$src_sum"
