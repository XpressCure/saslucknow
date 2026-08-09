#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/song-of-life-palette-20260809-v6"
backup="$releases/pre-song-of-life-palette-20260809-v6"
failed="$releases/failed-song-of-life-palette-20260809-v6"
archive=/tmp/song-of-life-palette-20260809-v6.tgz
smoke_unit=saslucknow-song-of-life-palette-v6
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
    sudo systemctl stop saslucknow.service || true
    if [[ -d "$current" && ! -e "$failed" ]]; then mv "$current" "$failed"; fi
    if [[ -d "$backup" && ! -e "$current" ]]; then mv "$backup" "$current"; fi
    sudo systemctl restart saslucknow.service || true
  elif [[ -d "$candidate" && ! -e "$failed" ]]; then
    mv "$candidate" "$failed"
  fi
  exit "$exit_code"
}
trap rollback ERR

[[ -f "$archive" ]]
[[ -d "$current" ]]
[[ ! -e "$candidate" ]]
[[ ! -e "$backup" ]]
[[ ! -e "$failed" ]]

cp -a "$current" "$candidate"
rm -rf "$candidate/dist"
tar -xzf "$archive" -C "$candidate"
[[ -f "$candidate/dist/server/index.js" ]]
grep -R -q -- '--paper:#fff9ed' "$candidate/dist"
grep -R -q -- '--surface:#fffefa' "$candidate/dist"
grep -R -q -- 'width:145%;max-width:none' "$candidate/dist"
grep -q -- '--paper:#fff9ed' "$candidate/app/globals.css"
grep -q -- 'width:145%;max-width:none' "$candidate/app/globals.css"

stop_smoke
sudo systemd-run --unit="$smoke_unit" --property="User=ec2-user" --property="Group=ec2-user" --property="WorkingDirectory=$candidate" --setenv=NODE_ENV=production --setenv=PORT=3010 /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null

ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-palette-smoke.html; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
grep -q 'The Song of Life' /tmp/saslucknow-palette-smoke.html
stop_smoke

cutover_started=1
sudo systemctl stop saslucknow.service
mv "$current" "$backup"
mv "$candidate" "$current"
sudo systemctl restart saslucknow.service

ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-palette-live.html; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
grep -q 'The Song of Life' /tmp/saslucknow-palette-live.html
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'saslucknow-song-of-life-palette-live'
