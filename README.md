# AIOStreams Standalone Installer

Run the upstream AIOStreams Docker image with its own configuration, storage and lifecycle. This branch contains the deployment files for AIOStreams. The independent subtitle addon lives on the [PolyCue AI branch](https://github.com/jfle/aio-streams-subtitles-greek/tree/polycue-ai).

## Install or update

Install Docker Engine and its Compose v2 plugin on the host, then run:

```bash
git clone --branch aiostreams-standalone --single-branch https://github.com/jfle/aio-streams-subtitles-greek.git aiostreams-standalone
cd aiostreams-standalone
sudo bash install.sh
```

The installer uses `/opt/aiostreams`. If you already installed AIOStreams through the bundled installer, it reuses that Compose file, environment and data. Your existing proxy and address are managed independently.

For a fresh install, the app listens on `127.0.0.1:3000` with a generated admin password. Retrieve the login on the host with `sudo grep '^AIOSTREAMS_AUTH=' /opt/aiostreams/.env`. From another machine, use an SSH tunnel such as `ssh -L 3000:localhost:3000 user@host`, then open `http://localhost:3000`.

## Home network and remote Stremio access

- **Home network only:** No router port forwarding is required. A fresh install binds to `127.0.0.1:3000`. To use AIOStreams from another device at home, configure an HTTPS reverse proxy reachable on your LAN.
- **Direct remote access:** Configure a publicly reachable HTTPS reverse proxy that sends requests to `127.0.0.1:3000`, then forward the router's external **TCP port** to the HTTPS listener on the host. For example, if your existing AIOStreams proxy listens on **8444**, forward **TCP 8444 → 8444** to that host. Use the proxy's actual listener port on a fresh setup. Keep port **3000** private.
- **Remote access without port forwarding:** Use an HTTPS tunnel to the local AIOStreams endpoint, or use a private VPN if every remote Stremio device can join it and reach an HTTPS address for AIOStreams.

Set `BASE_URL` in `/opt/aiostreams/.env` to the HTTPS URL that your Stremio clients will use, including the external port if it differs from 443. The host must be online and reachable for Stremio to use the addon.

## Update or stop AIOStreams

Preserve `SECRET_KEY` and the data directory when updating. Rerun the installer to pull the upstream image and apply configuration changes.

To stop it while keeping your configuration and data:

```bash
cd /opt/aiostreams
sudo docker compose down
```

This repository packages a deployment of [upstream AIOStreams](https://github.com/Viren070/AIOStreams). See the [upstream documentation](https://aiostreams.org/) for app configuration and support.
