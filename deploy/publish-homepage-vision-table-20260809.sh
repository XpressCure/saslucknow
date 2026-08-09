#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/pushpanjali-portrait-gutter-20260809-v2"
backup="$releases/pre-pushpanjali-portrait-gutter-20260809-v2"
failed="$releases/failed-pushpanjali-portrait-gutter-20260809-v2"
archive=/tmp/pushpanjali-portrait-gutter-20260809-v2.tgz
smoke_unit=saslucknow-pushpanjali-portrait-gutter-v2
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
grep -R -q 'hero-vision-pillars' "$candidate/dist"
grep -R -q 'Inner growth' "$candidate/dist"
grep -R -q 'grid-template-columns:104px minmax(0,1fr)' "$candidate/dist"
grep -R -q 'grid-template-rows:minmax(126px,auto)' "$candidate/dist"
grep -R -q 'scrollbar-width:none' "$candidate/dist"
grep -q 'cardNotes\[i\]' "$candidate/app/mission-home.tsx"
if grep -q 'className="savitri-video-description"' "$candidate/app/mission-home.tsx"; then exit 1; fi
if grep -R -q 'A path towards a more conscious life' "$candidate/dist"; then exit 1; fi

stop_smoke
sudo systemd-run --unit="$smoke_unit" --property="User=ec2-user" --property="Group=ec2-user" --property="WorkingDirectory=$candidate" --setenv=NODE_ENV=production --setenv=PORT=3010 /usr/bin/pnpm start -- --hostname 127.0.0.1 --port 3010 >/dev/null

ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/ >/tmp/saslucknow-homepage-vision-smoke.html; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
grep -q 'hero-vision-pillars' /tmp/saslucknow-homepage-vision-smoke.html
grep -q 'Inner growth' /tmp/saslucknow-homepage-vision-smoke.html
grep -q 'Discover the deeper self' /tmp/saslucknow-homepage-vision-smoke.html
grep -q 'Five luminous lines at a time' /tmp/saslucknow-homepage-vision-smoke.html
if grep -q 'A path towards a more conscious life' /tmp/saslucknow-homepage-vision-smoke.html; then exit 1; fi
if grep -q 'SAVITRI · IN IMAGE, WORD' /tmp/saslucknow-homepage-vision-smoke.html; then exit 1; fi
stop_smoke

cutover_started=1
sudo systemctl stop saslucknow.service
mv "$current" "$backup"
mv "$candidate" "$current"
sudo systemctl restart saslucknow.service

ready=0
for attempt in {1..20}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/ >/tmp/saslucknow-homepage-vision-live.html; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
grep -q 'hero-vision-pillars' /tmp/saslucknow-homepage-vision-live.html
grep -q 'Inner growth' /tmp/saslucknow-homepage-vision-live.html
grep -q 'Discover the deeper self' /tmp/saslucknow-homepage-vision-live.html
grep -q 'Five luminous lines at a time' /tmp/saslucknow-homepage-vision-live.html
if grep -q 'A path towards a more conscious life' /tmp/saslucknow-homepage-vision-live.html; then exit 1; fi
if grep -q 'SAVITRI · IN IMAGE, WORD' /tmp/saslucknow-homepage-vision-live.html; then exit 1; fi
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
printf '%s\n' 'saslucknow-homepage-vision-table-live'
