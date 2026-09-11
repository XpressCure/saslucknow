#!/usr/bin/env bash
set -Eeuo pipefail

: "${BOOK_ONE_EN:?Set BOOK_ONE_EN to the English Book One PDF}"
: "${BOOK_ONE_HI:?Set BOOK_ONE_HI to the Hindi Book One PDF}"

storage="${NEXT_HUMAN_BOOK_STORAGE_DIR:-/var/lib/saslucknow-participation/documents/next-human-books}"

for source in "$BOOK_ONE_EN" "$BOOK_ONE_HI"; do
  [[ -f "$source" ]]
  [[ "$(head -c 5 "$source")" == "%PDF-" ]]
done

sudo install -d -m 0750 -o ec2-user -g ec2-user "$storage"
install -m 0640 "$BOOK_ONE_EN" "$storage/next-human-book-one-en.pdf"
install -m 0640 "$BOOK_ONE_HI" "$storage/next-human-book-one-hi.pdf"

if [[ -n "${BOOK_ZERO_EN:-}" || -n "${BOOK_ZERO_HI:-}" ]]; then
  [[ -f "${BOOK_ZERO_EN:-}" && -f "${BOOK_ZERO_HI:-}" ]]
  [[ "$(head -c 5 "$BOOK_ZERO_EN")" == "%PDF-" ]]
  [[ "$(head -c 5 "$BOOK_ZERO_HI")" == "%PDF-" ]]
  install -m 0640 "$BOOK_ZERO_EN" "$storage/next-human-book-zero-en.pdf"
  install -m 0640 "$BOOK_ZERO_HI" "$storage/next-human-book-zero-hi.pdf"
fi

printf 'Installed protected NEXT HUMAN editions in %s\n' "$storage"
