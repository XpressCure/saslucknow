#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/pushpanjali-counter-20260807-v10"
backup="$releases/pre-pushpanjali-counter-20260807-v10"
failed="$releases/failed-pushpanjali-counter-20260807-v10"
archive=/tmp/saslucknow-pushpanjali-counter-20260807-v10.tgz
site_smoke=saslucknow-pushpanjali-counter-site-smoke-v10
api_smoke=saslucknow-pushpanjali-counter-api-smoke-v10
cutover_started=0
services_stopped=0

stop_smoke() {
  sudo systemctl stop "$site_smoke.service" "$api_smoke.service" >/dev/null 2>&1 || true
  sudo systemctl reset-failed "$site_smoke.service" "$api_smoke.service" >/dev/null 2>&1 || true
  rm -rf /tmp/saslucknow-pushpanjali-layout-smoke
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
grep -R -q 'safe-area-inset-bottom' "$candidate/dist/client/assets"
grep -R -q 'society-logo-transparent.png' "$candidate/dist/client/assets"
grep -R -q 'Flower offered' "$candidate/dist/client/assets"
grep -R -q 'With gratitude,' "$candidate/dist/client/assets"
grep -R -q 'Being prepared' "$candidate/dist/client/assets"
grep -R -q 'object-position:30% 30%' "$candidate/dist/client/assets"
grep -R -q 'grid-area:1/3/4' "$candidate/dist/client/assets"
grep -R -q 'align-items:flex-end' "$candidate/dist/client/assets"
grep -R -q 'Sri Aurobindo Society Lucknow' "$candidate/dist/server"
grep -R -q 'application/ld+json' "$candidate/dist/server"
grep -R -q 'sitemap.xml' "$candidate/dist/server"
grep -q 'countPushpanjaliOfferings' "$candidate/server/gallery-api.mjs"
grep -q 'UC02-' "$candidate/server/gallery-api.mjs"
grep -q 'void emailPushpanjaliCertificate' "$candidate/server/gallery-api.mjs"
grep -q 'metadataStorageQueued' "$candidate/server/gallery-api.mjs"
[[ -f "$candidate/scripts/migrate-pushpanjali-certificate-numbers.mjs" ]]
[[ -s "$candidate/public/pushpanjali-certificate-ornamental-bg.png" ]]
[[ -s "$candidate/public/society-logo-transparent.png" ]]

stop_smoke
mkdir -p /tmp/saslucknow-pushpanjali-layout-smoke
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
  --setenv=PUSHPANJALI_DIR=/tmp/saslucknow-pushpanjali-layout-smoke \
  /usr/bin/node server/gallery-api.mjs >/dev/null

site_ready=0
api_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-seo-site.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3011/api/pushpanjali-offerings >/tmp/saslucknow-seo-api.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q 'Sri Aurobindo Society Lucknow | Meditation' /tmp/saslucknow-seo-site.html
grep -q 'application/ld+json' /tmp/saslucknow-seo-site.html
grep -q 'rel="canonical" href="https://www.saslucknow.in/' /tmp/saslucknow-seo-site.html
grep -q '"count":0' /tmp/saslucknow-seo-api.json
curl -fsS --max-time 4 http://127.0.0.1:3010/robots.txt >/tmp/saslucknow-seo-robots.txt
curl -fsS --max-time 4 http://127.0.0.1:3010/sitemap.xml >/tmp/saslucknow-seo-sitemap.xml
grep -q 'Sitemap: https://www.saslucknow.in/sitemap.xml' /tmp/saslucknow-seo-robots.txt
grep -q 'https://www.saslucknow.in/the-mother' /tmp/saslucknow-seo-sitemap.xml
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
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-seo-live.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3001/api/pushpanjali-offerings >/tmp/saslucknow-seo-live-api.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q 'Sri Aurobindo Society Lucknow | Meditation' /tmp/saslucknow-seo-live.html
grep -q 'application/ld+json' /tmp/saslucknow-seo-live.html
grep -q '"count":' /tmp/saslucknow-seo-live-api.json
curl -fsS --max-time 4 http://127.0.0.1:3000/robots.txt >/tmp/saslucknow-seo-live-robots.txt
curl -fsS --max-time 4 http://127.0.0.1:3000/sitemap.xml >/tmp/saslucknow-seo-live-sitemap.xml
grep -q 'Sitemap: https://www.saslucknow.in/sitemap.xml' /tmp/saslucknow-seo-live-robots.txt
grep -q 'https://www.saslucknow.in/sri-aurobindo/life-sketch' /tmp/saslucknow-seo-live-sitemap.xml
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'saslucknow-pushpanjali-layout-live'
