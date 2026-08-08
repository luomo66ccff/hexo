---
title: 从 Markdown 到全球 CDN：我的 Hexo 博客 GitHub + Vercel 部署全流程
date: 2026-08-08 19:45:00
updated: 2026-08-08 19:45:00
categories:
  - 技术实践
tags:
  - Hexo
  - Butterfly
  - Vercel
  - GitHub
  - pnpm
  - CI/CD
description: 以 Luomoの云日常的真实仓库和生产配置为样本，完整拆解 Hexo、Butterfly、插件、GitHub、Vercel、自定义域名、缓存、回滚，以及黑屏和旧 Service Worker 等实际故障的处理路径。
katex: true
abbrlink: 3d61fa8b
---

这篇文章把 {Luomoの云日常|本站博客} 自己放到解剖台上：源码托管在 GitHub，Hexo 把 Markdown 编译成静态文件，Butterfly 负责页面结构与样式，Vercel 连接 `main` 分支并将构建结果发布到 `blog.luomo.moe`。这不是一份只在空目录里成功过的“理论教程”，而是对当前生产仓库、部署记录和几次真实事故的复盘。

{% label Hexo静态生成 blue %} {% label Butterfly主题 purple %} {% label GitHub源代码 black %} {% label Vercel生产部署 green %}

{% btn https://blog.luomo.moe,打开博客,fas fa-blog,blue larger %}
{% btn https://github.com/luomo66ccff/hexo,查看 GitHub 仓库,fab fa-github,purple larger %}
{% btn https://hexo.io/docs/,Hexo 官方文档,fas fa-book,green larger %}
{% btn https://vercel.com/docs/git,Vercel Git 部署文档,fas fa-cloud,orange larger %}

{% note success %}
本文所有版本号、目录、构建命令和故障原因都来自当前仓库或真实部署记录。账号令牌、百度推送 Token、评论系统密钥等不会写进文章，更不会塞进 Git 历史供全世界考古。
{% endnote %}

<!-- more -->

## 先看最终架构

{% mermaid %}
flowchart LR
  A["source/_posts/*.md\n文章与 Front-matter"] --> B["Markdown-it 与内容插件\nKaTeX / Ruby / Hint / Spoiler"]
  B --> C["Hexo 7.3.0\n生成路由与静态资源"]
  T["Butterfly 4.13.0\nPug + Stylus + Tag Plugins"] --> C
  X["自定义 CSS / JS\n白色主题与 PJAX 兼容"] --> C
  C --> P["public/\nHTML / CSS / JS / XML"]
  P --> V["Vercel Production\n静态托管与边缘缓存"]
  G["GitHub main 分支"] --> V
  V --> D["blog.luomo.moe\nHTTPS 自定义域名"]
{% endmermaid %}

整条链路里没有运行时数据库，也没有常驻 Node.js 服务。Node.js 只在构建阶段执行 Hexo；部署完成后，访客拿到的是预先生成的 HTML、CSS、JavaScript、图片、搜索索引、Feed 和站点地图。{% hint '构建时生成' '静态文件托管' '生产域名分发' %} 是理解这套架构的三个关键词。

## 当前生产基线

截至本文发布前，我重新执行了版本检查、干净构建与 Vercel 控制面审计：

| 项目 | 当前值 | 说明 |
|---|---|---|
| GitHub 仓库 | `luomo66ccff/hexo` | Vercel 项目已真实连接该仓库 |
| 生产分支 | `main` | 推送后触发 Production 部署 |
| Hexo | `7.3.0` | 实际安装版本，不是只看范围声明 |
| Butterfly | `4.13.0` | 主题源码随仓库版本化 |
| 本地验证环境 | Node.js `24.14.0`、pnpm `11.16.0` | 本文构建基线 |
| Vercel 项目运行时 | Node.js `20.x` | 当前仍可构建，但已经收到弃用警告 |
| Vercel 项目根目录 | `.` | 博客位于仓库根目录 |
| 构建输出 | `public/` | 由 `hexo generate` 生成 |
| 最近生产状态 | `READY` | 控制面显示最新 Production 已就绪 |
| 正式域名 | `https://blog.luomo.moe` | 指向最新生产部署 |

{% note warning %}
Vercel 已提示 Node.js 20.x 将在 2026 年 10 月 1 日后阻止新构建。新建项目应直接选 24.x；本站也需要在截止日前完成 24.x 迁移和一次完整回归，不能等构建日历翻脸时再临场表演滑跪。
{% endnote %}

## 仓库结构：哪些文件真正参与部署

```text
hexo-blog/
├─ _config.yml                    # Hexo 站点、路由与插件配置
├─ package.json                   # 依赖与 clean/build/server 脚本
├─ pnpm-lock.yaml                 # 可复现依赖图
├─ pnpm-workspace.yaml            # 将仓库根声明为 pnpm workspace
├─ vercel.json                    # Vercel 构建、输出与缓存响应头
├─ source/
│  ├─ _posts/                    # 已发布 Markdown 文章
│  ├─ _drafts/                   # 草稿，不进入正式构建
│  ├─ css/luomo-theme.css        # 白色主题覆盖层
│  ├─ js/luomo-theme.js          # 项目筛选与 PJAX 重初始化
│  └─ service-worker.js          # 旧离线缓存的一次性退役脚本
├─ themes/butterfly/              # Butterfly 4.13.0 主题源码
└─ public/                        # 构建产物，忽略提交，由 Vercel 生成
```

这里最重要的边界是：`source/`、主题和配置属于源码，`public/` 属于可重复生成的产物。仓库的 `.gitignore` 会排除 `public/`、`node_modules/`、`db.json`、`.vercel/` 与本地环境文件，避免把几万份可再生文件和项目链接元数据一起扔进 Git。

## 从零准备运行环境

为了避开即将退役的 Node.js 20，新部署建议直接使用 Node.js 24 LTS，并通过 Corepack 或独立安装获得 pnpm：

```bash
node --version
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm --version
```

然后克隆仓库并严格按照锁文件安装：

```bash
git clone https://github.com/luomo66ccff/hexo.git
cd hexo
pnpm install --frozen-lockfile
```

`--frozen-lockfile` 会在 `package.json` 与锁文件不一致时直接失败。失败虽然很不给面子，却比生产构建偷偷换一批依赖、上线后集体失忆更安全。

### pnpm 版本还有一个现实差异

仓库的 `packageManager` 声明为 `pnpm@11.9.0`，当前本地验证实际使用 `11.16.0`；现有 Vercel 项目则根据项目创建时间和锁文件格式选择了 pnpm 9.x。也就是说，“写了 packageManager”不自动等于每个环境都精确执行该版本。

若团队需要完全一致，可以启用 Vercel 支持的 Corepack 机制，并把本地、CI 与 Vercel 的 pnpm 版本统一；在完成迁移前，至少要保留锁文件安装和 Preview 验证，不能一边跨大版本一边直冲生产。

## `package.json`：把流程收口成四个命令

仓库使用的脚本非常克制：

```json
{
  "scripts": {
    "build": "hexo generate",
    "clean": "hexo clean",
    "deploy": "hexo deploy",
    "server": "hexo server"
  }
}
```

日常真正使用的是：

```bash
pnpm run clean     # 删除 db.json 与 public，排除旧产物污染
pnpm run build     # 生成 public
pnpm run server    # 在 http://localhost:4000 预览
```

虽然还保留了 `hexo deploy` 脚本，但本站生产链路并不依赖它。仓库也没有安装 `hexo-deployer-git`，所以正确发布方式是提交源码并推送 GitHub，再由 Vercel 构建；不要把 `hexo deploy` 和 Vercel Git 集成同时当作两位司机抢方向盘。

## 为什么需要 `pnpm-workspace.yaml`

当前文件内容如下：

```yaml
packages:
  - .

allowBuilds:
  core-js: true
  ejs: true
  hexo-util: true
  highlight.js: true
```

`packages: - .` 明确告诉 pnpm：仓库根就是工作区包。它看起来像在认真声明“我家住我家”，但这行曾经解决过 Vercel 对工作区根识别不完整的问题。`allowBuilds` 则只允许列出的依赖执行构建脚本，降低安装阶段随意运行脚本的范围。

[pnpm 官方工作区文档](https://pnpm.io/workspaces)要求工作区根包含 `pnpm-workspace.yaml`。即使这里只有一个包，把根目录显式列出也能让本地与远端对项目边界形成同一套认知。

## Hexo 主配置：域名、路由与生成目录

`_config.yml` 中与部署最相关的部分可以压缩为：

```yaml
title: Luomoの云日常
language: zh-CN
timezone: Asia/Shanghai

url: https://blog.luomo.moe
permalink: posts/:abbrlink.html
source_dir: source
public_dir: public
render_drafts: false
theme: butterfly

markdown:
  plugins:
    - '@renbaoshuo/markdown-it-katex'
    - markdown-it-ruby
```

`url` 必须写正式域名，否则 Feed、站点地图、规范链接和百度提交列表可能继续散发旧地址。`permalink` 使用 `hexo-abbrlink` 生成稳定短链接，标题改名时不会顺手给所有外链来一记背刺。

草稿放在 `source/_drafts/`，因为 `render_drafts: false`，正式构建不会发布；需要预览时使用 `hexo server --draft`，不要为了看草稿把它先塞进 `_posts` 再祈祷自己记得删。

## 我扫描到的 28 个直接依赖

依赖多不代表每篇文章都要全员上台。下面按职责列出当前安装结果，版本来自实际依赖树：

{% hideToggle 展开完整插件审计,#425b89,#ffffff %}

| 类别 | 包与实际版本 | 当前职责 |
|---|---|---|
| 核心 | `hexo 7.3.0`、`hexo-util 3.3.0`、`hexo-server 3.0.0` | 生成器、工具与本地预览 |
| 渲染器 | `hexo-renderer-markdown-it 7.1.1`、`ejs 2.0.0`、`pug 3.0.0`、`stylus 3.0.1` | Markdown、模板与样式编译 |
| 基础生成器 | `archive 2.0.0`、`category 2.0.0`、`index 3.0.0`、`tag 2.0.0` | 首页、归档、分类与标签 |
| 发现与订阅 | `searchdb 1.5.0`、`feed 4.0.0`、`sitemap 3.0.1`、`baidu-sitemap 0.1.9` | 搜索索引、Atom、两类站点地图 |
| 链接与 SEO | `abbrlink 2.2.1`、`filter-nofollow 2.0.2`、`baidu-url-submit 0.0.6` | 固定链接、外链属性与提交列表 |
| 数学与排版 | `markdown-it-katex 2.0.2`、`markdown-it-ruby 0.1.1`、`wordcount 6.0.1` | 公式、Ruby 注音、字数与阅读时间 |
| 交互内容 | `hexo-spoiler 1.7.4`、`hexo-tag-hint 0.3.1` | 模糊隐藏与行内提示 |
| 媒体标签 | `hexo-tag-aplayer 3.0.4`、`hexo-tag-bilibili 0.3.1` | 音乐和视频嵌入，本文不强行使用 |
| 说说生态 | `hexo-butterfly-artitalk 1.0.4`、`hexo-butterfly-hpptalk 1.0.4` | 说说页面能力，需要独立配置凭据 |
| 备用主题 | `hexo-theme-landscape 1.0.0` | Hexo 默认主题依赖，当前未启用 |

{% endhideToggle %}

全站构建时，搜索、Feed、站点地图、nofollow 与字数统计会自然参与；本文另外使用了 KaTeX、Ruby、Hint、Spoiler，以及 Butterfly 自带的 Mermaid、Note、Tabs、Timeline、Button、Label 和 HideToggle。APlayer 与 Bilibili 不服务于部署主题，硬塞一段音乐视频只会让教程像项目经理突然唱起片尾曲。

## Butterfly 与白色主题如何叠加

本站把 Butterfly 4.13.0 的源码放在 `themes/butterfly/` 中，并启用了这些关键项：

```yaml
display_mode: light

darkmode:
  enable: false
  button: false

preloader:
  enable: false

wordcount:
  enable: true

search:
  use: local_search

pjax:
  enable: true

lazyload:
  enable: true

mermaid:
  enable: true
```

自定义样式不直接堆进文章，而是由主题注入：

```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/luomo-theme.css?v=20260804-white">
  bottom:
    - <script src="/js/luomo-theme.js?v=20260626-butterfly"></script>
```

`source/css/luomo-theme.css` 将正文卡片、表格、代码块、导航和页脚统一为白色；移动端表格单独允许横向滚动。`source/js/luomo-theme.js` 在 `DOMContentLoaded` 和 `pjax:complete` 后重新初始化交互，避免 PJAX 换页后按钮看得见却像灵魂已离职。

长期维护时，优先把个性化放在 `source/css`、`source/js` 和独立主题配置中。本站历史上修改过少量 Butterfly 内部模板与过滤器，所以升级主题前必须对比这些补丁，不能直接覆盖整个主题目录。

## `vercel.json`：生产构建的唯一明确契约

当前仓库使用：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "public",
  "framework": "hexo",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, s-maxage=300, must-revalidate"
        }
      ]
    }
  ]
}
```

四个核心字段各管一层：

| 字段 | 作用 |
|---|---|
| `framework` | 让 Vercel 按 Hexo 项目理解仓库 |
| `installCommand` | 严格按锁文件安装依赖 |
| `buildCommand` | 运行 `hexo generate` |
| `outputDirectory` | 只发布 `public/`，不把源码端上桌 |

控制台的 Project Inspect 可能显示框架默认命令，但仓库中的显式配置会进入实际构建。判断最终执行了什么要看部署日志；本站生产日志确实运行了 `pnpm install --frozen-lockfile` 与 `pnpm run build`。

### 缓存头为什么这样写

`max-age=0` 要求浏览器重新验证，`s-maxage=300` 允许共享边缘缓存保留 300 秒，`must-revalidate` 避免过期内容被随意继续使用。它适合更新频率不高的静态博客，同时降低长时间卡住旧 HTML 的概率。

一次发布的体感时间可以近似拆成：

$$
T_{visible} \approx T_{install} + T_{generate} + T_{upload} + T_{alias}
$$

边缘缓存与 DNS 状态会影响个别访问，但 Vercel 的部署本身是独立产物，Production 就绪后再把域名别名切过去。不要在构建还红着时把“CDN 有缓存”当作电子护身符。

## 在 Vercel 导入 GitHub 仓库

### 1. 导入仓库

进入 Vercel Dashboard，选择 **Add New → Project**，授权 GitHub 后导入 `luomo66ccff/hexo`。本站控制面当前确认的绑定关系是：

| 设置 | 值 |
|---|---|
| Git Provider | GitHub |
| Repository | `luomo66ccff/hexo` |
| Production Branch | `main` |
| Root Directory | `.` |
| Framework Preset | Hexo |
| Node.js Version | 建议 `24.x` |

因为仓库已有 `vercel.json`，不必在控制台重复维护三套命令。若控制台有旧的手工覆盖值，要么清空让仓库配置接管，要么确保两边完全一致；最怕一边改成 pnpm，另一边还在召唤 npm，最后构建日志现场举行包管理器武林大会。

### 2. 理解 Preview 与 Production

Vercel 的 Git 集成会为非生产分支和 Pull Request 创建 Preview，`main` 则跟踪 Production。推荐流程是：

{% timeline 一次正常发布,blue %}
<!-- timeline 1. 本地写作 -->
在 `source/_posts/` 新建文章，填写 Front-matter，并只提交真正需要的素材。
<!-- endtimeline -->
<!-- timeline 2. 干净构建 -->
执行 `pnpm run clean && pnpm run build`，确认新页面、搜索、Feed 和 Sitemap 都生成。
<!-- endtimeline -->
<!-- timeline 3. 本地视觉验收 -->
运行 `pnpm run server`，分别检查桌面端和手机端，关注白色主题、代码块、表格、Mermaid 与横向溢出。
<!-- endtimeline -->
<!-- timeline 4. Git 提交 -->
明确审查 `git status` 和差异，只提交本篇文章及关联资源。
<!-- endtimeline -->
<!-- timeline 5. Preview 或 Production -->
功能分支推送后先看 Preview；确认无误再合并 `main`。个人站也可在完整本地 QA 后直接推送 `main`。
<!-- endtimeline -->
<!-- timeline 6. 控制面确认 -->
等待 Vercel 状态变为 Ready，核对提交哈希、生成文件、生产域名和错误日志。
<!-- endtimeline -->
{% endtimeline %}

## 本地发布命令

```bash
pnpm install --frozen-lockfile
pnpm run clean
pnpm run build
pnpm run server
```

浏览器检查完成后：

```bash
git status --short
git diff --check
git add source/_posts/your-post.md
git commit -m "docs: 发布 Hexo 部署教程"
git push origin main
```

推送 `main` 后，Git 集成会自动创建 Production 部署。[Vercel Git 部署文档](https://vercel.com/docs/git)也说明非生产分支和 Pull Request 会获得独立 Preview，生产分支则生成 Production。

## CLI 发布与排障备用路线

Git 自动部署是日常主路，CLI 是手动发布、检查和回滚的备用通道：

```bash
npx vercel login
npx vercel link
npx vercel project inspect hexo
npx vercel list hexo --status READY

# Preview
npx vercel deploy

# 明确发布 Production
npx vercel deploy --prod
```

`vercel link` 会创建 `.vercel/project.json`，其中是项目与组织标识，不是部署源码；本站将整个 `.vercel/` 加入 `.gitignore`。自动化环境中的令牌必须放在 Secret 或环境变量中，禁止写进命令历史和仓库。

{% tabs vercel-ops,1 %}
<!-- tab 检查部署@fas fa-magnifying-glass -->
```bash
npx vercel inspect <deployment-url>
npx vercel logs <deployment-url> --level error --since 1h
```

确认目标为 Production、状态为 Ready、提交 SHA 正确，并查看构建或运行错误。
<!-- endtab -->
<!-- tab 回滚@fas fa-rotate-left -->
```bash
npx vercel rollback
# 或指定一份已知正常的部署
npx vercel rollback <deployment-url-or-id>
```

静态博客没有数据库迁移，回滚通常就是把生产域名重新指向上一份完整静态产物。
<!-- endtab -->
<!-- tab 预构建发布@fas fa-box -->
```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

适合需要在构建与发布之间插入额外测试门禁的 CI；普通个人博客无需为了显得专业把流水线堆成跨海大桥。
<!-- endtab -->
{% endtabs %}

## 绑定 `blog.luomo.moe`

在 Vercel 项目的 **Settings → Domains** 添加 `blog.luomo.moe`。这是子域名，通常需要在 DNS 服务商处添加 Vercel 当时显示的 CNAME 目标。

不要从旧教程里复制某个固定 CNAME 值。[Vercel 自定义域名文档](https://vercel.com/docs/domains/working-with-domains/add-a-domain)要求以项目面板显示的 DNS 目标为准；域名被其他账号占用时还可能要求 TXT 验证。DNS 验证成功后，Vercel 会自动申请 HTTPS 证书。

站点配置也必须同步：

```yaml
# _config.yml
url: https://blog.luomo.moe
```

还要检查 `source/robots.txt`、Feed、Sitemap、Open Graph、评论系统白名单和第三方回调地址。只改浏览器地址栏能访问，不代表整站的机器读者已经跟着搬家。

## 四次真实踩坑复盘

### 坑一：Vercel 识别 pnpm 工作区不稳定

早期仓库只有 `allowBuilds`，没有 `packages`。加入下面两行后，仓库根被明确识别为工作区包：

```yaml
packages:
  - .
```

同时将 `.vercel/` 和 `.env.local` 排除提交。修复重点不是“多写一份 YAML”，而是让本地 pnpm、Vercel 安装阶段和项目根目录对同一边界达成一致。

### 坑二：页面黑屏和文章排版错位

这次故障由多件小事叠加：

1. 自定义 CSS 使用了 `.article-container`，而实际正文节点是 `#article-container`；
2. 全屏预加载器让异常加载表现成整页遮罩；
3. 文章头图与全站图片懒加载规则发生重复处理；
4. 表格在手机端没有自己的横向滚动容器；
5. Note 标签参数与当前 Butterfly 版本语法不一致。

修复后关闭全屏预加载器、改正选择器、让带 `nolazyload` 的图片绕过过滤器，并为表格添加移动端滚动。{% spoiler style:blur “把背景改白”只能遮住部分症状，真正的黑屏还可能来自覆盖层、缓存和资源加载。 %}

### 坑三：主题配置是 light，视觉却仍然很黑

`display_mode: light` 只决定 Butterfly 默认模式，旧自定义 CSS 仍可用深色变量把整站重新涂黑。因此白色主题迁移同时修改了：

- 页面背景与玻璃卡片变量；
- 导航、正文、标题和页脚文字色；
- 代码块、表格、引用与 Note；
- 前后文章导航；
- 移动端正文内边距与表格滚动；
- 禁用自动暗色模式与暗色切换按钮。

验证主题不能只检查 `data-theme="light"`，还要读取最终计算样式，并在真实尺寸截图中确认正文背景和文字对比度。

### 坑四：插件删了，旧 Service Worker 还活着

移除 `hexo-offline` 只会阻止新构建继续生成缓存逻辑，已经注册在访客浏览器里的 Service Worker 不会自动原地圆寂。它仍可能把旧 HTML、CSS 和脚本塞回来，让生产站出现“代码已经改了，浏览器坚持活在前朝”的现象。

本站使用一次性迁移 Worker：安装后接管页面、删除旧 Cache Storage、注销自身，再让页面重新导航。`vercel.json` 对 `/service-worker.js` 单独发送 `no-store, no-cache, must-revalidate`，确保浏览器能够拿到退役脚本，而不是继续缓存旧 Worker。

{% note danger %}
不要随意把 Service Worker 文件直接删掉后就宣布胜利。要清理已经安装的旧 Worker，需要先在同一作用域发布能接管并注销自己的版本，等待足够的迁移窗口后再移除。
{% endnote %}

## 构建产物应该验收什么

一次干净构建不是只看退出码为 0。本文写作前的基线构建生成 69 个文件，其中 30 个为 HTML；新增文章后还要检查以下内容：

```text
public/posts/<abbrlink>.html     新文章页面
public/index.html                首页收录
public/search.json               本地搜索索引
public/atom.xml                  Atom Feed
public/sitemap.xml               通用站点地图
public/baidusitemap.xml          百度站点地图
public/baidu_urls.txt            最新链接列表
```

`hexo-baidu-url-submit` 在公开仓库中只保留生成配置，真实 Token 必须通过私有配置或环境变量提供。看到 `baidu_urls.txt` 生成，不等于已经向百度成功提交；二者不能用一个绿色日志互相冒充。

## 桌面端与手机端视觉 QA

{% hideToggle 展开发布前检查表,#425b89,#ffffff %}

1. 页面主题为 light，正文卡片计算背景是白色或接近白色；
2. 页面 `scrollWidth` 不大于视口宽度，手机底部没有横向滚动条；
3. Mermaid 已从源码块转换为 SVG，而不是原样露出文本；
4. KaTeX 公式、Ruby、Hint、Spoiler、Tabs、Timeline 与折叠块均成功渲染；
5. 代码块可读、长命令可换行或局部滚动；
6. 表格只在自身容器滚动，不把整页撑宽；
7. 图片无 404，头图没有被懒加载重复改写；
8. 页面中不存在未解析的 Hexo 标签、模板空值或渲染错误；
9. 搜索、Feed 和 Sitemap 包含新文章；
10. 浏览器控制台没有新的 JavaScript 错误。

{% endhideToggle %}

## 生产发布后的判断顺序

1. Vercel 部署是否从 Building 进入 Ready；
2. 部署关联的 Git 提交 SHA 是否与远端 `main` 一致；
3. 构建日志是否生成目标文章；
4. Production 域名是否已经指向该部署；
5. 若页面异常，先区分构建失败、域名未切换、边缘缓存和浏览器 Service Worker；
6. 问题影响全站时先回滚，再慢慢写事故文学。

Vercel 每次部署都有独立 URL。Preview 没问题但正式域名异常时，不要立刻重写 Hexo；先检查 Production alias、DNS 与缓存层，避免对着正确代码进行错误手术。

## 还需要继续收紧的地方

| 项目 | 当前状态 | 后续动作 |
|---|---|---|
| Node.js | Vercel 仍为 20.x | 在 2026-10-01 前升级 24.x并回归 |
| pnpm | 本地声明、实际本地和 Vercel 版本不完全一致 | 统一 Corepack 与 packageManager 策略 |
| Butterfly | 主题源码入库且有少量内部补丁 | 升级前逐文件合并，不整目录覆盖 |
| Service Worker | 正在承担一次性旧缓存退役 | 经过足够迁移窗口后评估移除 |
| 外部凭据 | 公开配置中不含真实 Token | 继续放在 Vercel 环境变量或私有配置 |
| SEO 域名 | 多份生成物依赖 `url` 与 robots | 域名变更时做全仓扫描和产物验收 |

## 最后的复盘

这套博客的部署价值不在于“Vercel 点一下就上线”，而在于把内容、渲染、主题、生成、版本控制和托管边界拆得足够清楚。Markdown 是源，`public/` 是产物，GitHub 是版本事实，Vercel Deployment 是不可变发布单元，自定义域名只负责把访客带到已经通过验证的生产版本。

真正让站点稳定的也不是某个神奇插件，而是锁文件、干净构建、Preview、移动端 QA、缓存认知和可回滚发布。把这些步骤做实，写完文章推一次 `main` 就能优雅上线；把它们跳过，三分钟部署也可能附赠三小时“为什么我这还是黑的”。

{% btn https://github.com/luomo66ccff/hexo,从真实仓库开始复现,fab fa-github,blue center larger %}
