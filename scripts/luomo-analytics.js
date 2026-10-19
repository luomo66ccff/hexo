'use strict';

/*
 * Vercel Web Analytics for this plain static site.
 *
 * Vercel serves the tracking script from a project-specific path that is
 * shown after Web Analytics is enabled (Project → Analytics). Set it as the
 * build environment variable VERCEL_WEB_ANALYTICS_SCRIPT, e.g.
 * "/<unique-path>/script.js". Without it nothing is injected, so local and
 * preview builds stay clean.
 *
 * Not a body_end injector: Hexo inserts those before the FIRST "</body>",
 * and the theme's Mermaid script carries "</body></html>" inside a template
 * string, so the snippet landed in that script, closed it early and printed
 * the rest of the code on every page. Insert before the last "</body>".
 */
const SCRIPT = (process.env.VERCEL_WEB_ANALYTICS_SCRIPT || '').trim();
const SAFE_PATH = /^\/[A-Za-z0-9._~\-/]+\.js$/;

let snippet = '';
if (SCRIPT && !SAFE_PATH.test(SCRIPT)) {
  hexo.log.warn('[luomo-analytics] VERCEL_WEB_ANALYTICS_SCRIPT must be a same-site path ending in .js; skipped');
} else if (SCRIPT) {
  snippet = '<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>' +
    `<script defer src="${SCRIPT}"></script>`;
}

hexo.extend.filter.register('after_render:html', html => {
  if (!snippet || typeof html !== 'string') return html;
  const end = html.lastIndexOf('</body>');
  return end === -1 ? html : html.slice(0, end) + snippet + html.slice(end);
});
