'use strict';
// Sign-in support for cloud providers:
//  • OpenRouter — official OAuth PKCE flow; returns an OpenRouter API key for the user.
//  • OpenAI "Sign in with ChatGPT" — ChatGPT plan usage for open-source / self-hosted apps
//    (dynamic client registration, PKCE, rotating refresh tokens, Responses API).
//  • xAI "Sign in with Grok" — SuperGrok / X Premium plan usage through xAI's OAuth 2.0 device-code
//    flow (RFC 8628) with xAI's shared public Grok client, the same one OpenCode, Kilo Code and others use.
// Credentials are stored server-side in DATA_DIR/credentials (0600); addon URLs only carry an opaque id.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./paths');

const CRED_DIR = path.join(DATA_DIR, 'credentials');
const OPENROUTER_URL = (process.env.OPENROUTER_URL || 'https://openrouter.ai').replace(/\/+$/, '');
const OA_AUTH = (process.env.OPENAI_AUTH_URL || 'https://auth.openai.com').replace(/\/+$/, '');
const OA_ISSUER = process.env.OPENAI_ISSUER || 'https://auth.openai.com';
const OA_RESOURCE = 'https://api.openai.com/v1';
const OA_SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const APP_NAME = 'PolyCue AI';

const rand = (n = 32) => crypto.randomBytes(n).toString('base64url');
function pkce() {
  const verifier = rand(48);
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// ---------- credential store ----------
function credPath(id) {
  if (!/^[\w-]{16,64}$/.test(String(id || ''))) throw new Error('Invalid credential id');
  return path.join(CRED_DIR, `${id}.json`);
}
function saveCred(id, rec) {
  const p = credPath(id);
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(rec, null, 1), { mode: 0o600 });
  fs.renameSync(`${p}.tmp`, p);
}
function loadCred(id) {
  try {
    return JSON.parse(fs.readFileSync(credPath(id), 'utf8'));
  } catch {
    return null;
  }
}
function credSummary(id) {
  if (!id) return null;
  const c = loadCred(id);
  if (!c) return { missing: true };
  return { type: c.type, email: c.email || null, needsReauth: !!c.needsReauth };
}
function deleteCred(id) {
  try { fs.unlinkSync(credPath(id)); } catch { /* already gone */ }
}

// Stable, opaque id for this host (the Pi), required by Sign in with ChatGPT.
function hostId() {
  const f = path.join(DATA_DIR, 'host-id');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const id = `urn:uuid:${crypto.randomUUID()}`;
  fs.writeFileSync(f, id, { mode: 0o600 });
  return id;
}

// Pending sign-in attempts (state -> data), kept 15 minutes (device codes: until they expire).
const pending = new Map();
function addPending(state, data) {
  const now = Date.now();
  for (const [k, v] of pending) if (now > (v.expiresAt || v.at + 15 * 60e3)) pending.delete(k);
  pending.set(state, { ...data, at: now });
}
function takePending(state, type) {
  const p = pending.get(state);
  if (!p || p.type !== type) return null;
  pending.delete(state);
  return p;
}

// ---------- OpenRouter (OAuth PKCE) ----------
function openrouterStart(publicUrl, { limit } = {}) {
  const { verifier, challenge } = pkce();
  const state = rand(16);
  addPending(state, { type: 'openrouter', verifier });
  const u = new URL(`${OPENROUTER_URL}/auth`);
  u.searchParams.set('callback_url', `${publicUrl}/oauth/openrouter/callback`);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('state', state);
  u.searchParams.set('key_label', APP_NAME);
  const lim = parseFloat(limit);
  if (lim > 0) u.searchParams.set('limit', String(Math.round(lim * 100) / 100));
  return u.toString();
}

async function openrouterFinish(code, state) {
  const p = takePending(state, 'openrouter');
  if (!p) throw new Error('This sign-in has expired. Start it again from the configure page.');
  const r = await fetch(`${OPENROUTER_URL}/api/v1/auth/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: p.verifier, code_challenge_method: 'S256' }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.key) throw new Error(`OpenRouter sign-in failed (HTTP ${r.status}${j.error?.message ? `: ${j.error.message}` : ''})`);
  const id = rand(18);
  saveCred(id, { type: 'openrouter', key: j.key, saved_at: new Date().toISOString() });
  return id;
}

function staticKey(id) {
  const c = loadCred(id);
  if (!c || !c.key) throw new Error('Sign-in not found. Sign in again on the configure page.');
  return c.key;
}

// ---------- Sign in with ChatGPT (plan usage, open-source flow) ----------
const CHATGPT_REDIRECT = 'http://127.0.0.1:1455/auth/callback';

function chatgptStart({ credId } = {}) {
  const { verifier, challenge } = pkce();
  const state = rand(16);
  const nonce = rand(16);
  const prev = credId ? loadCred(credId) : null;
  const reuse = prev && prev.type === 'chatgpt' && prev.client_id ? prev : null;
  const clientId = reuse ? reuse.client_id : 'dynamic_agent_client';
  addPending(state, { type: 'chatgpt', verifier, nonce, clientId, reauthCredId: reuse ? credId : null });

  const u = new URL(`${OA_AUTH}/api/accounts/authorize`);
  const q = u.searchParams;
  q.set('client_id', clientId);
  if (!reuse) q.set('agent_name_hint', APP_NAME);
  q.set('ext_agent_host_id', hostId());
  if (reuse?.id_token) q.set('id_token_hint', reuse.id_token);
  if (reuse?.email) q.set('login_hint', reuse.email);
  q.set('response_type', 'code');
  q.set('redirect_uri', CHATGPT_REDIRECT);
  q.set('scope', OA_SCOPES);
  q.set('resource', OA_RESOURCE);
  q.set('state', state);
  q.set('nonce', nonce);
  q.set('code_challenge_method', 'S256');
  q.set('code_challenge', challenge);
  return u.toString();
}

async function tokenRequest(params) {
  const r = await fetch(`${OA_AUTH}/api/accounts/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(20000),
  });
  const text = await r.text();
  let j = {};
  try { j = JSON.parse(text); } catch { /* not json */ }
  if (!r.ok) {
    const e = new Error(`OpenAI sign-in error: ${j.error_description || j.error || `HTTP ${r.status}`}`);
    e.oauthError = j.error;
    throw e;
  }
  return j;
}

let jwksCache = null;
async function verifyIdToken(idToken, audience, nonce) {
  if (!idToken) throw new Error('OpenAI returned no ID token');
  const [h, p, s] = idToken.split('.');
  const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  if (!jwksCache || Date.now() - jwksCache.at > 3600e3 || !jwksCache.keys.some((k) => k.kid === header.kid)) {
    const r = await fetch(`${OA_AUTH}/.well-known/jwks.json`, { signal: AbortSignal.timeout(15000) });
    jwksCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  const jwk = jwksCache.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('ID token signing key not found');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const data = Buffer.from(`${h}.${p}`);
  const sig = Buffer.from(s, 'base64url');
  let ok = false;
  if (header.alg === 'RS256') ok = crypto.verify('RSA-SHA256', data, key, sig);
  else if (header.alg === 'ES256') ok = crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, sig);
  else throw new Error(`Unsupported ID token algorithm ${header.alg}`);
  if (!ok) throw new Error('ID token signature is invalid');
  if (claims.iss !== OA_ISSUER) throw new Error('ID token issuer mismatch');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(audience)) throw new Error('ID token audience mismatch');
  if (claims.exp * 1000 < Date.now() - 60e3) throw new Error('ID token expired');
  if (nonce && claims.nonce !== nonce) throw new Error('ID token nonce mismatch');
  return claims;
}

// The user pastes the address their browser landed on (http://127.0.0.1:1455/auth/callback?code=…).
async function chatgptFinish(pasted) {
  const raw = String(pasted || '').trim();
  let q;
  try {
    q = new URL(raw).searchParams;
  } catch {
    q = new URLSearchParams(raw.replace(/^[^?]*\?/, ''));
  }
  const state = q.get('state');
  const p = state && pending.get(state);
  if (!p || p.type !== 'chatgpt') throw new Error('That address is not from the current sign-in attempt (or it expired). Click "Sign in with ChatGPT" again.');
  if (q.get('error')) {
    pending.delete(state);
    throw new Error(`Sign-in was not completed (${q.get('error')}).`);
  }
  const code = q.get('code');
  if (!code) throw new Error('The pasted address has no "code" in it. Copy the full address from the browser bar.');
  let clientId = p.clientId;
  const returned = q.get('client_id');
  if (clientId === 'dynamic_agent_client') {
    if (!returned) throw new Error('OpenAI did not finish registering this app (no client_id returned). Try again.');
    clientId = returned;
  } else if (returned && returned !== clientId) {
    pending.delete(state);
    throw new Error('Client ID mismatch. Start the sign-in again.');
  }
  pending.delete(state);

  const tok = await tokenRequest({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    code_verifier: p.verifier,
    redirect_uri: CHATGPT_REDIRECT,
    resource: OA_RESOURCE,
  });
  const scopes = String(tok.scope || q.get('scope') || '').split(/\s+/).filter(Boolean);
  if (!scopes.includes('chatgpt.tokens.use.direct')) {
    throw new Error('ChatGPT plan usage was not granted. It needs an eligible ChatGPT Plus or Pro plan, and the plan-usage permission must be allowed.');
  }
  const claims = await verifyIdToken(tok.id_token, clientId, p.nonce);
  const prev = p.reauthCredId ? loadCred(p.reauthCredId) : null;
  if (prev && prev.subject && prev.subject !== claims.sub) throw new Error('You signed in with a different ChatGPT account than before.');
  const id = p.reauthCredId || rand(18);
  saveCred(id, {
    type: 'chatgpt',
    email: claims.email || null,
    issuer: OA_ISSUER,
    subject: claims.sub,
    client_id: clientId,
    ext_agent_host_id: hostId(),
    id_token: tok.id_token,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    token_type: tok.token_type || 'Bearer',
    expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
    scopes,
    saved_at: new Date().toISOString(),
  });
  return { credId: id, email: claims.email || null };
}

const REAUTH_ERRORS = ['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused'];
const refreshing = new Map();

function refreshChatgpt(id, force = false) {
  if (refreshing.has(id)) return refreshing.get(id); // serialize: refresh tokens rotate
  const run = (async () => {
    const cur = loadCred(id);
    if (!cur || cur.type !== 'chatgpt') throw new Error('ChatGPT sign-in not found. Sign in again on the configure page.');
    if (!force && cur.expires_at - Date.now() > 120e3) return cur.access_token;
    try {
      const tok = await tokenRequest({
        grant_type: 'refresh_token',
        client_id: cur.client_id,
        refresh_token: cur.refresh_token,
        resource: OA_RESOURCE,
      });
      const next = {
        ...cur,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token || cur.refresh_token,
        expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
        scopes: tok.scope ? tok.scope.split(/\s+/) : cur.scopes,
        saved_at: new Date().toISOString(),
        needsReauth: false,
      };
      if (tok.id_token) next.id_token = tok.id_token;
      saveCred(id, next);
      return next.access_token;
    } catch (e) {
      if (REAUTH_ERRORS.includes(e.oauthError)) {
        saveCred(id, { ...cur, needsReauth: true });
        const err = new Error('ChatGPT sign-in has expired. Sign in again on the configure page.');
        err.fatal = true;
        throw err;
      }
      throw e;
    } finally {
      refreshing.delete(id);
    }
  })();
  refreshing.set(id, run);
  return run;
}

async function chatgptAccessToken(id) {
  const c = loadCred(id);
  if (!c || c.type !== 'chatgpt') {
    const e = new Error('ChatGPT sign-in not found. Sign in again on the configure page.');
    e.fatal = true;
    throw e;
  }
  if (c.needsReauth) {
    const e = new Error('ChatGPT sign-in has expired. Sign in again on the configure page.');
    e.fatal = true;
    throw e;
  }
  if (c.expires_at - Date.now() > 120e3) return c.access_token;
  return refreshChatgpt(id);
}

// ---------- Sign in with Grok (xAI, OAuth 2.0 device code) ----------
const XAI_AUTH = (process.env.XAI_AUTH_URL || 'https://auth.x.ai').replace(/\/+$/, '');
const XAI_CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828'; // xAI's public Grok client (no secret)
const XAI_SCOPES = 'openid profile email offline_access grok-cli:access api:access';
const XAI_REFERRER = 'aio-streams-subtitles-greek';

async function xaiForm(pathname, params) {
  let res;
  try {
    res = await fetch(`${XAI_AUTH}${pathname}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    throw new Error(`Could not reach xAI sign-in: ${e.message}`);
  }
  let j = {};
  try { j = await res.json(); } catch { /* not JSON */ }
  return { ok: res.ok, status: res.status, j };
}

function jwtClaims(token) {
  try { return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8')); } catch { return {}; }
}

async function xaiStart() {
  const { ok, status, j } = await xaiForm('/oauth2/device/code', { client_id: XAI_CLIENT_ID, scope: XAI_SCOPES, referrer: XAI_REFERRER });
  if (!ok || !j.device_code || !j.user_code) {
    throw new Error(`xAI sign-in could not start: ${j.error_description || j.error || `HTTP ${status}`}`);
  }
  const uri = j.verification_uri_complete || j.verification_uri;
  if (!/^https:\/\/([\w-]+\.)*x\.ai\//i.test(uri || '')) throw new Error('xAI returned an unexpected sign-in address');
  const interval = Math.max(2, j.interval || 5) * 1000;
  const pendingId = rand(18);
  addPending(pendingId, {
    type: 'xai',
    deviceCode: j.device_code,
    interval,
    nextPoll: Date.now() + interval,
    expiresAt: Date.now() + (j.expires_in || 900) * 1000,
  });
  return { pendingId, userCode: j.user_code, verificationUri: j.verification_uri || uri, verificationUriComplete: uri, interval: interval / 1000, expiresIn: j.expires_in || 900 };
}

// One poll step; the configure page calls this every few seconds until it returns done.
async function xaiPoll(pendingId) {
  const p = pending.get(pendingId);
  if (!p || p.type !== 'xai') throw new Error('This sign-in attempt has expired. Click "Sign in with Grok" again.');
  if (Date.now() > p.expiresAt) {
    pending.delete(pendingId);
    throw new Error('The code expired before it was approved. Click "Sign in with Grok" again.');
  }
  if (Date.now() < p.nextPoll || p.polling) return { status: 'pending' };
  p.polling = true;
  try {
    const { ok, j } = await xaiForm('/oauth2/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: XAI_CLIENT_ID,
      device_code: p.deviceCode,
    });
    p.nextPoll = Date.now() + p.interval;
    if (ok && j.access_token) {
      pending.delete(pendingId);
      const claims = jwtClaims(j.id_token);
      const id = rand(18);
      saveCred(id, {
        type: 'xai',
        access_token: j.access_token,
        refresh_token: j.refresh_token || null,
        expires_at: Date.now() + (j.expires_in || 3600) * 1000,
        scopes: j.scope ? j.scope.split(/\s+/) : XAI_SCOPES.split(' '),
        email: claims.email || null,
        saved_at: new Date().toISOString(),
      });
      return { status: 'done', credId: id, email: claims.email || null };
    }
    if (j.error === 'authorization_pending') return { status: 'pending' };
    if (j.error === 'slow_down') {
      p.interval += 5000;
      p.nextPoll = Date.now() + p.interval;
      return { status: 'pending' };
    }
    pending.delete(pendingId);
    if (j.error === 'access_denied' || j.error === 'authorization_denied') throw new Error('The sign-in was declined on x.ai.');
    if (j.error === 'expired_token') throw new Error('The code expired before it was approved. Click "Sign in with Grok" again.');
    throw new Error(`xAI sign-in failed: ${j.error_description || j.error || 'unknown error'}`);
  } finally {
    p.polling = false;
  }
}

function refreshXai(id, force = false) {
  if (refreshing.has(id)) return refreshing.get(id);
  const run = (async () => {
    const cur = loadCred(id);
    if (!cur || cur.type !== 'xai') throw Object.assign(new Error('Grok sign-in not found. Sign in again on the configure page.'), { fatal: true });
    if (!force && cur.expires_at - Date.now() > 120e3) return cur.access_token;
    if (!cur.refresh_token) {
      saveCred(id, { ...cur, needsReauth: true });
      throw Object.assign(new Error('Grok sign-in has expired. Sign in again on the configure page.'), { fatal: true });
    }
    try {
      const { ok, status, j } = await xaiForm('/oauth2/token', { grant_type: 'refresh_token', client_id: XAI_CLIENT_ID, refresh_token: cur.refresh_token });
      if (!ok || !j.access_token) {
        if (status >= 400 && status < 500) {
          saveCred(id, { ...cur, needsReauth: true });
          throw Object.assign(new Error('Grok sign-in has expired. Sign in again on the configure page.'), { fatal: true });
        }
        throw new Error(`xAI token refresh failed: ${j.error_description || j.error || `HTTP ${status}`}`);
      }
      saveCred(id, {
        ...cur,
        access_token: j.access_token,
        refresh_token: j.refresh_token || cur.refresh_token,
        expires_at: Date.now() + (j.expires_in || 3600) * 1000,
        saved_at: new Date().toISOString(),
        needsReauth: false,
      });
      return j.access_token;
    } finally {
      refreshing.delete(id);
    }
  })();
  refreshing.set(id, run);
  return run;
}

async function xaiAccessToken(id) {
  const c = loadCred(id);
  if (!c || c.type !== 'xai') throw Object.assign(new Error('Grok sign-in not found. Sign in again on the configure page.'), { fatal: true });
  if (c.needsReauth) throw Object.assign(new Error('Grok sign-in has expired. Sign in again on the configure page.'), { fatal: true });
  if (c.expires_at - Date.now() > 120e3) return c.access_token;
  return refreshXai(id);
}

// Refresh tokens last 30 days and rotate on use: refresh idle sign-ins weekly so they never lapse.
function keepAlive() {
  try {
    for (const f of fs.readdirSync(CRED_DIR)) {
      if (!f.endsWith('.json')) continue;
      const id = f.slice(0, -5);
      const c = loadCred(id);
      if (!c || c.needsReauth || Date.now() - Date.parse(c.saved_at || 0) < 7 * 86400e3) continue;
      const refresh = c.type === 'chatgpt' ? refreshChatgpt : c.type === 'xai' && c.refresh_token ? refreshXai : null;
      if (refresh) refresh(id, true).catch((e) => console.error(`[auth] keep-alive refresh failed: ${e.message}`));
    }
  } catch { /* ignore */ }
}
setInterval(keepAlive, 6 * 3600e3).unref();
setTimeout(keepAlive, 30e3).unref();

module.exports = {
  openrouterStart,
  openrouterFinish,
  staticKey,
  chatgptStart,
  chatgptFinish,
  chatgptAccessToken,
  refreshChatgpt,
  xaiStart,
  xaiPoll,
  xaiAccessToken,
  refreshXai,
  credSummary,
  deleteCred,
  CHATGPT_REDIRECT,
};
