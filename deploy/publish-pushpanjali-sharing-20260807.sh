#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/pushpanjali-sharing-20260807-v2"
backup="$releases/pre-pushpanjali-sharing-20260807-v2"
failed="$releases/failed-pushpanjali-sharing-20260807-v2"
archive=/tmp/pushpanjali-sharing-20260807-v2.tgz
site_smoke=saslucknow-pushpanjali-sharing-site-smoke-v2
api_smoke=saslucknow-pushpanjali-sharing-api-smoke-v2
cutover_started=0

stop_smoke() {
  sudo systemctl stop "$site_smoke.service" "$api_smoke.service" >/dev/null 2>&1 || true
  sudo systemctl reset-failed "$site_smoke.service" "$api_smoke.service" >/dev/null 2>&1 || true
  rm -rf /tmp/saslucknow-pushpanjali-sharing-smoke
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

grep -R -q 'certificates generated' "$candidate/dist/client/assets"
grep -R -q 'Share certificate on WhatsApp' "$candidate/dist/client/assets"
grep -q 'countPushpanjaliOfferings' "$candidate/server/gallery-api.mjs"

stop_smoke
mkdir -p /tmp/saslucknow-pushpanjali-sharing-smoke
sudo systemd-run \
  --unit="$site_smoke" \
  --property="User=ec2-user" \
  --property="Group=ec2-user" \
  --property="WorkingDirectory=$candidate" \
  --setenv=NODE_ENV=production \
  --setenv=PORT=3010 \
  /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null
sudo systemd-run \
  --unit="$api_smoke" \
  --property="User=ec2-user" \
  --property="Group=ec2-user" \
  --property="WorkingDirectory=$candidate" \
  --setenv=NODE_ENV=production \
  --setenv=PORT=3011 \
  --setenv=PUSHPANJALI_DIR=/tmp/saslucknow-pushpanjali-sharing-smoke \
  /usr/bin/node server/gallery-api.mjs >/dev/null

site_ready=0
api_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-pushpanjali-sharing-site.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3011/api/pushpanjali-offerings >/tmp/saslucknow-pushpanjali-sharing-api.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q 'Pushpanjali' /tmp/saslucknow-pushpanjali-sharing-site.html
grep -q '"count":0' /tmp/saslucknow-pushpanjali-sharing-api.json
stop_smoke

cutover_started=1
mv "$current" "$backup"
mv "$candidate" "$current"

sudo systemctl restart saslucknow-gallery.service
sudo systemctl restart saslucknow.service

site_ready=0
api_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-pushpanjali-sharing-live.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3001/api/pushpanjali-offerings >/tmp/saslucknow-pushpanjali-sharing-live-api.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q 'Pushpanjali' /tmp/saslucknow-pushpanjali-sharing-live.html
grep -q '"count":' /tmp/saslucknow-pushpanjali-sharing-live-api.json
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'pushpanjali-sharing-live'
