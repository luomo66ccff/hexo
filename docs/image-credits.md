# 横幅图片署名

署名数据统一维护在 `source/_data/image_credits.json`。主题根据当前页面实际使用的 `top_img` 匹配图片，显示角落署名；`/image-credits/` 从同一份数据生成详情，页脚提供统一入口。

新增或更换横幅时，把图片路径、作者、原作链接和使用位置一起补入数据。未知信息如实留空并说明，不把图片搜索里的相似作品或转载者当作原作者。运行 `pnpm run build` 会检查所有生成页面的横幅是否有对应记录。

2026-10-18 核对结果：53 个已有页面中，49 页使用图片横幅，4 页没有图片横幅，共 6 张不同图片。

| 图片 | 出处与署名 | 核对情况 |
| --- | --- | --- |
| `home-lantern.webp` | 柠檬静静静静《新年快乐》，[Pixiv 141256714](https://www.pixiv.net/artworks/141256714) | 公开作品元数据及预览与横幅一致 |
| `default-sky.webp` | T0nyS《Choice》，[Pixiv 150868112](https://www.pixiv.net/artworks/150868112) | 公开作品元数据及预览与横幅一致；作者主页关联 X `@imT0nyS` |
| `archive-quartet.webp` | 作者、原帖待确认 | 搜索到的相似作品均不能作为署名依据 |
| `tags-elaina.webp` | 《魔女之旅》动画画面，动画制作 C2C，[作品官网](https://majotabi.jp/) | 官网确认制作团队及版权信息；截图最初上传页、该帧个人原画署名未确认 |
| `naiwa-launch.webp` | 本站制作，OpenAI image_gen 生成 | 本次文章制作记录及生成提示词留存于博客工作区；使用博主提供的奶蛙参考图 |
| `og-fog-harbor.webp` | [雾港档案项目源文件](https://github.com/luomo66ccff/fog-harbor-archive/blob/main/design-assets/marketing/og-fog-harbor.png) | 找到同图 PNG；素材清单没有制作署名 |

Pixiv 核对使用的公开接口为 `/ajax/illust/141256714`、`/ajax/illust/150868112` 及对应作者资料页。未发现两幅同人插画的明确公开转载许可；本次只补充署名，不将“找到出处”写成“获得授权”。
