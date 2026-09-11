#!/usr/bin/env bash
set -Eeuo pipefail

: "${SOURCE_REF:?Set SOURCE_REF to the exact Git commit to deploy}"

releases=/var/www/saslucknow/releases
current="$releases/current"
old_release="$(readlink -f "$current")"
release_id="next-human-concept-${SOURCE_REF:0:7}-$(date -u +%Y%m%d%H%M%S)"
stage="/var/tmp/$release_id"
final="$releases/$release_id"
archive="/var/tmp/$release_id.tgz"
next_link="$releases/current.next"
smoke_unit="saslucknow-next-human-smoke-${SOURCE_REF:0:7}"
switched=0

stop_smoke() {
  sudo systemctl stop "$smoke_unit.service" >/dev/null 2>&1 || true
  sudo systemctl reset-failed "$smoke_unit.service" >/dev/null 2>&1 || true
}

page_contains() {
  local url="$1"
  local expected="$2"
  local body
  body="$(curl -fsS --max-time 5 "$url")"
  grep -Fq "$expected" <<<"$body"
}

rollback() {
  code=$?
  trap - ERR
  stop_smoke
  if [[ "$switched" == 1 && -d "$old_release" ]]; then
    sudo ln -sfn "$old_release" "$next_link"
    sudo mv -Tf "$next_link" "$current"
    sudo systemctl restart saslucknow-gallery.service saslucknow-participation.service saslucknow.service || true
  fi
  printf 'Deployment stopped safely (exit %s). Live release: %s\n' "$code" "$(readlink -f "$current" 2>/dev/null || true)" >&2
  exit "$code"
}
trap rollback ERR

[[ -d "$old_release" ]]
[[ -d "$old_release/node_modules" ]]
[[ ! -e "$stage" ]]
[[ ! -e "$final" ]]

curl -fsSL --retry 3 "https://github.com/XpressCure/saslucknow/archive/$SOURCE_REF.tar.gz" -o "$archive"
mkdir -p "$stage"
tar -xzf "$archive" --strip-components=1 -C "$stage"
[[ -f "$stage/package.json" ]]
ln -s "$old_release/node_modules" "$stage/node_modules"

cd "$stage"
NODE_OPTIONS=--max-old-space-size=768 /usr/bin/pnpm build
[[ -f "$stage/dist/server/index.js" ]]

stop_smoke
sudo systemd-run \
  --unit="$smoke_unit" \
  --property="User=ec2-user" \
  --property="Group=ec2-user" \
  --property="WorkingDirectory=$stage" \
  --setenv=NODE_ENV=production \
  --setenv=PORT=3010 \
  /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null

ready=0
for attempt in {1..30}; do
  if curl -fsS --max-time 5 "http://127.0.0.1:3010/" >/dev/null \
    && page_contains "http://127.0.0.1:3010/next-human" "Book Zero" \
    && page_contains "http://127.0.0.1:3010/next-human-quiz" "Next Human Quiz" \
    && page_contains "http://127.0.0.1:3010/member/next-human-books" "YOUR PRIVATE BOOKSHELF"; then
    ready=1
    break
  fi
  sleep 1
done
[[ "$ready" == 1 ]]
stop_smoke

mv "$stage" "$final"
[[ -f "$final/package.json" ]]
[[ -f "$final/dist/server/index.js" ]]
sudo ln -sfn "$old_release" "$releases/rollback"
sudo ln -sfn "$final" "$next_link"
[[ "$(readlink -f "$next_link")" == "$final" ]]
sudo mv -Tf "$next_link" "$current"
switched=1

sudo systemctl restart saslucknow-gallery.service saslucknow-participation.service saslucknow.service
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active saslucknow-participation.service)" == active ]]

live_ready=0
for attempt in {1..30}; do
  if page_contains "http://127.0.0.1:3000/next-human" "Book Zero" \
    && page_contains "http://127.0.0.1:3000/next-human-quiz" "Next Human Quiz" \
    && page_contains "http://127.0.0.1:3000/member/next-human-books" "YOUR PRIVATE BOOKSHELF"; then
    live_ready=1
    break
  fi
  sleep 1
done
[[ "$live_ready" == 1 ]]

switched=0
trap - ERR
rm -f "$archive"
printf 'LIVE_RELEASE=%s\nROLLBACK_RELEASE=%s\n' "$final" "$old_release"
