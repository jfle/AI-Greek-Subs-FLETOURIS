'use strict';
// Starts the addon server as a child process with a fresh data folder and endpoints pointed at the mocks.

const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startAddon(mockBase, extraEnv = {}) {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigreeksubs-test-'));
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DATA_DIR: dataDir,
    PUBLIC_URL: base,
    SUBTITLE_WAIT_MS: '3000',
    OPENAI_AUTH_URL: mockBase,
    OPENAI_API_URL: `${mockBase}/v1`,
    OPENROUTER_URL: mockBase,
    XAI_AUTH_URL: `${mockBase}/xai`,
    XAI_OAUTH_API_URL: `${mockBase}/xai/api/v1`,
    XAI_OAUTH_PROXY_URL: `${mockBase}/xai/proxy/v1`,
    ...extraEnv,
  };
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    if (child.exitCode !== null) throw new Error(`addon exited early:\n${log}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    base,
    dataDir,
    log: () => log,
    async stop() {
      child.kill();
      await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

async function api(base, action, body = {}) {
  const r = await fetch(`${base}/api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

async function getJson(url) {
  const r = await fetch(url);
  return { status: r.status, body: await r.json() };
}

async function waitFor(fn, { timeout = 15000, every = 150 } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, every));
  }
  throw new Error('waitFor: timed out');
}

module.exports = { startAddon, api, getJson, waitFor };
