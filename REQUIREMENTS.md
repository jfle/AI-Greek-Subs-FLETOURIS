# Requirements

What you need to run **AI-Greek-Subs-Fletouris**. In short: **one always-on machine** that your Stremio devices can reach over **HTTPS**, and **one AI account** (or a local model).

## 1. Server (where the addon runs)

| | Minimum | Recommended |
|---|---|---|
| Hardware | Any 64-bit or 32-bit ARM / x86 computer with **512 MB RAM** free (Raspberry Pi 3, Orange Pi, old laptop, NAS, VPS) | Raspberry Pi 4/5, Orange Pi 5, mini-PC — always on, wired network |
| Operating system | **Installer:** Debian 11+, Ubuntu 20.04+, Raspberry Pi OS (Bullseye+), Armbian, other Debian-based systems with `apt` and `systemd`. **Docker / manual:** any OS that runs Node.js (Linux, Windows 10/11, macOS) | Debian 12 / Ubuntu 24.04 / Raspberry Pi OS Bookworm |
| Node.js | **18.17** or newer (uses built-in `fetch`) — the installer installs **Node.js 22** automatically | 22 LTS |
| npm packages | **None** — the project has zero dependencies | |
| Disk | ~5 MB for the program; the cache uses ~100–200 KB per translated episode (kept 30 days) | 100 MB free |
| CPU | Negligible — the AI work happens at the provider (or on your GPU PC) | |
| Network | Fixed LAN IP (DHCP reservation) so the addon address doesn't change | Wired Ethernet |

The installer also uses: `curl`, `nginx` (installed automatically for HTTPS), `cron` (weekly certificate refresh) and root access (`sudo`).

## 2. HTTPS

Stremio installs addons only over **HTTPS** (plain HTTP is accepted only for `localhost` / `127.0.0.1`, i.e. Stremio on the same computer). Any one of:

- **Default:** the installer's automatic HTTPS for your home network via `<ip>.local-ip.sh` — needs internet access to download the certificate, and a router/DNS that doesn't block DNS rebinding for `local-ip.sh`.
- **Tailscale Serve**, **Cloudflare Tunnel** or **Caddy with your own domain** — see [INSTALL.md → HTTPS](INSTALL.md#https). Needed if you want to use the addon away from home.

## 3. Stremio

- **Stremio 4.4+ or 5.x** on Windows, macOS, Linux, Android, Android TV / Google TV, or [web.stremio.com](https://web.stremio.com).
- A **Stremio account** is recommended: install the addon once and it syncs to all your devices.
- With local-ip.sh HTTPS, the devices must be on the **same network** as the server.
- Streams with **English subtitles available** on OpenSubtitles (or another subtitle addon you add as a source). Titles without any English subtitle can't be translated.

## 4. An AI provider (pick one)

| Option | What you need | Cost |
|---|---|---|
| **Sign in with ChatGPT** | A **ChatGPT Plus or Pro** subscription | Included in your plan (counts toward its usage limits) |
| **Sign in with Grok** | A **SuperGrok** or **X Premium** subscription that xAI enables for app sign-in | Included in your plan |
| **Sign in with OpenRouter** | A free [OpenRouter](https://openrouter.ai) account with credit | Pay-as-you-go, typically cents per movie |
| **API key** | A key from OpenAI, Anthropic, Google AI Studio (Gemini), Mistral, DeepSeek, xAI, Groq, OpenRouter or Together AI | Pay-as-you-go (Gemini and Groq have free tiers with rate limits) |
| **Local model** | A PC running **LM Studio** (0.3+), **Ollama**, vLLM or another OpenAI-compatible server, reachable from the addon server | Free |

Rough usage: a feature film is 1,000–1,500 subtitle lines ≈ 60–100k tokens in + out. Small/fast models are recommended (luna, non-reasoning, Flash, mini, Haiku, small).

### Local model hardware

| Model size | GPU memory (VRAM) | Example |
|---|---|---|
| 7–9B (Q4–Q6) | **8 GB+** (12 GB+ for 4 parallel requests with 16k context) | Llama-Krikri-8B-Instruct (Greek-tuned), Qwen3-8B |
| 12–14B | 12–16 GB | Gemma 3 12B, Qwen3-14B |
| 27–32B | 24 GB+ | Gemma 3 27B, Qwen3-32B |

Apple Silicon Macs work well with LM Studio (unified memory). CPU-only inference works but is too slow for comfortable use.

## 5. Network access (firewalls / allowlists)

The server makes **outbound HTTPS** requests to:

| Purpose | Hosts |
|---|---|
| English subtitles | `opensubtitles-v3.strem.io` and the subtitle files it links to (plus any sources you add) |
| ChatGPT sign-in and models | `auth.openai.com`, `api.openai.com` |
| Grok sign-in and models | `auth.x.ai`, `accounts.x.ai`, `api.x.ai`, `cli-chat-proxy.grok.com` |
| OpenRouter | `openrouter.ai` |
| Other providers (if used) | `api.anthropic.com`, `generativelanguage.googleapis.com`, `api.mistral.ai`, `api.deepseek.com`, `api.groq.com`, `api.together.xyz` |
| Installer only | `deb.nodesource.com` (Node.js), your distribution's apt mirrors (nginx), `local-ip.sh` (certificate, weekly) |

**Inbound:** your Stremio devices must reach the server on **443** (or 8443) for HTTPS, or **7000** for local plain HTTP. Nothing needs to be opened to the internet unless you want outside access.

**Outside access (optional):** a **public IPv4 address** that isn't behind carrier-grade NAT (static is easiest; check that the IP your router shows matches `curl https://api.ipify.org`), and a router where you can set up **port forwarding**. Behind CGNAT, or without router access, use a tunnel (Cloudflare Tunnel, Tailscale Funnel) with `--public-url` instead.
