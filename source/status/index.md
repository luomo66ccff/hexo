---
title: 星港服务状态
description: 查看洛墨各公开服务入口最近的 HTTP 检查结果。真实检查时间、入口异常与未知状态分别标注。
date: 2026-10-11
updated: 2026-10-11
layout: page
type: status
comments: false
aside: false
top_img: false
---

<div class="luomo-hero">
  <p class="luomo-hero-sub">每一枚星标，都有自己的航行状态。<a href="/cloud/">返回云舰桥</a></p>
</div>

<p class="status-scope">这里检查各服务的公网 HTTP 入口。入口可达不代表全部业务正常；登录限制、网络问题或过期结果会显示为待确认。状态约每分钟更新。</p>
<div class="status-toolbar">
  <p id="status-summary" role="status" aria-live="polite">尚未检查服务入口。</p>
  <button type="button" class="status-refresh">刷新状态</button>
</div>
<noscript><p>当前状态未检查，你仍可使用下面的服务入口。</p></noscript>

<div class="cloud-dashboard" id="cloud-dashboard">
  <div class="cloud-card" data-service-id="ops">
    <div class="cloud-card-header"><h3 class="cloud-name">LuomoOps</h3><span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span></div>
    <p class="cloud-desc">服务器状态、服务监控与运维入口</p>
    <div class="cloud-meta"><a href="https://ops.luomo.moe" target="_blank" rel="noopener">访问服务</a></div>
    <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
  </div>
  <div class="cloud-card" data-service-id="file">
    <div class="cloud-card-header"><h3 class="cloud-name">LuomoFile Hub</h3><span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span></div>
    <p class="cloud-desc">私有文件上传、临时文件管理与对象存储服务</p>
    <div class="cloud-meta"><a href="https://file.luomo.moe" target="_blank" rel="noopener">访问服务</a></div>
    <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
  </div>
  <div class="cloud-card" data-service-id="api">
    <div class="cloud-card-header"><h3 class="cloud-name">LuomoAPI Hub</h3><span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span></div>
    <p class="cloud-desc">API 聚合网关与统一接口管理</p>
    <div class="cloud-meta"><a href="https://api.luomo.moe" target="_blank" rel="noopener">访问服务</a></div>
    <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
  </div>
  <div class="cloud-card" data-service-id="atri">
    <div class="cloud-card-header"><h3 class="cloud-name">AstrBot / ATRI API</h3><span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span></div>
    <p class="cloud-desc">AI 智能体后端与自动化接口服务</p>
    <div class="cloud-meta"><a href="https://atri-api.luomo.moe" target="_blank" rel="noopener">访问服务</a></div>
    <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
  </div>
  <div class="cloud-card" data-service-id="error">
    <div class="cloud-card-header"><h3 class="cloud-name">Error Gallery</h3><span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span></div>
    <p class="cloud-desc">HTTP 错误页与二次元错误页素材系统</p>
    <div class="cloud-meta"><a href="https://error.luomo.moe" target="_blank" rel="noopener">访问服务</a></div>
    <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
  </div>
  <div class="cloud-card" data-service-id="blog">
    <div class="cloud-card-header"><h3 class="cloud-name">Blog Star Harbor</h3><span class="status-indicator status-unknown"><span class="status-dot"></span><span class="status-label">未检查</span></span></div>
    <p class="cloud-desc">洛墨云世界的内容入口与日志档案馆</p>
    <div class="cloud-meta"><a href="https://blog.luomo.moe" target="_blank" rel="noopener">访问服务</a></div>
    <div class="cloud-footer"><span class="check-time">最后检查：<time class="time-value">未检查</time></span></div>
  </div>
</div>
