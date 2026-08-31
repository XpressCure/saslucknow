#!/usr/bin/env bash
set -euo pipefail

release_root="/var/www/saslucknow/releases"
current_link="$release_root/current"
rollback_link="$release_root/rollback"

current_target="$(readlink -f "$current_link")"
rollback_target="${1:-$(readlink -f "$rollback_link" 2>/dev/null || true)}"

if [[ -n "$rollback_target" && ! -d "$rollback_target" ]]; then
  rollback_target="$(find "$release_root" -mindepth 1 -maxdepth 1 -type d ! -path "$current_target" -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
fi

case "$current_target" in
  "$release_root"/*) ;;
  *) echo "Unsafe current release target: $current_target" >&2; exit 1 ;;
esac

if [[ -z "$rollback_target" ]]; then
  echo "A verified rollback release is required." >&2
  exit 1
fi
rollback_target="$(readlink -f "$rollback_target")"
case "$rollback_target" in
  "$release_root"/*) ;;
  *) echo "Unsafe rollback release target: $rollback_target" >&2; exit 1 ;;
esac

test -d "$current_target"
test -d "$rollback_target"
test "$current_target" != "$rollback_target"

ln -sfn "$rollback_target" "$rollback_link"

while IFS= read -r -d '' release; do
  resolved="$(readlink -f "$release")"
  if [[ "$resolved" == "$current_target" || "$resolved" == "$rollback_target" ]]; then
    continue
  fi
  case "$release" in
    "$release_root"/*) rm -rf -- "$release" ;;
    *) echo "Refusing unsafe release path: $release" >&2; exit 1 ;;
  esac
done < <(find "$release_root" -mindepth 1 -maxdepth 1 -type d -print0)

while IFS= read -r -d '' link; do
  [[ "$link" == "$current_link" || "$link" == "$rollback_link" ]] && continue
  rm -f -- "$link"
done < <(find "$release_root" -mindepth 1 -maxdepth 1 -type l -print0)

find "$release_root" -mindepth 1 -maxdepth 1 -type f \
  \( -name '*.tgz' -o -name '*.tar.gz' \) -delete

echo "Retained active: $current_target"
echo "Retained rollback: $rollback_target"
df -h "$release_root"
