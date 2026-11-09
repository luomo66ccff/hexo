'use strict';

const { stripHTML, unescapeHTML } = require('hexo-util');

function plainText(value) {
  const html = String(value ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|div|h[1-6]|li|br|section|blockquote|pre)\b[^>]*>/gi, ' ');
  return unescapeHTML(stripHTML(html)).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function summary(item) {
  return plainText(item.description) || plainText(item.excerpt)
    || Array.from(plainText(item.content)).slice(0, 120).join('');
}

function entry(item, base, pathname = item.path) {
  const title = plainText(item.title).replace(/([\\\[\]])/g, '\\$1');
  return `- [${title}](${new URL(pathname, base).href}): ${summary(item)}`;
}

hexo.extend.generator.register('luomo-llms', function (site) {
  const base = `${this.config.url.replace(/\/+$/, '')}/`;
  const lines = [
    '# Luomoの云日常',
    '',
    `> ${plainText(this.config.description)}`,
    '',
    '作者为洛墨 / Luomo，记录 AI 智能体、开发实践、服务器运维与日常生活。',
    '个人主页 https://luomo.moe。此刻状态 https://status.luomo.moe。',
    '',
    '## Posts',
    ''
  ];
  const posts = site.posts.toArray().sort((a, b) =>
    b.date.valueOf() - a.date.valueOf() || a.path.localeCompare(b.path, 'en'));
  for (const post of posts) lines.push(entry(post, base));

  lines.push('', '## Pages', '');
  const pages = site.pages.toArray().filter(page =>
    page.layout !== false && page.layout !== 'false' && !page.path.startsWith('march7th/'));
  for (const route of ['projects', 'cloud', 'build-log', 'status', 'about', 'link']) {
    const page = pages.find(item => item.path === `${route}/index.html` || item.path === `${route}/`);
    if (page) lines.push(entry(page, base, `${route}/`));
  }
  lines.push('', '## Feeds', '',
    `- [Atom feed](${new URL('atom.xml', base).href}): 博客文章订阅。`,
    `- [Sitemap](${new URL('sitemap.xml', base).href}): 博客站点地图。`, '');
  return { path: 'llms.txt', data: lines.join('\n') };
});
