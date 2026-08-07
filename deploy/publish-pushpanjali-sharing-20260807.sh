#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/pushpanjali-ornamental-20260807-v7"
backup="$releases/pre-pushpanjali-ornamental-20260807-v7"
failed="$releases/failed-pushpanjali-ornamental-20260807-v7"
archive=/tmp/pushpanjali-ornamental-20260807-v7.tgz
site_smoke=saslucknow-pushpanjali-ornamental-site-smoke-v7
api_smoke=saslucknow-pushpanjali-ornamental-api-smoke-v7
cutover_started=0
services_stopped=0

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
  elif [[ "$services_stopped" == 1 ]]; then
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
grep -R -q 'CERTIFICATE NUMBER:' "$candidate/dist/client/assets"
grep -R -q 'pushpanjali-certificate-ornamental-bg.png' "$candidate/dist/client/assets"
grep -q 'countPushpanjaliOfferings' "$candidate/server/gallery-api.mjs"
grep -q 'UC02-' "$candidate/server/gallery-api.mjs"
[[ -f "$candidate/scripts/migrate-pushpanjali-certificate-numbers.mjs" ]]
[[ -s "$candidate/public/pushpanjali-certificate-ornamental-bg.png" ]]
[[ -s "$candidate/public/society-logo-transparent.png" ]]

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

sudo systemctl stop saslucknow-gallery.service
services_stopped=1
/usr/bin/node "$candidate/scripts/migrate-pushpanjali-certificate-numbers.mjs" /var/www/saslucknow/shared/pushpanjali-offerings >/tmp/saslucknow-pushpanjali-certificate-migration.json
grep -q '"counter":' /tmp/saslucknow-pushpanjali-certificate-migration.json

cutover_started=1
mv "$current" "$backup"
mv "$candidate" "$current"

sudo systemctl restart saslucknow-gallery.service
sudo systemctl restart saslucknow.service
services_stopped=0

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
printf '%s\n' 'pushpanjali-ornamental-live'
