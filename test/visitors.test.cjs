'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVisitorsHandler, normalise } = require('../lib/visitor-countries.cjs');

const FIXED_TIME = Date.parse('2026-10-19T08:00:00Z');
const ENV = { VERCEL_ANALYTICS_TOKEN: 'tok_secret_value', VERCEL_ANALYTICS_PROJECT: 'hexo-nqq9', VERCEL_ANALYTICS_TEAM: 'team_abc' };

async function invoke(fetchImpl, { method = 'GET', url = '/api/visitors', env = ENV } = {}) {
  const headers = {};
  let raw;
  const res = { setHeader(key, value) { headers[key] = value; }, end(value) { raw = value; } };
  await createVisitorsHandler({ fetchImpl, now: () => FIXED_TIME, env })({ method, url }, res);
  return { code: res.statusCode, headers, raw, body: raw ? JSON.parse(raw) : null };
}

test('without configuration the globe is told it is unconfigured and nothing is fetched', async () => {
  let called = false;
  const response = await invoke(async () => { called = true; }, { env: {} });
  assert.equal(response.code, 200);
  assert.deepEqual(response.body, { schemaVersion: 1, status: 'unconfigured' });
  assert.equal(called, false);
});

test('caller input cannot change the query, and only GET/HEAD are allowed', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; throw new Error('must not run'); };
  for (const url of ['/api/visitors?projectId=other', '/api/visitors?since=2000-01-01', '/api/visitors?teamId=x']) {
    const response = await invoke(fetchImpl, { url });
    assert.equal(response.code, 400);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await invoke(fetchImpl, { method });
    assert.equal(response.code, 405);
  }
  assert.equal(called, false);
});

test('queries a fixed 90-day country breakdown with the server-side token', async () => {
  const calls = [];
  const response = await invoke(async (url, options) => {
    calls.push({ url: new URL(url), options });
    return Response.json({ data: [{ country: 'CN', count: 40, visitors: 31 }, { country: 'JP', count: 6, visitors: 5 }] });
  });
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url.origin + url.pathname, 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate');
  assert.equal(url.searchParams.get('projectId'), 'hexo-nqq9');
  assert.equal(url.searchParams.get('teamId'), 'team_abc');
  assert.equal(url.searchParams.get('by'), 'country');
  assert.equal(url.searchParams.get('since'), '2026-07-21');
  assert.equal(url.searchParams.get('until'), '2026-10-19');
  assert.equal(options.headers.Authorization, 'Bearer tok_secret_value');
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.total, 36);
  assert.deepEqual(response.body.countries, [{ code: 'CN', visitors: 31 }, { code: 'JP', visitors: 5 }]);
  assert.equal(response.raw.includes('tok_secret_value'), false);
  assert.equal(response.headers['Cache-Control'], 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
});

test('upstream errors degrade to "unavailable" with a safe reason code only', async () => {
  for (const [fetchImpl, reason] of [
    [async () => new Response('{"error":{"message":"forbidden tok_secret_value"}}', { status: 403 }), 'upstream_403'],
    [async () => new Response('not found', { status: 404 }), 'upstream_404'],
    [async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); }, 'upstream_timeout'],
    [async () => { throw new Error('network down tok_secret_value'); }, 'upstream_error'],
    [async () => new Response('<html>', { status: 200 }), 'upstream_invalid']
  ]) {
    const response = await invoke(fetchImpl);
    assert.equal(response.code, 200);
    assert.deepEqual(response.body, { schemaVersion: 1, status: 'unavailable', reason });
    assert.equal(response.raw.includes('tok_secret_value'), false);
    assert.equal(response.headers['Cache-Control'], 'public, max-age=0, s-maxage=60');
  }
});

test('a rejected 90-day range falls back to 30 then 7 days', async () => {
  const windows = [];
  const response = await invoke(async url => {
    const u = new URL(url);
    windows.push(u.searchParams.get('since'));
    if (windows.length < 3) return new Response('{"error":"range"}', { status: 400 });
    return Response.json({ data: [{ country: 'CN', visitors: 3 }] });
  });
  assert.deepEqual(windows, ['2026-07-21', '2026-09-19', '2026-10-12']);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.windowDays, 7);
  assert.equal(response.body.total, 3);
});

test('400 on every window reports upstream_400', async () => {
  let calls = 0;
  const response = await invoke(async () => { calls++; return new Response('bad', { status: 400 }); });
  assert.equal(calls, 3);
  assert.deepEqual(response.body, { schemaVersion: 1, status: 'unavailable', reason: 'upstream_400' });
});

test('rows are validated, merged and sorted; junk is dropped', () => {
  assert.deepEqual(normalise([
    { country: 'us', visitors: 3 },
    { country: 'US', count: 2 },
    { country: 'CN', visitors: 9 },
    { country: '', visitors: 4 },
    { country: 'Unknown', visitors: 4 },
    { country: 'JP', visitors: -1 },
    { country: 'DE', visitors: 'x' },
    null
  ]), [{ code: 'CN', visitors: 9 }, { code: 'US', visitors: 5 }]);
  assert.deepEqual(normalise(undefined), []);
});
