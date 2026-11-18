# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Use GitHub's private reporting instead: **[Report a vulnerability](https://github.com/jfle/ai-greek-subs-fletouris/security/advisories/new)** (repository → *Security* → *Report a vulnerability*). You'll get a reply within a few days.

Only the latest release is supported with fixes.

## How the addon protects your data

| What | How |
|---|---|
| Settings and API keys | Stored **inside your personal addon link**, encrypted with **AES-256-GCM**. The key (`data/secret.key`, or the `SECRET` variable) never leaves the server. |
| Sign-ins (ChatGPT, Grok, OpenRouter) | Stored **only on the server** in `data/credentials/` with owner-only permissions (`0600`, folder `0700`). The addon link carries an opaque random id. Access tokens are refreshed automatically; nothing is sent anywhere except to the provider that issued it. |
| Subtitle downloads | The server only downloads subtitle URLs it handed out itself (HMAC-signed links), so it can't be abused as an open proxy. |
| Service account | The installer runs the addon as an unprivileged `aigreeksubs` user with `NoNewPrivileges`, `ProtectSystem=full` and write access only to its data folder. |
| Configure page | Optional `CONFIG_PASSWORD` protects testing, model listing, sign-in and link generation. |

## What you should do

- **Treat your addon link like a password.** Anyone with the full link can use your server — and therefore your AI account or key. Share the project, not your link.
- Set **`CONFIG_PASSWORD`** whenever the server is reachable from the internet (Cloudflare Tunnel, own domain).
- **Back up `data/secret.key`** and keep it private; anyone with it can decrypt addon links made by your server.
- Revoke sign-ins on the provider side if a device or link is lost (ChatGPT settings → connected apps, x.ai account, OpenRouter → Keys), then sign in again and reinstall the addon.
- Keep the server updated (re-run the installer).

## Provider terms

The sign-in features use the official, publicly documented flows that each provider offers to third-party apps (OpenRouter OAuth PKCE, OpenAI's "Sign in with ChatGPT" for open-source apps, xAI's device-code sign-in with its shared app client). The addon deliberately offers **no** sign-in for providers that forbid using subscriptions in other apps (Anthropic, Google). You are responsible for using your accounts within each provider's terms.
