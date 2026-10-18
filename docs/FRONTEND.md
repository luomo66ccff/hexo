# 前端视觉层：星港手帐

博客使用 Butterfly 4.13 主题渲染页面结构，视觉与交互放在一层独立的自定义代码里。主题源码基本不改，升级主题或排查问题时，可以把这一层单独拿掉做对比。

## 设计方向

- **纸面**：暖白纸张底色，叠一层极淡的 28px 方格纹（呼应手帐和四人立绘那张横幅的方格纸）。
- **三色强调**：灯笼珊瑚红 `--lm-coral`、暮色紫 `--lm-violet`、天空青 `--lm-sky`，都取自现有横幅；三色渐变 `--lm-grad` 只用在细节上，比如标题短线、阅读进度条、头像光环、按钮。
- **横幅**：首页、页面和文章的横幅底部渐隐融进纸面。文章页横幅改为底部加深，保证压在上面的白色标题和元信息清楚可读。
- **手帐条目**：首页没有封面的文章卡片，右侧会显示描边的衬线体编号（01、02……），由 CSS 计数器生成，不需要改模板。
- **字体**：中文一律使用系统无衬线字体，不额外下载字体文件；衬线体只用于英文和数字的点缀（小标题、编号、年份、404）。
- **深色模式**：所有颜色都来自令牌，深色模式只是重新定义一组令牌值。右下角设置按钮里可以切换。

## 文件结构

| 文件 | 作用 |
|---|---|
| `source/_luomo/styles/00-tokens.css` | 设计令牌（颜色、阴影、圆角、字体）的唯一来源。另外负责把 Butterfly 的 CSS 变量映射到令牌，并提供旧变量名的兼容别名 |
| `10-base.css` | 纸面背景、选中色、焦点框、滚动条 |
| `20-chrome.css` | 导航、横幅、页脚、右下角浮动按钮、搜索弹窗 |
| `30-home.css` | 首页文章卡片、分页、入口卡片 |
| `40-article.css` | 文章、页面、归档的纸面容器和正文排版 |
| `50-aside.css` | 侧栏卡片、作者卡、目录 |
| `60-pages.css` | 项目档案、云服务面板/状态页、建站日志、友链、404。这些类名在 `source/*/index.md` 里直接使用 |
| `70-motion.css` | 入场动画、滚动浮现、阅读进度条、"减少动态效果"处理 |
| `90-banners.css` | 每张横幅的焦点位置 |
| `scripts/luomo-styles.js` | 构建时按文件名顺序合并以上文件，输出 `/css/luomo-theme.css` |
| `source/js/luomo-ui.js` | 阅读进度条（兼容 Pjax），以及 Waline 人机验证框的清理补丁（见 #15） |
| `source/_data/home.yml` | 首页「星港入口」和「最新手帐」标题的文案与链接 |
| `scripts/luomo-home.js` | 构建时把 `home.yml` 渲染进首页第一页的文章列表顶部，不改主题模板 |
| `source/_data/widget.yml` | 侧栏自定义小组件（目前是 MapMyVisitors 访客地图） |
| `source/js/luomo-navigation.js` | 导航菜单与搜索的键盘操作和无障碍属性 |
| `source/js/luomo-theme.js` | 项目筛选和状态页检查 |
| `themes/butterfly/_config.yml` → `theme_color` | 主题源码里写死的主色，要和令牌保持一致 |
| `themes/butterfly/_config.yml` → `inject` | 挂载样式和脚本，`?v=` 是缓存版本号 |

`source/_luomo/` 以下划线开头，Hexo 不会把它当作页面发布。`tools/check-site.cjs` 会检查每个样式文件都已合并进 bundle，并且没有被单独发布出去。

## 首页与侧栏布局

- **首页**：横幅下面依次是「星港入口」（4 个现有页面的入口卡片）、「最新手帐」标题和文章列表。入口卡片的数据在 `source/_data/home.yml`，删掉 `gates` 下的内容即可隐藏整块入口区。
- **侧栏**：顺序依次是作者卡、公告，然后是会跟随滚动的一组卡片：最新文章、最新评论、标签、分类、归档、网站资讯、访客地图。这组卡片的顺序由主题配置里各卡片的 `sort_order`（1–6）和 `widget.yml` 的 `order: 7` 决定。
- **最新评论**：Butterfly 4.13 读取的是**顶层**的 `newest_comments` 配置，不是 `aside` 下面的；数据来自 Waline。
- **公告**：在主题配置的 `aside.card_announcement.content` 里写，支持 HTML。
- `sort_order` 会被编译进主题的 Stylus 样式。本地修改后要先 `pnpm run clean` 再构建，否则会继续用缓存的旧样式；Vercel 每次都是全新构建，不受影响。

## 常见修改

**换配色**：只改 `00-tokens.css` 里 `:root`（浅色）和 `[data-theme="dark"]`（深色）两组值，再把主色同步到主题配置的 `theme_color`。

**加一张横幅**：
1. 把图片压成 WebP（大横幅宽 1920–2560px），放进 `source/img/banner/`。
2. 在主题配置里指向它（`index_img`、`default_top_img` 等），或者写在页面的 front matter `top_img` 里。
3. 在 `90-banners.css` 加一行焦点位置。`background-position` 的百分比越大，看到的越偏右（越偏下）；先用手机竖屏校准横向，再用桌面校准纵向。

**加或改首页入口**：编辑 `source/_data/home.yml`，图标用 Font Awesome 6 的类名。

**加一种卡片动效**：把选择器加进 `70-motion.css` 的两个列表（入场动画、滚动浮现）。动画的填充模式要保持 `backwards`，否则动画结束后残留的 `transform` 会让里面的 fixed/sticky 元素（比如手机端目录）定位错乱。

**发布前**：改过样式或脚本以后，在 `inject` 里把对应的 `?v=` 版本号更新一下，避免浏览器和 CDN 继续用旧缓存。

## 验证

```bash
pnpm run build   # 构建，并运行 tools/check-site.cjs
pnpm test        # 状态接口测试
pnpm run preview:local
```

视觉验收至少看以下几种情况：桌面 1440px、手机 390px、深色模式，以及首页、文章页、标签/分类/归档、友链、项目、状态、建站日志、404 这几类页面。
