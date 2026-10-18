/* 星港手帐 · small interaction layer (reading progress). Pjax-safe, no dependencies. */
(function () {
  'use strict';

  if (window.LuomoUI) return;

  var bar = null;
  var article = null;
  var frame = 0;

  function isPost() {
    return Boolean(window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.isPost);
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

  function init() {
    initProgress();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('pjax:complete', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LuomoUI = { init: init };
})();
