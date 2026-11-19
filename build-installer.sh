#!/usr/bin/env bash
# Builds dist/aio-streams-subtitles-greek-installer.sh — a single self-extracting installer file
# (shell script + embedded tar.gz of the app). Usage on the host: sudo bash aio-streams-subtitles-greek-installer.sh [options]
set -euo pipefail
cd "$(dirname "$0")"
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)
mkdir -p dist
STAGE=$(mktemp -d)
mkdir "$STAGE/aio-streams-subtitles-greek"
cp -r server.js package.json src public README.md INSTALL.md LICENSE install.sh Dockerfile docker-compose.yml "$STAGE/aio-streams-subtitles-greek/"
chmod +x "$STAGE/aio-streams-subtitles-greek/install.sh"
tar -C "$STAGE" -czf "$STAGE/payload.tgz" aio-streams-subtitles-greek
OUT=dist/aio-streams-subtitles-greek-installer.sh
cat > "$OUT" <<EOF
#!/usr/bin/env bash
# AIO-Streams&Subtitles-Greek v$VERSION — self-extracting installer.
#   sudo bash \$0                 install / update
#   sudo bash \$0 --https none    HTTP only
#   sudo bash \$0 --uninstall     remove
set -euo pipefail
[[ \$EUID -eq 0 ]] || { echo "Run as root: sudo bash \$0 \$*" >&2; exit 1; }
TMP=\$(mktemp -d); trap 'rm -rf "\$TMP"' EXIT
sed '1,/^__PAYLOAD_BELOW__\$/d' "\$0" | base64 -d | tar -xz -C "\$TMP"
bash "\$TMP/aio-streams-subtitles-greek/install.sh" "\$@"
exit \$?
__PAYLOAD_BELOW__
EOF
base64 -w 76 "$STAGE/payload.tgz" >> "$OUT"
chmod +x "$OUT"
tar -C "$STAGE" -czf "dist/aio-streams-subtitles-greek-$VERSION.tar.gz" aio-streams-subtitles-greek
rm -rf "$STAGE"
ls -l dist/
