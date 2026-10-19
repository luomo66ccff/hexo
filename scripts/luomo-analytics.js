'use strict';

/*
 * Vercel Web Analytics for this plain static site.
 *
 * Vercel serves the tracking script from a project-specific path that is
 * shown after Web Analytics is enabled (Project → Analytics). Set it as the
 * build environment variable VERCEL_WEB_ANALYTICS_SCRIPT, e.g.
 * "/<unique-path>/script.js". Without it nothing is injected, so local and
 * preview builds stay clean.
 */
const SCRIPT = (process.env.VERCEL_WEB_ANALYTICS_SCRIPT || '').trim();
const SAFE_PATH = /^\/[A-Za-z0-9._~\-/]+\.js$/;

hexo.extend.injector.register('body_end', () => {
  if (!SCRIPT) return '';
  if (!SAFE_PATH.test(SCRIPT)) {
    hexo.log.warn('[luomo-analytics] VERCEL_WEB_ANALYTICS_SCRIPT must be a same-site path ending in .js; skipped');
    return '';
  }
  return '<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>' +
    `<script defer src="${SCRIPT}"></script>`;
});
