---
title: 洛墨云舰桥 · Cloud Cockpit
description: 洛墨云服务的公开入口与最近 HTTP 检查结果；未知和过期结果明确标注，不代表完整业务健康状态。
date: 2026-06-25 00:00:00
type: cloud
comments: false
aside: false
top_img: false
---

<div class="luomo-hero">
  <p class="luomo-hero-sub">所有星港服务的航行状态，都汇集于此。</p>
</div>

<p class="status-scope">这里检查各服务的公网 HTTP 入口。入口可达不代表全部业务正常；登录限制、网络问题或过期结果会显示为待确认。状态约每分钟更新。<a href="/status/">查看服务状态页</a></p>
<div class="status-toolbar">
  <p id="status-summary" role="status" aria-live="polite">尚未检查服务入口。</p>
  <button type="button" class="status-refresh">刷新状态</button>
</div>
<noscript><p>当前状态未检查，你仍可使用下面的服务入口。</p></noscript>

<div class="cloud-dashboard" id="cloud-dashboard">

<div class="cloud-card" data-group="Operations" data-service-id="ops">
  <div class="cloud-card-header">
    <h3 class="cloud-name">LuomoOps</h3>
    <span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span>
  </div>
  <p class="cloud-desc">服务器状态、服务监控与运维入口</p>
  <div class="cloud-meta"><span class="cloud-url"><a href="https://ops.luomo.moe" target="_blank" rel="noopener">https://ops.luomo.moe</a></span></div>
  <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
</div>

<div class="cloud-card" data-group="Storage" data-service-id="file">
  <div class="cloud-card-header">
    <h3 class="cloud-name">LuomoFile Hub</h3>
    <span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span>
  </div>
  <p class="cloud-desc">私有文件上传、临时文件管理与对象存储服务</p>
  <div class="cloud-meta"><span class="cloud-url"><a href="https://file.luomo.moe" target="_blank" rel="noopener">https://file.luomo.moe</a></span></div>
  <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
</div>

<div class="cloud-card" data-group="API" data-service-id="api">
  <div class="cloud-card-header">
    <h3 class="cloud-name">LuomoAPI Hub</h3>
    <span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span>
  </div>
  <p class="cloud-desc">API 聚合网关与统一接口管理</p>
  <div class="cloud-meta"><span class="cloud-url"><a href="https://api.luomo.moe" target="_blank" rel="noopener">https://api.luomo.moe</a></span></div>
  <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
</div>

<div class="cloud-card" data-group="AI" data-service-id="atri">
  <div class="cloud-card-header">
    <h3 class="cloud-name">AstrBot / ATRI API</h3>
    <span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span>
  </div>
  <p class="cloud-desc">AI 智能体后端与自动化接口服务</p>
  <div class="cloud-meta"><span class="cloud-url"><a href="https://atri-api.luomo.moe" target="_blank" rel="noopener">https://atri-api.luomo.moe</a></span></div>
  <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
</div>

<div class="cloud-card" data-group="Misc" data-service-id="error">
  <div class="cloud-card-header">
    <h3 class="cloud-name">Error Gallery</h3>
    <span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span>
  </div>
  <p class="cloud-desc">HTTP 错误页与二次元错误页素材系统</p>
  <div class="cloud-meta"><span class="cloud-url"><a href="https://error.luomo.moe" target="_blank" rel="noopener">https://error.luomo.moe</a></span></div>
  <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
</div>

<div class="cloud-card" data-group="Blog" data-service-id="blog">
  <div class="cloud-card-header">
    <h3 class="cloud-name">Blog Star Harbor</h3>
    <span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span>
  </div>
  <p class="cloud-desc">Hexo 博客，洛墨云世界的内容入口与日志档案馆</p>
  <div class="cloud-meta"><span class="cloud-url"><a href="https://blog.luomo.moe" target="_blank" rel="noopener">https://blog.luomo.moe</a></span></div>
  <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
</div>

</div>

<div class="luomo-section-footer">
  <p>—— 循此苦旅，直抵群星 ——</p>
</div>
