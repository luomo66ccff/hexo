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
for (const script of ['luomo-reading.js', 'luomo-command.js']) assert.ok(read('index.html').includes(`/js/${script}`), `${script} must be injected`);
// Self-numbered post headings skip the automatic section number (scripts/luomo-headings.js).
assert.ok(read('posts/7a1d0a11.html').includes('class="lm-own-number"'), 'numbered headings must be marked');
assert.equal(read('posts/3d61fa8b.html').includes('lm-own-number'), false, 'unnumbered headings keep the automatic number');
// Sidebar widgets from source/_data/widget.yml render as-is (the visitor globe lives there).
assert.ok(/id="user-map"[\s\S]*class="lm-globe" data-endpoint="\/api\/visitors"/.test(read('index.html')), 'visitor star-map globe must render in the sidebar');
assert.ok(read('index.html').includes('/js/luomo-globe.js'), 'globe script must be injected');
// The analytics script is opt-in (VERCEL_WEB_ANALYTICS_SCRIPT) and must stay same-site.
assert.equal(/<script[^>]+src="https?:\/\/[^"]*insights/.test(read('index.html')), false, 'analytics script must be same-site');
// Home sections from source/_data/home.yml render once, on the first home page only.
assert.equal((read('index.html').match(/class="lm-gates"/g) || []).length, 1, 'home must render the starport gates once');
assert.equal(read('archives/index.html').includes('class="lm-gates"'), false, 'gates belong to the home page only');
// 夜航书 home composition (scripts/luomo-home.js): cover story, issue strip, star index.
const home = read('index.html');
for (const marker of ['class="lm-feature"', 'class="lm-issue"', 'class="lm-starmap"']) {
  assert.equal(home.split(marker).length - 1, 1, `home must render ${marker} once`);
}
assert.ok(home.indexOf('class="lm-starmap"') < home.indexOf('id="aside-content"'), 'star index must close the post column, before the aside');
assert.equal(/class="lm-(feature|starmap|issue)"/.test(read('archives/index.html')), false, 'home sections belong to the home page only');
assert.equal(fs.existsSync(path.join(root, 'status/config.js')), false, 'legacy public configuration must not be deployed');
assert.equal(fs.existsSync(path.join(root, 'status/static')), false, 'legacy status bundles must not be deployed');
// Post tags keep front-matter order; the first tag is the main topic (scripts/luomo-tag-order.js).
const postsDir = path.resolve(__dirname, '../source/_posts');
let taggedPosts = 0;
for (const name of fs.readdirSync(postsDir).filter(file => file.endsWith('.md'))) {
  const front = fs.readFileSync(path.join(postsDir, name), 'utf8').split(/^---\s*$/m)[1] || '';
  const id = (front.match(/^abbrlink:\s*['"]?([0-9a-f]+)/m) || [])[1];
  const block = front.match(/^tags:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m);
  if (!id || !block || /^published:\s*false/m.test(front)) continue;
  const expected = block[1].split('\n').map(line => line.replace(/^\s*-\s*/, '').trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean);
  const actual = [...read(`posts/${id}.html`).matchAll(/class="post-meta__tags" href="[^"]*">([^<]*)</g)].map(match => match[1]);
  assert.deepEqual(actual, expected, `posts/${id}.html tags must keep front-matter order`);
  taggedPosts++;
}
assert.ok(taggedPosts >= 5, 'tag order check found too few posts');
// Third-party banners carry a credit; the owner's own images stay unlabelled.
// Check the actual theme selection, including post cover fallbacks.
const imageCreditData = require('../source/_data/image_credits.json');
const imageCredits = imageCreditData.images;
const ownedImages = new Set(imageCreditData.owned_images);
const creditPage = read('image-credits/index.html');
const creditByImage = new Map();
const creditIds = new Set();
for (const image of ownedImages) {
  assert.ok(fs.existsSync(path.join(root, image)), `owned image missing: ${image}`);
  assert.equal(creditPage.includes(image), false, `owned image must not appear on the credits page: ${image}`);
}
for (const credit of imageCredits) {
  assert.ok(/^[a-z0-9-]+$/.test(credit.id) && !creditIds.has(credit.id), `invalid or duplicate image credit id: ${credit.id}`);
  assert.ok(!creditByImage.has(credit.image), `duplicate image credit: ${credit.image}`);
  assert.equal(ownedImages.has(credit.image), false, `image cannot be both owned and third-party: ${credit.image}`);
  assert.ok(fs.existsSync(path.join(root, credit.image)), `credited image missing: ${credit.image}`);
  assert.ok(creditPage.includes(`id="${credit.id}"`), `credit detail anchor missing: ${credit.id}`);
  creditIds.add(credit.id);
  creditByImage.set(credit.image, credit);
}
assert.equal((creditPage.match(/<h1\b/g) || []).length, 1, 'image credits page must have one main heading');
let creditedBanners = 0;
let ownedBanners = 0;
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
      if (entry.name.endsWith('.html')) {
        // Third-party assets are served locally (hexo-butterfly-extjs + luomo-local-assets.js).
        assert.equal(text.includes('cdn.jsdelivr.net'), false, `jsDelivr reference in ${filename}`);
        // Analytics goes before the real </body>, not one inside an inline script (the Mermaid viewer has one).
        const analytics = text.indexOf('window.va=window.va');
        if (analytics !== -1) assert.equal(text.indexOf('</body>', analytics), text.lastIndexOf('</body>'), `analytics injected inside an inline script in ${filename}`);
        for (const [, asset] of text.matchAll(/["'(](\/pluginsSrc\/[^"'?)\s]+)/g)) {
          assert.ok(fs.existsSync(path.join(root, asset)), `missing local asset ${asset} (${filename})`);
        }
        const header = text.match(/<header\b[^>]*\bid="page-header"[^>]*>[\s\S]*?<\/header>/);
        if (header) {
          // Butterfly 4.13 quotes the url ('...'); 5.x writes it bare.
          const match = header[0].match(/background-image:\s*url\((['"]?)([^'")]+)\1\)/);
          const image = match && [match[0], match[2]];
          if (image) {
            if (ownedImages.has(image[1])) {
              assert.equal(header[0].includes('class="banner-credit"'), false, `owned image must not have a banner credit in ${filename}`);
              ownedBanners++;
            } else {
              const credit = creditByImage.get(image[1]);
              assert.ok(credit, `banner missing from image credits registry: ${image[1]} (${filename})`);
              assert.ok(header[0].includes(`href="/image-credits/#${credit.id}"`), `wrong banner credit in ${filename}`);
              creditedBanners++;
            }
          } else {
            assert.equal(header[0].includes('class="banner-credit"'), false, `credit without a banner in ${filename}`);
          }
          if (path.relative(root, filename) !== '404.html') {
            assert.ok(text.includes('class="footer-image-credits"'), `image credits footer link missing in ${filename}`);
          }
        }
      }
      checked++;
    }
  }
}
inspect(root);
console.log(`Build checks passed: ${index.length} articles, four page headings, ${partials.length} style partials, ${creditedBanners} credited banners, ${ownedBanners} unlabelled owned banners, legacy status cleanup, ${taggedPosts} posts in tag order, ${checked} text assets.`);
