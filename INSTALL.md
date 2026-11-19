# Install PolyCue AI

## Debian, Ubuntu, Raspberry Pi OS or Armbian

```bash
git clone --branch polycue-ai --single-branch https://github.com/jfle/aio-streams-subtitles-greek.git polycue-ai
cd polycue-ai
sudo bash install.sh
```

The installer starts the `polycue-ai` systemd service, stores the app under `/opt/polycue-ai`, and prints its HTTPS configuration address. Use `--https none` for HTTP behind your own reverse proxy and `--public-url https://subs.example.com` for the proxy's external address. Run `bash install.sh --help` for options.

## Home network or remote access

- **Home network only** requires no router changes. Use the local HTTPS address printed by the installer and select **Home network only** when generating the Stremio link.
- **Remote access with port forwarding** uses `sudo bash install.sh --public-ip auto --public-port 8443`. On your router, forward **TCP 8443** to the Pi's HTTPS port (normally **443**). Use the destination port printed by the installer and select **Anywhere** when generating the link. Keep port 7000 off the public internet.
- **Remote access without port forwarding** can use an HTTPS tunnel. Point the tunnel at PolyCue on port 7000 and run `sudo bash install.sh --https none --public-url https://subs.example.com` with your tunnel's HTTPS address. Select **Anywhere** in PolyCue. A private VPN is another option if every remote Stremio device can join it and reach a suitable HTTPS URL for PolyCue.

The Pi must be online and reachable for PolyCue to return subtitles, including its built-in OpenSubtitles v3 results.

## Find the configuration URL and password

On the Pi or other systemd host, run `sudo polycue-config` to print your configuration URL and current configuration password. If external access was configured, it prints that URL too. The command requires root because the password is stored in a root-only file.

## Choose your language and backup

1. Open **/configure** and choose **Language to show in Stremio**.
2. Leave the default provider for OpenSubtitles alone. Add a **Local model API URL** for local AI, and optionally select a cloud provider for fallback. [Download the official Krikri Q4_K_M GGUF (5.04 GB)](https://huggingface.co/ilsp/Llama-Krikri-8B-Instruct-GGUF/resolve/main/llama-krikri-8b-instruct-q4_k_m.gguf?download=true) and load it in LM Studio or another GGUF-compatible runner. The default model ID is `llama-krikri-8b-instruct` for Greek and `qwen2.5-7b-instruct` for other languages. [Download the official Qwen2.5-7B-Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF). If LM Studio, Ollama, or another runner lists a different model ID, enter its exact ID in **Local model ID**. Click **Check model** to verify that PolyCue can reach the endpoint and that the endpoint lists that exact ID.
3. Test translation if enabled, then generate the private install link and open it in Stremio. If you want PolyCue as your only OpenSubtitles source, disable the separate OpenSubtitles addon after verifying the new link.

An AI backup is offered when PolyCue has translation configured and finds an English subtitle to translate. When OpenSubtitles already supplies the chosen language, the AI track is generated on demand. Set **Additional priority sources** only if you also use other subtitle addons.

## Upgrading from HellasCue AI or AI-Fletouris

Run the PolyCue installer on the same host. It copies legacy subtitle settings, cache and sign-ins, then replaces the legacy subtitle service. The previous addon identifier and encryption key are preserved, so existing links work at the same address. Open your existing addon's settings and generate a new link to change the selected language or model. AIOStreams remains independently managed.

## Docker Compose

Run `docker compose up -d --build` from this branch. The default bind is `127.0.0.1:7000`. Configure an HTTPS reverse proxy for Stremio and set `PUBLIC_URL` and `CONFIG_PASSWORD` in `.env`. Keep existing persistent subtitle data and its encryption key across upgrades.

To remove the systemd install while keeping subtitle data, run `sudo /opt/polycue-ai/install.sh --uninstall`.
