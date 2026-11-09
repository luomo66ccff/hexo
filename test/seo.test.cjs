'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const vercel = JSON.parse(read('vercel.json'));
const KEY = '75a69cf4a84876a314f8d3108ab52655';

test('middleware maps the four entrances for the exact March7th host, including case and port', async () => {
  const { resolveMarch7thPath, config } = await import('../middleware.js');
  assert.deepEqual(config.matcher, ['/', '/robots.txt', '/sitemap.xml', '/llms.txt']);
  const mappings = {
    '/': '/march7th/index.html',
    '/robots.txt': '/march7th/robots.txt',
    '/sitemap.xml': '/march7th/sitemap.xml',
    '/llms.txt': '/march7th/llms.txt'
  };
  for (const host of ['march7th.cn', 'MARCH7TH.CN:443', 'march7th.cn:80']) {
    for (const [pathname, destination] of Object.entries(mappings)) {
      assert.equal(resolveMarch7thPath(host, pathname), destination);
    }
  }
});

test('middleware passes through blog, subdomains, lookalike hosts and unmatched paths', async () => {
  const { resolveMarch7thPath } = await import('../middleware.js');
  for (const host of ['blog.luomo.moe', 'www.march7th.cn', 'luomo.march7th.cn', 'evilmarch7th.cn', 'march7th.cn.evil.com']) {
    for (const pathname of ['/', '/robots.txt', '/sitemap.xml', '/llms.txt']) {
      assert.equal(resolveMarch7thPath(host, pathname), null);
    }
  }
  for (const pathname of ['/posts/abc.html', '/march7th/favicon.svg', '/api/status', '/favicon.ico', `/${KEY}.txt`, '/robots.txt/']) {
    assert.equal(resolveMarch7thPath('march7th.cn', pathname), null);
  }
});

test('default middleware uses the real Vercel rewrite/next helpers and preserves query parameters', async () => {
  const { default: middleware } = await import('../middleware.js');
  const rewrite = middleware(new Request('https://MARCH7TH.CN:443/robots.txt?probe=1'));
  assert.equal(rewrite.headers.get('x-middleware-rewrite'), 'https://march7th.cn/march7th/robots.txt?probe=1');
  for (const url of ['https://blog.luomo.moe/', 'https://www.march7th.cn/robots.txt', 'https://march7th.cn/posts/abc.html']) {
    const response = middleware(new Request(url));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.has('x-middleware-rewrite'), false);
  }
});

// Simulates Vercel's redirect phase: rules in order, sources compiled with the same
// path-to-regexp version and options Vercel's routing-utils use (strict, case-sensitive),
// host conditions as either { eq } (exact) or a fully-anchored regex string.
const { pathToRegexp, compile } = require('path-to-regexp');
function hostMatches(condition, host) {
  if (condition.type !== 'host') throw new Error(`unexpected condition ${condition.type}`);
  if (typeof condition.value === 'object') return host === condition.value.eq;
  return new RegExp(`^${condition.value}$`).test(host);
}
function redirectFor(host, pathname) {
  for (const rule of vercel.redirects) {
    const keys = [];
    const match = pathToRegexp(rule.source, keys, { strict: true, sensitive: true, delimiter: '/' }).exec(pathname);
    if (!match) continue;
    if (rule.has && !rule.has.every(condition => hostMatches(condition, host))) continue;
    if (rule.missing && rule.missing.some(condition => hostMatches(condition, host))) continue;
    const params = Object.fromEntries(keys.map((key, index) => [key.name, match[index + 1] ?? '']));
    const destination = rule.destination.replace(/:([A-Za-z_]\w*)/g, (_, name) => name in params ? params[name] : `:${name}`);
    return { status: rule.statusCode ?? (rule.permanent ? 308 : 307), location: destination };
  }
  return null;
}

test('redirect host conditions use exact equality', () => {
  for (const rule of vercel.redirects) {
    for (const condition of [...(rule.has ?? []), ...(rule.missing ?? [])]) {
      assert.deepEqual(condition, { type: 'host', value: { eq: 'march7th.cn' } });
    }
  }
  // Rewrites run after the filesystem; none may target the March7th entrance paths.
  for (const rule of vercel.rewrites ?? []) {
    assert.ok(!/^\/(?:$|robots\.txt|sitemap\.xml|llms\.txt|march7th)/.test(rule.source), `rewrite ${rule.source} overlaps the March7th entrance`);
  }
});

test('march7th.cn: entrance resources stay, everything else 301s to the same blog path', () => {
  for (const pathname of ['/', '/robots.txt', '/sitemap.xml', '/llms.txt', '/march7th/', '/march7th/index.html', '/march7th/favicon.svg', `/${KEY}.txt`]) {
    assert.equal(redirectFor('march7th.cn', pathname), null, `${pathname} must be served on march7th.cn`);
  }
  for (const pathname of ['/posts/abc.html', '/tags/x/', '/atom.xml', '/search.json', '/baidusitemap.xml', '/api/status', '/api/visitors', '/index.html', '/favicon.ico', '/robots.txt/', '/ROBOTS.TXT', '/march7th']) {
    assert.deepEqual(redirectFor('march7th.cn', pathname), { status: 301, location: `https://blog.luomo.moe${pathname}` }, pathname);
  }
});

test('blog host: existing behaviour kept, March7th copies sent to march7th.cn, favicon fixed', () => {
  for (const pathname of ['/', '/robots.txt', '/sitemap.xml', '/llms.txt', '/posts/3d61fa8b.html', '/tags/x/', '/atom.xml', '/api/status', `/${KEY}.txt`, '/march7thevil/', '/march7th.html']) {
    assert.equal(redirectFor('blog.luomo.moe', pathname), null, pathname);
  }
  assert.deepEqual(redirectFor('blog.luomo.moe', '/index.html'), { status: 308, location: '/' });
  for (const pathname of ['/march7th', '/march7th/', '/march7th/index.html', '/march7th/favicon.svg', '/march7th/a/b/']) {
    assert.deepEqual(redirectFor('blog.luomo.moe', pathname), { status: 301, location: 'https://march7th.cn/' }, pathname);
  }
  assert.deepEqual(redirectFor('blog.luomo.moe', '/favicon.ico'), { status: 302, location: '/img/logo-192.png' });
});

test('lookalike hosts never take the march7th.cn redirects', () => {
  for (const host of ['march7thXcn', 'www.march7th.cn', 'evilmarch7th.cn', 'march7th.cn.evil.com']) {
    assert.equal(redirectFor(host, '/posts/abc.html'), null, host);
    assert.deepEqual(redirectFor(host, '/march7th/'), { status: 301, location: 'https://march7th.cn/' }, host);
  }
});

test('redirect chains terminate without loops', () => {
  for (const [host, start] of [['march7th.cn', '/favicon.ico'], ['march7th.cn', '/march7th'], ['march7th.cn', '/index.html'], ['blog.luomo.moe', '/march7th/']]) {
    let current = { host, pathname: start };
    const seen = new Set();
    for (let hop = 0; hop < 5; hop += 1) {
      const id = `${current.host}${current.pathname}`;
      assert.ok(!seen.has(id), `loop at ${id}`);
      seen.add(id);
      const next = redirectFor(current.host, current.pathname);
      if (!next) break;
      const url = new URL(next.location, `https://${current.host}`);
      current = { host: url.host, pathname: url.pathname };
      assert.ok(hop < 4, `too many hops from ${host}${start}`);
    }
  }
});

let generator;
vm.runInNewContext(read('scripts/luomo-llms.js'), {
  require, URL,
  hexo: { extend: { generator: { register(name, callback) {
    assert.equal(name, 'luomo-llms');
    generator = callback;
  } } } }
});

test('llms generator sorts posts deterministically and uses cleaned descriptions, excerpts and 120 characters', () => {
  const posts = [
    { title: '旧文', path: 'posts/old.html', date: new Date('2026-01-01'), content: `<p>${'星🌟'.repeat(100)}</p>` },
    { title: '中[文]', path: 'posts/middle.html', date: new Date('2026-06-01'), description: '  ', excerpt: '<p>摘录 &amp;&nbsp;&nbsp;\n 内容</p>', content: 'unused' },
    { title: '新文', path: 'posts/3d61fa8b.html', date: new Date('2026-11-09'), description: '<p>简介</p><p>优先</p>', excerpt: 'unused' }
  ];
  const site = { posts: { toArray: () => posts.slice() }, pages: { toArray: () => [] } };
  const context = { config: { url: 'https://blog.luomo.moe', description: '  网站\n摘要 ' } };
  const output = generator.call(context, site);
  assert.equal(output.path, 'llms.txt');
  assert.ok(output.data.startsWith('# Luomoの云日常\n\n> 网站 摘要\n'));
  const lines = output.data.split('\n').filter(line => line.startsWith('- ['));
  assert.equal(lines[0], '- [新文](https://blog.luomo.moe/posts/3d61fa8b.html): 简介 优先');
  assert.equal(lines[1], '- [中\\[文\\]](https://blog.luomo.moe/posts/middle.html): 摘录 & 内容');
  assert.equal(lines[2], `- [旧文](https://blog.luomo.moe/posts/old.html): ${'星🌟'.repeat(60)}`);
  assert.equal(generator.call(context, site).data, output.data);
  site.posts.toArray = () => posts.slice().reverse();
  assert.equal(generator.call(context, site).data, output.data);
});

test('llms generator includes only existing allowed pages with a rendered layout', () => {
  const pages = [
    { title: '关于', path: 'about/index.html', content: '作者简介' },
    { title: '状态', path: 'status/index.html', layout: false },
    { title: '项目', path: 'projects/index.html', description: '项目介绍' },
    { title: '隐藏', path: 'cloud/index.html', layout: 'false' },
    { title: '独立入口', path: 'march7th/index.html' },
    { title: '其他', path: 'other/index.html' }
  ];
  const site = { posts: { toArray: () => [] }, pages: { toArray: () => pages } };
  const { data } = generator.call({ config: { url: 'https://blog.luomo.moe/', description: '简介' } }, site);
  assert.ok(data.includes('- [项目](https://blog.luomo.moe/projects/): 项目介绍'));
  assert.ok(data.includes('- [关于](https://blog.luomo.moe/about/): 作者简介'));
  assert.equal(/隐藏|独立入口|其他|\[状态\]/.test(data), false);
  assert.ok(data.includes('https://blog.luomo.moe/atom.xml'));
  assert.ok(data.includes('https://blog.luomo.moe/sitemap.xml'));
});

test('March7th cards, structured data and llms.txt contain the same 22 destinations', () => {
  const html = read('source/march7th/index.html');
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const graph = JSON.parse(scripts[0][1])['@graph'];
  const list = graph.find(item => item['@type'] === 'ItemList');
  const cards = [...html.matchAll(/<a class="tool-card" href="([^"]+)"[^>]*rel="noopener"[^>]*>\s*<h3>/g)].map(match => match[1]);
  assert.equal(cards.length, 22);
  assert.equal(new Set(cards).size, 22);
  assert.deepEqual(cards, list.itemListElement.map(entry => entry.item.url));
  assert.equal(list.numberOfItems, 22);
  const llms = read('source/march7th/llms.txt');
  for (const [index, entry] of list.itemListElement.entries()) {
    assert.equal(entry.position, index + 1);
    assert.equal(entry.item['@type'], 'WebApplication');
    assert.equal(entry.item.operatingSystem, 'Web');
    assert.equal(entry.item.inLanguage, 'zh-CN');
    assert.ok(entry.item.name && entry.item.applicationCategory);
    assert.ok(llms.includes(`](${entry.item.url})`));
  }
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal(/<script\b[^>]*\bsrc\s*=|\bnofollow\b/.test(html), false);
  assert.ok(Buffer.byteLength(html) < 40 * 1024);
});

test('IndexNow defaults to dry-run, decodes sitemap URLs and groups deduplicated URLs by host', async () => {
  const messages = [];
  let fetchCalls = 0;
  const process = { argv: ['node', 'tools/indexnow-submit.cjs'], exitCode: 0 };
  const sitemap = '<urlset><url><loc>https://blog.luomo.moe/posts/3d61fa8b.html</loc></url>'
    + '<url><loc>https://blog.luomo.moe/posts/other.html?x=1&amp;y=2</loc></url>'
    + '<url><loc>https://blog.luomo.moe/posts/3d61fa8b.html</loc></url></urlset>';
  await vm.runInNewContext(read('tools/indexnow-submit.cjs'), {
    __dirname: path.join(root, 'tools'), URL, process,
    require(name) {
      if (name !== 'node:fs') return require(name);
      return { readFileSync(file) {
        assert.equal(file, path.join(root, 'public/sitemap.xml'));
        return sitemap;
      } };
    },
    console: { log: value => messages.push(value), error: value => assert.fail(value) },
    fetch() { fetchCalls++; throw new Error('dry-run must not make requests'); }
  });
  assert.equal(fetchCalls, 0);
  assert.equal(process.exitCode, 0);
  const payloads = messages.filter(value => value.startsWith('{')).map(value => JSON.parse(value));
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].host, 'blog.luomo.moe');
  assert.deepEqual(payloads[0].urlList, [
    'https://blog.luomo.moe/posts/3d61fa8b.html',
    'https://blog.luomo.moe/posts/other.html?x=1&y=2'
  ]);
  assert.deepEqual(payloads[1].urlList, ['https://march7th.cn/']);
  for (const payload of payloads) {
    assert.equal(payload.key, KEY);
    assert.equal(payload.keyLocation, `https://${payload.host}/${KEY}.txt`);
  }
});
