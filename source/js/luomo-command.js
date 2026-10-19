/* 星港手帐 · command palette (Ctrl/⌘ K), keyboard shortcuts and the "?" shortcut sheet. Posts come from /search.json, pages from the nav menu. Pjax-safe, no dependencies. */
(function () {
  'use strict';

  if (window.LuomoCommand) return;

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var MOD = isMac ? '⌘' : 'Ctrl';

  // Shortcut sheet; the palette shows the same keys next to its actions.
  var SHORTCUTS = [
    { group: '导航', items: [
      [[MOD, 'K'], '打开命令面板'],
      [['/'], '站内全文搜索'],
      [['G', 'H'], '回到首页'],
      [['G', 'A'], '归档'],
      [['G', 'T'], '标签'],
      [['G', 'C'], '分类']
    ] },
    { group: '阅读', items: [
      [['J'], '下一节'],
      [['K'], '上一节'],
      [['T'], '回到顶部'],
      [['C'], '前往评论区']
    ] },
    { group: '界面', items: [
      [['D'], '切换深色模式'],
      [['?'], '快捷键一览'],
      [['Esc'], '关闭面板']
    ] }
  ];

  var GO = { h: '/', a: '/archives/', t: '/tags/', c: '/categories/' };

  var posts = null;
  var postsLoading = null;
  var layer = null;
  var input = null;
  var list = null;
  var help = null;
  var items = [];
  var active = 0;
  var lastFocus = null;
  var pendingG = 0;
  var gChip = null;

  /* ---------- helpers ---------- */

  function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function keycaps(keys) {
    return keys.map(function (k) { return '<kbd>' + escapeHTML(k) + '</kbd>'; }).join('');
  }

  function highlight(text, tokens) {
    var html = escapeHTML(text);
    tokens.forEach(function (token) {
      if (!token) return;
      var safe = escapeHTML(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp('(' + safe + ')(?![^<]*>)', 'ig'), '<mark>$1</mark>');
    });
    return html;
  }

  function isTyping(target) {
    return target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  function isPost() {
    var site = window.GLOBAL_CONFIG_SITE;
    return Boolean(site && (site.isPost || site.pageType === 'post'));
  }

  function go(url) {
    var target;
    try { target = new URL(url, location.href); } catch (error) { return; }
    if (target.origin !== location.origin) { location.href = target.href; return; }
    if (target.pathname === location.pathname && target.hash) {
      var el = document.getElementById(decodeURIComponent(target.hash.slice(1)));
      if (el) return scrollToEl(el);
    }
    if (window.pjax && typeof window.pjax.loadUrl === 'function') window.pjax.loadUrl(target.href);
    else location.href = target.href;
  }

  function scrollToEl(el) {
    var btf = window.btf;
    if (btf && btf.scrollToDest && btf.getEleTop) btf.scrollToDest(btf.getEleTop(el), 300);
    else el.scrollIntoView({ behavior: 'smooth' });
  }

  function toTop() {
    var btf = window.btf;
    if (btf && btf.scrollToDest) btf.scrollToDest(0, 500);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toComments() {
    var el = document.getElementById('post-comment');
    if (el) scrollToEl(el);
    return Boolean(el);
  }

  function toast(text) {
    if (window.LuomoUI && window.LuomoUI.toast) window.LuomoUI.toast(text);
  }

  function toggleTheme() {
    if (window.LuomoUI && window.LuomoUI.toggleTheme) window.LuomoUI.toggleTheme(window.innerWidth / 2, window.innerHeight * 0.3);
    else { var b = document.getElementById('darkmode'); if (b) b.click(); }
  }

  function loadPosts() {
    if (posts) return Promise.resolve(posts);
    if (!postsLoading) {
      postsLoading = fetch('/search.json', { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (data) {
          posts = (Array.isArray(data) ? data : []).map(function (p) {
            var meta = [].concat(p.categories || [], p.tags || []);
            return {
              title: String(p.title || ''),
              url: String(p.url || ''),
              meta: meta.join(' · '),
              content: String(p.content || '').replace(/\s+/g, ' '),
              key: (String(p.title || '') + ' ' + meta.join(' ')).toLowerCase()
            };
          }).filter(function (p) { return p.url; });
          return posts;
        })
        .catch(function () { postsLoading = null; return []; });
    }
    return postsLoading;
  }

  /* ---------- sources ---------- */

  function pages() {
    var seen = {};
    var out = [];
    document.querySelectorAll('#menus .menus_items a.site-page[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.indexOf('javascript:') === 0 || seen[href]) return;
      seen[href] = true;
      var icon = a.querySelector('i');
      out.push({ title: a.textContent.trim(), hint: href, icon: icon ? icon.className.replace(/\bfa-fw\b/, '') : 'fas fa-compass', run: function () { go(href); } });
    });
    [['状态页', '/status/', 'fas fa-heartbeat'], ['图片来源', '/image-credits/', 'fas fa-image']].forEach(function (p) {
      if (!seen[p[1]]) out.push({ title: p[0], hint: p[1], icon: p[2], run: function () { go(p[1]); } });
    });
    return out;
  }

  function actions() {
    var list = [
      { title: '切换深色模式', icon: 'fas fa-adjust', keys: ['D'], run: toggleTheme },
      { title: '回到顶部', icon: 'fas fa-arrow-up', keys: ['T'], run: toTop },
      { title: '站内全文搜索', icon: 'fas fa-search', keys: ['/'], run: function () { var b = document.querySelector('#search-button .search'); if (b) b.click(); } },
      { title: '随机读一篇', icon: 'fas fa-dice', run: function () {
        loadPosts().then(function (all) {
          var pool = all.filter(function (p) { return p.url !== location.pathname; });
          if (pool.length) go(pool[Math.floor(Math.random() * pool.length)].url);
        });
      } },
      { title: '复制当前页面链接', icon: 'fas fa-link', run: function () {
        var url = location.href.split('#')[0];
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('已复制页面链接'); }, function () { window.prompt('复制页面链接', url); });
        else window.prompt('复制页面链接', url);
      } },
      { title: '订阅 RSS', icon: 'fas fa-rss', hint: '/atom.xml', run: function () { location.href = '/atom.xml'; } },
      { title: '快捷键一览', icon: 'far fa-keyboard', keys: ['?'], run: function () { openHelp(); } }
    ];
    if (document.getElementById('post-comment')) {
      list.splice(2, 0, { title: '前往评论区', icon: 'fas fa-comments', keys: ['C'], run: toComments });
    }
    if (isPost() && document.getElementById('readmode')) {
      list.splice(3, 0, { title: '阅读模式', icon: 'fas fa-book-open', run: function () { document.getElementById('readmode').click(); } });
    }
    return list;
  }

  function sections() {
    var out = [];
    document.querySelectorAll('#card-toc .toc-link').forEach(function (a) {
      var text = a.querySelector('.toc-text');
      var number = a.querySelector('.toc-number');
      var href = a.getAttribute('href');
      if (!text || !href) return;
      out.push({ title: text.textContent.trim(), badge: number ? number.textContent.trim().replace(/.$/, '') : '#', run: function () { go(href); } });
    });
    return out;
  }

  /* ---------- matching ---------- */

  function tokenize(query) {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  }

  function matchSimple(entries, tokens, limit) {
    if (!tokens.length) return entries.slice(0, limit);
    return entries.filter(function (e) {
      var key = (e.title + ' ' + (e.hint || '')).toLowerCase();
      return tokens.every(function (t) { return key.indexOf(t) !== -1; });
    }).slice(0, limit);
  }

  function snippet(content, tokens) {
    var lower = content.toLowerCase();
    var at = -1;
    for (var i = 0; i < tokens.length && at === -1; i++) at = lower.indexOf(tokens[i]);
    if (at === -1) return '';
    var start = Math.max(0, at - 18);
    return (start > 0 ? '…' : '') + content.slice(start, start + 64) + '…';
  }

  function matchPosts(tokens) {
    if (!posts) return [];
    if (!tokens.length) return posts.slice(0, 5).map(postItem.bind(null, tokens, ''));
    var scored = [];
    posts.forEach(function (p) {
      var score = 0;
      var inText = true;
      tokens.forEach(function (t) {
        if (p.title.toLowerCase().indexOf(t) !== -1) score += 6;
        else if (p.key.indexOf(t) !== -1) score += 3;
        else if (p.content.toLowerCase().indexOf(t) !== -1) score += 1;
        else inText = false;
      });
      if (inText && score) scored.push({ p: p, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 6).map(function (s) {
      var titleHit = tokens.some(function (t) { return s.p.key.indexOf(t) !== -1; });
      return postItem(tokens, titleHit ? '' : snippet(s.p.content, tokens), s.p);
    });
  }

  function postItem(tokens, extra, p) {
    return { title: p.title, hint: extra || p.meta, icon: 'far fa-file-alt', html: true, tokens: tokens, run: function () { go(p.url); } };
  }

  /* ---------- palette ---------- */

  function build() {
    layer = document.createElement('div');
    layer.className = 'lm-cmd';
    layer.hidden = true;
    layer.innerHTML =
      '<div class="lm-cmd-backdrop" data-close></div>' +
      '<div class="lm-cmd-panel" role="dialog" aria-modal="true" aria-label="命令面板">' +
        '<div class="lm-cmd-field">' +
          '<span class="lm-cmd-star" aria-hidden="true">✦</span>' +
          '<input class="lm-cmd-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="lm-cmd-list" aria-autocomplete="list" placeholder="搜索文章、页面或指令…">' +
          '<button class="lm-cmd-esc" type="button" data-close aria-label="关闭命令面板">Esc</button>' +
        '</div>' +
        '<div class="lm-cmd-list" id="lm-cmd-list" role="listbox" aria-label="结果"></div>' +
        '<div class="lm-cmd-foot"><span>' + keycaps(['↑', '↓']) + ' 选择</span><span>' + keycaps(['↵']) + ' 打开</span><span>' + keycaps(['?']) + ' 快捷键</span><span class="lm-cmd-brand">星港指令台</span></div>' +
      '</div>';
    document.body.appendChild(layer);
    input = layer.querySelector('.lm-cmd-input');
    list = layer.querySelector('.lm-cmd-list');

    layer.addEventListener('click', function (event) {
      if (event.target.hasAttribute('data-close')) close();
    });
    input.addEventListener('input', render);
    input.addEventListener('keydown', onPaletteKey);
    list.addEventListener('pointermove', function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) setActive(Number(option.dataset.index), false);
    });
    list.addEventListener('click', function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) choose(Number(option.dataset.index));
    });
  }

  function render() {
    var tokens = tokenize(input.value);
    var groups = [];
    if (isPost()) {
      var secs = matchSimple(sections(), tokens, tokens.length ? 6 : 4);
      if (secs.length) groups.push(['本文章节', 'Sections', secs]);
    }
    var found = matchPosts(tokens);
    if (found.length) groups.push(['文章', 'Posts', found]);
    var pageHits = matchSimple(pages(), tokens, 8);
    if (pageHits.length) groups.push(['页面', 'Pages', pageHits]);
    var acts = matchSimple(actions(), tokens, 8);
    if (acts.length) groups.push(['指令', 'Actions', acts]);
    if (!tokens.length && !posts) loadPosts().then(function () { if (!layer.hidden) render(); });

    items = [];
    var html = '';
    groups.forEach(function (g, gi) {
      html += '<div class="lm-cmd-group" role="group" aria-labelledby="lm-cmd-g' + gi + '"><div class="lm-cmd-label" id="lm-cmd-g' + gi + '">' + g[0] + '<span>' + g[1] + '</span></div>';
      g[2].forEach(function (item) {
        var i = items.length;
        items.push(item);
        var title = item.html ? highlight(item.title, item.tokens) : highlight(item.title, tokens);
        var hint = item.hint ? '<span class="lm-cmd-hint">' + (item.html ? highlight(item.hint, item.tokens) : escapeHTML(item.hint)) + '</span>' : '';
        var side = item.keys ? '<span class="lm-cmd-keys">' + keycaps(item.keys) + '</span>' : '<span class="lm-cmd-enter" aria-hidden="true">↵</span>';
        html += '<div class="lm-cmd-item" role="option" id="lm-cmd-o' + i + '" data-index="' + i + '" aria-selected="false">' +
          (item.badge
            ? '<span class="lm-cmd-icon lm-cmd-badge" aria-hidden="true">' + escapeHTML(item.badge) + '</span>'
            : '<span class="lm-cmd-icon" aria-hidden="true"><i class="' + escapeHTML(item.icon) + '"></i></span>') +
          '<span class="lm-cmd-text"><span class="lm-cmd-title">' + title + '</span>' + hint + '</span>' + side + '</div>';
      });
      html += '</div>';
    });
    if (!items.length) {
      html = '<div class="lm-cmd-empty"><span aria-hidden="true">✧</span>没有找到「' + escapeHTML(input.value.trim()) + '」<small>换个关键词试试，或按 <kbd>/</kbd> 用全文搜索</small></div>';
    }
    list.innerHTML = html;
    setActive(0, true);
  }

  function setActive(index, scroll) {
    if (!items.length) { input.removeAttribute('aria-activedescendant'); return; }
    active = (index + items.length) % items.length;
    list.querySelectorAll('[role="option"]').forEach(function (el) {
      var on = Number(el.dataset.index) === active;
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      el.classList.toggle('is-active', on);
      if (on && scroll) el.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', 'lm-cmd-o' + active);
  }

  function choose(index) {
    var item = items[index];
    if (!item) return;
    close(true);
    item.run();
  }

  function onPaletteKey(event) {
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) { event.preventDefault(); setActive(active + 1, true); }
    else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) { event.preventDefault(); setActive(active - 1, true); }
    else if (event.key === 'Enter') { event.preventDefault(); choose(active); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === 'Tab') { event.preventDefault(); setActive(active + (event.shiftKey ? -1 : 1), true); }
    else if (event.key === '?' && !input.value) { event.preventDefault(); event.stopPropagation(); close(true); openHelp(); }
  }

  function open() {
    if (!layer) build();
    closeHelp(true);
    if (!layer.hidden) { input.select(); return; }
    lastFocus = outsideFocus();
    layer.hidden = false;
    document.documentElement.classList.add('lm-cmd-open');
    input.value = '';
    render();
    loadPosts().then(function () { if (!layer.hidden && input.value) render(); });
    requestAnimationFrame(function () { layer.classList.add('is-open'); input.focus(); });
  }

  // The element to return focus to; never one inside a palette layer.
  function outsideFocus() {
    var el = document.activeElement;
    return el && el !== document.body && !el.closest('.lm-cmd') ? el : null;
  }

  function dropFocus(container) {
    if (container.contains(document.activeElement)) document.activeElement.blur();
  }

  function close(keepFocusAway) {
    if (!layer || layer.hidden) return;
    dropFocus(layer);
    layer.classList.remove('is-open');
    layer.hidden = true;
    document.documentElement.classList.remove('lm-cmd-open');
    if (!keepFocusAway && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- shortcut sheet ---------- */

  function openHelp() {
    close(true);
    if (!help) {
      help = document.createElement('div');
      help.className = 'lm-cmd lm-keys';
      help.hidden = true;
      var body = SHORTCUTS.map(function (g) {
        return '<section><h3>' + g.group + '</h3><dl>' + g.items.map(function (row) {
          return '<div><dt>' + keycaps(row[0]) + '</dt><dd>' + row[1] + '</dd></div>';
        }).join('') + '</dl></section>';
      }).join('');
      help.innerHTML =
        '<div class="lm-cmd-backdrop" data-close></div>' +
        '<div class="lm-cmd-panel" role="dialog" aria-modal="true" aria-labelledby="lm-keys-title" tabindex="-1">' +
          '<header class="lm-keys-head"><p class="lm-keys-kicker">Keyboard · 航海手势</p><h2 id="lm-keys-title">快捷键</h2>' +
          '<button class="lm-keys-close" type="button" data-close aria-label="关闭">×</button></header>' +
          '<div class="lm-keys-body">' + body + '</div>' +
          '<p class="lm-keys-note">输入框里不会触发；<kbd>G</kbd> 之后一秒内按第二个键。</p>' +
        '</div>';
      document.body.appendChild(help);
      help.addEventListener('click', function (event) {
        if (event.target.hasAttribute('data-close')) closeHelp();
      });
      help.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' || event.key === '?') { event.preventDefault(); event.stopPropagation(); closeHelp(); }
        if (event.key === 'Tab') { event.preventDefault(); help.querySelector('.lm-keys-close').focus(); }
      });
    }
    if (!help.hidden) return;
    help.hidden = false;
    document.documentElement.classList.add('lm-cmd-open');
    requestAnimationFrame(function () { help.classList.add('is-open'); help.querySelector('.lm-cmd-panel').focus(); });
  }

  function closeHelp(silent) {
    if (!help || help.hidden) return;
    dropFocus(help);
    help.classList.remove('is-open');
    help.hidden = true;
    document.documentElement.classList.remove('lm-cmd-open');
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- global keys ---------- */

  function showG(on) {
    if (!gChip) {
      gChip = document.createElement('div');
      gChip.className = 'lm-gchip';
      gChip.setAttribute('aria-hidden', 'true');
      gChip.innerHTML = '<kbd>G</kbd><span>→</span>' + Object.keys(GO).map(function (k) {
        return '<kbd>' + k.toUpperCase() + '</kbd>' + { h: '首页', a: '归档', t: '标签', c: '分类' }[k];
      }).join('');
      document.body.appendChild(gChip);
    }
    gChip.classList.toggle('is-shown', on);
  }

  function cancelG() {
    clearTimeout(pendingG);
    pendingG = 0;
    showG(false);
  }

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (key === 'k' || key === 'K')) {
      event.preventDefault();
      if (layer && !layer.hidden) close(); else open();
      return;
    }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    if ((layer && !layer.hidden) || (help && !help.hidden)) return;

    if (pendingG) {
      var path = GO[key.toLowerCase()];
      cancelG();
      if (path) { event.preventDefault(); go(path); }
      return;
    }
    switch (key) {
      case '?': event.preventDefault(); lastFocus = outsideFocus(); openHelp(); break;
      case 'g': case 'G':
        pendingG = setTimeout(cancelG, 1200);
        showG(true);
        break;
      case 'j': case 'J':
        if (window.LuomoReading && window.LuomoReading.step(1)) event.preventDefault();
        break;
      case 'k': case 'K':
        if (window.LuomoReading && window.LuomoReading.step(-1)) event.preventDefault();
        break;
      case 't': case 'T': event.preventDefault(); toTop(); break;
      case 'c': case 'C': if (toComments()) event.preventDefault(); break;
      case 'd': case 'D': event.preventDefault(); toggleTheme(); break;
    }
  });

  /* ---------- nav trigger ---------- */

  function addTrigger() {
    var search = document.getElementById('search-button');
    if (!search || document.getElementById('lm-cmd-button')) return;
    var wrap = document.createElement('div');
    wrap.id = 'lm-cmd-button';
    wrap.innerHTML = '<button class="site-page lm-cmd-trigger" type="button" aria-label="打开命令面板（' + MOD + ' K）" aria-haspopup="dialog">' +
      '<i class="fas fa-compass fa-fw" aria-hidden="true"></i><kbd>' + MOD + '</kbd><kbd>K</kbd></button>';
    wrap.firstChild.addEventListener('click', function () { open(); });
    search.insertAdjacentElement('afterend', wrap);
  }

  document.addEventListener('pjax:send', function () { close(true); closeHelp(true); cancelG(); });
  document.addEventListener('pjax:complete', addTrigger);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addTrigger);
  else addTrigger();

  window.LuomoCommand = { open: open, close: close, help: openHelp };
})();
