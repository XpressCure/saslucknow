#!/usr/bin/env bash
set -euo pipefail

source_ref="342ff735a3b79f03caa9d54c0ba12cdbb374202b"
release_id="member-self-registration-${source_ref:0:7}-20260810-v2"
releases=/var/www/saslucknow/releases
current="$releases/current"
candidate="$releases/$release_id"
backup="$releases/pre-$release_id"
failed="$releases/failed-$release_id"
archive="/tmp/$release_id.tgz"
smoke_unit="saslucknow-member-registration-smoke"
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
    sudo systemctl stop saslucknow.service saslucknow-gallery.service saslucknow-participation.service || true
    if [[ -d "$current" && ! -e "$failed" ]]; then mv "$current" "$failed"; fi
    if [[ -d "$backup" && ! -e "$current" ]]; then mv "$backup" "$current"; fi
    sudo systemctl restart saslucknow-gallery.service saslucknow-participation.service saslucknow.service || true
  elif [[ -d "$candidate" && ! -e "$failed" ]]; then
    mv "$candidate" "$failed"
  fi
  exit "$exit_code"
}
trap rollback ERR

[[ -d "$current" ]]
[[ ! -e "$candidate" ]]
[[ ! -e "$backup" ]]
[[ ! -e "$failed" ]]
[[ -f /etc/saslucknow-participation.env ]]
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active saslucknow-participation.service)" == active ]]

rm -f "$archive"
curl -fsSL --retry 3 \
  "https://github.com/XpressCure/saslucknow/archive/$source_ref.tar.gz" \
  -o "$archive"

mkdir -p "$candidate"
tar -xzf "$archive" --strip-components=1 -C "$candidate"
if [[ -f "$current/.env.local" ]]; then cp "$current/.env.local" "$candidate/.env.local"; fi

cd "$candidate"
/usr/bin/pnpm install --frozen-lockfile
/usr/bin/pnpm build

[[ -f "$candidate/dist/server/index.js" ]]
grep -q 'member.self_registered' "$candidate/server/participation-api.mjs"
grep -q 'No approval or reference is required' "$candidate/app/member/member-client.tsx"
grep -q 'You can sign in immediately after submitting' "$candidate/app/participate/participation-client.tsx"

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
for attempt in {1..25}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3010/member >/tmp/saslucknow-member-registration-smoke.html; then
    site_ready=1
    break
  fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
stop_smoke

cutover_started=1
sudo systemctl stop saslucknow.service saslucknow-gallery.service saslucknow-participation.service
mv "$current" "$backup"
mv "$candidate" "$current"
sudo systemctl restart saslucknow-gallery.service saslucknow-participation.service saslucknow.service

site_ready=0
api_ready=0
for attempt in {1..25}; do
  if curl -fsS --max-time 4 http://127.0.0.1:3000/member >/tmp/saslucknow-member-registration-live.html; then site_ready=1; fi
  if curl -fsS --max-time 4 http://127.0.0.1:3002/api/participation/health >/tmp/saslucknow-member-registration-health.json; then api_ready=1; fi
  if [[ "$site_ready" == 1 && "$api_ready" == 1 ]]; then break; fi
  sleep 1
done
[[ "$site_ready" == 1 ]]
[[ "$api_ready" == 1 ]]
grep -q '"status":"ok"' /tmp/saslucknow-member-registration-health.json
curl -fsS --max-time 8 https://saslucknow.in/api/participation/health | grep -q '"status":"ok"'
curl -fsS --max-time 8 https://saslucknow.in/member >/dev/null
curl -fsS --max-time 8 https://saslucknow.in/participate >/dev/null
[[ "$(systemctl is-active saslucknow.service)" == active ]]
[[ "$(systemctl is-active saslucknow-gallery.service)" == active ]]
[[ "$(systemctl is-active saslucknow-participation.service)" == active ]]
[[ "$(systemctl is-active httpd)" == active ]]

cutover_started=0
trap - ERR
rm -f "$archive"
printf '%s\n' "saslucknow-$release_id-live"
