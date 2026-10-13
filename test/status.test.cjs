'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStatusHandler } = require('../lib/status-probe.cjs');
const FIXED_TIME = Date.parse('2026-10-11T13:00:00Z');

async function invoke(fetchImpl, { method = 'GET', url = '/api/status' } = {}) {
  const headers = {};
  let raw;
  const res = { setHeader(key, value) { headers[key] = value; }, end(value) { raw = value; } };
  await createStatusHandler({ fetchImpl, now: () => FIXED_TIME })({ method, url }, res);
  return { code: res.statusCode, headers, raw, body: raw ? JSON.parse(raw) : null };
}

test('caller input cannot select a target or cause a request', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; throw new Error('must not run'); };
  for (const url of ['/api/status?url=http://127.0.0.1/', '/api/status?host=example.com', '/api/status?refresh=1']) {
    const response = await invoke(fetchImpl, { url });
    assert.equal(response.code, 400);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await invoke(fetchImpl, { method });
    assert.equal(response.code, 405);
    assert.equal(response.headers.Allow, 'GET, HEAD');
  }
  assert.equal(called, false);
});

test('six fixed HTTPS entrances are checked with HEAD, bounded time and manual redirects', async () => {
  const calls = [];
  const response = await invoke(async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 200 });
  });
  assert.equal(response.code, 200);
  assert.deepEqual(calls.map(call => call.url), [
    'https://ops.luomo.moe/', 'https://file.luomo.moe/', 'https://api.luomo.moe/',
    'https://atri-api.luomo.moe/', 'https://error.luomo.moe/', 'https://blog.luomo.moe/'
  ]);
  for (const { options } of calls) {
    assert.equal(options.method, 'HEAD');
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers.Cookie, undefined);
  }
  assert.equal(response.body.services.length, 6);
  assert.ok(response.body.services.every(service => service.status === 'online'));
  assert.equal(response.headers['Cache-Control'], 'public, max-age=0, s-maxage=60, must-revalidate');
});

test('real probe completion timestamps expire after two minutes', async () => {
  const response = await invoke(async () => new Response(null, { status: 204 }));
  const service = response.body.services[0];
  assert.equal(service.checkedAt, '2026-10-11T13:00:00.000Z');
  assert.equal(service.expiresAt, '2026-10-11T13:02:00.000Z');
  assert.equal(response.body.kind, 'public-http');
  assert.equal(response.body.schemaVersion, 1);
});

for (const code of [301, 302, 307, 308, 401, 403, 407, 429, 405, 501]) {
  test(`HTTP ${code} remains unconfirmed instead of claiming health or downtime`, async () => {
    let calls = 0;
    const response = await invoke(async () => {
      calls++;
      return new Response(null, { status: code, headers: { Location: 'http://127.0.0.1/private' } });
    });
    assert.equal(calls, 6);
    assert.ok(response.body.services.every(service => service.status === 'unknown'));
    const reason = code >= 300 && code < 400 ? 'redirect_unconfirmed'
      : [405, 501].includes(code) ? 'head_unsupported' : 'access_limited';
    assert.ok(response.body.services.every(service => service.reason === reason));
    assert.equal(response.headers['Cache-Control'], 'public, max-age=0, s-maxage=15, must-revalidate');
    assert.equal(response.raw.includes('127.0.0.1'), false);
  });
}

for (const code of [404, 418, 500, 502, 503, 504]) {
  test(`HTTP ${code} reports an entrance error without leaking upstream content`, async () => {
    const response = await invoke(async () => new Response('private upstream content', { status: code }));
    assert.ok(response.body.services.every(service => service.status === 'degraded'));
    assert.equal(response.raw.includes('private upstream content'), false);
  });
}

test('Cloudflare challenge headers never produce a green result', async () => {
  const response = await invoke(async () => new Response(null, { status: 200, headers: { 'cf-mitigated': 'challenge' } }));
  assert.ok(response.body.services.every(service => service.status === 'unknown'));
  assert.ok(response.body.services.every(service => service.reason === 'challenge_unconfirmed'));
});

test('timeouts and network failures are isolated; raw exceptions are not returned', async () => {
  let call = 0;
  const response = await invoke(async () => {
    call++;
    if (call === 1) throw new DOMException('private URL and credential', 'TimeoutError');
    if (call === 2) throw new Error('private URL and credential');
    return new Response(null, { status: 200 });
  });
  assert.equal(response.code, 200);
  assert.equal(response.body.services[0].reason, 'timeout');
  assert.equal(response.body.services[1].reason, 'network_unconfirmed');
  assert.ok(response.body.services.slice(2).every(service => service.status === 'online'));
  assert.equal(response.raw.includes('private URL'), false);
});

test('HEAD returns headers and no response body', async () => {
  const response = await invoke(async () => new Response(null, { status: 200 }), { method: 'HEAD' });
  assert.equal(response.code, 200);
  assert.equal(response.raw, undefined);
  assert.equal(response.headers['X-Content-Type-Options'], 'nosniff');
});
