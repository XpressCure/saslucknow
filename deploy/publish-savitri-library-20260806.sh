#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/savitri-library-20260806-1e77c01"
backup="$releases/pre-savitri-library-20260806-v1"
failed="$releases/failed-savitri-library-20260806-v1"
archive=/tmp/savitri-library-1e77c01.tgz
smoke_unit=saslucknow-savitri-library-smoke-v2
cutover_started=0

stop_smoke() {
  sudo systemctl stop "$smoke_unit.service" >/dev/null 2>&1 || true
  sudo systemctl reset-failed "$smoke_unit.service" >/dev/null 2>&1 || true
}

rollback() {
  exit_code=$?
  trap - ERR
  stop_smoke
  if [[ "$cutover_started" == 1 ]]; then
    sudo systemctl stop saslucknow.service saslucknow-gallery.service || true
    if [[ -d "$current" && ! -e "$failed" ]]; then mv "$current" "$failed"; fi
    if [[ -d "$backup" && ! -e "$current" ]]; then mv "$backup" "$current"; fi
    sudo systemctl restart saslucknow-gallery.service saslucknow.service || true
  fi
  exit "$exit_code"
}
trap rollback ERR

[[ -f "$archive" ]]
[[ -d "$current" ]]
[[ ! -e "$backup" ]]
[[ ! -e "$failed" ]]

if [[ ! -d "$candidate" ]]; then
  cp -a "$current" "$candidate"
fi
tar -xzf "$archive" -C "$candidate"

[[ -f "$candidate/dist/server/index.js" ]]
[[ -f "$candidate/public/data/savitri-corpus.json" ]]
[[ $(wc -c < "$candidate/public/data/savitri-corpus.json") -gt 1000000 ]]

stop_smoke
sudo systemd-run \
  --unit="$smoke_unit" \
  --property="User=ec2-user" \
  --property="Group=ec2-user" \
  --property="WorkingDirectory=$candidate" \
  --setenv=NODE_ENV=production \
  --setenv=PORT=3010 \
  /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null

smoke_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-savitri-library-smoke.html; then
    smoke_ready=1
    break
  fi
  sleep 1
done
[[ "$smoke_ready" == 1 ]]

curl -fsS --max-time 35 'http://127.0.0.1:3010/api/library-search?query=divine%20life' >/tmp/saslucknow-library-smoke.json
grep -q 'Full-text result' /tmp/saslucknow-library-smoke.json

curl -fsS --max-time 20 \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Identify this line: All can be done if the god-touch is there"}]}' \
  http://127.0.0.1:3010/api/savitri-sakhi >/tmp/saslucknow-sakhi-smoke.json
grep -q '"verified":true' /tmp/saslucknow-sakhi-smoke.json
grep -q 'line 78' /tmp/saslucknow-sakhi-smoke.json
stop_smoke

cutover_started=1
mv "$current" "$backup"
mv "$candidate" "$current"

sudo systemctl restart saslucknow-gallery.service
sudo systemctl restart saslucknow.service

site_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-savitri-library-live.html; then
    site_ready=1
    break
  fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
grep -q 'Savitri Sakhi' /tmp/saslucknow-savitri-library-live.html
curl -fsS --max-time 5 http://127.0.0.1:3001/health | grep -q '"ok":true'
curl -fsS --max-time 35 'http://127.0.0.1:3000/api/library-search?query=divine%20life' | grep -q 'Full-text result'
curl -fsS --max-time 20 \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Identify this line: All can be done if the god-touch is there"}]}' \
  http://127.0.0.1:3000/api/savitri-sakhi | grep -q '"verified":true'
curl -fsS --max-time 5 -I http://127.0.0.1:3000/quiet-aspiration.wav | grep -q '200 OK'

[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'savitri-library-live'
