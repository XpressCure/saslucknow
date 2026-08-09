#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/song-of-savitri-20260809-v1"
backup="$releases/pre-song-of-savitri-20260809-v1"
failed="$releases/failed-song-of-savitri-20260809-v1"
archive=/tmp/song-of-savitri-20260809-v1.tgz
http_conf=/etc/httpd/conf.d/saslucknow.conf
https_conf=/etc/httpd/conf.d/saslucknow-le-ssl.conf
site_smoke=saslucknow-savitri-site-smoke-v1
api_smoke=saslucknow-savitri-api-smoke-v1
cutover_started=0
configs_changed=0

stop_smoke() {
  sudo systemctl stop "$site_smoke.service" "$api_smoke.service" >/dev/null 2>&1 || true
  sudo systemctl reset-failed "$site_smoke.service" "$api_smoke.service" >/dev/null 2>&1 || true
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
  elif [[ -d "$candidate" && ! -e "$failed" ]]; then
    mv "$candidate" "$failed"
  fi
  if [[ "$configs_changed" == 1 ]]; then
    sudo cp -a "${http_conf}.pre-song-of-savitri" "$http_conf" || true
    sudo cp -a "${https_conf}.pre-song-of-savitri" "$https_conf" || true
    sudo systemctl reload httpd || true
  fi
  exit "$exit_code"
}
trap rollback ERR

[[ -f "$archive" ]]
[[ -d "$current" ]]
[[ ! -e "$candidate" ]]
[[ ! -e "$backup" ]]
[[ ! -e "$failed" ]]
[[ ! -e "${http_conf}.pre-song-of-savitri" ]]
[[ ! -e "${https_conf}.pre-song-of-savitri" ]]

cp -a "$current" "$candidate"
tar -xzf "$archive" -C "$candidate"
[[ -f "$candidate/dist/server/index.js" ]]
grep -R -q 'The Song of Savitri' "$candidate/dist"
grep -q '/api/savitri-video-submissions' "$candidate/server/gallery-api.mjs"
grep -q 'savitri-manifests' "$candidate/server/gallery-api.mjs"

stop_smoke
sudo systemd-run --unit="$site_smoke" --property="User=ec2-user" --property="Group=ec2-user" --property="WorkingDirectory=$candidate" --setenv=NODE_ENV=production --setenv=PORT=3010 /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null
sudo systemd-run --unit="$api_smoke" --property="User=ec2-user" --property="Group=ec2-user" --property="WorkingDirectory=$candidate" --setenv=NODE_ENV=production --setenv=PORT=3011 --setenv=UPLOAD_DIR=/tmp/saslucknow-savitri-smoke --setenv=PUSHPANJALI_DIR=/tmp/saslucknow-savitri-pushpanjali-smoke /usr/bin/node server/gallery-api.mjs >/dev/null

site_ready=0
api_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-savitri-site-smoke.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3011/api/savitri-videos >/tmp/saslucknow-savitri-api-smoke.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q 'The Song of Savitri' /tmp/saslucknow-savitri-site-smoke.html
grep -q '"items":\[\]' /tmp/saslucknow-savitri-api-smoke.json
stop_smoke

sudo cp -a "$http_conf" "${http_conf}.pre-song-of-savitri"
sudo cp -a "$https_conf" "${https_conf}.pre-song-of-savitri"
configs_changed=1
for config in "$http_conf" "$https_conf"; do
  if ! sudo grep -q 'ProxyPass /api/savitri-videos ' "$config"; then
    sudo sed -i '/ProxyPreserveHost On/a\    ProxyPass /api/savitri-video-media/ http://127.0.0.1:3001/api/savitri-video-media/\n    ProxyPassReverse /api/savitri-video-media/ http://127.0.0.1:3001/api/savitri-video-media/\n    ProxyPass /api/savitri-videos http://127.0.0.1:3001/api/savitri-videos\n    ProxyPassReverse /api/savitri-videos http://127.0.0.1:3001/api/savitri-videos\n    ProxyPass /api/savitri-video-submissions http://127.0.0.1:3001/api/savitri-video-submissions\n    ProxyPassReverse /api/savitri-video-submissions http://127.0.0.1:3001/api/savitri-video-submissions' "$config"
  fi
done
sudo apachectl configtest

cutover_started=1
sudo systemctl stop saslucknow.service saslucknow-gallery.service
mv "$current" "$backup"
mv "$candidate" "$current"
sudo systemctl restart saslucknow-gallery.service saslucknow.service
sudo systemctl reload httpd

site_ready=0
api_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-song-of-savitri-live.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3001/api/savitri-videos >/tmp/saslucknow-song-of-savitri-api-live.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q 'The Song of Savitri' /tmp/saslucknow-song-of-savitri-live.html
grep -q '"items":' /tmp/saslucknow-song-of-savitri-api-live.json
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
configs_changed=0
trap - ERR
printf '%s\n' 'saslucknow-song-of-savitri-live'
