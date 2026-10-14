---
title: '从「奶龙大学.com」到自己的小网站：零基础域名购买与建站教程'
date: 2026-10-14 12:00:00
updated: 2026-10-14 20:36:11
categories:
  - 技术实践
tags:
  - 域名
  - 零基础
  - 中文域名
  - DNS
  - Cloudflare
  - 建站
description: 从上海、苏州、甘肃奶龙大学的真实案例出发，手把手买域名、上传网页、设置 DNS、绑定 HTTPS，附可下载模板、跳转示例和排障清单。奶蛙负责整活，你负责拥有自己的互联网门牌。
abbrlink: 7a1d0a11
cover: /images/domain-beginner/naiwa-launch.png
---

刷到「XX奶龙大学.com」，随手一输，居然真能打开，有的还把你送到学校官网。

第一反应：**学校终于被奶蛙接管了？**

实际操作：有人注册了一个有梗的域名，再给它配上网页或者跳转。互联网门牌还能这么起，属实是把招生简章玩成了精神状态检测。(¬‿¬)

这篇就从这个梗出发，带你完成一条实用路线：**买一个自己的域名 → 做一个简单网页 → 上传上线 → 绑定域名与 HTTPS。** 不需要先学编程，也不用先买一台服务器。你最后得到的，可以是个人主页、作品集、社团导航，或者一张朋友点进去就绷不住的整活页面。

> 本文资料和案例核查日期：**2026 年 10 月 14 日**。费用以购买页和续费页为准，平台按钮名称可能调整。文中的 `example.com` 是保留的演示域名，不能拿去注册；配置时一律换成你实际购买的域名。

<!-- more -->

## 1. 先吃个瓜：这些「奶龙大学」到底在干什么

近期能定位的讨论包括 [YourTJ 论坛的《上海奶龙大学.com》](https://f.yourtj.de/p/post/572)，以及 B站的[《重要通知：中国奶龙大学域名已被购》](https://www.bilibili.com/video/BV1xypd6FEvw/)。后者的公开投稿信息显示发布于 10 月 12 日。这里用来说明近期确有相关讨论，**不据此断言谁是首创，也不编一个“全网多少亿播放”。**

我还直接检查了三个实际入口，结果挺有教学价值：

| 案例 | 本次检查到的行为 | 对应的建站思路 |
| --- | --- | --- |
| [上海奶龙大学.com](https://xn--fhqu4y0gz4ew51bfy2e.com/) | 返回 HTTP 302，地址指向同济大学官网 `www.tongji.edu.cn` | 域名收到访问后，直接让浏览器去另一个网址 |
| [苏州奶龙大学.com](https://xn--psszg58cf1d8u4erdxb.com/) | 页面写着“非官方跳转页”，HTML 设置 5 秒后前往西交利物浦大学官网 | 先显示趣味页面，再倒计时跳转 |
| [甘肃奶龙大学.com](https://xn--psszg58cy52cu6lj57b.com/) | 自己的页面里有 GO 按钮，链接到兰州理工大学官网；还有[公开源码仓库](https://github.com/TomyJan/gansunailongdaxue.com) | 域名绑定自己的页面，由读者选择是否点击 |

上海的结论来自 HTTP 响应；苏州、甘肃的结论来自当前网页内容与链接配置。域名之后可能改指向，今天的结果不是永远的承诺。甘肃对应的是**兰州理工大学**，别和兰州大学混了，奶蛙整活，校名还是要写对。

**跳转到学校官网，不等于学校官方注册、授权或改名。** 这些入口只是我们观察到的域名使用案例。做同类页面时，写清“个人／非官方”，按钮点向真正官网；别让别人误把你的玩梗页当成招生入口，更别收学号密码。

你完全可以把同一套方法用到正常项目上：一个短域名指向作品集，一个社团域名展示活动，一个个人域名连接自己的博客。

## 2. 域名、网站、DNS：三位各干各的，别让奶蛙独自背锅

把网站想成一间店：

| 名词 | 好理解的比喻 | 实际负责什么 |
| --- | --- | --- |
| 域名 | 门牌，比如 `example.com` | 给人一个好记的访问地址 |
| 网页文件 | 店里的装修和内容 | 决定别人打开后看到什么 |
| 网站托管 | 店铺空间 | 保存文件，并把网页发给访客 |
| DNS 解析 | 找店用的导航 | 告诉访问者，域名该去哪里找服务 |
| HTTPS | 加密的通信通道 | 加密浏览器和网站之间的传输 |

**域名购买成功，只代表门牌到手。网页还要制作和托管，门牌还要连到服务。**

<img src="/images/domain-beginner/naiwa-dns.png" alt="奶蛙举着域名门牌：域名买了，网站呢？你给我变出来啊" width="560" loading="lazy" style="display:block;margin:24px auto;max-width:100%;height:auto">

再拆一个常见网址：

```text
https://blog.example.com/about
└协议   └子域名└注册的域名 └网页路径
```

你购买 `example.com` 后，通常可以自行设置 `www.example.com`、`blog.example.com` 等子域名，无需把每个都另买一遍。`/about` 则是网站里面的路径，不是另一个域名。

### 中文域名是真的，不是浏览器被奶蛙夺舍

域名可以包含中文，这类叫 **IDN（国际化域名）**。系统会把中文部分转换成以 `xn--` 开头的 ASCII 形式，也叫 Punycode。中文显示和转换后的形式可以代表同一个域名；某些浏览器或后台显示长串编码是正常现象。[ICANN 的 IDN 说明](https://www.icann.org/resources/idn)和 [A-label 定义](https://www.icann.org/en/icann-acronyms-and-terms/a-label-en)解释了这一点。

`.com` 的注册局支持包括中文在内的多语言 IDN，但**具体注册商是否提供、如何查询，以其当前支持范围为准**。可以通过 [Verisign 的 IDN 页面](https://www.verisign.com/resources/internationalized-domain-names/)了解注册渠道。

一个容易走错的门：**Cloudflare Registrar 当前不支持注册或转入 IDN，包括 Punycode 形式。** 这条限制针对其域名注册服务，别把它和 Cloudflare 的 DNS、网站托管混为一谈。[官方支持说明](https://developers.cloudflare.com/registrar/top-level-domains/)

零基础第一次练手，选一个短一点的英文域名会更省心；想玩中文梗，再选明确支持该中文后缀的注册商。不要默认“域名注册页面都能买中文.com”。

## 3. 买域名：别让首年优惠给你施法

下面用**阿里云的普通域名注册流程**举例，其他注册商也有类似步骤。本教程的主线先用英文域名完成；中文梗域名需要额外确认商家支持和完整报价。

### 第一步：想三个候选，别和全网奶蛙抢同一个门牌

用自己的网名、项目名、社团名组合，准备几个备选。起名尽量短、好念、好打；完整的后缀也是名字的一部分，`.com`、`.net` 和 `.cn` 是不同的地址。

**可注册**才是常规新注册；页面如果显示“一口价”“交易”“溢价”，先看清那是在买什么。教程不需要你为了一个梗冲进二手域名拍卖场。

先确定能接受的**每年续费成本**。首年便宜，第二年未必还是这个价；中文域名也不一定和英文同后缀同价。

<img src="/images/domain-beginner/naiwa-renewal.png" alt="奶蛙看续费单：首年真香，续费你怎么不去抢" width="560" loading="lazy" style="display:block;margin:24px auto;max-width:100%;height:auto">

### 第二步：在注册商官网查询完整域名

1. 打开 [阿里云域名注册页面](https://wanwang.aliyun.com/domain)，登录自己的账号；按平台要求先完成账号实名认证。
2. 输入候选名称，确认搜索结果里的**完整域名和后缀**。
3. 找到显示可注册的候选，查看首年价格、续费价格、购买年限和是否有额外服务。
4. 新手练习可以先注册一年，不必为了上传一页 HTML 同时买服务器、数据库或建站套餐。

如果准备买中文域名，查询完整中文名称；无法查询时，先检查该商家的 IDN 支持，不要把“这个平台不卖”误读成“这个名字一定被抢了”。

### 第三步：填持有人信息，完成邮件验证与实名认证

按平台要求创建**域名信息模板**，选个人或单位，填写真实信息，完成邮箱验证并提交所需证件，等待状态变为**“模板实名成功”**，再使用它注册。域名持有人是谁，取决于登记的持有人信息，不能只看“是谁的账号付了钱”。这些资料仅在注册商的认证页面提交。[信息模板官方说明](https://help.aliyun.com/zh/dws/user-guide/how-to-complete-domain-name-authentication)

支付时选择审核通过的持有人模板和正确年限，检查订单，再付款。随后进入域名控制台，确认：**域名出现在列表中、注册成功，等待域名状态变为“正常”，并核对到期日期**。确认注册商发来的验证邮件，不要只凭支付成功截图宣布开学。[域名注册快速入门](https://help.aliyun.com/zh/dws/getting-started/quickly-register-a-new-domain-name)

### 第四步：把续费这件事安排上

愿意长期持有就开启自动续费，确认付款方式可用；同时给自己留一个到期提醒。启用账号的双重验证，保管好登录方式。

这里的“购买”更像按期限注册使用权。到期后未续费，域名可能停止工作甚至被别人重新注册。奶蛙可以装作无事发生，网站访客不会。

## 4. 先做网页：复制一个文件，你就有内容了

我们做的是**静态网站**：浏览器直接展示 HTML 等文件。个人介绍、作品列表、活动导航都适合这条路线；账号登录、收款、数据库等功能需要另做服务，不是贴一个按钮就会自动出现。

这里准备了一个没有外部依赖的入门页：

**[下载网页模板 ZIP](/downloads/domain-starter-v1.zip)**

下载后解压，里面只有一个 `index.html`。双击它，浏览器会显示“摸鱼大学，今天开站”。这一步打开的是你电脑里的文件，其他人还访问不到；第 5 节再把它放到网上。

### 改成自己的内容

右键 `index.html`，选择记事本或其他文本编辑器打开。找到并修改这几处：

| 找到的内容 | 改成什么 |
| --- | --- |
| `<title>摸鱼大学 · 我的第一个网站</title>` | 浏览器标签上的名称 |
| `<h1>摸鱼大学，今天开站 🐟</h1>` | 网页里的大标题 |
| “欢迎来到我的互联网小窝”等段落 | 你的个人介绍、项目说明 |
| `href="https://example.com/"` | 你希望按钮打开的**完整网址**，例如自己的博客 |
| “去看看我的主页” | 按钮文字 |

保存后刷新浏览器，确认文字和按钮链接正确。“非学校官网”的说明也根据页面实际用途调整，趣味校园页就保留。

想从零建文件，也可以复制下面这一版。记事本点“另存为”，文件名填 `index.html`，**保存类型选“所有文件”，编码选 UTF-8**。Windows 文件管理器开启“查看 → 显示 → 文件扩展名”，确保它没有偷偷变成 `index.html.txt`。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>我的第一个网站</title>
  <style>
    body { margin: 0; background: #fff9e8; color: #292820;
      font: 17px/1.8 system-ui, sans-serif; }
    main { max-width: 700px; margin: 8vh auto; padding: 24px; }
    h1 { font-size: clamp(30px, 7vw, 48px); }
    a { display: inline-block; padding: 10px 18px;
      background: #ffcf45; color: #292820; border-radius: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>我的小网站，今天开站</h1>
    <p>代码是复制的，域名是自己的，快乐是真的。</p>
    <a href="https://example.com/">去看看我的主页</a>
    <p>个人练习页，不代表任何学校或机构。</p>
  </main>
</body>
</html>
```

上传前记得把演示按钮的 `https://example.com/` 换掉。别做完自己的主页，按钮却把朋友送进“Example Domain”：那是演示保留域名，奶蛙也不会替你写自我介绍。

## 5. 上传上线：用 Cloudflare Pages 拖进去

这一步使用 **Cloudflare Pages 的 Direct Upload（直接上传）**，把静态文件托管到网上。小型练习站可以从免费计划开始，额度与限制看[当前官方说明](https://developers.cloudflare.com/pages/platform/limits/)；免费托管不代表域名永久免费。

1. 注册并验证自己的 [Cloudflare 账号](https://dash.cloudflare.com/)。
2. 打开 **Workers & Pages**，创建应用，选择 **Pages** 的上传入口。它可能显示“Drag and drop”“Upload assets”或“拖放文件”，确认进入的是 Pages 的直接上传流程。
3. 填一个英文项目名，例如 `my-first-site`；若被占用就加自己的网名。
4. 拖入包含**修改后的 `index.html`** 的网页文件夹。如果使用 ZIP，先把修改后的文件重新打包；原下载 ZIP 不会随解压文件的编辑而变化。**打开 ZIP 或上传的文件夹，就应直接看到 `index.html`**，别多套一层 `网页模板/网页模板/`。
5. 点击部署，记录平台给你的实际地址，例如 `你的项目名.pages.dev`。这里的示例项目名不保证可用，以你的后台为准。

打开 `https://你的项目名.pages.dev`，看到正确页面，再用手机打开一次，点一下按钮。**这一步成功，才说明网页已经在网上；它和买域名是两件事。** 上传方式与入口依据 [Direct Upload 官方文档](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

> 这条流程的网页文件可以直接上传，无需“编译”或安装 Node.js。将来想通过 Git 自动发布，Direct Upload 项目不能直接切换成 Git 集成，需要另建项目。本文模板已做本地浏览器检查；你的 Pages 部署与购买需要你在自己的账号完成。

如果平台原生地址在你的网络打不开，先解决这个问题再绑域名。换一个门牌不能保证托管线路立刻变快；国内访问体验请用自己的网络和手机流量实测。

## 6. 绑定域名：让自己的门牌找到这个网页

先选你希望别人输入的地址：

- `example.com`：直接使用购买的根域名，也叫 apex；走 **A 路线**。
- `www.example.com` 或 `blog.example.com`：使用子域名；已有其他网站或邮箱、暂时不想迁移 DNS，可以走 **B 路线**。

本文的注册商和托管商不同，这是正常的：注册商负责域名登记，Cloudflare Pages 负责网页，DNS 负责把两边连起来。

### A 路线：根域名交给 Cloudflare DNS

Pages 绑定根域名，需要把该域名作为 Cloudflare zone 接入，并让域名的 nameserver 指向 Cloudflare。这是 Pages 根域名绑定的要求，不能拿“在原注册商填一条 CNAME”来替代。[根域名绑定官方说明](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-apex-domain)

**A1. 添加域名。** 在 Cloudflare 选择添加／接入域名，填写自己买到的根域名，选择合适计划；本教程使用免费计划即可。检查扫描出的 DNS 记录。全新空域名通常简单；已经有网站或邮箱的，要保留原有记录，尤其邮箱使用的 MX 和相关 TXT。

**A2. 修改 nameserver（NS）。** Cloudflare 会分配两条具体的 nameserver。把这两条完整复制下来，回到注册商的域名控制台，找到“DNS 服务器／修改 DNS 服务器／Nameserver”，替换成后台分配的值。这一步改的是**负责回答整个域名 DNS 的服务器**，不是添加一条普通 NS 记录，也不是过户域名。

**A3. 等待接入生效。** 回到 Cloudflare，按提示检查，直到域名状态显示 Active／已激活。NS 修改和缓存刷新可能需要较长时间，别在两个后台反复改来改去。[Cloudflare DNS 接入步骤](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)

**A4. 添加 Pages 自定义域名。** 打开你的 Pages 项目 → **Custom domains（自定义域名）** → 添加自己买的根域名 → 按提示确认。Cloudflare 会处理所需 DNS 记录。等待自定义域名和证书状态正常后，打开 `https://你的域名`。

想同时支持 `www`，就在同一项目再添加 `www.你的域名`。根域名和 `www` 是两个主机名，**绑定其中一个不会自动等于另一个也绑定了**。

### B 路线：保留现有 DNS，用子域名

先在 Pages 项目的 **Custom domains** 中添加 `www.你的域名` 或 `blog.你的域名`，然后到当前生效的 DNS 服务商后台添加记录。例如：

| 类型 | 主机记录／名称 | 记录值／目标 |
| --- | --- | --- |
| `CNAME` | `www` | `你的实际项目名.pages.dev` |

DNS 表里的主机记录有的填写 `www`，有的要求完整的 `www.你的域名`，依后台格式填写。记录值填**主机名**，不带 `https://`，不带 `/`，不带网页路径。

同一个 `www` 已经有 A、AAAA 或 CNAME 时，要先确认原记录用途再处理冲突。这个方法绑定的是 `www.你的域名`，裸的根域名不会因此自动打开。[子域名绑定官方说明](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-subdomain)

**务必先在 Pages 里添加自定义域名，再设置外部 CNAME。** 只填一条解析、没有告诉 Pages 要接待这个主机名，可能出现 522。它需要的不是一句“你怎么不去抢”，而是完整的绑定步骤。

### DNS 表里的几种类型，看到不慌

| 类型 | 用途 | 新手怎么理解 |
| --- | --- | --- |
| A | 主机名指向 IPv4 地址 | 托管商给你 IP 时按提示用 |
| AAAA | 主机名指向 IPv6 地址 | 与 A 类似，只是地址类型不同 |
| CNAME | 主机名指向另一主机名 | Pages 子域名绑定常用它 |
| TXT | 文本记录 | 验证域名归属等用途，照平台提供的内容填 |
| MX | 邮件接收服务 | 用域名邮箱时会用到，迁移 DNS 时保留 |

`@` 通常代表根域名；TTL 是解析记录可以被缓存多久。**DNS 解析不是网页跳转。** CNAME 不会让浏览器自动显示另一个网址，也不能把记录值填成 `https://学校官网/某个路径`。[DNS 记录类型说明](https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/)

## 7. 想复刻「奶龙大学」的效果？有三种做法

### 做自己的页面：最适合第一次练习

前面的模板已经完成这件事：访问你的域名，显示你写的内容。按钮想去哪里，就把 `href` 改成那个完整 HTTPS 地址。作品集、博客入口、社团链接都可以放，按钮比自动跳转更容易让访客看清用途。

### 页面显示几秒，再跳转

在自己 `index.html` 的 `<head>` 中添加一行：

```html
<meta http-equiv="refresh" content="5;url=https://example.com/">
```

把地址换成你的真实目标，然后重新上传；页面正文写清目标，并保留一个能手动点击的链接。它是**HTML 层面的页面跳转**，和服务器直接返回 302 不同。苏州案例采用的就是这类配置。[MDN 对 meta refresh 的说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/http-equiv#refresh)

### 直接返回 HTTP 跳转

Pages 的静态站点可以通过 `_redirects` 文件设置规则。这个文件**没有扩展名**，放在和 `index.html` 同一层；例如内容只有一行：

```text
/ https://example.com/ 302
```

换成真实目标后，重新上传**整个文件夹或包含两个文件的 ZIP**，而不是只上传 `_redirects`。这条规则只匹配首页 `/`，浏览器访问首页后会去目标网址；其他路径不会被这行自动接管。[Pages 重定向规则文档](https://developers.cloudflare.com/pages/configuration/redirects/)

第一次玩梗先用 **302（临时跳转）**，方便之后换目标。明确长期不变再考虑 301（永久跳转），因为浏览器和其他客户端可能缓存它。[HTTP 302](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/302)／[HTTP 301](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/301)

用学校或机构作为目标时，先确认准确官网地址，在页面或对外介绍中写明非官方性质。**不能靠给目标官网建 CNAME 来复刻这种跳转**：对方服务器和证书通常并没有配置你的域名。

## 8. 网站打不开？照这个顺序查，别上来就重买域名

先判断坏在哪一层：

**电脑里的 HTML → 平台提供的 pages.dev 地址 → 自定义域名 → HTTPS。**

| 现象 | 优先检查 |
| --- | --- |
| 本地双击打开的是代码／没反应 | 文件是不是 `index.html.txt`；保存类型与 UTF-8 是否正确 |
| `pages.dev` 显示 404 或错误页面 | 上传根目录有没有 `index.html`，是否多套了一层目录，部署是否成功 |
| `pages.dev` 能打开，自定义域名不存在 | 注册和认证是否完成；NS 是否生效；记录是不是写在真正生效的 DNS 后台 |
| 自定义域名显示 522 | Pages 的 Custom domains 里是否已添加该完整域名，再核对 CNAME |
| 根域名能开，`www` 不能开，或反过来 | 两个主机名是否分别绑定；别把 `www` 当成自动赠送的跳转 |
| 域名状态正常，HTTPS 仍报错 | 自定义域名及证书是否仍在验证；有自定义 CAA 时检查是否允许签发 |
| 改 NS 后出现 SERVFAIL | 如果原域名开启了 DNSSEC，按服务商迁移说明处理旧 DS 与新 DNSSEC 设置 |
| 网页还是旧内容 | 是否重新上传到同一项目的生产环境；用无痕窗口或手机流量比较缓存 |
| 中文地址在后台显示 `xn--…` | 先确认对应同一个 IDN，这是编码形式，不是域名乱码损坏 |

DNSSEC 迁移和证书签发属于有具体配置才需要处理的事项，参照[接入指导](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)与[自定义域名证书排障](https://developers.cloudflare.com/pages/configuration/custom-domains/#caa-records)。

想多确认一层，Windows 开始菜单搜“终端”，在 PowerShell 里运行这两条。把域名换成自己的，这不是必做步骤：

```powershell
nslookup www.example.com
curl.exe -I https://www.example.com/
```

前者看有没有 DNS 应答，后者查看 HTTP 状态与响应头。`200` 表示请求成功；做了跳转则通常会看到 `301` 或 `302` 和 `Location` 目标。**解析成功不等于网页正常，网页正常也不保证每个网络都一样快。**

## 9. 实名和备案，别一股脑全叫“认证”

**域名实名认证**回答“谁持有这个域名”，是注册商的域名管理流程。

**ICP备案**则与中国内地接入的网站服务有关。使用中国内地服务器等相关资源对外提供网站服务，需要按接入商要求完成备案；一般非中国内地节点不通过这套内地服务器流程申请 ICP 备案。具体部署地域、CDN 与业务要求应向接入商确认，不能仅凭域名后缀或买域名的位置判断。[阿里云备案流程](https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview)、[服务器与接入检查](https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-server-access-information-check)

本教程的 Pages 路线不能承诺中国内地访问速度，也不等于替你完成所有上线手续。后续要用内地资源、正式经营或增加特定业务功能，再核对对应的接入与资质要求。

论坛里的“萌备案”是社区玩法，**不是工信部 ICP 备案的替代品**。萌可以萌，概念别混。

## 10. 下课前，确认你真的拥有一个可用网站

做完以后，用这份清单检查：

- [ ] 域名已在自己的注册商账号下，持有人、认证状态和到期日正确。
- [ ] `index.html` 的标题、内容和按钮已换成自己的，按钮没有遗留 `example.com`。
- [ ] Pages 的原生地址能打开正确页面。
- [ ] 自定义域名状态正常，`https://` 可以访问，没有证书错误。
- [ ] 需要的根域名和 `www` 分别检查过。
- [ ] 手机 Wi-Fi 和流量都试过，按钮可用，页面没有挤出屏幕。
- [ ] 修改内容后知道如何重新上传，电脑里保留了网页源文件。
- [ ] 想长期保留的域名安排了续费和账号保护。

以后改内容：在电脑里编辑 `index.html` → 本地刷新检查 → 打开同一个 Pages 项目创建新部署 → 选择生产环境 → 上传完整文件 → 检查域名页面。项目和域名保持原样，一般不需要每次重设 DNS。

这次你学到的，其实是一套能反复使用的方法：**起名、准备内容、托管、连接、验证。** 今天门牌上写着奶蛙，明天也可以是你的个人主页、毕业作品或认真做起来的小项目。

<img src="/images/domain-beginner/naiwa-launch.png" alt="恶搞奶蛙竖起大拇指：网站上线了，现在我也是有站之人了" width="640" loading="lazy" style="display:block;margin:24px auto;max-width:100%;height:auto">

奶蛙：你现在也算是有站之人了。至于有人访问没——先把链接发给朋友，别让网站和你的早八出勤率一样安静。(¬‿¬)

想继续做可长期更新的博客，可以接着看本站的[《Hexo 博客 GitHub + Vercel 部署全流程》](/posts/3d61fa8b.html)。先把这一页跑通，再升级装备，互联网小窝就从这里开始。

> 配图为参考恶搞“奶蛙”形象生成的教程表情包，用于本文讲解，不是任何注册商、学校或角色方的官方宣传。资料链接随对应步骤列出；案例的实时行为可能变化。
