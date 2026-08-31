#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
candidate="$releases/pushpanjali-20260806-dd408e6"
current="$releases/current"
backup="$releases/pre-pushpanjali-20260806-v1"
failed="$releases/failed-pushpanjali-20260806-v1"
http_conf=/etc/httpd/conf.d/saslucknow.conf
https_conf=/etc/httpd/conf.d/saslucknow-le-ssl.conf
gallery_service=/etc/systemd/system/saslucknow-gallery.service
cutover_started=0

rollback() {
  exit_code=$?
  trap - ERR
  if [[ "$cutover_started" == 1 ]]; then
    sudo systemctl stop saslucknow.service saslucknow-gallery.service || true
    if [[ -d "$current" && ! -e "$failed" ]]; then mv "$current" "$failed"; fi
    if [[ -d "$backup" && ! -e "$current" ]]; then mv "$backup" "$current"; fi
    sudo cp -a "${gallery_service}.pre-pushpanjali-20260806" "$gallery_service" || true
    sudo cp -a "${http_conf}.pre-pushpanjali-20260806" "$http_conf" || true
    sudo cp -a "${https_conf}.pre-pushpanjali-20260806" "$https_conf" || true
    sudo systemctl daemon-reload || true
    sudo systemctl restart saslucknow.service saslucknow-gallery.service || true
    sudo systemctl reload httpd || true
  fi
  exit "$exit_code"
}
trap rollback ERR

[[ -d "$candidate" ]]
[[ -f "$candidate/dist/server/index.js" ]]
[[ -d "$candidate/node_modules/nodemailer" ]]
[[ -d "$current" ]]
[[ ! -e "$backup" ]]
[[ ! -e "$failed" ]]

sudo install -d -m 0700 -o ec2-user -g ec2-user /var/www/saslucknow/shared/pushpanjali-offerings

sudo cp -a "$gallery_service" "${gallery_service}.pre-pushpanjali-20260806"
sudo cp -a "$http_conf" "${http_conf}.pre-pushpanjali-20260806"
sudo cp -a "$https_conf" "${https_conf}.pre-pushpanjali-20260806"

for config in "$http_conf" "$https_conf"; do
  if ! sudo grep -q 'ProxyPass /api/pushpanjali-offerings ' "$config"; then
    sudo sed -i '/ProxyPreserveHost On/a\    ProxyPass /api/pushpanjali-offerings http://127.0.0.1:3001/api/pushpanjali-offerings\n    ProxyPassReverse /api/pushpanjali-offerings http://127.0.0.1:3001/api/pushpanjali-offerings' "$config"
  fi
done

sudo install -m 0644 "$candidate/deploy/saslucknow-gallery.service" "$gallery_service"
sudo apachectl configtest
sudo systemctl daemon-reload

cutover_started=1
mv "$current" "$backup"
mv "$candidate" "$current"

sudo systemctl restart saslucknow-gallery.service
sudo systemctl restart saslucknow.service
sudo systemctl reload httpd

site_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ > /tmp/saslucknow-pushpanjali-live.html; then
    site_ready=1
    break
  fi
  sleep 2
done
[[ "$site_ready" == 1 ]]
grep -q 'Pushpanjali' /tmp/saslucknow-pushpanjali-live.html
grep -q '15 August 2026' /tmp/saslucknow-pushpanjali-live.html
curl -fsS --max-time 5 http://127.0.0.1:3001/health | grep -q '"ok":true'

pushpanjali_status=$(curl -sS --max-time 5 -o /tmp/sas-pushpanjali-api-check.json -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d '{}' \
  http://127.0.0.1:3001/api/pushpanjali-offerings)
[[ "$pushpanjali_status" == 400 ]]

[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'pushpanjali-live'
