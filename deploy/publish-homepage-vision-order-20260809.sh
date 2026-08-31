#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/homepage-vision-order-20260809-v1"
backup="$releases/pre-homepage-vision-order-20260809-v1"
failed="$releases/failed-homepage-vision-order-20260809-v1"
archive=/tmp/homepage-vision-order-20260809-v1.tgz
smoke_unit=saslucknow-homepage-smoke-20260809-v1
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
tar -xzf "$archive" -C "$candidate"

[[ -f "$candidate/dist/server/index.js" ]]
grep -R -q 'A path towards a more conscious life' "$candidate/dist"
grep -R -q 'Gatherings through the years' "$candidate/dist"
grep -R -q 'Upcoming gatherings' "$candidate/dist"

stop_smoke
sudo systemd-run \
  --unit="$smoke_unit" \
  --property="User=ec2-user" \
  --property="Group=ec2-user" \
  --property="WorkingDirectory=$candidate" \
  --setenv=NODE_ENV=production \
  --setenv=PORT=3010 \
  /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null

site_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-homepage-smoke.html; then
    site_ready=1
    break
  fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
grep -q 'A path towards a more conscious life' /tmp/saslucknow-homepage-smoke.html
grep -q 'Gatherings through the years' /tmp/saslucknow-homepage-smoke.html
grep -q 'Upcoming gatherings' /tmp/saslucknow-homepage-smoke.html
stop_smoke

cutover_started=1
sudo systemctl stop saslucknow.service
mv "$current" "$backup"
mv "$candidate" "$current"
sudo systemctl restart saslucknow.service

site_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-homepage-live.html; then
    site_ready=1
    break
  fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
grep -q 'A path towards a more conscious life' /tmp/saslucknow-homepage-live.html
grep -q 'Gatherings through the years' /tmp/saslucknow-homepage-live.html
grep -q 'Upcoming gatherings' /tmp/saslucknow-homepage-live.html
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'saslucknow-homepage-vision-order-live'
