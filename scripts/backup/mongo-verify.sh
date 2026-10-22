#!/usr/bin/env bash
# Integrity check of a backup archive: checksum + a mongorestore --dryRun (reads the archive, writes nothing).
# Usage: ./mongo-verify.sh /path/to/pakBazar-<stamp>.archive.gz [--dry-run]
set -euo pipefail
FILE="${1:-}"; [[ -n "$FILE" ]] || { echo "usage: $0 <archive.gz> [--dry-run]" >&2; exit 2; }
if [[ "${2:-}" == "--dry-run" ]]; then echo "[dry-run] would verify sha256 and run mongorestore --dryRun on $FILE"; exit 0; fi
[[ -f "$FILE" ]] || { echo "archive not found: $FILE" >&2; exit 2; }
command -v mongorestore >/dev/null || { echo "mongorestore not found" >&2; exit 2; }
( cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256" )
mongorestore --archive="$FILE" --gzip --dryRun --quiet >/dev/null
echo "OK: checksum matches and archive is readable"
