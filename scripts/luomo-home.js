'use strict';

/*
 * Home page composition ("夜航书" edition) without forking the theme templates.
 *
 * On the first home page only, this filter:
 *   - adds an issue strip under the hero title (posts / tags / days afloat);
 *   - opens the column with a "封面故事" feature card for the newest post,
 *     then the 星港入口 gates and the 最新手帐 heading (source/_data/home.yml);
 *   - closes the column with a 星港索引 panel (tag nebula, voyage log by
 *     month, categories) that replaces the sidebar cards hidden on home.
 * Styling: source/_luomo/styles/30-home.css. See docs/FRONTEND.md.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ESCAPES[ch]);
const stripHTML = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const truncate = (value, max) => (value.length > max ? `${value.slice(0, max).trim()}…` : value);

// Butterfly 4.13 renders class="recent-posts"; 5.x adds a modifier (class="recent-posts nc").
const LIST_ANCHOR = /<div class="recent-posts[^"]*" id="recent-posts">/;
const ASIDE_ANCHOR = /<div class="aside-content" id="aside-content">/;
const SCROLL_ANCHOR = '<div id="scroll-down">';

function url(path) {
  const root = hexo.config.root || '/';
  return root + String(path || '').replace(/^\//, '');
}

function heading(eyebrow, title, extraClass = '') {
  if (!title) return '';
  const eyebrowHTML = eyebrow ? `<span class="lm-eyebrow">${escapeHTML(eyebrow)}</span>` : '';
  return `<header class="lm-section-head${extraClass}">${eyebrowHTML}<h2>${escapeHTML(title)}</h2></header>`;
}

function gate(item) {
  const icon = item.icon ? `<span class="lm-gate-icon" aria-hidden="true"><i class="${escapeHTML(item.icon)}"></i></span>` : '';
  const desc = item.desc ? `<small>${escapeHTML(item.desc)}</small>` : '';
  return `<a class="lm-gate" href="${escapeHTML(item.link)}">${icon}<span class="lm-gate-text"><strong>${escapeHTML(item.name)}</strong>${desc}</span><i class="fas fa-arrow-right lm-gate-go" aria-hidden="true"></i></a>`;
}

function newestPost() {
  return hexo.locals.get('posts').sort('-date').filter(post => post.published !== false).toArray()[0];
}

function feature(home, post) {
  if (!post) return '';
  const cover = typeof post.cover === 'string' && post.cover ? post.cover : null;
  const category = post.categories && post.categories.length ? post.categories.toArray()[0] : null;
  const excerpt = truncate(post.description || stripHTML(post.excerpt || post.content), 120);
  const date = post.date.format('YYYY.MM.DD');
  const coverHTML = cover
    ? `<figure class="lm-feature-cover" style="--lm-cover:url(&quot;${escapeHTML(url(cover))}&quot;)"><img src="${escapeHTML(url(cover))}" alt="" decoding="async"></figure>`
    : '<figure class="lm-feature-cover lm-feature-cover--empty" aria-hidden="true"><span>✦</span></figure>';
  const categoryHTML = category ? `<a class="lm-feature-cat" href="${escapeHTML(url(category.path))}">${escapeHTML(category.name)}</a>` : '';
  return `<article class="lm-feature">${coverHTML}<div class="lm-feature-body">
<p class="lm-feature-kicker"><span class="lm-eyebrow">${escapeHTML(home.feature_eyebrow || 'Cover Story')}</span><span class="lm-feature-label">${escapeHTML(home.feature_title || '封面故事')}</span></p>
<h2 class="lm-feature-title"><a href="${escapeHTML(url(post.path))}">${escapeHTML(post.title)}</a></h2>
<p class="lm-feature-meta"><time datetime="${post.date.toISOString()}">${date}</time>${categoryHTML}</p>
<p class="lm-feature-excerpt">${escapeHTML(excerpt)}</p>
<a class="lm-feature-cta" href="${escapeHTML(url(post.path))}">${escapeHTML(home.feature_cta || '展开阅读')}<i class="fas fa-arrow-right" aria-hidden="true"></i></a>
</div></article>`;
}

function gates(home) {
  const items = (home.gates || []).filter(item => item && item.name && item.link);
  if (!items.length) return '';
  return `<section class="lm-gates" aria-label="${escapeHTML(home.gates_title || '入口')}">${heading(home.gates_eyebrow, home.gates_title)}<div class="lm-gates-grid">${items.map(gate).join('')}</div></section>`;
}

function starIndex(home) {
  const palette = home.palette || [];
  const tags = hexo.locals.get('tags').sort('name').filter(tag => tag.length).toArray();
  const counts = tags.map(tag => tag.length);
  const max = Math.max(1, ...counts);
  const tagHTML = tags.map((tag, i) => {
    const weight = tag.length / max;
    const color = palette.length ? palette[i % palette.length] : '';
    const style = `--lm-tag-size:${(0.86 + weight * 0.5).toFixed(2)}rem;${color ? `--lm-tag-color:${color};` : ''}`;
    return `<a class="lm-star-tag" href="${escapeHTML(url(tag.path))}" style="${style}" title="${tag.length} 篇">${escapeHTML(tag.name)}</a>`;
  }).join('');

  const months = new Map();
  hexo.locals.get('posts').sort('-date').forEach(post => {
    const key = post.date.format('YYYY/MM');
    months.set(key, (months.get(key) || 0) + 1);
  });
  const archiveHTML = [...months].slice(0, 6).map(([key, count]) => {
    const [year, month] = key.split('/');
    return `<li><a href="${escapeHTML(url(`${hexo.config.archive_dir}/${year}/${month}/`))}"><span class="lm-log-date"><b>${month}</b>${year}</span><span class="lm-log-bar" style="--lm-log:${count}"></span><span class="lm-log-count">${count} 篇</span></a></li>`;
  }).join('');

  const categoryHTML = hexo.locals.get('categories').sort('-length').filter(cat => cat.length).map(cat =>
    `<a class="lm-star-cat" href="${escapeHTML(url(cat.path))}"><b>${cat.length}</b><span>${escapeHTML(cat.name)}</span></a>`
  ).join('');

  return `<section class="lm-starmap" aria-label="${escapeHTML(home.index_title || '星港索引')}">${heading(home.index_eyebrow, home.index_title, ' lm-index-head')}
<div class="lm-starmap-grid">
<div class="lm-starmap-panel lm-starmap-tags"><h3>标签星云</h3><div class="lm-star-tags">${tagHTML}</div></div>
<div class="lm-starmap-panel lm-starmap-log"><h3>航线归档</h3><ol class="lm-log">${archiveHTML}</ol><a class="lm-starmap-more" href="${escapeHTML(url(`${hexo.config.archive_dir}/`))}">全部航线<i class="fas fa-arrow-right" aria-hidden="true"></i></a></div>
<div class="lm-starmap-panel lm-starmap-cats"><h3>分类舱段</h3><div class="lm-star-cats">${categoryHTML}</div></div>
</div></section>`;
}

function issueStrip(home) {
  const posts = hexo.locals.get('posts').length;
  const tags = hexo.locals.get('tags').filter(tag => tag.length).length;
  const since = home.voyage_since ? new Date(home.voyage_since) : null;
  const days = since && !Number.isNaN(since.getTime()) ? Math.floor((Date.now() - since.getTime()) / 86400000) : null;
  const daysHTML = days !== null
    ? `<span><b data-lm-days-since="${escapeHTML(home.voyage_since)}">${days}</b>天航行</span>`
    : '';
  return `<p class="lm-issue" aria-label="站点概况"><span class="lm-issue-vol">VOL.${new Date().getFullYear()}</span><span><b>${posts}</b>篇手帐</span><span><b>${tags}</b>枚标签</span>${daysHTML}</p>`;
}

hexo.extend.filter.register('after_render:html', function (html, locals) {
  const page = locals && locals.page;
  if (!page || page.__index !== true || (page.current && page.current !== 1)) return html;
  const home = hexo.locals.get('data').home;
  if (!home || !LIST_ANCHOR.test(html)) return html;

  // The </div> right before #scroll-down closes #site-info: put the strip inside it.
  const scroll = html.indexOf(SCROLL_ANCHOR);
  const infoEnd = scroll > 0 ? html.lastIndexOf('</div>', scroll) : -1;
  if (infoEnd > 0) html = html.slice(0, infoEnd) + issueStrip(home) + html.slice(infoEnd);

  const lead = feature(home, newestPost()) + gates(home) + heading(home.list_eyebrow, home.list_title, ' lm-list-head');
  html = html.replace(LIST_ANCHOR, match => match + lead);

  // Close the post column: the </div> right before the aside ends #recent-posts.
  const aside = html.search(ASIDE_ANCHOR);
  const end = aside > 0 ? html.lastIndexOf('</div>', aside) : -1;
  if (end > 0) html = html.slice(0, end) + starIndex(home) + html.slice(end);
  return html;
});
