/* ===== 洛墨云上星港 · Luomo Cloud Star Harbor Engine ===== */
(function() {
  'use strict';
  function initStarfield() {
    if (document.getElementById('canvas-starfield')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas-starfield';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let stars = [], w, h;
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    function createStars(c) {
      stars = [];
      for (let i = 0; i < c; i++) stars.push({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.2,
        alpha: Math.random() * 0.8 + 0.2, twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
    let shootingStars = [];
    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
        const a = s.alpha * tw;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,220,255,' + a + ')'; ctx.fill();
        if (s.r > 1.2) {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168,85,247,' + (a * 0.08) + ')'; ctx.fill();
        }
      }
      if (Math.random() < 0.003 && shootingStars.length < 2) shootingStars.push({
        x: Math.random() * w, y: 0, len: Math.random() * 80 + 40,
        speed: Math.random() * 8 + 4, alpha: 1, life: 1
      });
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x -= ss.speed; ss.y += ss.speed * 0.6; ss.life -= 0.016; ss.alpha = ss.life;
        if (ss.life <= 0 || ss.x < -100 || ss.y > h + 100) { shootingStars.splice(i, 1); continue; }
        const g = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * 0.5);
        g.addColorStop(0, 'rgba(200,220,255,' + ss.alpha + ')'); g.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.beginPath(); ctx.moveTo(ss.x, ss.y); ctx.lineTo(ss.x - ss.len, ss.y - ss.len * 0.5);
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.stroke();
      }
      requestAnimationFrame(draw);
    }
    resize(); createStars(Math.min(Math.floor(w * h / 8000), 200)); draw(0);
    window.addEventListener('resize', () => { resize(); createStars(Math.min(Math.floor(w * h / 8000), 200)); });
  }
  function initProjectsFilter() {
    const btns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.project-card');
    if (!btns.length) return;
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        cards.forEach(c => { c.style.display = (f === 'all' || c.dataset.category === f) ? '' : 'none'; });
      });
    });
  }
  function initCloudTimestamps() {
    const timeEls = document.querySelectorAll('.cloud-card .time-value');
    if (!timeEls.length) return;
    const now = new Date();
    timeEls.forEach(el => { el.textContent = now.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }); });
  }
  
  // --- Home Entry Cards ---
  function initHomeEntryCards() {
    // Only on homepage
    if (!document.querySelector('#page-header.full_page')) return;
    const container = document.querySelector('.recent-posts') || document.querySelector('#content-inner .layout');
    if (!container) return;
    // Check if already inserted
    if (document.getElementById('home-entry-cards')) return;
    const cards = document.createElement('div');
    cards.id = 'home-entry-cards';
    cards.className = 'home-entry-cards';
    cards.innerHTML = [
      { icon: '🚀', title: '项目档案馆', desc: '每一个服务，都是洛墨云世界中的一枚星标。', link: '/projects/' },
      { icon: '🛸', title: '洛墨云舰桥', desc: '所有星港服务的航行状态，都汇集于此。', link: '/cloud/' },
      { icon: '📡', title: '航行日志', desc: '把每一次构建、修复与重启，记录成通往群星的轨迹。', link: '/build-log/' },
    ].map(function(c) {
      return '<a class="home-entry-card" href="' + c.link + '">' +
        '<span class="entry-icon">' + c.icon + '</span>' +
        '<span class="entry-title">' + c.title + '</span>' +
        '<span class="entry-desc">' + c.desc + '</span></a>';
    }).join('');
    container.parentNode.insertBefore(cards, container);
  }
function init() {
    initStarfield();`n    initHomeEntryCards();
    initProjectsFilter();
    initCloudTimestamps();
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
})();



