#!/usr/bin/env bash
set -euo pipefail

if [[ ${1:-} == --help ]]; then
  echo "Usage: sudo bash install.sh"
  echo "Install or update standalone AIOStreams in /opt/aiostreams. Requires Docker Compose v2."
  exit
fi
if [[ $# -ne 0 || $EUID -ne 0 ]]; then
  echo "Usage: sudo bash install.sh" >&2
  exit 2
fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null; then
  echo "Install Docker Engine with the Compose v2 plugin, then rerun this installer." >&2
  exit 1
fi

src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dir=/opt/aiostreams
install -d -m 755 "$dir"
if [[ ! -f "$dir/compose.yaml" ]]; then
  install -m 644 "$src/compose.yaml" "$dir/compose.yaml"
fi
created_credentials=0
if [[ ! -f "$dir/.env" ]]; then
  command -v openssl >/dev/null || { echo "OpenSSL is required to generate credentials." >&2; exit 1; }
  password=$(openssl rand -hex 16)
  secret=$(openssl rand -hex 32)
  umask 077
  {
    printf 'BASE_URL=http://localhost:3000\n'
    printf 'SECRET_KEY=%s\n' "$secret"
    printf 'AIOSTREAMS_AUTH=admin:%s\n' "$password"
    printf '%s\n' 'TEMPLATE_URLS=["https://raw.githubusercontent.com/jfle/aio-streams-subtitles-greek/main/templates/aiostreams-english-greek.json"]'
    printf '%s\n' 'FEATURED_TEMPLATE_IDS=["jfle.english-greek-stremio"]'
  } > "$dir/.env"
  created_credentials=1
fi
cd "$dir"
docker compose config --quiet
if command -v systemctl >/dev/null && [[ -d /run/systemd/system ]]; then
  systemctl enable --now docker
fi
docker compose pull
docker compose up -d
echo "AIOStreams deployment is in $dir. Check startup with: sudo docker compose -f $dir/compose.yaml ps"
if [[ $created_credentials -eq 1 ]]; then
  echo "New login details are stored in $dir/.env (AIOSTREAMS_AUTH)."
  echo "A fresh install binds to http://localhost:3000. Use an SSH tunnel or an HTTPS reverse proxy for remote access."
fi
