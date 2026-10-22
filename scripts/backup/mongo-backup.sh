#!/usr/bin/env bash
# MongoDB logical backup for the existing PakBazaar database (db name "pakBazar", see src/config/database.js).
# Does NOT replace or modify the database. Requires MongoDB Database Tools (mongodump) on the machine that runs it.
# Usage: DATABASE_URL=... BACKUP_DIR=/secure/path ./mongo-backup.sh [--dry-run]
# NOTE: this only creates a backup when someone/something RUNS it. Nothing here schedules itself.
set -euo pipefail
umask 077

DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
: "${DATABASE_URL:?DATABASE_URL is required (use the same value as the app; never commit it)}"
DB_NAME="${DB_NAME:-pakBazar}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/pakbazaar-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.archive.gz"

if [[ "$DRY" == 1 ]]; then
  echo "[dry-run] would dump database '$DB_NAME' to $OUT, write a .sha256 file, and prune backups older than ${RETENTION_DAYS} days"
  exit 0
fi
command -v mongodump >/dev/null || { echo "mongodump not found (install MongoDB Database Tools)" >&2; exit 2; }
case "$BACKUP_DIR" in "$PWD"/*|"$PWD") echo "Refusing to write backups inside the project directory (risk of committing dumps)" >&2; exit 2;; esac
mkdir -p "$BACKUP_DIR"

# the URI goes through a private temp config file so it never appears in the process list or logs
CFG="$(mktemp)"; trap 'rm -f "$CFG"' EXIT
printf 'uri: "%s"\n' "${DATABASE_URL//\"/\\\"}" > "$CFG"
mongodump --config="$CFG" --db="$DB_NAME" --archive="$OUT" --gzip --quiet

( cd "$BACKUP_DIR" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )
find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.archive.gz*" -mtime +"$RETENTION_DAYS" -delete
echo "Backup written: $OUT"
