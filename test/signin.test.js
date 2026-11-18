'use strict';
// Sign-in flows (ChatGPT, Grok, OpenRouter) end to end against mock identity providers.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startMockProviders } = require('./helpers/mock-providers');
const { startAddon, api, waitFor } = require('./helpers/server');

let mock;
let addon;

test.before(async () => {
  mock = await startMockProviders({ lines: 40 });
  addon = await startAddon(mock.base);
});
test.after(async () => {
  await addon?.stop();
  await mock?.close();
});

test('Sign in with ChatGPT: authorize → paste callback → models → translate', async () => {
  const start = await api(addon.base, 'oauth/chatgpt/start', {});
  assert.equal(start.status, 200);
  const authUrl = new URL(start.body.url);
  assert.equal(authUrl.searchParams.get('client_id'), 'dynamic_agent_client');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');

  // The browser is redirected to the loopback callback; the user pastes that address back.
  const redirect = await fetch(authUrl, { redirect: 'manual' });
  const callback = redirect.headers.get('location');
  assert.match(callback, /^http:\/\/127\.0\.0\.1:1455\/auth\/callback\?/);
  const fin = await api(addon.base, 'oauth/chatgpt/finish', { url: callback });
  assert.equal(fin.status, 200, JSON.stringify(fin.body));
  assert.equal(fin.body.email, 'viewer@example.com');
  const credId = fin.body.credId;

  const cred = await api(addon.base, 'credential', { credId });
  assert.deepEqual(cred.body.credential, { type: 'chatgpt', email: 'viewer@example.com', needsReauth: false });

  const models = await api(addon.base, 'models', { config: { provider: 'chatgpt', credId } });
  assert.deepEqual(models.body.models, ['gpt-6-luna', 'gpt-6-sol']);

  const t = await api(addon.base, 'test', { config: { provider: 'chatgpt', credId, model: 'gpt-6-luna' } });
  assert.equal(t.status, 200, JSON.stringify(t.body));
  assert.match(t.body.sample['1'], /^ΕΛ /);

  // Replaying the same callback must fail (single-use state).
  const again = await api(addon.base, 'oauth/chatgpt/finish', { url: callback });
  assert.equal(again.status, 400);
});

test('Sign in with Grok: device code → poll → plan models → translate with endpoint fallback', async () => {
  const start = await api(addon.base, 'oauth/xai/start', {});
  assert.equal(start.status, 200, JSON.stringify(start.body));
  assert.equal(start.body.userCode, 'ABCD-EFGH');
  assert.match(start.body.verificationUriComplete, /^https:\/\/accounts\.x\.ai\//);
  assert.equal(mock.state.xaiDevice.client_id, 'b1a00492-073a-47ea-816f-4c329264a828');
  assert.match(mock.state.xaiDevice.scope, /api:access/);
  assert.equal(mock.state.xaiDevice.referrer, 'ai-greek-subs-fletouris');

  const done = await waitFor(async () => {
    const r = await api(addon.base, 'oauth/xai/poll', { pendingId: start.body.pendingId });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.status === 'done' ? r.body : null;
  }, { timeout: 20000, every: 500 });
  assert.equal(done.email, 'viewer@example.com');

  const cfg = { provider: 'xai', credId: done.credId, model: 'grok-4.20-0309-non-reasoning' };
  const models = await api(addon.base, 'models', { config: cfg });
  assert.ok(models.body.models.includes('grok-4.20-0309-non-reasoning'), 'falls back to the known plan models');

  mock.state.xaiApiDenied = true; // public API refuses → proxy endpoint is used
  const t = await api(addon.base, 'test', { config: cfg });
  assert.equal(t.status, 200, JSON.stringify(t.body));
  assert.match(t.body.sample['1'], /^ΓΚ /);

  const enc = await api(addon.base, 'encode', { config: cfg });
  assert.equal(enc.status, 200);

  mock.state.xaiProxyDenied = true; // both refuse → clear, actionable error
  const denied = await api(addon.base, 'test', { config: { ...cfg, model: 'grok-4.7' } });
  assert.equal(denied.status, 400);
  assert.match(denied.body.error, /xAI did not allow this account/);
  mock.state.xaiProxyDenied = false;
});

test('Sign in with OpenRouter: PKCE start → callback → key stored', async () => {
  const start = await api(addon.base, 'oauth/openrouter/start', { limit: '2.5' });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const u = new URL(start.body.url);
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(u.searchParams.get('limit'), '2.5');
  assert.equal(u.searchParams.get('callback_url'), `${addon.base}/oauth/openrouter/callback`);
  const state = u.searchParams.get('state');

  const cb = await fetch(`${addon.base}/oauth/openrouter/callback?code=good-code&state=${state}`, { redirect: 'manual' });
  const loc = cb.headers.get('location');
  assert.match(loc, /^\/configure#cred=[\w-]+$/);
  const credId = loc.split('=')[1];
  const cred = await api(addon.base, 'credential', { credId });
  assert.equal(cred.body.credential.type, 'openrouter');

  const bad = await fetch(`${addon.base}/oauth/openrouter/callback?code=bad&state=nope`, { redirect: 'manual' });
  assert.match(bad.headers.get('location'), /#autherror=/);
});
