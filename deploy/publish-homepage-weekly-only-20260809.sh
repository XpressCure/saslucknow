#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/homepage-weekly-only-20260809-v1"
backup="$releases/pre-homepage-weekly-only-20260809-v1"
failed="$releases/failed-homepage-weekly-only-20260809-v1"
archive=/tmp/homepage-weekly-only-20260809-v1.tgz
cutover_started=0

rollback() {
  exit_code=$?
  trap - ERR
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
grep -R -q 'Weekly collective meeting' "$candidate/dist"
! grep -R -q 'SPECIAL OBSERVANCE · OFFLINE' "$candidate/dist"
! grep -R -q 'SAVITRI STUDY · ONLINE' "$candidate/dist"

cutover_started=1
sudo systemctl stop saslucknow.service
mv "$current" "$backup"
mv "$candidate" "$current"
sudo systemctl restart saslucknow.service

site_ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-weekly-only-live.html; then
    site_ready=1
    break
  fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
grep -q 'Weekly collective meeting' /tmp/saslucknow-weekly-only-live.html
! grep -q 'SPECIAL OBSERVANCE · OFFLINE' /tmp/saslucknow-weekly-only-live.html
! grep -q 'SAVITRI STUDY · ONLINE' /tmp/saslucknow-weekly-only-live.html
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'saslucknow-homepage-weekly-only-live'
