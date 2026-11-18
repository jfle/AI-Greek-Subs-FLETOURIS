#!/usr/bin/env bash
# AI-Greek-Subs-Fletouris installer — Debian / Ubuntu / Raspberry Pi OS / Armbian (amd64, arm64, armhf).
#
#   sudo ./install.sh                  install or update (keeps settings, cache and sign-ins)
#   sudo ./install.sh --https none     plain HTTP only (Stremio desktop on your LAN)
#   sudo ./install.sh --port 7100      use another port for the addon
#   sudo ./install.sh --uninstall      remove the service (keeps data); add --purge to delete data too
#
# After installing, open the printed address, configure your AI provider and click "Install in Stremio".
set -euo pipefail

APP=ai-greek-subs-fletouris
NAME="AI-Greek-Subs-Fletouris"
DIR=/opt/$APP
SVC_USER=aigreeksubs
PORT=7000
HTTPS=localip          # localip = HTTPS on your LAN via <ip>.local-ip.sh + nginx ; none = HTTP only
UNINSTALL=0
PURGE=0
OLD_DIRS=(/opt/stremio-ai-subtitle-translator)
OLD_SERVICES=(stremio-ai-subtitles)
OLD_SITES=(stremio-ai-subtitles)
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

c_b=$'\e[1;34m'; c_g=$'\e[1;32m'; c_y=$'\e[1;33m'; c_r=$'\e[1;31m'; c_0=$'\e[0m'
step() { echo "${c_b}==>${c_0} $*"; }
ok()   { echo "${c_g} ✓${c_0} $*"; }
warn() { echo "${c_y} !${c_0} $*"; }
die()  { echo "${c_r} ✗ $*${c_0}" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --https) HTTPS="$2"; shift 2 ;;
    --uninstall) UNINSTALL=1; shift ;;
    --purge) PURGE=1; shift ;;
    -y|--yes) shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done
[[ $EUID -eq 0 ]] || die "Run as root: sudo $0 $*"
[[ "$HTTPS" == localip || "$HTTPS" == none ]] || die "--https must be 'localip' or 'none'"

echo
echo "${c_b}  ███  ${NAME}${c_0}"
echo "${c_b}  ═══  AI Greek subtitles for Stremio${c_0}"
echo

# ---------------------------------------------------------------- uninstall
if [[ $UNINSTALL -eq 1 ]]; then
  step "Removing $NAME"
  systemctl disable --now "$APP" 2>/dev/null || true
  rm -f "/etc/systemd/system/$APP.service"
  systemctl daemon-reload
  rm -f "/etc/nginx/sites-enabled/$APP" "/etc/nginx/sites-available/$APP"
  command -v nginx >/dev/null && nginx -t -q 2>/dev/null && systemctl reload nginx || true
  if [[ $PURGE -eq 1 ]]; then rm -rf "$DIR"; userdel "$SVC_USER" 2>/dev/null || true; ok "Removed program and data"
  else find "$DIR" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} + 2>/dev/null || true; ok "Removed program (settings kept in $DIR/data; use --purge to delete)"; fi
  exit 0
fi

[[ -f "$SRC/server.js" && -f "$SRC/package.json" ]] || die "Run this script from the unpacked $NAME folder"
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$SRC/package.json" | head -1)

# ---------------------------------------------------------------- Node.js
need_node() { command -v node >/dev/null || return 0; local v; v=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0); [[ $v -lt 18 ]]; }
if need_node; then
  step "Installing Node.js 22"
  command -v apt-get >/dev/null || die "Node.js 18+ is required. Install it, then re-run this script."
  apt-get update -qq
  apt-get install -y -qq curl ca-certificates gnupg >/dev/null
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
NODE=$(command -v node)
ok "Node.js $($NODE -v) at $NODE"

# ---------------------------------------------------------------- user + files
id "$SVC_USER" &>/dev/null || useradd --system --home-dir "$DIR" --shell /usr/sbin/nologin "$SVC_USER"
step "Installing $NAME v$VERSION to $DIR"
mkdir -p "$DIR/data"
for item in server.js package.json src public README.md INSTALL.md LICENSE install.sh; do
  [[ -e "$SRC/$item" ]] || continue
  rm -rf "${DIR:?}/$item"
  cp -r "$SRC/$item" "$DIR/"
done

# Carry over settings from an older installation so existing Stremio addon links keep working.
if [[ ! -f "$DIR/data/secret.key" ]]; then
  for old in "${OLD_DIRS[@]}"; do
    if [[ -f "$old/data/secret.key" ]]; then
      step "Migrating settings, cache and sign-ins from $old"
      cp -a "$old/data/." "$DIR/data/"
      ok "Migrated (old folder left in place; delete it when you're happy)"
      break
    fi
  done
fi
chown -R "$SVC_USER:$SVC_USER" "$DIR"
chmod 700 "$DIR/data"

# Stop old services that would clash on the port or hostname.
for s in "${OLD_SERVICES[@]}"; do
  if systemctl list-unit-files "$s.service" &>/dev/null && systemctl cat "$s" &>/dev/null; then
    step "Disabling old service $s"; systemctl disable --now "$s" 2>/dev/null || true
  fi
done

# Port check: another program (not us) already listening?
if ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q . && ! systemctl is-active --quiet "$APP"; then
  for p in $(seq $((PORT+1)) $((PORT+50))); do ss -ltnH "sport = :$p" | grep -q . || { warn "Port $PORT is busy; using $p"; PORT=$p; break; }; done
fi

# ---------------------------------------------------------------- HTTPS (local-ip.sh)
PUBLIC_URL=""
LAN_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1)
[[ -n "$LAN_IP" ]] || LAN_IP=$(hostname -I | awk '{print $1}')
if [[ "$HTTPS" == localip ]]; then
  HOSTN="${LAN_IP//./-}.local-ip.sh"
  step "Setting up HTTPS at https://$HOSTN (works on your home network)"
  if ! command -v nginx >/dev/null; then
    command -v apt-get >/dev/null || die "nginx is needed for HTTPS. Install it or use --https none."
    apt-get install -y -qq nginx >/dev/null
  fi
  HTTPS_PORT=443
  if ss -ltnpH "sport = :443" 2>/dev/null | grep -q . && ! ss -ltnpH "sport = :443" | grep -q nginx; then
    HTTPS_PORT=8443; warn "Port 443 is used by another program; using 8443"
  fi
  mkdir -p /etc/ssl/local-ip
  cat > /usr/local/bin/refresh-local-ip-cert <<'EOF'
#!/bin/sh
# Refreshes the public wildcard certificate for *.local-ip.sh (LAN HTTPS for AI-Greek-Subs-Fletouris).
set -e
curl -fsS -m 30 -o /tmp/lip.pem https://local-ip.sh/server.pem
curl -fsS -m 30 -o /tmp/lip.key https://local-ip.sh/server.key
openssl x509 -in /tmp/lip.pem -noout >/dev/null
install -m 644 /tmp/lip.pem /etc/ssl/local-ip/server.pem
install -m 600 /tmp/lip.key /etc/ssl/local-ip/server.key
rm -f /tmp/lip.pem /tmp/lip.key
nginx -t -q && systemctl reload nginx
EOF
  chmod 755 /usr/local/bin/refresh-local-ip-cert
  ln -sf /usr/local/bin/refresh-local-ip-cert /etc/cron.weekly/refresh-local-ip-cert
  curl -fsS -m 30 -o /etc/ssl/local-ip/server.pem https://local-ip.sh/server.pem || die "Could not download the local-ip.sh certificate (internet access needed), or use --https none"
  curl -fsS -m 30 -o /etc/ssl/local-ip/server.key https://local-ip.sh/server.key
  chmod 600 /etc/ssl/local-ip/server.key
  for s in "${OLD_SITES[@]}"; do rm -f "/etc/nginx/sites-enabled/$s" "/etc/nginx/sites-available/$s"; done
  cat > "/etc/nginx/sites-available/$APP" <<EOF
# $NAME — HTTPS for the Stremio addon
server {
    listen $HTTPS_PORT ssl;
    listen [::]:$HTTPS_PORT ssl;
    server_name $HOSTN;
    ssl_certificate     /etc/ssl/local-ip/server.pem;
    ssl_certificate_key /etc/ssl/local-ip/server.key;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 120s;
    }
}
EOF
  ln -sf "/etc/nginx/sites-available/$APP" "/etc/nginx/sites-enabled/$APP"
  nginx -t -q || die "nginx configuration test failed"
  systemctl enable --now nginx >/dev/null 2>&1 || true
  systemctl reload nginx
  PUBLIC_URL="https://$HOSTN"; [[ $HTTPS_PORT -ne 443 ]] && PUBLIC_URL="$PUBLIC_URL:$HTTPS_PORT"
  ok "HTTPS ready (certificate refreshes weekly)"
fi

# ---------------------------------------------------------------- service
step "Creating service $APP"
cat > "/etc/systemd/system/$APP.service" <<EOF
[Unit]
Description=$NAME (Stremio AI Greek subtitles)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SVC_USER
WorkingDirectory=$DIR
ExecStart=$NODE server.js
Environment=PORT=$PORT
Environment=DATA_DIR=$DIR/data
Environment=PUBLIC_URL=$PUBLIC_URL
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$DIR/data

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$APP" >/dev/null 2>&1
systemctl restart "$APP"

for _ in $(seq 1 20); do curl -fsS -m 2 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && break; sleep 0.5; done
curl -fsS -m 2 "http://127.0.0.1:$PORT/health" >/dev/null || die "Service did not start. Check: journalctl -u $APP -e"
ok "Service running (v$VERSION, port $PORT)"

URL="${PUBLIC_URL:-http://$LAN_IP:$PORT}"
echo
echo "${c_g}  Done!${c_0}  Next steps:"
echo "   1. Open  ${c_b}$URL/configure${c_0}  in a browser on your network"
echo "   2. Choose your AI provider (sign in or paste a key), click Test translation"
echo "   3. Click Generate install link → Install in Stremio"
[[ -z "$PUBLIC_URL" ]] && echo "   (HTTP only: paste the manifest URL into Stremio desktop's addon search box)"
echo
echo "   Logs:    journalctl -u $APP -f"
echo "   Update:  run the newer installer the same way (settings are kept)"
echo "   Remove:  sudo $DIR/install.sh --uninstall"
echo
