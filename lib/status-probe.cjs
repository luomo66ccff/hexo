'use strict';

const SERVICES = Object.freeze([
  Object.freeze({ id: 'ops', url: 'https://ops.luomo.moe/' }),
  Object.freeze({ id: 'file', url: 'https://file.luomo.moe/' }),
  Object.freeze({ id: 'api', url: 'https://api.luomo.moe/' }),
  Object.freeze({ id: 'atri', url: 'https://atri-api.luomo.moe/' }),
  Object.freeze({ id: 'error', url: 'https://error.luomo.moe/' }),
  Object.freeze({ id: 'blog', url: 'https://blog.luomo.moe/' })
]);
const PROBE_TIMEOUT_MS = 4000;
const RESULT_TTL_MS = 120000;

function classify(response) {
  const code = response.status;
  if (response.headers.get('cf-mitigated') === 'challenge') {
    return { status: 'unknown', reason: 'challenge_unconfirmed' };
  }
  if ([401, 403, 407, 429].includes(code)) {
    return { status: 'unknown', reason: 'access_limited' };
  }
  if ([405, 501].includes(code)) {
    return { status: 'unknown', reason: 'head_unsupported' };
  }
  if (code >= 200 && code < 300) {
    return { status: 'online', reason: 'http_ok' };
  }
  if (code >= 300 && code < 400) {
    return { status: 'unknown', reason: 'redirect_unconfirmed' };
  }
  if (code >= 400 && code < 600) {
    return { status: 'degraded', reason: 'http_error' };
  }
  return { status: 'unknown', reason: 'network_unconfirmed' };
}

async function probe(service, fetchImpl, now) {
  let result;
  let httpStatus = null;
  try {
    const response = await fetchImpl(service.url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { 'User-Agent': 'LuomoBlogStatus/1.0', Accept: '*/*' }
    });
    httpStatus = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
    result = classify(response);
    if (response.body) await response.body.cancel();
  } catch (error) {
    result = {
      status: 'unknown',
      reason: error && ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'timeout' : 'network_unconfirmed'
    };
  }
  // This timestamp records a completed server-side attempt, never page-open time.
  const completedAt = now();
  return {
    id: service.id,
    ...result,
    httpStatus,
    checkedAt: new Date(completedAt).toISOString(),
    expiresAt: new Date(completedAt + RESULT_TTL_MS).toISOString()
  };
}

function send(req, res, code, body, cacheControl) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cacheControl);
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
}

function createStatusHandler({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  return async function statusHandler(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return send(req, res, 405, { error: 'method_not_allowed' }, 'no-store');
    }
    let requestUrl;
    try {
      requestUrl = new URL(req.url, 'https://blog.luomo.moe');
    } catch (_) {
      return send(req, res, 400, { error: 'invalid_request' }, 'no-store');
    }
    if (requestUrl.search) {
      return send(req, res, 400, { error: 'parameters_not_supported' }, 'no-store');
    }
    try {
      const services = await Promise.all(SERVICES.map(service => probe(service, fetchImpl, now)));
      const cacheSeconds = services.every(service => service.status === 'unknown') ? 15 : 60;
      return send(req, res, 200, {
        schemaVersion: 1,
        kind: 'public-http',
        generatedAt: new Date(now()).toISOString(),
        services
      }, `public, max-age=0, s-maxage=${cacheSeconds}, must-revalidate`);
    } catch (_) {
      console.error('status_snapshot_unavailable');
      return send(req, res, 503, { error: 'snapshot_unavailable' }, 'no-store');
    }
  };
}

module.exports = { createStatusHandler };
