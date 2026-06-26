/* ===== 洛墨云上星港 · Butterfly 轻量脚本 ===== */
(function() {
  'use strict';

  // Projects filter
  function initProjectsFilter() {
    var btns = document.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('.project-card');
    if (!btns.length) return;
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.dataset.filter;
        cards.forEach(function(c) { c.style.display = (f === 'all' || c.dataset.category === f) ? '' : 'none'; });
      });
    });
  }

  // Cloud timestamps
  function initCloudTimestamps() {
    var els = document.querySelectorAll('.cloud-card .time-value');
    if (!els.length) return;
    var now = new Date();
    els.forEach(function(el) { el.textContent = now.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }); });
  }

  // Home entry cards (via pinned post, no JS needed - CSS only)
  function init() {
    initProjectsFilter();
    initCloudTimestamps();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
})();
