#!/usr/bin/env bash
# Builds dist/hellascue-ai-installer.sh — a single self-extracting installer file
# (shell script + embedded tar.gz of the app). Usage on the host: sudo bash hellascue-ai-installer.sh [options]
set -euo pipefail
cd "$(dirname "$0")"
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)
mkdir -p dist
STAGE=$(mktemp -d)
mkdir "$STAGE/hellascue-ai"
cp -r server.js package.json src public README.md INSTALL.md LICENSE install.sh Dockerfile docker-compose.yml "$STAGE/hellascue-ai/"
chmod +x "$STAGE/hellascue-ai/install.sh"
tar -C "$STAGE" -czf "$STAGE/payload.tgz" hellascue-ai
OUT=dist/hellascue-ai-installer.sh
cat > "$OUT" <<EOF
#!/usr/bin/env bash
# HellasCue AI v$VERSION — self-extracting installer.
#   sudo bash \$0                 install / update
#   sudo bash \$0 --https none    HTTP only
#   sudo bash \$0 --uninstall     remove
set -euo pipefail
[[ \$EUID -eq 0 ]] || { echo "Run as root: sudo bash \$0 \$*" >&2; exit 1; }
TMP=\$(mktemp -d); trap 'rm -rf "\$TMP"' EXIT
sed '1,/^__PAYLOAD_BELOW__\$/d' "\$0" | base64 -d | tar -xz -C "\$TMP"
bash "\$TMP/hellascue-ai/install.sh" "\$@"
exit \$?
__PAYLOAD_BELOW__
EOF
base64 -w 76 "$STAGE/payload.tgz" >> "$OUT"
chmod +x "$OUT"
tar -C "$STAGE" -czf "dist/hellascue-ai-$VERSION.tar.gz" hellascue-ai
rm -rf "$STAGE"
ls -l dist/
