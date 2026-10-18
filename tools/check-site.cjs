'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = JSON.parse(read('search.json'));
assert.ok(index.length >= 5, 'all existing published articles must remain searchable');
for (const id of ['7a032026', 'fa8c2026', '3d61fa8b', '9f7e31ac', '7c2a4f61']) {
  assert.ok(index.some(entry => entry.url.includes(id)), `missing searchable article ${id}`);
  assert.ok(fs.existsSync(path.join(root, `posts/${id}.html`)), `missing article ${id}`);
}
for (const route of ['projects', 'cloud', 'build-log', 'status']) {
  const html = read(`${route}/index.html`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${route} must have one main heading`);
  assert.ok(html.includes('name="description"'), `${route} needs a search description`);
}
assert.ok(/<link\b[^>]*rel="canonical"[^>]*href="https:\/\/blog\.luomo\.moe\/"/.test(read('index.html')), 'canonical homepage should use the directory URL');
// Visual layer: every partial is bundled, none is published on its own.
const theme = read('css/luomo-theme.css');
const partials = fs.readdirSync(path.resolve(__dirname, '../source/_luomo/styles')).filter(name => name.endsWith('.css'));
for (const name of partials) assert.ok(theme.includes(`==== ${name} ====`), `style partial ${name} missing from css/luomo-theme.css`);
assert.equal(fs.existsSync(path.join(root, '_luomo')), false, 'style partials must not be published');
assert.ok(read('index.html').includes('/js/luomo-ui.js'), 'interaction layer must be injected');
assert.equal(fs.existsSync(path.join(root, 'status/config.js')), false, 'legacy public configuration must not be deployed');
assert.equal(fs.existsSync(path.join(root, 'status/static')), false, 'legacy status bundles must not be deployed');
let checked = 0;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(filename);
    else if (/\.(?:html|js|css|json|xml|md)$/i.test(entry.name)) {
      const text = fs.readFileSync(filename, 'utf8');
      assert.equal(/\bm\d{5,}-[A-Za-z0-9]{12,}\b/.test(text), false, 'monitor credentials found in generated assets');
      assert.equal(text.includes('cors.status.org.cn'), false, 'legacy third-party credential forwarding must not ship');
      assert.equal(/yourname\.(?:js|css)/.test(text), false, 'placeholder status assets must not ship');
      checked++;
    }
  }
}
inspect(root);
console.log(`Build checks passed: ${index.length} articles, four page headings, ${partials.length} style partials, legacy status cleanup, ${checked} text assets.`);
