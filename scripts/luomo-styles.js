'use strict';

/*
 * Bundles the Luomo visual layer into a single stylesheet.
 *
 * Partials live in source/_luomo/styles/*.css (Hexo ignores "_" folders, so
 * they are never published on their own). They are joined in file-name order
 * and served as /css/luomo-theme.css, the path injected in the theme config.
 * See docs/FRONTEND.md for what each partial owns.
 */
const fs = require('node:fs');
const path = require('node:path');

const OUTPUT = 'css/luomo-theme.css';

function bundle() {
  const dir = path.join(hexo.source_dir, '_luomo', 'styles');
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.css')).sort();
  if (!files.length) throw new Error(`luomo-styles: no partials found in ${dir}`);
  return files
    .map(name => `/* ==== ${name} ==== */\n${fs.readFileSync(path.join(dir, name), 'utf8').trim()}\n`)
    .join('\n');
}

hexo.extend.generator.register('luomo-styles', () => ({
  path: OUTPUT,
  // Read lazily so `hexo server` picks up edits without a restart.
  data: () => bundle()
}));
