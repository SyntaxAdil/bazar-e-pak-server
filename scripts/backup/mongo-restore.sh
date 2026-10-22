#!/usr/bin/env bash
# Restore a backup. SAFE BY DEFAULT: restores into a separate database "<db>_restore_check" so you can inspect and
# compare it. Overwriting the live database requires --in-place AND --confirm-restore.
# Usage: RESTORE_DATABASE_URL=... ./mongo-restore.sh <archive.gz> [--in-place --confirm-restore] [--dry-run]
set -euo pipefail
umask 077
FILE="${1:-}"; shift || true
DB_NAME="${DB_NAME:-pakBazar}"
INPLACE=0; CONFIRM=0; DRY=0
for a in "$@"; do case "$a" in --in-place) INPLACE=1;; --confirm-restore) CONFIRM=1;; --dry-run) DRY=1;; *) echo "unknown option $a" >&2; exit 2;; esac; done
[[ -n "$FILE" ]] || { echo "usage: $0 <archive.gz> [--in-place --confirm-restore] [--dry-run]" >&2; exit 2; }
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required (explicit target; the app DATABASE_URL is deliberately not used)}"
if [[ "$INPLACE" == 1 && "$CONFIRM" != 1 ]]; then echo "--in-place needs --confirm-restore. Take a fresh backup first." >&2; exit 2; fi
TARGET="${DB_NAME}_restore_check"; [[ "$INPLACE" == 1 ]] && TARGET="$DB_NAME"
if [[ "$DRY" == 1 ]]; then echo "[dry-run] would restore $FILE into database '$TARGET'"; exit 0; fi
[[ -f "$FILE" ]] || { echo "archive not found: $FILE" >&2; exit 2; }
command -v mongorestore >/dev/null || { echo "mongorestore not found" >&2; exit 2; }
( cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256" )
CFG="$(mktemp)"; trap 'rm -f "$CFG"' EXIT
printf 'uri: "%s"\n' "${RESTORE_DATABASE_URL//\"/\\\"}" > "$CFG"
EXTRA=(); [[ "$INPLACE" == 1 ]] && EXTRA+=(--drop)
mongorestore --config="$CFG" --archive="$FILE" --gzip --nsInclude="${DB_NAME}.*" --nsFrom="${DB_NAME}.*" --nsTo="${TARGET}.*" "${EXTRA[@]}"
echo "Restored into database '$TARGET'. Now run the post-restore checks from the README (collection counts, ledger consistency)."
