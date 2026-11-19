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

For routine remote access, configure an HTTPS reverse proxy and set `BASE_URL` in `/opt/aiostreams/.env` to the public HTTPS URL. Preserve `SECRET_KEY` and the data directory when updating. Rerun the installer to pull the upstream image and apply configuration changes.

To stop it while keeping your configuration and data:

```bash
cd /opt/aiostreams
sudo docker compose down
```

This repository packages a deployment of [upstream AIOStreams](https://github.com/Viren070/AIOStreams). See the [upstream documentation](https://aiostreams.org/) for app configuration and support.
