# AGENTS.md — DeepSucker 博客项目说明书（给 AI 看的）

读完这份文档你应该能直接上手改代码、调样式、加文章、修 bug。按顺序看：结构 → 命令 → 坑 → 内容风格。

> **🔒 安全约定（最高优先级，务必遵守）**
>
> 本仓库是**公开仓库**，AGENTS 系列文件任何人都能看到。所以：
>
> 1. **绝不写入**任何密钥、令牌、私钥内容、私钥实际路径、内网地址、Bearer Key —— 不管是明文还是"示例"。
> 2. 遇到需要这些信息才能继续的操作（SSH 私钥在哪、GitHub PAT、外部 API 的 Bearer Key、本机内网 IP…）→ **停下来询问用户**，不要自己猜，不要从别的文件里翻出来填进去。
> 3. 需要真实凭据才能执行的动作（git push、调外部 API、连本地模型服务）——**交给人来做**，或者当面索取后只用一次，不落盘、不写入任何文件。
> 4. 如果你（AI）在某个历史对话里见过相关值，也不要复述到文件里；需要时直接问。
>
> ⚠️ 例外：代码里已有的配置（如 `AILayout.vue` 的 `ENDPOINTS`）属于项目运行必需，可以保留，但**不要把它抄进 AGENTS 文档，也不要在公开场合引用**。

> **⚙️ 平台相关说明按当前系统分文件**
> - **Windows**（本机当前环境）→ 看 `AGENTS-windows.md`
> - **Linux / macOS**（旧环境）→ 看 `AGENTS-ubuntu.md`
> - 本文件只放**跨平台通用**的：项目结构、设计系统、内容风格、通用坑、验证清单。

---

## 1. 项目是什么

- **VitePress 1.6.4** 静态博客，中文为主，托管在 Cloudflare Pages
- 线上地址：`https://deepsucker.top`（预览：`https://deepsucker-blog.pages.dev`）
- 仓库：`git@github.com:ClearloveXS/deepsucker-blog.git`，分支 `master`
- 风格定位：**简约风 + 幽默抽象 + 冷面荒诞 + 带点色**（参考 Wait But Why / xkcd 的冷幽默路线）

## 2. 目录结构（只列要动的）

```
deepsucker-blog/
├── package.json                  # scripts: dev / build / preview
├── AGENTS.md                     # 本文件（跨平台通用）
├── AGENTS-windows.md             # Windows 专属
├── AGENTS-ubuntu.md              # Linux/macOS 专属
└── docs/                         # ← 站点根目录（VitePress root）
    ├── .vitepress/
    │   ├── config.mts            # 导航、侧边栏、搜索、页脚、appearance
    │   ├── dist/                 # 构建产物，别手改（gitignore 了）
    │   └── theme/
    │       ├── index.ts          # 自定义主题入口：按 frontmatter.layout 分发
    │       ├── style.css         # Aurora Glass 设计系统（所有 CSS 变量在这）
    │       └── layouts/
    │           ├── HomeLayout.vue  # 首页整页布局（极光+玻璃+卡片），layout: home 触发
    │           ├── AILayout.vue    # 「无尽能源」整页布局（门禁+四地址复制+字符级动效），layout: ai 触发
    │           └── GufengLayout.vue # 「巨構：行深般若」整页布局（古风，页面全部内容都在此文件），layout: gufeng 触发
    ├── public/favicon.svg
    ├── index.md                  # 首页（layout: home，hero + features）
    ├── about.md                  # 关于我
    ├── ai.md                     # 无尽能源页（frontmatter: layout: ai）
    └── blog/
        ├── hello-world.md        # 文章；新文章放这里
        └── megastructure.md      # 巨構页（frontmatter: layout: gufeng，只有 frontmatter，内容全在 GufengLayout.vue）
```

## 3. 常用命令（跨平台通用部分）

- 提交身份：`git -c user.name="ClearloveXS" -c user.email="hello@deepsucker.top" commit ...`
- **Cloudflare Pages 构建配置**：build command `npm run build`，output dir `docs/.vitepress/dist`（改这两处要同步 CF 后台）
- 平台具体的 `cd 路径` / dev server 启动方式见对应平台文件
- 推送后 Cloudflare 自动部署（约 1~2 分钟）

## 4. 坑（跨平台通用部分；平台坑见平台文件）

### #1 VitePress Router 用 `go()` 不是 `push()`
`useRouter()` 返回的对象只有 `go(to)`，**没有 `push`**。写 `router.push('/')` 会在点击时才抛 `TypeError: router.push is not a function`（SSR 不报错，纯运行时炸）。

### #2 SSR：浏览器 API 要用 `inBrowser` 守卫
构建时（SSR）会执行 setup 函数，此时 `location`/`window` 不存在。访问它们必须：
```ts
import { inBrowser } from 'vitepress'
if (!inBrowser) return '默认值'
```
症状：`npm run build` 输出里有 `ReferenceError: location is not defined`（build 仍显示成功，容易漏看）。

### #3 深色模式必须用同一个 storageKey
全站深浅色由 VitePress 管理，key 是 **`vitepress-theme-appearance`**。自定义组件里切换主题要用：
```ts
import { useDark } from '@vueuse/core'
const isDark = useDark({ storageKey: 'vitepress-theme-appearance' })
```
用别的 key 会导致 AI 页和博客页主题不同步。

### #4 hero 的 text/name/tagline 走 v-html
`docs/index.md` 里 `hero.text` 等字段支持内联 HTML，可以写 `text: 教她如何<br>deep suck fantasy` 实现换行。

### #5 Markdown 表格里的竖线要转义
表格单元格内出现 `|` 必须写成 `\|`，否则表格会断列（about.md 的「涩涩 \| 玉族」就是例子）。

### #6 `<script setup>` 里模板用不了 `$router`
要用 `const router = useRouter()` 再在函数里调。

### #7 国内网络环境（通用）
- `github.com:443` 直连经常被拒，但 `api.github.com` 通；下载 release 包走镜像：`https://gh-proxy.com/https://github.com/...`
- 验证线上：`curl -sI https://deepsucker.top/xxx`
- **git 推送方式**（SSH 还是 HTTPS）因平台而异，看对应平台文件

### #8 同一文件的多个 Edit 禁止并行（AI 操作坑）
并行对同一文件发多个 Edit 会竞争：每个调用各自读原始文件再整体写回，**后写的覆盖先写的**——4 个并行 Edit 只有最后 1 个真正落盘，且每个都返回"成功"，极具迷惑性。
症状：改完 build 发现产物还是旧规则，`grep` 源文件发现改动"消失"。
对策：同一文件的多处修改**必须串行**（等上一个返回再发下一个）；改完 `grep` 验证再 build。
另外：build 后别急着信产物——`grep dist/assets/*.css` 确认新规则真的进去了（2026-09-09  backdrop-filter 残留事件，两轮才清干净）。

### #9 性能红线（写"高级感"动效前必读）
- ❌ `filter: blur()` / `drop-shadow()` 做动画——每帧重算模糊
- ❌ 滚动期常驻元素挂 `backdrop-filter`——滚动时每帧重算，头号卡顿源。**半透明 rgba 背景本身零成本**，质感要保留就只删 blur
- ❌ 滚动事件直接改 ref——每帧触发 Vue 重渲染；用 rAF 节流 + 直接写 CSS 变量
- ✅ 柔光用径向渐变模拟；持续动画只动 `transform`/`opacity`；移动端 `<820px` 降级关动画

### #10 CSS 竖排（writing-mode: vertical-rl）铁律：容器内禁止开 flex
`writing-mode: vertical-rl` 的容器一旦覆盖 `display:flex`，主轴随书写模式翻转——列序/字序全乱、多句挤成一列（古风页词卷 `.gf-ci`、杂咏 `.gf-zy-poem` 各翻车一次）。
✅ 正确姿势：
- 多列竖排文本（诗词）：容器只写 `writing-mode: vertical-rl`，每句 `display:block`——block 轴即"水平从右往左"，自然一句一列；列距用 `margin-left`
- 需要居中：用 `width: fit-content; margin: 0 auto`，**不要** `display:flex; justify-content:center`
- 需要混排竖排块（标题+印章+诗）：外层普通 flex 加 `flex-direction: row-reverse`（=从右往左读），**每个子元素自己** `writing-mode: vertical-rl`

## 5. 关键机制速查

### 无尽能源页（/ai）
- `docs/ai.md` 的 frontmatter `layout: ai` 触发整页布局；`theme/index.ts` 里判断 `frontmatter.value.layout === 'ai'` 渲染 `AILayout.vue`，否则回落默认主题 Layout
- 改这些都在 `AILayout.vue`：
  - 门禁答案：`const ANSWER = '普通网友'`
  - 答错骚话：`FLIRTS` 数组（随机、不连续重复；**别写会直接暴露答案的条**）
  - 四个地址：`ENDPOINTS` 数组（2 个本地 + 2 个外部）。🔒 **具体值含内网地址，本文件不记录** —— 改之前直接看 `AILayout.vue` 里的现有值，或询问用户
  - 门禁解锁状态存 `sessionStorage['ai_unlocked']`（关标签页重问）
  - 标题字符数组：`TITLE_CHARS = '无尽能源'.split('')`（用于字符级动效）
- 外部 API 调用需要 Bearer Key。🔒 **Key 本身绝不写入任何文件**，需要调用时询问用户

### 巨構页（/blog/megastructure）
- `docs/blog/megastructure.md` 的 frontmatter `layout: gufeng` 触发整页布局；**页面全部内容（数据+模板+CSS）都写在 `GufengLayout.vue`**，md 文件只有 frontmatter（title/description），改文案改 Vue 不改 md
- 数据区（`<script setup>` 顶部）：`GUANS`（五观）、`XU_GUANS`（续四观，含 `tag` 意象标签如「雪之意象」）、`OPEN_POEM`（开卷诗）、`TIMELINE`（简史）、`ZAYONG`（诗卷六首）、`TOC`（卷目）
- 题在图上的诗用 `.gf-poem-on` 竖排题跋样式，移动端降级为图下横排（竖排铁律见坑 #10）
- 图片资源：`docs/public/images/gufeng/*.jpg`，已压缩到 1280px / quality 70（2.1M→0.87M）。换图/加图时保持同档压缩（PIL：`resize 1280 宽、quality=70、progressive`），否则首屏加载过重

### 加新文章
1. `docs/blog/xxx.md` 建文件
2. `config.mts` 的 `sidebar` 里加一行 `{ text: '标题', link: '/blog/xxx' }`
3. `npm run build` 验证，推送

### 样式：Aurora Glass 设计系统（2026-09 改版）

- 所有颜色/字体/阴影变量在 `style.css` 顶部 `:root` / `.dark`，**改配色只动这里**，组件里一律引用变量
- 品牌渐变三色：`--ds-g1 #7c5cff`（紫）→ `--ds-g2 #ff4d8d`（品红）→ `--ds-g3 #22d3ee`（青），组合成 `--ds-grad`
- 常用变量速查：
  | 变量 | 用途 |
  |------|------|
  | `--ds-grad` / `--ds-grad-soft` | 渐变（标题、按钮、强调线、卡片顶部细线） |
  | `--ds-glass` / `--ds-glass-strong` | 玻璃拟态背景（卡片、顶栏、按钮） |
  | `--ds-hairline` / `--ds-hairline-strong` | 发丝边框（普通态 / hover 态） |
  | `--ds-shadow-sm` / `--ds-shadow-md` / `--ds-shadow-glow` | 阴影三档 |
  | `--ds-noise-opacity` / `--ds-grid-color` | 全站噪点与网格纹理强度 |
  | `--ds-aurora-opacity` | 极光光斑浓度（深色会自动调高） |
- **全站纹理**：`body::before` 是网格（径向遮罩淡出），`body::after` 是 SVG 噪点，`#app` 用 `z-index:1` 压在上面。别动这层关系，否则纹理会盖住正文
- 工具类：`.ds-gradient-text`（渐变文字）、`.ds-card`（玻璃卡片）、`.ds-reveal` + `.is-in`（滚动入场）
- 动画 keyframes 全在 `style.css`：`ds-float`（极光漂移）、`ds-drift`、`ds-shimmer`（按钮流光）、`ds-rise`（入场）
- 已内建 `prefers-reduced-motion` 降级和 `:focus-visible` 焦点环，别删
- 页底半透明小注释用 `<div class="site-note">...</div>`
- VitePress 内部类名带 `.VP` 前缀（`.VPNav`、`.VPFeature`、`.VPButton`、`.VPLocalSearchBox`…），覆盖前先查 `node_modules/vitepress/dist/client/theme-default/`

### 首页（/）是整页自定义布局

- `docs/index.md` 的 `layout: home` → `theme/index.ts` 判断后渲染 **`HomeLayout.vue`**（不是 VitePress 自带的 VPHome）
- 首页内容仍写在 `index.md` 的 frontmatter 里（`hero.name/text/tagline/actions`、`features`），组件读 `frontmatter.value` 渲染，**改文案改 md 就行，不用动 Vue**
- `features` 卡片支持可选 `link` 字段：有则整卡可点（手型光标 + 点击 `router.go` 跳转），无则普通卡片（当前「艺术鉴赏」卡指向 `/blog/megastructure`）
- `hero.badge` 是自定义字段（顶部徽章文案）
- 交互都在 `HomeLayout.vue`：极光 blob、鼠标跟随高光（`--mx/--my` CSS 变量）、滚动视差、IntersectionObserver 入场
- 首页顶栏是组件自己画的（默认 `VPNav` 不渲染），所以**首页没有搜索框**；`about`/`blog` 等文档页仍走默认主题，有搜索

## 6. 内容风格（改文案时遵守）

- 语气：冷面荒诞 + 自嘲 + 一本正经的假科学（自造理论、假分类表格）
- 可以带点色但**点到为止**（🍑、40dB、言外之意），别太露骨
- 抽象感：薛定谔、情绪残骸、活体实验记录这类词是安全区
- 中文为主；梗参考：Wait But Why（CLIPs 式自造术语 + 家族糗事冷收尾）、xkcd（技术流装逼页脚）
- 别用「千里之行始于足下」这类正经结尾，要反转

## 7. 验证清单（改完必做）

1. `npm run build` —— 确认无 `ReferenceError`（SSR）
2. `curl -sI http://localhost:5173/改的页面` —— 200
3. 推送前问用户要不要推（他经常想先看本地效果）
4. 推送后等 ~90 秒再 `curl -s https://deepsucker.top/xxx` 验证线上
