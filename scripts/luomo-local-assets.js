'use strict';

/*
 * Serve hexo-tag-hint's stylesheet from this site instead of jsDelivr, in
 * line with CDN.third_party_provider: local (hexo-butterfly-extjs covers the
 * theme's own third-party scripts but not other plugins).
 */
const fs = require('node:fs');
const path = require('node:path');

const PKG = 'hexo-tag-hint';
const FILE = 'dist/hexo-tag-hint.min.css';
const LOCAL = `/pluginsSrc/${PKG}/${FILE}`;
const REMOTE = /https:\/\/cdn\.jsdelivr\.net\/npm\/hexo-tag-hint@[^/]+\/dist\/hexo-tag-hint\.min\.css/g;

function sourcePath() {
  try {
    return path.join(path.dirname(require.resolve(`${PKG}/package.json`, { paths: [hexo.base_dir] })), FILE);
  } catch (_) {
    return null;
  }
}

hexo.extend.generator.register('luomo-local-assets', () => {
  const file = sourcePath();
  if (!file || !fs.existsSync(file)) return [];
  return { path: LOCAL.slice(1), data: () => fs.createReadStream(file) };
});

// Runs after hexo-tag-hint's own after_post_render filter (default priority 10).
hexo.extend.filter.register('after_post_render', data => {
  if (sourcePath() && data.content) data.content = data.content.replace(REMOTE, LOCAL);
  return data;
}, 20);
