# Contributing

Thanks for helping improve AI-Greek-Subs-Fletouris! Bug reports, translations of the UI, new providers and fixes are all welcome.

## Ground rules

- **Zero dependencies.** The server uses only Node.js built-ins (Node 18.17+). Please don't add npm packages; that keeps installs tiny and safe on a Raspberry Pi.
- **Keep it simple to run.** One process, one data folder, works behind any reverse proxy.
- **Respect provider terms.** Only add sign-in flows that a provider officially offers to third-party apps.
- **Never commit secrets** — no API keys, tokens, `data/` contents or personal addon links in code, tests, issues or screenshots.

## Development setup

```bash
git clone https://github.com/jfle/ai-greek-subs-fletouris.git
cd ai-greek-subs-fletouris
npm start              # http://localhost:7000/configure  (data goes to ./data)
npm test               # full test suite with local mock providers — no network, no keys needed
npm run check          # syntax check of all files
npm run build          # builds dist/ai-greek-subs-fletouris-installer.sh
```

Stremio accepts `http://127.0.0.1:7000/<token>/manifest.json` from the same computer, so you can test the addon in Stremio desktop without HTTPS.

## Project structure

| Path | What it does |
|---|---|
| `server.js` | HTTP routes: manifest, subtitles, stream (early start), translated `.srt`, configure page, `/api/*` |
| `src/translator.js` | Translation jobs: batching, priority scheduling across jobs, partial rendering, cache |
| `src/providers.js` | Provider adapters and model listing |
| `src/auth.js` | Sign-in flows and the server-side credential store |
| `src/config.js` | Encrypted per-user configuration, automatic limits |
| `src/subtitles.js` | SRT/VTT parsing and output, character-set detection |
| `public/configure.html` | The configuration page (plain HTML/JS, no build step) |
| `install.sh`, `build-installer.sh` | Debian installer and the single-file installer builder |
| `test/` | `node:test` suites and mock servers |

## Adding an AI provider

1. Add an entry to `PROVIDERS` in `src/providers.js` (`label`, `type`, `baseUrl`, `defaultModel`, `models`, `keyUrl`). OpenAI-compatible APIs need nothing else.
2. For a different API, add an adapter next to `chatAnthropic` / `chatGemini` and route it in `chat()` and `listModels()`.
3. Add a test with a mock server in `test/`.
4. Document it in README.md (providers table) and REQUIREMENTS.md (hosts to allow).

## Pull requests

1. Fork, create a branch, make your change with tests.
2. Run `npm test` — CI runs the same on Node 18, 20 and 22.
3. Update `CHANGELOG.md` under an *Unreleased* heading.
4. Open the PR and describe what you tested (provider, model, Stremio platform).

## Releasing (maintainers)

1. Bump `version` in `package.json` and move the changelog entries under the new version.
2. Commit, then tag: `git tag v1.8.0 && git push --tags`.
3. The *Release* workflow builds `ai-greek-subs-fletouris-installer.sh` and the source tarball, attaches them to a GitHub release, and publishes the Docker image to `ghcr.io/jfle/ai-greek-subs-fletouris`.
