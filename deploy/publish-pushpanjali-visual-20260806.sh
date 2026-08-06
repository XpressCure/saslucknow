#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/pushpanjali-visual-20260806-c78bb43"
backup="$releases/pre-pushpanjali-visual-20260806-v1"
failed="$releases/failed-pushpanjali-visual-20260806-v1"
archive=/tmp/pushpanjali-visual-c78bb43.tgz
smoke_unit=saslucknow-pushpanjali-visual-smoke
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
[[ ! -e "$candidate" ]]
[[ ! -e "$backup" ]]
[[ ! -e "$failed" ]]

cp -a "$current" "$candidate"
tar -xzf "$archive" -C "$candidate"

for asset in \
  pushpanjali-sri-aurobindo.jpg \
  pushpanjali-divine-love-cutout.png \
  pushpanjali-integral-love-cutout.png \
  pushpanjali-supramental-power-cutout.png; do
  [[ -s "$candidate/public/$asset" ]]
done
grep -R -q 'pushpanjali-sri-aurobindo.jpg' "$candidate/dist/client/assets"
grep -R -q 'pushpanjali-divine-love-cutout.png' "$candidate/dist/client/assets"

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
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-pushpanjali-visual-smoke.html; then
    smoke_ready=1
    break
  fi
  sleep 1
done
[[ "$smoke_ready" == 1 ]]
grep -q 'Pushpanjali' /tmp/saslucknow-pushpanjali-visual-smoke.html
curl -fsS --max-time 5 -I http://127.0.0.1:3010/pushpanjali-sri-aurobindo.jpg | grep -q '200 OK'
curl -fsS --max-time 5 -I http://127.0.0.1:3010/pushpanjali-divine-love-cutout.png | grep -q '200 OK'
stop_smoke

cutover_started=1
mv "$current" "$backup"
mv "$candidate" "$current"

sudo systemctl restart saslucknow-gallery.service
sudo systemctl restart saslucknow.service

site_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-pushpanjali-visual-live.html; then
    site_ready=1
    break
  fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
grep -q 'Pushpanjali' /tmp/saslucknow-pushpanjali-visual-live.html
curl -fsS --max-time 5 -I http://127.0.0.1:3000/pushpanjali-sri-aurobindo.jpg | grep -q '200 OK'
curl -fsS --max-time 5 -I http://127.0.0.1:3000/pushpanjali-divine-love-cutout.png | grep -q '200 OK'
curl -fsS --max-time 5 http://127.0.0.1:3001/health | grep -q '"ok":true'

[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'pushpanjali-visual-live'
