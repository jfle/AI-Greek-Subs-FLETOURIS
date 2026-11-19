# Install HellasCue AI

## Debian, Ubuntu, Raspberry Pi OS or Armbian

```bash
git clone --branch hellascue-ai --single-branch https://github.com/jfle/aio-streams-subtitles-greek.git hellascue-ai
cd hellascue-ai
sudo bash install.sh
```

The installer creates the `hellascue-ai` systemd service, stores the app under `/opt/hellascue-ai`, and prints the HTTPS configuration address. Use `--https none` for an HTTP-only install behind your own reverse proxy. For independent external HTTPS routing, use `--https none --public-url https://subs.example.com`. Run `bash install.sh --help` for the LAN port, router and uninstall options.

### Upgrade from AI-Fletouris or the bundled installer

Run this installer on the same host. It copies the legacy subtitle data, adopts the previous subtitle settings and replaces the legacy subtitle service and proxy. Keeping the original addon ID and encryption key allows existing links to work when the hostname and port stay the same. The AIOStreams container, web address and data are independent of the upgrade. Use this installer for future subtitle updates.

### Docker Compose

From this branch run `docker compose up -d --build`. The default bind address is `127.0.0.1:7000`. Configure a reverse proxy with HTTPS for Stremio, and set `PUBLIC_URL` and `CONFIG_PASSWORD` in `.env`. See [.env.example](.env.example) for server-wide defaults. Keep the persistent data directory and encryption key across upgrades.

### Configure

Open **/configure**, set a provider and select **Test translation**. For local-first translation, set a cloud API provider and enter the local OpenAI-compatible endpoint under **Advanced**. Expose Krikri with the model identifier `llama-krikri-8b-instruct`. List higher-priority subtitle providers in **Advanced** to defer backup generation until the player loads it.

To update, rerun the installer from a newer checkout. To remove the subtitle service while keeping its data, run `sudo /opt/hellascue-ai/install.sh --uninstall`.
