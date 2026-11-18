# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org).

## [1.7.0] — 2026-11-18

First public release on GitHub.

### Added
- **Sign in with Grok** — use a SuperGrok / X Premium plan through xAI's OAuth device-code sign-in (approve on x.ai with a short code; works from any device). Falls back between xAI's API endpoints automatically and explains clearly when xAI doesn't enable an account.
- One-click **"Use … through OpenRouter sign-in"** for providers that offer no sign-in (Claude, Gemini, Mistral, DeepSeek, Groq, Together); picks a fast model from that vendor after signing in.
- One-click switch from the OpenAI API-key provider to **Sign in with ChatGPT**.
- Full documentation (README, INSTALL, REQUIREMENTS, SECURITY, CONTRIBUTING), zero-dependency test suite, GitHub Actions CI, release workflow (single-file installer + multi-arch Docker image).

## [1.6.0] — 2026-11-18

### Added
- **Early start:** translation begins as soon as you *open* a movie or episode in Stremio (the addon listens to Stremio's stream request and always answers "no streams").
- **Automatic parallelism:** 24 parallel requests with ChatGPT sign-in, 8 for other cloud providers, 3 for local servers (configurable). A 1,010-line episode now translates in about 1 minute instead of 5.
- Untranslated lines are tagged `[⏳ 42% · OFF/ON για ελληνικά]` so it's clear how to load the rest.

### Changed
- Batches ramp up (5 → 10 → 20 lines) so the opening minutes come back first.
- The subtitle request waits for the whole file when it is about to finish, and for more of the opening on the first request.

## [1.5.2] — 2026-11-18

### Fixed
- The model picker showed only the selected model; it is now a real dropdown of every model your account can use, plus "Other…".

## [1.5.1] — 2026-11-18

### Fixed
- "Load models" returned nothing after signing in with ChatGPT (different response format of the plan's model list).

## [1.5.0] — 2026-11-18

### Added
- **Sign in with OpenRouter** (OAuth PKCE, optional spending limit) and **Sign in with ChatGPT** (ChatGPT Plus/Pro plan usage, rotating refresh tokens kept alive automatically).
- Single-file **installer** for Debian-based hosts with automatic HTTPS (nginx + local-ip.sh), systemd service, update and uninstall.
- Greek flag theme, new name **AI-Greek-Subs-Fletouris**, logo and background.

## [1.0.0 – 1.4.x] — 2026-11-17

Early development.

- Stremio subtitle addon translating English subtitles with OpenAI, Anthropic, Gemini, Mistral, DeepSeek, xAI, Groq, OpenRouter, Together or any OpenAI-compatible server.
- Configuration page with encrypted settings inside the addon URL, model loading and test translation.
- LM Studio support: on-demand model loading, "thinking" switched off (`reasoning_effort: none`), JSON-schema structured output and recovery of malformed replies.
- Works within Stremio's ~10 s subtitle timeout: partial results, priority scheduling of the track being watched, opening lines first.
- One Greek track per title, next-episode prefetch, reuse of already translated subtitles, 30-day cache.

[1.7.0]: https://github.com/jfle/ai-greek-subs-fletouris/releases/tag/v1.7.0
[1.6.0]: https://github.com/jfle/ai-greek-subs-fletouris/releases/tag/v1.6.0
[1.5.2]: https://github.com/jfle/ai-greek-subs-fletouris/releases/tag/v1.5.2
[1.5.1]: https://github.com/jfle/ai-greek-subs-fletouris/releases/tag/v1.5.1
[1.5.0]: https://github.com/jfle/ai-greek-subs-fletouris/releases/tag/v1.5.0
