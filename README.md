 # Luomoの云日常

 洛墨的个人博客，基于 **Hexo + Butterfly** 构建。

 记录技术、AI、服务器、游戏、音乐与生活。

 ## 技术栈

 - [Hexo](https://hexo.io/) 7.x — 静态博客生成器
 - [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) — 主题
 - [pnpm](https://pnpm.io/) — 包管理器
 - [Vercel](https://vercel.com/) — 托管与部署
 - Markdown / KaTeX / APlayer / Bilibili tag 等

 ## 本地运行

 ```bash
 pnpm install
 pnpm run server
 ```

 然后访问 http://localhost:4000 即可。

 ## 构建

 ```bash
 pnpm run build
 ```

 生成静态文件到 `public/` 目录。

 ## 部署说明

 本博客使用 **Vercel** 自动构建部署。

 - 推送 main 分支后，Vercel 会自动触发构建。
 - 不建议再使用 `hexo deploy` 命令推送。

 ## 域名说明

 | 域名 | 说明 |
 |------|------|
 | https://blog.luomo.moe | 博客正式主域名 |
 | https://luomo.march7th.cn | 旧入口（历史兼容） |
 | https://hexo-omega-drab.vercel.app | Vercel 默认域名 |

 > 注意：luomo.moe 不用于本博客跳转，未来可用于个人主页或导航站。
 > 修改域名后需要在 Vercel Domains 页面添加域名并等待 SSL 证书签发完成。

 ## 注意事项

 - 不要提交 `node_modules/`、`public/`、`db.json`、日志文件
 - 不要提交真实 token、appSecret 等敏感凭据
 - 修改文章后需重新构建（Vercel 自动触发）

 ## 后续规划

 - 新增专栏页面：云日常、AI 手记、游戏星海、实验室
 - 完善站点搜索与导航体验
 - 持续优化移动端性能

## 美化说明

当前使用「洛墨云上星港」自定义样式，主要文件：

- source/css/luomo-theme.css — 玻璃拟态、霓虹边框、星海渐变
- source/js/luomo-theme.js — 星空粒子引擎、Pjax 兼容

### 视觉风格

- 深蓝 / 紫色 / 黑色星空渐变背景
- 半透明玻璃拟态卡片（backdrop-filter）
- 蓝紫霓虹边框与 hover 上浮效果
- 站点标题柔和发光动画
- 导航栏毛玻璃模糊
- 自定义滚动条
