---
title: 把一个 npm 包变成热榜 API：HotAPI 的 Vercel Serverless 技术路径与部署实战
date: 2026-08-04 22:10:00
updated: 2026-08-04 22:10:00
categories:
  - 技术实践
tags:
  - Vercel
  - Serverless
  - Node.js
  - Hono
  - API
  - GitHub
description: 从三行入口、ESM 依赖、动态路由与进程内缓存，到 Vercel Node.js Function、GitHub 持续部署、CORS 加固和版本升级，完整拆解 HotAPI 的部署适配路径。
katex: true
abbrlink: 9f7e31ac
---

这次我选择拆解 {HotAPI|热榜接口部署仓}。它不是我原创的一整套爬虫内核，而是我在 GitHub 上维护、交给 Vercel 托管的部署适配项目：上游核心来自 [imsyy/DailyHotApi](https://github.com/imsyy/DailyHotApi)，遵循 MIT 协议；我的工作重点是把 npm 包固定成可复现依赖，再用极薄的 Node.js 入口与 `vercel.json` 把它变成公开 Serverless API。

{% label GitHub部署仓 blue %} {% label Vercel函数 black %} {% label JSON与RSS green %} {% label 上游MIT purple %}

{% btn https://hotapi-ten.vercel.app,打开 HotAPI,fas fa-fire,orange larger %}
{% btn https://github.com/luomo66ccff/hotapi,查看 GitHub 部署仓,fab fa-github,purple larger %}
{% btn https://github.com/imsyy/DailyHotApi,查看上游核心,fab fa-github,blue larger %}

{% note warning %}
先把署名边界钉牢：本文讲的是“如何部署、约束和维护上游 API”，不是把上游作者 imsyy 的采集器改姓。薄适配层同样有工程价值，但它的价值来自可复现部署、运行时边界和运维策略，而不是抢走核心实现的作者席位。
{% endnote %}

<!-- more -->

## 为什么一个三行入口仍然值得写

项目入口只有三行：

```js
import serveHotApi from "dailyhot-api";

serveHotApi();
```

三行不等于没有架构。它把职责切得很清楚：上游包负责 Hono 路由、数据抓取、格式归一化、JSON/RSS 输出和缓存；部署仓负责版本锁定、ESM 入口、Vercel Function 构建、全路径转发与 GitHub 更新入口。{% hint '薄部署仓' '业务代码很少' '版本和运行时要固定' '路由与发布边界要明确' %} 的目标正是少写重复代码，而不是少做验证。

截至本文审计时，Vercel 项目 `hotapi` 的生产部署状态为 `Ready`，构建结果是一枚位于 `iad1` 的 Node.js Function，解包前显示约 `939.08 KB`。GitHub 仓库的锁文件固定了 `dailyhot-api 2.0.6`；上游已经发布 `2.0.8`，所以“生产正在跑什么”和“上游最新是什么”必须分开记录。

## 仓库虽小，边界要完整

```text
hotapi/
├─ index.js                 # Serverless 入口
├─ package.json             # ESM、依赖与脚本
├─ package-lock.json        # 可复现安装契约
├─ vercel.json              # Function 构建与全路径路由
├─ public/                  # 图标等静态资源
└─ .github/
   └─ dependabot.yml        # 每日检查 npm 版本更新
```

`package.json` 中有三个不能随手删的关键点：

| 配置 | 当前值 | 作用 |
|---|---|---|
| `type` | `module` | 让 `index.js` 使用原生 ESM `import` |
| `dependencies` | `dailyhot-api: ^2.0.6` | 引入上游运行时；实际部署版本由锁文件决定 |
| `devDependencies` | `@vercel/node` | 把入口构建成 Vercel Node.js Function |

Vercel 官方文档也明确：无框架 JavaScript Function 若使用 ESM，需要在 `package.json` 设置 `"type": "module"`，或者改用 `.mjs`。这里选择前者，入口文件保持普通 `.js` 即可。

## 请求是怎样穿过这三层的

{% mermaid %}
flowchart LR
  U["浏览器 / RSS 阅读器 / 脚本"] --> V["Vercel 路由层"]
  V --> F["Node.js Function\nindex.js"]
  F --> H["dailyhot-api\nHono 应用"]
  H --> R["动态路由注册表"]
  R --> S["公开数据源 / RSS / 页面"]
  R --> C["NodeCache\n实例内缓存"]
  H --> J["JSON 响应"]
  H --> X["RSS XML 响应"]
{% endmermaid %}

{% timeline 一次热榜请求的生命史,orange %}
<!-- timeline 1. Vercel 接收路径 -->
`/bilibili?limit=10` 先命中部署仓的 catch-all 路由，再交给 `index.js` 对应的 Node.js Function。
<!-- endtimeline -->
<!-- timeline 2. Hono 匹配动态路由 -->
上游在启动时扫描 `routes/`。2.0.6 标签中共有 42 个路由文件，其中 40 个可用，`52pojie` 与 `hostloc` 被显式排除。
<!-- endtimeline -->
<!-- timeline 3. 尝试读取缓存 -->
默认 TTL 为 3600 秒。命中当前 Function 实例的 NodeCache 就直接返回；`cache=false` 会主动绕过缓存。
<!-- endtimeline -->
<!-- timeline 4. 获取并标准化数据 -->
未命中缓存时，具体路由向公开数据源请求内容，再统一成标题、链接、热度、更新时间和列表项等字段。
<!-- endtimeline -->
<!-- timeline 5. 决定输出格式 -->
默认返回 JSON；带 `rss=true` 时生成 RSS XML。`limit` 参数在响应前裁剪条目数。
<!-- endtimeline -->
{% endtimeline %}

## 动态路由为什么比手写 40 次更稳

上游的注册器扫描路由目录，为每个文件创建 `/<route>` 入口，并在请求时动态导入对应实现。逻辑可以压缩成下面这段伪代码：

```ts
for (const route of routeFiles) {
  app.get(`/${route}`, async (context) => {
    const noCache = context.req.query("cache") === "false";
    const limit = Number(context.req.query("limit"));
    const rss = context.req.query("rss") === "true";

    const { handleRoute } = await import(`./routes/${route}.js`);
    const result = await handleRoute(context, noCache);
    return rss ? toRss(result) : context.json(trim(result, limit));
  });
}
```

这样新增一个榜单通常只需新增一个路由文件，不必再修改总入口。`/all` 还能返回路由目录，前端或监控脚本不需要把列表硬编码到自己的版本里。

常用请求如下：

```bash
# 查看可用接口
curl --fail https://hotapi-ten.vercel.app/all

# 只取前 10 条
curl --fail "https://hotapi-ten.vercel.app/bilibili?limit=10"

# 输出 RSS
curl --fail "https://hotapi-ten.vercel.app/zhihu?rss=true"

# 绕过缓存，仅用于排障或人工刷新
curl --fail "https://hotapi-ten.vercel.app/36kr?cache=false"
```

{% note danger %}
不要把 `cache=false` 塞进公开前端的默认请求。那等于让每位访客都拿着小锤子敲上游站点，缓存当场表演“我装了，但没完全装”。
{% endnote %}

## 缓存：Serverless 最容易被误解的一层

上游 2.0.6 默认使用 `NodeCache`，TTL 是 3600 秒。单进程常驻服务器上，理想情况下同一路由每小时只回源一次；但 Vercel 会冷启动、并发扩容，也可能同时存在多个 Function 实例。各实例内存不共享，因此更准确的近似是：

$$
R_{origin} \approx \frac{I_{warm} + I_{cold}}{T_{TTL}}
$$

其中 $I_{warm}$ 是窗口内实际承接请求的暖实例数，$I_{cold}$ 是发生冷启动的实例数，$T_{TTL}$ 是缓存秒数。这个公式不是计费器，而是在提醒我们：进程内缓存只能减少单实例回源，不能承诺全局每小时一次。

如果流量上升，需要跨实例稳定缓存，应升级到支持 Redis 的上游版本并接入兼容服务，或者把适合缓存的响应交给 CDN；同时必须遵守数据源更新频率和使用条款，不能用“我有缓存”给高频抓取穿隐身衣。

## `vercel.json` 到底做了什么

仓库当前配置使用显式构建器：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ]
}
```

第一段把 `index.js` 编译为 Node.js Function；第二段把所有访问路径送进同一个 Hono 应用，让 `/all`、`/bilibili`、`/zhihu` 不必各自创建 Function 文件。Vercel 目前仍支持 `routes`，但官方建议普通重写和响应头优先使用更高层的 `rewrites`、`headers` 配置。这个仓库的显式 Function 适配属于需要先做回归验证再迁移的情况，不要只因为新语法看起来更潮就闭眼改配置。

### 当前 CORS 配置需要收紧

原仓库在 Vercel 路由层同时声明了：

```text
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: *
```

浏览器的凭据型 CORS 不接受通配来源；而热榜 API 本身通常只需要公开的 `GET` 与预检 `OPTIONS`，也没必要默认放行 `PATCH`、`DELETE`、`POST`、`PUT`。更稳妥的原则是二选一：

1. 公开只读 API：允许 `Origin: *`，移除 credentials，只开放 `GET, OPTIONS`；
2. 私有前端 API：把 Origin 写成明确域名，保留 credentials，并补上 `Vary: Origin`。

上游 Hono 应用本身已经有 CORS 中间件，部署层不应再发一套互相打架的头。正式上线前应统一到一个地方管理，并用浏览器预检请求验证，而不是让两层 CORS 像两位保安互相检查工作证。

{% spoiler style:blur 看到“全放行最省事”时，请默念：省下来的配置时间，通常会变成未来的事故复盘时间。 %}

## 从 GitHub 部署到 Vercel

下面给出一条可复现、可回滚的部署路线。仓库当前生产项目使用 Node.js 22；上游 2.0.6 要求 Node.js 20 或更高版本。

### 1. 拉取代码并锁定安装

```bash
git clone https://github.com/luomo66ccff/hotapi.git
cd hotapi
node --version
npm ci
```

这里用 `npm ci`，不使用 `npm install`。前者严格读取 `package-lock.json`，确保部署复现 2.0.6；后者可能因为 `^2.0.6` 自动解析到新的兼容版本，让“重新部署”偷偷变成“顺便升级”。

### 2. 本地用 Vercel 运行时验证

这个部署仓没有普通 `dev` 脚本，最接近生产路径的方式是：

```bash
npx vercel dev
```

另开终端做四个冒烟测试：

```bash
curl --fail http://localhost:3000/all
curl --fail "http://localhost:3000/bilibili?limit=3"
curl --fail "http://localhost:3000/zhihu?rss=true"
curl -i -X POST http://localhost:3000/bilibili
```

预期分别是：路由目录、三条 JSON 数据、XML 响应，以及不支持方法的 `405`。某个数据源失败不必立刻判定整站坏掉；先用 `/all` 区分运行时故障与单路由上游变化。

### 3. 导入 GitHub 仓库

在 Vercel 控制台选择 **Add New → Project**，导入 `luomo66ccff/hotapi`。设置如下：

| 项目 | 值 |
|---|---|
| Framework Preset | Other |
| Root Directory | `.` |
| Install Command | `npm ci` |
| Node.js Version | 22.x |
| Build / Function config | 读取仓库根目录 `vercel.json` |
| Production Branch | `main` |

也可以用 CLI：

```bash
npx vercel link
npx vercel deploy
npx vercel deploy --prod
```

第一次先发布 Preview，完成接口检查后再发 Production。GitHub 连接建立后，分支或 Pull Request 生成预览部署，`main` 进入生产；这样依赖升级不会直接在正式接口上玩俄罗斯轮盘。

### 4. 环境变量建议

默认配置可以启动，但公开服务建议显式记录这些值：

```dotenv
CACHE_TTL=3600
DISALLOW_ROBOT=true
RSS_MODE=false
USE_LOG_FILE=false
ALLOWED_HOST=your-frontend.example
ALLOWED_DOMAIN=https://your-frontend.example
```

`USE_LOG_FILE=false` 很重要：Vercel Function 的本地文件系统不是持久日志盘，运行日志应写到标准输出，再由 Vercel Logs 收集。

{% note warning %}
锁定的上游 2.0.6 有一个已修复的配置错误：`REQUEST_TIMEOUT` 实际误读了 `CACHE_TTL`。因此不要在 2.0.6 上假设 `REQUEST_TIMEOUT=6000` 已生效；先升级并验证到 2.0.8，再单独配置请求超时。
{% endnote %}

### 5. 发布后的验收

{% tabs hotapi-check,1 %}
<!-- tab 接口正确性@fas fa-vial -->
```bash
curl --fail https://your-project.vercel.app/all
curl --fail "https://your-project.vercel.app/bilibili?limit=3"
curl -I "https://your-project.vercel.app/zhihu?rss=true"
```

确认 `/all` 的 `code` 为 200、`routes` 非空；榜单 `data` 是数组；RSS 的 `Content-Type` 是 XML。
<!-- endtab -->
<!-- tab 平台状态@fas fa-cloud -->
```bash
npx vercel inspect https://your-project.vercel.app
npx vercel logs https://your-project.vercel.app --since 1h
```

确认目标是 production、状态是 Ready、Function 构建成功，并检查是否存在连续超时、上游 403 或模块缺失。
<!-- endtab -->
<!-- tab 浏览器 CORS@fas fa-shield-halved -->
```bash
curl -i -X OPTIONS https://your-project.vercel.app/bilibili \
  -H "Origin: https://your-frontend.example" \
  -H "Access-Control-Request-Method: GET"
```

确认只返回预期 Origin 和方法；若使用 `*`，就不应同时允许 credentials。
<!-- endtab -->
{% endtabs %}

### 6. 绑定域名与回滚

在 Vercel 的 Domains 中添加 API 子域名，再按控制台给出的 DNS 目标配置。不要凭记忆硬写 CNAME；同一个域名若已经被其他项目占用，应先确认归属，避免为了一个热榜接口把主站 DNS 拔成盆栽。

每次更新前保留上一个 Ready 部署。新版本出现系统性 500 时，优先在 Vercel 控制台把别名切回上一份通过验收的生产部署，再分析依赖或数据源变化；不要在事故现场边改 `package-lock.json` 边许愿。

## 依赖升级：把“每天检查”变成真正的门禁

仓库已启用 Dependabot，每天检查 npm 依赖。但自动开 PR 不等于自动安全升级，尤其 `dailyhot-api` 同时包含路由、爬取器、缓存和页面解析逻辑。建议每个升级 PR 至少执行：

1. 锁文件差异审查，确认没有意外主版本跳跃；
2. `npx vercel dev` 本地启动；
3. `/all`、一个 JSON 路由、一个 RSS 路由和一个错误方法测试；
4. Preview 部署检查 Function 体积和冷启动；
5. CORS、缓存参数与 robots 行为回归；
6. 只在 Preview 全绿后合并到 `main`。

从 2.0.6 升到 2.0.8 时，建议把依赖改为精确版本，避免以后无审查漂移：

```bash
npm install --save-exact dailyhot-api@2.0.8
npx vercel dev
```

验证完再提交 `package.json` 与 `package-lock.json`。若希望继续自动接收补丁版本，也可以保留 caret，但生产部署仍必须使用锁文件安装。

## 公开 API 还缺哪些生产护栏

当前部署适合个人项目、开发测试和轻量聚合，但不能因为 Vercel 自动扩容就假装它无限抗打。

| 风险 | 表现 | 建议 |
|---|---|---|
| 数据源变更 | 单路由 403、结构解析失败 | 独立监控重点路由，不把单源故障升级成全站宕机 |
| 无全局限流 | 热门接口被脚本集中调用 | 在边缘层增加限流、Bot 防护或调用配额 |
| 实例缓存不共享 | 并发实例重复回源 | 需要时接 Redis/CDN，并设置合理 TTL |
| 宽松 CORS | 任意站点借用接口、配置互相冲突 | 只读与凭据场景分开配置 |
| 抓取合规 | 数据源条款或结构变化 | 尊重站点规则、降低频率、保留停用单路由能力 |
| 依赖漂移 | 重部署行为突然变化 | `npm ci`、Preview、锁文件审查与可回滚部署 |

{% hideToggle 点开：接口异常时按这个顺序排查,#425b89,#ffffff %}
1. `/all` 也失败：检查 Vercel Function 构建、Node 版本、ESM 配置和入口是否被正确打包。
2. `/all` 正常、某个榜单失败：大概率是该数据源接口、反爬或页面结构变化；查看对应上游路由的运行日志。
3. JSON 正常、RSS 失败：检查 `rss=true` 是否正确传递、响应是否包含无法生成 Feed 的异常字段。
4. 首次请求慢、随后恢复：区分冷启动与上游超时；不要先把 TTL 调成一年假装世界和平。
5. 浏览器报 CORS、命令行正常：检查响应里是否同时出现多套 `Access-Control-*`，并修复 wildcard + credentials 冲突。
6. 更新依赖后全部 500：回滚上一份 Ready 部署，再比较 Node 要求、导出方式、锁文件与 `vercel.json`。
{% endhideToggle %}

## 最后的复盘

HotAPI 最值得复用的不是那句 `serveHotApi()`，而是“核心能力做成包，平台差异留在薄适配层”的思路。业务路由不必知道自己跑在 Vercel，部署仓也不复制 40 份抓取实现；两边通过版本、入口和 HTTP 契约连接。

但薄并不等于随便。真正决定它能否长期运行的是锁文件、Serverless 缓存认知、CORS 边界、Preview 门禁、日志和回滚。把这些补齐，三行代码可以是一座稳稳的桥；忽略它们，三行代码也能是一块写着“此路不通”的电子牌。

{% btn https://github.com/luomo66ccff/hotapi,从部署仓开始复现,fab fa-github,blue center larger %}
