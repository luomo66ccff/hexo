/* 星港手帐 · interaction layer: reading progress, card spotlight, "/" search, voyage days, Pjax fade and view transitions, dark-mode reveal, toast, local-preview counter label, Waline captcha fix. Pjax-safe, no dependencies. */
(function () {
  'use strict';

  if (window.LuomoUI) return;

  var bar = null;
  var article = null;
  var frame = 0;

  function isPost() {
    var site = window.GLOBAL_CONFIG_SITE;
    // Butterfly 4.13 sets isPost; 5.x sets pageType: 'post'.
    return Boolean(site && (site.isPost || site.pageType === 'post'));
  }

  function update() {
    frame = 0;
    if (!bar || !article) return;
    var rect = article.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 1;
    bar.style.setProperty('--lm-progress', progress.toFixed(4));
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function initProgress() {
    article = isPost() ? document.getElementById('article-container') : null;
    if (!article) {
      if (bar) bar.hidden = true;
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'lm-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    bar.hidden = false;
    update();
  }

  /*
   * Waline (3.1.2, unchanged through 3.16.1) renders a Turnstile widget into
   * .wl-captcha-container on every submit and never removes it. The widget
   * stays on screen, and Turnstile rejects the next render into the same
   * container, so a second comment waits forever. Clear the container before
   * each render and shortly after a token is issued.
   */
  var CAPTCHA = '.wl-captcha-container';

  function clearCaptcha(ts) {
    var box = document.querySelector(CAPTCHA);
    if (box && box.children.length) {
      try { ts.remove(CAPTCHA); } catch (error) { /* already gone */ }
    }
  }

  function patchTurnstile() {
    var ts = window.turnstile;
    if (!ts || typeof ts.render !== 'function' || ts.luomoPatched) return;
    var render = ts.render;
    ts.render = function (container, options) {
      if (container === CAPTCHA && options) {
        clearCaptcha(ts);
        var done = options.callback;
        options = Object.assign({}, options, {
          callback: function (token) {
            if (typeof done === 'function') done(token);
            setTimeout(function () { clearCaptcha(ts); }, 900);
          }
        });
      }
      return render.call(ts, container, options);
    };
    ts.luomoPatched = true;
  }

  // Waline injects the Turnstile script on first submit; a capturing load
  // listener runs before Waline's own handler goes on to call render().
  document.addEventListener('load', function (event) {
    var src = event.target && event.target.src;
    if (src && src.indexOf('challenges.cloudflare.com/turnstile') !== -1) patchTurnstile();
  }, true);

  /*
   * Spotlight: cards carry a soft light that follows the pointer
   * (--lm-mx / --lm-my, drawn in 70-motion.css). Fine pointers only, and
   * skipped when the reader prefers reduced motion.
   */
  var SPOTLIT = '.lm-feature, .lm-gate, .lm-starmap-panel, #recent-posts .recent-post-item, #aside-content .card-widget';
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lit = null;

  document.addEventListener('pointermove', function (event) {
    if (!finePointer.matches || calm.matches) return;
    var card = event.target.closest && event.target.closest(SPOTLIT);
    if (lit && lit !== card) lit.classList.remove('lm-lit');
    lit = card;
    if (!card) return;
    var rect = card.getBoundingClientRect();
    card.style.setProperty('--lm-mx', (event.clientX - rect.left) + 'px');
    card.style.setProperty('--lm-my', (event.clientY - rect.top) + 'px');
    card.classList.add('lm-lit');
  }, { passive: true });

  document.addEventListener('pointerleave', function () {
    if (lit) lit.classList.remove('lm-lit');
    lit = null;
  });

  // "/" opens search from anywhere outside a text field.
  document.addEventListener('keydown', function (event) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    var field = event.target;
    if (field && (field.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName))) return;
    var button = document.querySelector('#search-button .search');
    if (!button) return;
    event.preventDefault();
    button.click();
  });

  // Keep the hero's "days afloat" current between deploys.
  function updateVoyageDays() {
    document.querySelectorAll('[data-lm-days-since]').forEach(function (node) {
      var since = Date.parse(node.getAttribute('data-lm-days-since'));
      if (Number.isFinite(since)) node.textContent = String(Math.floor((Date.now() - since) / 86400000));
    });
  }

  /*
   * Busuanzi keys its counters by the page's host, so every local preview in
   * the world shares one "localhost" bucket (tens of millions of visits).
   * On local hosts, label the counters instead of showing those numbers.
   */
  var LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/i;
  var LOCAL_LABEL = '本地预览';

  function maskLocalCounters() {
    if (!LOCAL_HOST.test(location.hostname)) return;
    document.querySelectorAll('[id^="busuanzi_value_"]').forEach(function (node) {
      if (node.dataset.lmMasked) return;
      node.dataset.lmMasked = 'true';
      node.title = '本地预览时不蒜子返回的是所有人共用的 localhost 计数，不代表本站数据';
      var mask = function () {
        if (node.textContent !== LOCAL_LABEL) node.textContent = LOCAL_LABEL;
      };
      new MutationObserver(mask).observe(node, { childList: true, characterData: true, subtree: true });
      mask();
    });
  }

  // A small status line at the bottom of the screen, shared by the reading aids and the command palette.
  var toastEl = null;
  var toastTimer = 0;

  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'lm-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-shown'); }, 1800);
  }

  /*
   * View Transitions (Chromium, Safari 18+). Elsewhere, and with reduced
   * motion, everything works exactly as before without animation.
   */
  var canTransition = typeof document.startViewTransition === 'function';
  var bypassTheme = false;

  // Dark mode: the new theme spreads from the button as a circle.
  function toggleTheme(x, y) {
    var button = document.getElementById('darkmode');
    if (!button) return;
    var click = function () {
      bypassTheme = true;
      try { button.click(); } finally { bypassTheme = false; }
    };
    if (!canTransition || calm.matches) return click();
    if (typeof x !== 'number') {
      var rect = button.getBoundingClientRect();
      x = rect.width ? rect.left + rect.width / 2 : window.innerWidth - 40;
      y = rect.height ? rect.top + rect.height / 2 : window.innerHeight - 40;
    }
    var root = document.documentElement;
    root.classList.add('lm-vt-theme');
    var transition = document.startViewTransition(click);
    transition.ready.then(function () {
      var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] }, {
        duration: 600,
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)'
      });
    }).catch(function () { /* skipped: the theme still switched */ });
    transition.finished.finally(function () { root.classList.remove('lm-vt-theme'); });
  }

  // The theme's own button (#darkmode in the right-side bar) goes through the transition too.
  document.addEventListener('click', function (event) {
    if (bypassTheme || !canTransition || calm.matches) return;
    var button = event.target.closest && event.target.closest('#darkmode');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggleTheme(event.clientX || undefined, event.clientY || undefined);
  }, true);

  /*
   * Pjax swaps run inside a view transition: the old page breathes out, the
   * new one rises in, and when a post title was clicked it flies into the
   * post's banner title. Pjax builds the new page in switchSelectors(), and
   * nothing after that call relies on it having finished synchronously.
   */
  var MORPH_FROM = '.lm-feature-title, .article-title, .aside-list-item .title, .pagination-related .info-item-2';
  var clickedLink = null;

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    clickedLink = link && link.origin === location.origin ? link : null;
  }, true);

  function morphSource(href) {
    var link = clickedLink;
    clickedLink = null;
    if (!link || !href || link.href.split('#')[0] !== href.split('#')[0]) return null;
    if (link.matches(MORPH_FROM)) return link;
    var card = link.closest('.recent-post-item, .lm-feature, .aside-list-item, .pagination-related');
    var title = card && card.querySelector(MORPH_FROM);
    if (!title) return null;
    var rect = title.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight ? title : null;
  }

  function wrapPjax() {
    var pjax = window.pjax;
    if (!canTransition || !pjax || pjax.luomoTransitions) return;
    var switchSelectors = pjax.switchSelectors;
    pjax.switchSelectors = function () {
      var self = this;
      var args = arguments;
      if (calm.matches || document.visibilityState !== 'visible') return switchSelectors.apply(self, args);
      var root = document.documentElement;
      var from = morphSource(self.state && self.state.href);
      var to = null;
      if (from) from.style.viewTransitionName = 'lm-title';
      root.classList.add('lm-vt-page');
      var transition = document.startViewTransition(function () {
        try {
          switchSelectors.apply(self, args);
        } catch (error) {
          console.error('Pjax switch failed:', error);
          window.location.href = (self.state && self.state.href) || window.location.href;
          return;
        }
        to = from && document.querySelector('#post-info .post-title');
        if (to) to.style.viewTransitionName = 'lm-title';
      });
      transition.finished.finally(function () {
        root.classList.remove('lm-vt-page');
        if (to) to.style.viewTransitionName = '';
      });
    };
    pjax.luomoTransitions = true;
  }

  // Soft fade of the content while Pjax swaps pages.
  document.addEventListener('pjax:send', function () {
    wrapPjax();
    document.documentElement.classList.add('lm-swapping');
  });

  function init() {
    document.documentElement.classList.remove('lm-swapping');
    wrapPjax();
    initProgress();
    patchTurnstile();
    updateVoyageDays();
    maskLocalCounters();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('pjax:complete', init);
  document.addEventListener('pjax:error', function () {
    document.documentElement.classList.remove('lm-swapping');
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LuomoUI = { init: init, toast: toast, toggleTheme: toggleTheme };
})();
