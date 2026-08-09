#!/usr/bin/env bash
set -euo pipefail

releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/pushpanjali-devotees-counter-20260809-v10"
backup="$releases/pre-pushpanjali-devotees-counter-20260809-v10"
failed="$releases/failed-pushpanjali-devotees-counter-20260809-v10"
archive=/tmp/pushpanjali-devotees-counter-20260809-v10.tgz
smoke_unit=saslucknow-pushpanjali-devotees-counter-v10
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
grep -R -q -- 'text-size-adjust:100%' "$candidate/dist"
grep -R -q -- 'font-size:clamp(1.65rem,2.2vw,2.15rem)' "$candidate/dist"
grep -q -- '--paper:#fff9ed' "$candidate/app/globals.css"
grep -q -- 'width:145%;max-width:none' "$candidate/app/globals.css"
grep -q -- 'text-size-adjust:100%' "$candidate/app/globals.css"
grep -q -- 'pushpanjali-preview' "$candidate/app/pushpanjali-campaign.tsx"
grep -q -- 'Initiative of: Sri Aurobindo Society' "$candidate/app/pushpanjali-campaign.tsx"
if grep -q -- 'Powered by:' "$candidate/app/pushpanjali-campaign.tsx"; then exit 1; fi
[[ -s "$candidate/public/mothers-organ-joy-1960.mp3" ]]
grep -q -- 'mothers-organ-joy-1960.mp3' "$candidate/app/mission-home.tsx"
grep -q -- 'meditationMusicVolume = 0.55' "$candidate/app/mission-home.tsx"
grep -q -- 'Devotees Offered Pushpanjali' "$candidate/app/pushpanjali-campaign.tsx"
if grep -q -- 'certificates generated' "$candidate/app/pushpanjali-campaign.tsx"; then exit 1; fi

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
printf '%s\n' 'saslucknow-pushpanjali-devotees-counter-live'
