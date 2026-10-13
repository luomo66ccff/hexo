/* ===== 洛墨云上星港 · 页面交互与公开入口检查 ===== */
(function() {
  'use strict';
  if (window.LuomoBlogTheme) {
    window.LuomoBlogTheme.init();
    return;
  }

  var SERVICE_IDS = ['ops', 'file', 'api', 'atri', 'error', 'blog'];
  var REASONS = ['http_ok', 'http_error', 'redirect_unconfirmed', 'access_limited', 'head_unsupported', 'challenge_unconfirmed', 'timeout', 'network_unconfirmed'];
  var context = null;

  function initProjectsFilter() {
    var btns = document.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('.project-card');
    btns.forEach(function(btn) {
      if (btn.dataset.luomoFilterBound) return;
      btn.dataset.luomoFilterBound = 'true';
      btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
      btn.addEventListener('click', function() {
        btns.forEach(function(other) {
          other.classList.toggle('active', other === btn);
          other.setAttribute('aria-pressed', String(other === btn));
        });
        cards.forEach(function(card) {
          card.style.display = (btn.dataset.filter === 'all' || card.dataset.category === btn.dataset.filter) ? '' : 'none';
        });
      });
    });
  }

  function setIndicator(card, status, label) {
    var indicator = card.querySelector('.status-indicator');
    indicator.className = 'status-indicator status-' + status;
    indicator.querySelector('.status-label').textContent = label;
  }

  function unknownAll(root, label) {
    root.querySelectorAll('.cloud-card[data-service-id]').forEach(function(card) {
      setIndicator(card, 'unknown', label);
    });
  }

  function stopChecks() {
    if (!context) return;
    if (context.controller) context.controller.abort();
    clearInterval(context.refreshTimer);
    clearTimeout(context.expiryTimer);
    context = null;
  }

  function validatePayload(payload) {
    if (!payload || payload.schemaVersion !== 1 || payload.kind !== 'public-http' || !Array.isArray(payload.services) || payload.services.length !== SERVICE_IDS.length) throw new Error('invalid_snapshot');
    var seen = new Set();
    var now = Date.now();
    payload.services.forEach(function(service) {
      if (!service || SERVICE_IDS.indexOf(service.id) < 0 || seen.has(service.id) || ['online', 'degraded', 'unknown'].indexOf(service.status) < 0 || REASONS.indexOf(service.reason) < 0) throw new Error('invalid_service');
      seen.add(service.id);
      var checked = Date.parse(service.checkedAt);
      var expires = Date.parse(service.expiresAt);
      if (!Number.isFinite(checked) || !Number.isFinite(expires) || expires <= checked || expires - checked > 180000 || checked > now + 60000) throw new Error('invalid_time');
      if (service.status === 'online' && (service.reason !== 'http_ok' || service.httpStatus < 200 || service.httpStatus >= 300)) throw new Error('invalid_online');
      if (service.httpStatus !== null && (!Number.isInteger(service.httpStatus) || service.httpStatus < 100 || service.httpStatus > 599)) throw new Error('invalid_http_status');
    });
    return payload.services;
  }

  function labelFor(service) {
    if (service.status === 'online') return '入口可达';
    if (service.status === 'degraded') return '入口异常 · HTTP ' + service.httpStatus;
    if (service.reason === 'redirect_unconfirmed') return '入口重定向 · 待确认';
    if (service.reason === 'access_limited') return '访问受限 · 待确认';
    if (service.reason === 'timeout') return '检查超时 · 待确认';
    if (service.reason === 'network_unconfirmed') return '连接未确认';
    return '待确认';
  }

  function renderSnapshot(state) {
    if (context !== state || !document.contains(state.root)) return;
    clearTimeout(state.expiryTimer);
    var now = Date.now();
    var nearestExpiry = Infinity;
    var counts = { online: 0, degraded: 0, unknown: 0 };
    state.services.forEach(function(service) {
      var card = state.root.querySelector('[data-service-id="' + service.id + '"]');
      if (!card) return;
      var expires = Date.parse(service.expiresAt);
      var expired = now >= expires;
      var status = expired ? 'unknown' : service.status;
      setIndicator(card, status, expired ? '结果已过期 · 待确认' : labelFor(service));
      var time = card.querySelector('.time-value');
      time.dateTime = service.checkedAt;
      time.textContent = new Date(service.checkedAt).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }) + (expired ? '（已过期）' : '');
      counts[status] += 1;
      if (!expired) nearestExpiry = Math.min(nearestExpiry, expires);
    });
    state.summary.textContent = '本次公开入口检查：' + counts.online + ' 个可达，' + counts.degraded + ' 个异常，' + counts.unknown + ' 个待确认。';
    if (Number.isFinite(nearestExpiry)) state.expiryTimer = setTimeout(function() { renderSnapshot(state); }, Math.max(1, nearestExpiry - now + 20));
  }

  async function refreshChecks(state) {
    if (context !== state || state.busy || !document.contains(state.root)) return;
    state.busy = true;
    state.button.disabled = true;
    state.button.textContent = '检查中…';
    state.summary.textContent = '正在检查公开入口…';
    state.controller = new AbortController();
    var controller = state.controller;
    var timeout = setTimeout(function() { controller.abort(); }, 8000);
    try {
      var response = await fetch('/api/status', { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error('snapshot_unavailable');
      var services = validatePayload(await response.json());
      if (context !== state) return;
      state.services = services;
      renderSnapshot(state);
    } catch (error) {
      if (context !== state) return;
      state.services = [];
      clearTimeout(state.expiryTimer);
      unknownAll(state.root, '暂时无法检查 · 待确认');
      state.summary.textContent = '暂时无法获取检查结果，请稍后刷新。';
    } finally {
      clearTimeout(timeout);
      if (context === state) {
        state.busy = false;
        state.controller = null;
        state.button.disabled = false;
        state.button.textContent = '刷新状态';
      }
    }
  }

  function initChecks() {
    var root = document.getElementById('cloud-dashboard');
    if (context && context.root === root) return;
    stopChecks();
    if (!root) return;
    var page = root.closest('#article-container') || root.parentElement;
    var button = page.querySelector('.status-refresh');
    var summary = page.querySelector('#status-summary');
    if (!button || !summary) return;
    var state = { root: root, button: button, summary: summary, services: [], busy: false, controller: null, refreshTimer: null, expiryTimer: null };
    context = state;
    button.addEventListener('click', function() { refreshChecks(state); });
    refreshChecks(state);
    state.refreshTimer = setInterval(function() {
      if (!document.hidden) refreshChecks(state);
    }, 60000);
  }

  function init() {
    initProjectsFilter();
    initChecks();
  }

  window.LuomoBlogTheme = { init: init };
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:send', stopChecks);
  document.addEventListener('pjax:complete', init);
  if (document.readyState !== 'loading') init();
})();
