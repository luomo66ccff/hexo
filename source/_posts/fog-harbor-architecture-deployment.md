---
title: 把网页做成一间会记住你的调查室：雾港档案 2.2 技术路径与部署实战
date: 2026-08-04 18:30:00
updated: 2026-08-04 18:30:00
categories:
  - 技术实践
tags:
  - Next.js
  - React
  - TypeScript
  - Zustand
  - Playwright
  - Docker
  - Cloudflare
description: 从叙事数据建模、桌面式交互、持久化迁移和自动化测试，到 Docker 与 Cloudflare Tunnel 上线，完整拆解《雾港档案：失踪的第七码头》的工程路径。
cover: /images/fog-harbor/og-fog-harbor.webp
top_img: /images/fog-harbor/og-fog-harbor.webp
abbrlink: 7c2a4f61
---

我把自己做过的公开项目重新过了一遍，最后选择详细拆解 {雾港档案|Fog Harbor Archive}。理由并不是它的技术名词最多，而是它把一个原创题材从“能点的网页”做成了完整产品：有 11 个调查模块、23 份证物、4 组谜题、3 个结局、二周目变化、跨设备布局、自动化测试和可重复部署链路。它最能说明一件事：沉浸感不是靠全屏特效糊出来的，而是叙事、状态、交互和工程约束一起咬合的结果。

{% label 原创叙事 purple %} {% label 本地存档 blue %} {% label 完整E2E green %} {% label 已上线 orange %}

{% btn https://fog-harbor-archive.luomo.moe,进入雾港调查室,fas fa-play,blue larger %}
{% btn https://github.com/luomo66ccff/fog-harbor-archive,查看 GitHub 源码,fab fa-github,purple larger %}

{% note info fas fa-user-secret %}
本文只谈工程，不剧透案件答案。核心真相会继续躺在雾里，绝不被教程一铲子挖出来。
{% endnote %}

<!-- more -->

## 先看成品：同一案件，两套交互密度

{% gallery true %}
![桌面端调查工作区：多窗口、任务栏与案件材料并存](/images/fog-harbor/desktop-investigation.webp "桌面端调查工作区")
![移动端调查界面：内容重排为单列阅读与操作](/images/fog-harbor/mobile-investigation.webp "移动端调查界面")
![调查员索引：二周目和隐藏线索不会硬塞进第一次流程](/images/fog-harbor/investigator-index.webp "调查员索引")
{% endgallery %}

桌面端不是普通网页套一层“窗口皮肤”：窗口有打开、最小化、聚焦、层级和位置；移动端也不是把桌面缩成邮票，而是换成更适合触控的导航与阅读顺序。两端共享案件状态，但各自拥有符合设备的交互密度。

## 为什么这类项目真正难做

一个线性故事只需要回答“下一段是什么”。调查游戏却同时要回答：玩家看过什么、证物是否被关联、谜题是否解开、当前任务能否推进、二周目是否开启、窗口该出现在什么位置，以及异常存档是否会把进度机炸成烟花。

因此我没有先堆页面，而是把项目拆成四种不同寿命的状态：

| 状态 | 例子 | 保存位置 | 设计目的 |
|---|---|---|---|
| 案件事实 | 证物、人物、文档、消息、时间线 | TypeScript 静态数据 | 可审查、可测试、不会被 UI 改写 |
| 长期进度 | 已解锁证物、谜题、结局、二周目 | `localStorage` | 刷新或下次访问后继续调查 |
| 会话状态 | 彩蛋触发、临时提示 | `sessionStorage` | 关闭标签页后自然重置 |
| 界面状态 | 窗口位置、层级、最小化、待处理意图 | Zustand 内存状态 | 快速响应，不污染案件数据 |

{% note warning fas fa-triangle-exclamation %}
最重要的边界是：窗口开没开，不等于证据解没解锁；动画播没播，也不等于剧情已经推进。把 UI 状态和领域状态混在一起，后面一定会出现“关个窗口把结局关没了”的赛博灵异事件。
{% endnote %}

## 技术路线：先建立规则，再让界面长出来

{% timeline 从想法到可部署产品,blue %}
<!-- timeline 1. 把叙事写成可查询的数据 -->
人物、证物、文档、消息、音频转写、谜题、任务、时间线和结局先获得稳定 ID。组件只消费数据，不在 JSX 里偷偷决定案件真相。
<!-- endtimeline -->
<!-- timeline 2. 把推进规则抽成纯逻辑 -->
证据解锁、谜题判定、任务推进、结局条件、二周目变化和调查日志分别进入 `lib/`。它们可以脱离浏览器做单元测试。
<!-- endtimeline -->
<!-- timeline 3. 用两个 Store 管理两种世界 -->
`case-store` 负责案件进度、迁移与持久化；`window-store` 负责窗口系统、层级和会话彩蛋。两者通过明确动作协作，不互相偷改内部字段。
<!-- endtimeline -->
<!-- timeline 4. 再实现桌面与移动交互 -->
桌面端组合窗口管理器、任务栏和叙事层；移动端重排内容和入口。动效遵守 reduced-motion，音频不可用时仍提供文本转写。
<!-- endtimeline -->
<!-- timeline 5. 用自动化测试钉住关键旅程 -->
CI 依次执行 lint、TypeScript 检查、构建、Node 单元测试、依赖审计和 Playwright；桌面、移动、二周目与彩蛋流程都进入浏览器测试。
<!-- endtimeline -->
<!-- timeline 6. 用不可公开暴露的容器端口上线 -->
生产构建输出 Next.js standalone，由非 root 容器运行；Cloudflare Tunnel 在同一 Compose 网络中接入，宿主机只监听 `127.0.0.1:8797`。
<!-- endtimeline -->
{% endtimeline %}

## 架构全景

{% mermaid %}
flowchart TB
  U["调查员 / 浏览器"] --> C["GameClient"]
  C --> P["Providers"]
  P --> CS["case-store"]
  P --> WS["window-store"]
  CS --> E["推进与谜题引擎"]
  WS --> W["桌面窗口系统"]
  E --> D["案件静态数据"]
  CS --> LS["localStorage\nfog-harbor-save-v1"]
  WS --> SS["sessionStorage\nfog-harbor-easter-session-v1"]
  C --> N["叙事层 / 过场 / 环境事件"]
  C --> M["桌面组件 / 移动组件 / 谜题组件"]
{% endmermaid %}

代码按 Next.js App Router 组织，React 与 TypeScript 承担视图和类型边界，Tailwind CSS 负责视觉系统，Framer Motion 处理过场与微动效，Zustand 管状态。默认开发/构建命令由 Vinext 驱动；服务器部署则在 Docker 构建阶段显式执行 `next build`，并通过环境变量启用 Next.js 的 `standalone` 输出。这样，日常开发目标和自托管运行时互不冒充。

## 路径一：叙事数据要“可计算”

调查游戏里的文案并不只是字符串。每份证物至少需要稳定 ID、来源、显示条件和关联关系；任务需要前置条件；结局需要一组可以解释的判定。稳定 ID 是这套系统的地基，因为存档、测试和 UI 都只应该引用 ID，而不是复制整份对象。

时间谜题也应先成为规则。例如比较实体钟与系统记录时，可以把核心偏差写成：

$$
\Delta t = t_{\text{physical}} - t_{\text{system}}
$$

界面负责收集输入和展示反馈，谜题引擎负责标准化输入、计算 $\Delta t$、判断容差并返回结果。这样同一条规则可以被桌面窗口、移动页面和单元测试复用。

{% spoiler style:blur 案件答案当然不会写在公式下面。想套答案的侦探请收起你那伸向 F12 的小手。 %}

## 路径二：存档不是 `JSON.parse` 完就下班

长期状态保存在 `fog-harbor-save-v1`。读取时不直接相信浏览器里的 JSON，而是执行迁移和清洗：旧字段补默认值，集合按合法 ID 白名单过滤，枚举落到允许范围，计数和布尔值做类型归一化。损坏或被手工篡改的存档最多丢失异常字段，不能让整个应用在启动阶段白屏。

推荐把持久化层看成一个版本化协议：

```ts
type PersistedCaseState = {
  version: number;
  unlockedEvidenceIds: string[];
  solvedPuzzleIds: string[];
  unlockedEndingIds: string[];
  secondRun: boolean;
};
```

每次升级只从“磁盘里的未知数据”迁移到“当前内存模型”，不要让 UI 组件各自兼容历史版本。迁移完成后再由 Store 暴露稳定动作，组件只调用 `unlockEvidence()`、`solvePuzzle()` 一类的领域操作。

调查日志导出也遵循最小化原则：只包含玩家主动形成的调查记录，不夹带身份、网络或设备信息。一个离线单机叙事项目，没必要突然 cosplay 数据经纪人。

## 路径三：桌面窗口系统的关键不是拖拽

窗口管理真正麻烦的是一致性：打开已存在窗口时要聚焦而非复制；最小化后任务栏状态要同步；点击窗口要提升 z-index；视口变化后位置不能漂到屏幕外；剧情发出的“打开某文件”意图要等目标窗口准备好后消费。

`window-store` 因此维护窗口实体、焦点、层级、位置和 pending intent。组件发动作，Store 完成原子更新，最终由视图渲染。移动端则绕开自由窗口布局，直接把相同内容投影到单列导航中。共享的是领域信息，不是桌面坐标。

动效还要有降级路径。系统开启 `prefers-reduced-motion` 时，九段短过场切换到静态表达；音频失败时保留转写；环境彩蛋可以增强氛围，但绝不能成为推进主线的唯一入口。

## 路径四：测试一条“玩家真的会走”的路

这个项目的 CI 不是只跑一次构建。GitHub Actions 使用 Node.js 22，并按下面的顺序验证：

1. `npm ci` 保证锁文件安装可复现；
2. ESLint 与 `tsc --noEmit` 守住静态边界；
3. Vinext 构建确认默认目标可产出；
4. Node 原生测试覆盖推进、谜题、结局和状态清洗等纯逻辑；
5. `npm audit` 对生产依赖的 high 和全依赖的 critical 风险设门禁；
6. Playwright 安装 Chromium，跑桌面、移动端、二周目和彩蛋旅程；
7. 失败时上传截图、视频、trace 和报告，避免只留一句“元素不存在”让人对着空气破案。

{% note success fas fa-shield-halved %}
测试分层的收益是定位速度：纯规则错了看单元测试，交互旅程断了看 Playwright，部署运行时错了看容器健康检查。三类问题不会在同一个红灯里抱团取暖。
{% endnote %}

## 部署教程：Docker + Cloudflare Tunnel

下面是仓库当前真实使用的生产路径。它不要求在公网开放应用端口，适合已有 Linux 服务器和 Cloudflare 托管域名的场景。

### 1. 准备环境

- 一台安装 Docker Engine 与 Docker Compose v2 的 Linux 主机；
- 一个 Cloudflare Zero Trust 账户与已创建的 remotely-managed Tunnel；
- 域名已接入 Cloudflare；
- Git，用于拉取和更新代码。

{% tabs fog-harbor-setup,1 %}
<!-- tab 本地开发@fas fa-laptop-code -->
本地开发需要 Node.js 22.13 或更高版本：

```bash
git clone https://github.com/luomo66ccff/fog-harbor-archive.git
cd fog-harbor-archive
npm ci
npm run dev
```

提交前建议执行完整验证：

```bash
npm run test:all
```
<!-- endtab -->
<!-- tab 生产服务器@fas fa-server -->
服务器只需要 Git、Docker 与 Compose：

```bash
git clone https://github.com/luomo66ccff/fog-harbor-archive.git
cd fog-harbor-archive
```

不要在服务器全局安装 Node。依赖安装、构建和运行都在版本固定的 `node:22-alpine` 镜像里完成。
<!-- endtab -->
{% endtabs %}

### 2. 配置 Tunnel Token

在 Cloudflare Zero Trust 后台创建 Tunnel，把公开主机名指向 `http://app:3000`。`app` 是 Compose 服务名，cloudflared 与它处于同一私有网络，因此无需绕到宿主机公网端口。

在项目根目录创建 `.env.server`：

```dotenv
TUNNEL_TOKEN=粘贴你的_Remotely_Managed_Tunnel_Token
```

这个文件已经被 Git 忽略。不要把 Token 写进 `compose.server.yaml`，更不要截图发群里表演“一键共享基础设施”。

如果你使用自己的域名，还要把 `compose.server.yaml` 中的构建参数改为实际地址：

```yaml
build:
  args:
    NEXT_PUBLIC_SITE_URL: https://your-domain.example
```

### 3. 构建并启动

```bash
docker compose -f compose.server.yaml --env-file .env.server up -d --build
```

构建采用三阶段镜像：`dependencies` 通过 `npm ci` 安装锁定依赖；`builder` 设置 `FOG_HARBOR_SERVER_BUILD=1` 并执行 `npx next build`；`runner` 只复制 `.next/standalone`、静态文件和 `public`，最后以非 root 的 `nextjs` 用户运行 `server.js`。

### 4. 验证健康状态

```bash
docker compose -f compose.server.yaml --env-file .env.server ps
curl --fail http://127.0.0.1:8797/
docker compose -f compose.server.yaml --env-file .env.server logs --tail=100 app tunnel
```

`app` 的健康检查每 15 秒请求容器内的 `127.0.0.1:3000`。只有它进入 healthy，`tunnel` 才会启动。宿主机映射为 `127.0.0.1:8797:3000`，所以 8797 只允许本机访问；公网流量必须经过 Tunnel。

### 5. 安全与运维检查

两个服务都启用了 `no-new-privileges` 并丢弃全部 Linux capabilities。应用容器不以 root 运行，Tunnel Token 位于未提交的环境文件，服务端也没有数据库和玩家账号。上线前仍应确认服务器防火墙没有额外放行 3000 或 8797。

更新代码时使用：

```bash
git pull --ff-only
docker compose -f compose.server.yaml --env-file .env.server up -d --build
docker image prune -f
```

生产回滚最好依赖已验证 Git 标签。切到上一个稳定标签后重新构建，而不是手改正在运行的容器：

```bash
git switch --detach v2.2.0
docker compose -f compose.server.yaml --env-file .env.server up -d --build
```

{% hideToggle 点开：部署失败时按这个顺序排查,#425b89,#ffffff %}
1. `app` 构建失败：先看 Docker 构建输出，确认锁文件未漂移、Node 版本仍为 22、`next build` 没有类型或静态生成错误。
2. `app` 一直 unhealthy：进入日志检查 `server.js` 是否启动，确认容器端口仍是 3000，健康检查 URL 没被重定向到不可达地址。
3. `tunnel` 退出：检查 `.env.server` 是否存在、Token 是否来自当前 Tunnel、容器时间与服务器 DNS 是否正常。
4. 域名显示 502：确认 Zero Trust 的 Service URL 是 `http://app:3000`，不是宿主机的 `localhost:8797`；容器里的 localhost 只指向它自己。
5. 页面能开但旧资源未更新：检查浏览器缓存和 Cloudflare 缓存，再确认构建参数里的站点 URL 是否还是旧域名。
{% endhideToggle %}

## 这条路线为什么适合它

这个项目的核心状态全部在浏览器本地，服务器只负责交付应用。Docker standalone 控制运行时体积和版本，Cloudflare Tunnel 解决入口、TLS 与隐藏源站端口，Zustand 持久化让故事不依赖数据库。每层只解决自己的问题，部署路径就不会为了“看起来像大厂”凭空养出一套用户系统、消息队列和三台吃灰的数据库。

它也保留了继续扩展的空间：若未来需要云存档，可以在现有持久化协议外增加同步适配层；若需要更多案件，可以复用引擎与窗口系统，仅替换数据包和主题组件；如果要把客户端交付到其他运行时，领域规则和测试仍然可以保留。

## 最后的复盘

《雾港档案》最值得复用的并不是某个组件，而是这条顺序：先把事实做成数据，把推进做成纯规则，把长期状态和界面状态拆开，再让桌面、移动端、动效和部署围绕同一组边界生长。顺序对了，特效是放大器；顺序错了，特效就是案发现场的烟雾弹。

如果你准备做自己的互动叙事项目，可以先只实现一个人物、三份证物、一个谜题和一个结局，但从第一天就给它们稳定 ID、迁移策略和一条自动化玩家旅程。小规模的正确结构，比大规模的临时奇迹更容易走到上线。

{% btn https://fog-harbor-archive.luomo.moe,现在开始调查,fas fa-magnifying-glass,blue center larger %}
