'use strict';

/*
 * /api/visitors — visitors per country for the sidebar star-map globe.
 *
 * Reads Vercel Web Analytics with a server-side token and returns only
 * aggregated, public-safe numbers (country code + visitor count). The token,
 * team and project ids come from environment variables and never reach the
 * browser. Until they are configured the endpoint answers
 * { status: "unconfigured" } and the globe shows "暂不可用".
 *
 * Environment (Vercel → Project → Settings → Environment Variables):
 *   VERCEL_ANALYTICS_TOKEN   access token that can read the project (sensitive)
 *   VERCEL_ANALYTICS_PROJECT project id or name, e.g. hexo-nqq9
 *   VERCEL_ANALYTICS_TEAM    team id (team_...), optional for personal scope
 */

const API = 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate';
// Longest window first; a 400 (e.g. a range beyond the plan's retention) falls back to the next.
const WINDOWS = [90, 30, 7];
const WINDOW_DAYS = WINDOWS[0];
const MAX_COUNTRIES = 60;
const TIMEOUT_MS = 3000;
const COUNTRY = /^[A-Z]{2}$/;

function send(req, res, code, body, cacheControl) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cacheControl);
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
}

function readConfig(env) {
  const token = (env.VERCEL_ANALYTICS_TOKEN || '').trim();
  const project = (env.VERCEL_ANALYTICS_PROJECT || '').trim();
  const team = (env.VERCEL_ANALYTICS_TEAM || '').trim();
  return token && project ? { token, project, team } : null;
}

function timestamp(ms) {
  return new Date(ms).toISOString();
}

function normalise(rows) {
  const totals = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const code = String(row && row.country || '').toUpperCase();
    const visitors = Number(row && (row.visitors ?? row.count));
    if (!COUNTRY.test(code) || !Number.isFinite(visitors) || visitors <= 0) continue;
    totals.set(code, (totals.get(code) || 0) + Math.round(visitors));
  }
  return [...totals]
    .map(([code, visitors]) => ({ code, visitors }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, MAX_COUNTRIES);
}

function createVisitorsHandler({ fetchImpl = globalThis.fetch, now = Date.now, env = process.env } = {}) {
  return async function visitorsHandler(req, res) {
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

    const config = readConfig(env);
    if (!config) {
      return send(req, res, 200, { schemaVersion: 1, status: 'unconfigured' }, 'public, max-age=0, s-maxage=300');
    }

    const until = now();
    // Status codes are safe to expose and make misconfiguration diagnosable
    // from the browser; tokens and upstream bodies never are.
    const unavailable = reason => {
      console.error(`visitors_${reason}`);
      return send(req, res, 200, { schemaVersion: 1, status: 'unavailable', reason }, 'public, max-age=0, s-maxage=60');
    };

    for (let i = 0; i < WINDOWS.length; i++) {
      const windowDays = WINDOWS[i];
      const since = until - windowDays * 86400000;
      const query = new URLSearchParams({
        projectId: config.project,
        by: 'country',
        // These are inclusive timestamps; a date-only until stops at UTC midnight.
        since: timestamp(since),
        until: timestamp(until),
        limit: String(MAX_COUNTRIES)
      });
      if (config.team) query.set('teamId', config.team);

      let response;
      try {
        response = await fetchImpl(`${API}?${query}`, {
          headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
      } catch (error) {
        return unavailable(error && error.name === 'TimeoutError' ? 'upstream_timeout' : 'upstream_error');
      }
      if (response.status === 400 && i < WINDOWS.length - 1) continue;
      if (!response.ok) return unavailable(`upstream_${response.status}`);

      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        return unavailable(error && error.name === 'TimeoutError' ? 'upstream_timeout' : 'upstream_invalid');
      }
      if (!payload || !Array.isArray(payload.data) || payload.error != null) {
        return unavailable('upstream_invalid');
      }
      const countries = normalise(payload.data);
      return send(req, res, 200, {
        schemaVersion: 1,
        status: 'ok',
        windowDays,
        since: timestamp(since),
        until: timestamp(until),
        total: countries.reduce((sum, item) => sum + item.visitors, 0),
        countries
      }, countries.length
        ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
        : 'public, max-age=0, s-maxage=60');
    }
    return unavailable('upstream_400');
  };
}

module.exports = { createVisitorsHandler, normalise, WINDOW_DAYS, WINDOWS };
