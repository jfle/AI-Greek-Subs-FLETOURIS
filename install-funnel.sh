#!/usr/bin/env bash
# Guided fresh install for users behind CGNAT.
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: sudo bash install-funnel.sh

Install the subtitle add-on, AIOStreams, and AIOMetadata on a fresh host and publish their
HTTPS endpoints through Tailscale Funnel. Requires approval in a browser.
Existing installations should use the manual tunnel instructions in INSTALL.md.
HELP
}
die() { printf '%s\n' "$*" >&2; exit 1; }

case "${1:-}" in -h|--help) usage; exit 0 ;; esac
[[ $# -eq 0 && $EUID -eq 0 ]] || { usage >&2; exit 2; }
[[ -t 0 ]] || die 'Run this command in an interactive terminal.'
case "$(uname -m)" in x86_64|amd64|aarch64|arm64) ;; *) die 'Bundled AIOStreams requires a 64-bit host.' ;; esac

src=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
[[ -f "$src/install.sh" && -f "$src/server.js" && -f "$src/deploy/aiometadata/compose.yaml" ]] || die 'Run this script from the full GitHub source checkout.'
for path in /opt/aiometadata /opt/aiostreams /opt/aio-streams-subtitles-greek /opt/polycue-ai /opt/ai-greek-subs-fletouris /opt/stremio-ai-subtitle-translator /etc/aio-streams-subtitles-greek.conf /etc/ai-greek-subs-fletouris.conf; do
  [[ ! -e "$path" ]] || die "Found an existing installation at $path. Use the manual tunnel guide in INSTALL.md."
done

printf '%s\n' 'This setup publishes the subtitle, AIOStreams, and AIOMetadata endpoints on the internet.'
read -r -p 'Type yes to continue: ' answer
[[ "$answer" == yes ]] || die 'Cancelled.'

command -v curl >/dev/null && command -v python3 >/dev/null && command -v ss >/dev/null ||
  die 'Install curl, python3, and iproute2 before running setup.'
for port in 7000 3232; do
  [[ -z $(ss -ltnH "sport = :$port") ]] || die "Local port $port is in use. See the manual tunnel guide."
done
if ! command -v tailscale >/dev/null; then
  installer=$(mktemp)
  trap 'rm -f -- "$installer"' EXIT
  curl -fsSL https://tailscale.com/install.sh -o "$installer"
  sh "$installer"
fi

status=$(tailscale status --json || true)
if ! python3 -c 'import json,sys; raise SystemExit(json.load(sys.stdin).get("BackendState") != "Running")' <<<"$status" 2>/dev/null; then
  tailscale up
  status=$(tailscale status --json)
fi
hostname=$(python3 -c 'import json,re,sys; name=json.load(sys.stdin)["Self"]["DNSName"].rstrip("."); assert re.fullmatch(r"[a-z0-9-]+(?:\.[a-z0-9-]+)*\.ts\.net",name); print(name)' <<<"$status") ||
  die 'Could not find the node’s ts.net hostname. Enable MagicDNS and try again.'

# Funnel and Serve share the port configuration. Preserve any existing routes.
routes=$(tailscale funnel status --json)
python3 -c 'import json,sys
cfg=json.load(sys.stdin) or {}
used=set((cfg.get("TCP") or {}).keys())
used.update(k.rsplit(":",1)[-1] for k in (cfg.get("Web") or {}))
raise SystemExit(bool({"443","8443","10000"} & used))' <<<"$routes" ||
  die 'Tailscale already uses port 443, 8443, or 10000. Use the manual tunnel guide.'

subs_url="https://$hostname"
aio_url="$subs_url:8443"
meta_url="$subs_url:10000"
bash "$src/install.sh" --https none --port 7000 --public-url "$subs_url" --aio-public-url "$aio_url"

grep -Eq '^CONFIG_PASSWORD=.+$' /etc/aio-streams-subtitles-greek.env ||
  die 'Subtitle configuration password was not found. Funnel was not enabled.'
grep -Fxq 'AIOSTREAMS_AUTH_REQUIRED=true' /opt/aiostreams/.env ||
  die 'AIOStreams configuration authentication was not enabled. Funnel was not enabled.'
binding=$(docker port aiostreams 3000/tcp)
[[ "$binding" =~ ^127\.0\.0\.1:([0-9]+)$ ]] || die 'AIOStreams must have one loopback-only HTTP port.'
aio_port=${BASH_REMATCH[1]}

meta_dir=/opt/aiometadata
[[ -z $(docker ps -aq --filter label=com.docker.compose.project=stremio-aiometadata) ]] ||
  die 'An existing stremio-aiometadata Docker project was found.'
mkdir -m 700 "$meta_dir"
install -m 644 "$src/deploy/aiometadata/compose.yaml" "$meta_dir/compose.yaml"
meta_password=$(python3 -c 'import secrets; print(secrets.token_hex(16))')
meta_admin_key=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
(
  umask 077
  printf 'HOST_NAME=%s\nADDON_PASSWORD=%s\nADMIN_KEY=%s\n' "$meta_url" "$meta_password" "$meta_admin_key" > "$meta_dir/.env"
)
docker compose --project-directory "$meta_dir" up -d
for ((attempt = 0; attempt < 90; attempt++)); do
  if curl -fsS --max-time 3 http://127.0.0.1:3232/configure/ >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS --max-time 3 http://127.0.0.1:3232/configure/ >/dev/null ||
  die 'AIOMetadata setup did not become ready. Check Docker Compose logs in /opt/aiometadata.'

printf '%s\n' 'Approve Tailscale Funnel in your browser if prompted.'
opened_ports=()
remove_new_routes() {
  for port in "${opened_ports[@]}"; do
    tailscale funnel "--https=$port" off ||
      printf 'Could not turn off port %s. Check tailscale funnel status.\n' "$port" >&2
  done
}
for route in "443:7000" "8443:$aio_port" "10000:3232"; do
  port=${route%%:*}
  target=${route#*:}
  if ! tailscale funnel --bg "--https=$port" "http://127.0.0.1:$target"; then
    remove_new_routes
    die "Funnel setup failed at port $port. The add-ons remain installed. See INSTALL.md to finish setup."
  fi
  opened_ports+=("$port")
done

printf '\nSubtitle setup: %s/configure\nAIOStreams setup: %s/stremio/configure\nAIOMetadata setup: %s/configure/\n' "$subs_url" "$aio_url" "$meta_url"
printf '%s\n' 'The AIOMetadata instance password is in /opt/aiometadata/.env (ADDON_PASSWORD).'
printf '%s\n' 'In AIOMetadata, import templates/aiometadata-mainstream.json from this checkout and enter your TMDB key.'
printf '%s\n' 'Allow DNS to propagate, then open the setup pages and install the configured add-ons in Stremio.'
tailscale funnel status
