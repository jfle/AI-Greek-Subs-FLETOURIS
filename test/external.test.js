'use strict';
// Outside access: an external address (public IP / domain) next to the home address.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startMockProviders } = require('./helpers/mock-providers');
const { startAddon } = require('./helpers/server');

const EXT = 'https://203-0-113-5.local-ip.sh:8443';
let mock;

// fetch() can't set the Host header, so use http.request to arrive "via" another address.
function call(base, path, { host, body, ip } = {}) {
  const u = new URL(path, base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: body ? 'POST' : 'GET', headers: { host: host || u.host, 'content-type': 'application/json', ...(ip ? { 'x-real-ip': ip } : {}) } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: d, json: () => JSON.parse(d) }));
    });
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

test.before(async () => { mock = await startMockProviders({ lines: 30 }); });
test.after(async () => { await mock?.close(); });

test('install links for home and anywhere; page shows the choice', async () => {
  const addon = await startAddon(mock.base, { EXTERNAL_URL: EXT, CONFIG_PASSWORD: 'pw' });
  try {
    const cfg = { provider: 'custom', baseUrl: `${mock.base}/v1`, model: 'm', sources: [mock.base] };
    const r = (await call(addon.base, '/api/encode', { body: { config: cfg, password: 'pw', target: 'external' } })).json();
    assert.equal(r.manifestUrl, `${EXT}/${r.token}/manifest.json`);
    assert.equal(r.links.home.manifestUrl, `${addon.base}/${r.token}/manifest.json`);
    assert.equal(r.links.external.stremioUrl, `stremio://203-0-113-5.local-ip.sh:8443/${r.token}/manifest.json`);
    const page = (await call(addon.base, '/configure')).text;
    assert.match(page, /"external":"https:\/\/203-0-113-5\.local-ip\.sh:8443"/);
    // Arriving through the external address: links, manifest and the configure page use that address.
    const m = (await call(addon.base, `/${r.token}/manifest.json`, { host: '203-0-113-5.local-ip.sh:8443' })).json();
    assert.equal(new URL(m.logo).pathname, '/logo.png');
    assert.equal(new URL(m.logo).origin, EXT);
    assert.equal((await call(addon.base, '/configure', { host: '203-0-113-5.local-ip.sh:8443' })).status, 200, 'no redirect away from the external address');
    assert.equal((await call(addon.base, '/configure', { host: 'unknown.example:1' })).status, 302);
  } finally { await addon.stop(); }
});

test('without a password the configuration API refuses requests from outside', async () => {
  const addon = await startAddon(mock.base, { EXTERNAL_URL: EXT });
  try {
    const cfg = { provider: 'custom', baseUrl: `${mock.base}/v1`, model: 'm' };
    const out = await call(addon.base, '/api/encode', { host: '203-0-113-5.local-ip.sh:8443', body: { config: cfg } });
    assert.equal(out.status, 403);
    assert.match(out.json().error, /password/);
    assert.equal((await call(addon.base, '/api/encode', { body: { config: cfg } })).status, 200, 'home network still works');
  } finally { await addon.stop(); }
});

test('wrong passwords are throttled and locked out per address', async () => {
  const addon = await startAddon(mock.base, { EXTERNAL_URL: EXT, CONFIG_PASSWORD: 'right' });
  try {
    const cfg = { provider: 'custom', baseUrl: `${mock.base}/v1`, model: 'm' };
    const t0 = Date.now();
    const bad = await Promise.all(Array.from({ length: 10 }, () => call(addon.base, '/api/encode', { body: { config: cfg, password: 'nope' }, ip: '198.51.100.7' })));
    assert.ok(bad.every((b) => b.status === 401));
    assert.ok(Date.now() - t0 >= 900, 'wrong passwords are slowed down');
    const locked = await call(addon.base, '/api/encode', { body: { config: cfg, password: 'right' }, ip: '198.51.100.7' });
    assert.equal(locked.status, 429);
    const other = await call(addon.base, '/api/encode', { body: { config: cfg, password: 'right' }, ip: '198.51.100.8' });
    assert.equal(other.status, 200, 'other visitors are not affected');
  } finally { await addon.stop(); }
});

test('the external address is recognised without its port (other forwarded port / proxy)', async () => {
  const addon = await startAddon(mock.base, { EXTERNAL_URL: EXT, CONFIG_PASSWORD: 'pw' });
  try {
    const r = (await call(addon.base, '/api/encode', { body: { config: { provider: 'custom', baseUrl: `${mock.base}/v1`, model: 'm' }, password: 'pw' } })).json();
    const m = (await call(addon.base, `/${r.token}/manifest.json`, { host: '203-0-113-5.local-ip.sh' })).json();
    assert.equal(new URL(m.logo).pathname, '/logo.png');
    assert.equal(new URL(m.logo).origin, EXT);
  } finally { await addon.stop(); }
});

test('the configure page links to the bundled AIOStreams when it is installed', async () => {
  const addon = await startAddon(mock.base, { AIOSTREAMS_URL: 'https://203-0-113-5.local-ip.sh:8444/' });
  try {
    const page = (await call(addon.base, '/configure')).text;
    assert.match(page, /"aiostreams":"https:\/\/203-0-113-5\.local-ip\.sh:8444"/);
    assert.match(page, /id="aioBox"/);
  } finally { await addon.stop(); }
});
