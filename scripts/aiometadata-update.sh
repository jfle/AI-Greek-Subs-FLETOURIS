#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || $EUID -ne 0 ]]; then
  echo 'Usage: sudo aiometadata-update /path/to/compose-directory' >&2
  exit 2
fi

cd "$1"
umask 077
exec 9>.aiometadata-update.lock
flock -n 9 || { echo 'AIOMetadata update already running' >&2; exit 1; }

container=$(docker compose ps -q aiometadata)
if [[ -z "$container" ]]; then
  echo 'Start AIOMetadata before running the updater.' >&2
  exit 1
fi
data=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/addon/data"}}{{.Source}}{{end}}{{end}}' "$container")
if [[ -z "$data" || ! -f "$data/db.sqlite" ]]; then
  echo 'AIOMetadata SQLite database not found in the deployed data mount.' >&2
  exit 1
fi

mkdir -p update-backups
backup=$(mktemp -d "update-backups/$(date -u +%Y%m%dT%H%M%SZ).XXXXXXXX")
python3 - "$data/db.sqlite" "$backup/db.sqlite" <<'PY'
import sqlite3
import sys
from pathlib import Path

source = Path(sys.argv[1]).resolve().as_uri() + "?mode=ro"
with sqlite3.connect(source, uri=True, timeout=30) as current:
    with sqlite3.connect(sys.argv[2], timeout=30) as backup:
        current.backup(backup)
        if backup.execute("PRAGMA quick_check").fetchone() != ("ok",):
            raise SystemExit("AIOMetadata database backup failed integrity validation")
PY
docker inspect -f '{{.Image}}' "$container" > "$backup/previous-image"
for file in compose.yaml compose.yml docker-compose.yaml docker-compose.yml .env .tmdb.env; do
  if [[ -f "$file" ]]; then cp -- "$file" "$backup/"; fi
done
echo "Verified pre-update snapshot: $backup"

docker compose pull aiometadata
docker compose up -d --no-deps aiometadata
for ((attempt = 0; attempt < 90; attempt++)); do
  if docker compose exec -T aiometadata node -e '
    fetch("http://127.0.0.1:3232/health", {signal: AbortSignal.timeout(2500)})
      .then(async response => {
        const health = await response.json();
        process.exitCode = response.ok && health.status === "healthy" ? 0 : 1;
      })
      .catch(() => { process.exitCode = 1; });
  ' >/dev/null 2>&1; then
    echo 'AIOMetadata health check passed'
    exit 0
  fi
  sleep 2
done

echo "AIOMetadata did not become healthy. Pre-update snapshot: $backup" >&2
exit 1
