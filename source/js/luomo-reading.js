/* 星港手帐 · post reading aids: TOC that follows the reader, its route fill, remaining reading time, section links, J/K section jumps. Pjax-safe, no dependencies. */
(function () {
  'use strict';

  if (window.LuomoReading) return;

  var article = null;
  var headings = [];
  var tocContent = null;
  var tocList = null;
  var linksById = {};
  var remaining = null;
  var totalMinutes = 0;
  var frame = 0;
  var syncing = false;
  var observer = null;

  function isPost() {
    var site = window.GLOBAL_CONFIG_SITE;
    return Boolean(site && (site.isPost || site.pageType === 'post'));
  }

  // Where a heading counts as "reached": a little below the fixed nav.
  function line() {
    return Math.min(window.innerHeight * 0.25, 180);
  }

  /*
   * The theme marks the current TOC entry from an IntersectionObserver that
   * only fires while a heading crosses a thin band near the top. Scrolling
   * back up inside a section, dragging the scrollbar or jumping from the TOC
   * leaves the highlight on the wrong entry. Work it out from positions.
   */
  function currentId() {
    if (!headings.length) return '';
    var doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 10) return headings[headings.length - 1].id;
    var limit = line();
    var id = '';
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top - limit <= 0) id = headings[i].id;
      else break;
    }
    return id;
  }

  function syncToc() {
    if (!tocList) return;
    var id = currentId();
    var target = id ? linksById[id] : null;
    var actives = tocList.querySelectorAll('.toc-link.active');
    if (target && actives.length === 1 && actives[0] === target) return fill(target);
    if (!target && !actives.length) return fill(null);

    syncing = true;
    actives.forEach(function (link) { link.classList.remove('active'); });
    tocList.querySelectorAll('li.active').forEach(function (item) { item.classList.remove('active'); });
    if (target) {
      target.classList.add('active');
      // Same as the theme: open the parents unless the TOC is always expanded.
      if (!tocContent.classList.contains('is-expand')) {
        for (var node = target.parentNode; node && node !== tocList; node = node.parentNode) {
          if (node.tagName === 'LI') node.classList.add('active');
        }
      }
      centre(target);
    }
    syncing = false;
    fill(target);
  }

  // Keep the active entry in the middle of the scrolling TOC card.
  function centre(link) {
    var offset = link.offsetTop - tocContent.scrollTop;
    var middle = (tocContent.clientHeight - link.clientHeight) / 2;
    if (Math.abs(offset - middle) > 4) tocContent.scrollTop += offset - middle;
  }

  // Route fill: the gradient line reaches down to the active stop.
  function fill(link) {
    if (!tocList) return;
    var height = 0;
    if (link) {
      var listTop = tocList.getBoundingClientRect().top;
      var rect = link.getBoundingClientRect();
      var size = parseFloat(window.getComputedStyle(link).fontSize) || 14;
      height = Math.max(0, rect.top - listTop + size * 0.85 + 4 - 8);
    }
    tocList.style.setProperty('--lm-toc-fill', height.toFixed(1) + 'px');
  }

  function updateRemaining() {
    if (!remaining || !article) return;
    var rect = article.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 1;
    var text = progress >= 0.98
      ? '已读完 · 谢谢你的航行'
      : '约 ' + Math.max(1, Math.ceil(totalMinutes * (1 - progress))) + ' 分钟读完';
    if (remaining.textContent !== text) remaining.textContent = text;
  }

  function update() {
    frame = 0;
    if (!article) return;
    syncToc();
    updateRemaining();
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function copySectionLink(id) {
    var url = location.origin + location.pathname + '#' + encodeURIComponent(id);
    var done = function () { if (window.LuomoUI) window.LuomoUI.toast('已复制本节链接'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('复制本节链接', url); });
    } else {
      window.prompt('复制本节链接', url);
    }
  }

  function addAnchors() {
    article.querySelectorAll(':scope > h2[id], :scope > h3[id]').forEach(function (heading) {
      if (heading.querySelector('.lm-anchor')) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'lm-anchor';
      button.textContent = '#';
      button.setAttribute('aria-label', '复制本节链接：' + heading.textContent.trim());
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        copySectionLink(heading.id);
      });
      heading.appendChild(button);
    });
  }

  function scrollToHeading(heading) {
    var btf = window.btf;
    if (btf && btf.scrollToDest && btf.getEleTop) btf.scrollToDest(btf.getEleTop(heading), 300);
    else heading.scrollIntoView({ behavior: 'smooth' });
  }

  // J / K: next / previous section (h2 and h3).
  function step(direction) {
    if (!article) return false;
    var stops = headings.filter(function (h) { return /^H[23]$/.test(h.tagName); });
    if (!stops.length) return false;
    var limit = line() + 2;
    var target = null;
    if (direction > 0) {
      for (var i = 0; i < stops.length; i++) {
        if (stops[i].getBoundingClientRect().top > limit) { target = stops[i]; break; }
      }
    } else {
      for (var j = stops.length - 1; j >= 0; j--) {
        if (stops[j].getBoundingClientRect().top < -2) { target = stops[j]; break; }
      }
    }
    if (target) scrollToHeading(target);
    return Boolean(target);
  }

  function init() {
    if (observer) observer.disconnect();
    article = isPost() ? document.getElementById('article-container') : null;
    headings = [];
    linksById = {};
    tocContent = tocList = remaining = null;
    if (!article) return;

    headings = Array.prototype.slice.call(article.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'));
    addAnchors();

    var card = document.getElementById('card-toc');
    tocContent = card && card.querySelector('.toc-content');
    tocList = tocContent && tocContent.querySelector('.toc');
    if (tocList) {
      // Headings numbered by the author ("1. …") would read "1. 1. …" in the TOC.
      tocList.classList.toggle('lm-toc-own-numbers', Boolean(article.querySelector('.lm-own-number')));
      tocList.querySelectorAll('.toc-link').forEach(function (link) {
        try {
          linksById[decodeURIComponent(link.getAttribute('href') || '').replace(/^#/, '')] = link;
        } catch (error) { /* malformed href */ }
      });
      // Re-check after the theme's own observer moves the highlight.
      observer = new MutationObserver(function () { if (!syncing) schedule(); });
      observer.observe(tocList, { subtree: true, attributes: true, attributeFilter: ['class'] });

      var minutes = document.querySelector('#post-meta .post-meta-wordcount');
      var match = minutes && minutes.textContent.match(/(\d+)\s*分钟/);
      totalMinutes = match ? Number(match[1]) : 0;
      var headline = card.querySelector('.item-headline');
      if (totalMinutes && headline) {
        remaining = document.createElement('span');
        remaining.className = 'lm-toc-remaining';
        remaining.setAttribute('aria-live', 'off');
        headline.insertAdjacentElement('afterend', remaining);
      }
    }
    update();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('pjax:complete', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LuomoReading = { init: init, step: step, sections: function () { return headings.slice(); } };
})();
