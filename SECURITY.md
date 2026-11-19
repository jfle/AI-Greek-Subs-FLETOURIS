# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Use GitHub's private reporting instead: **[Report a vulnerability](https://github.com/jfle/aio-streams-subtitles-greek/security/advisories/new)** (repository → *Security* → *Report a vulnerability*). You'll get a reply within a few days.

Only the latest release is supported with fixes.

## How the addon protects your data

| What | How |
|---|---|
| Settings and API keys | Stored **inside your personal addon link**, encrypted with **AES-256-GCM**. The key (`data/secret.key`, or the `SECRET` variable) never leaves the server. |
| Sign-ins (ChatGPT, Grok, OpenRouter) | Stored **only on the server** in `data/credentials/` with owner-only permissions (`0600`, folder `0700`). The addon link carries an opaque random id. Access tokens are refreshed automatically; nothing is sent anywhere except to the provider that issued it. |
| Subtitle downloads | The server only downloads subtitle URLs it handed out itself (HMAC-signed links), so it can't be abused as an open proxy. |
| Service account | The installer runs the addon as an unprivileged `aigreeksubs` user with `NoNewPrivileges`, `ProtectSystem=full` and write access only to its data folder. |
| Configure page | `CONFIG_PASSWORD` protects testing, model listing, sign-in and link generation. It is generated automatically when outside access is enabled; without it, configuration requests arriving through the external address are refused. Wrong passwords are delayed 1 s and an address is locked out for 15 minutes after 10 failures. |
| Outside access | Only through HTTPS. Secrets (`CONFIG_PASSWORD`, `EXTERNAL_URL`) live in `/etc/polycue-ai.env` (root-only), not in the world-readable systemd unit. |


## What you should do

- **Treat your addon link like a password.** Anyone with the full link can use your server — and therefore your AI account or key. Share the project, not your link.
- Keep the configuration password when outside access is on (the installer sets one); forward only the one HTTPS port, never port 7000.
- **Back up `data/secret.key`** and keep it private; anyone with it can decrypt addon links made by your server.
- Revoke sign-ins on the provider side if a device or link is lost (ChatGPT settings → connected apps, x.ai account, OpenRouter → Keys), then sign in again and reinstall the addon.
- Keep the server updated (re-run the installer).

## Provider terms

Review your provider’s terms before enabling any integration. For automated cloud translation, use an API key with a provider that permits your use case. For offline inference, use a compatible local model endpoint.
