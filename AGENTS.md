# AGENTS.md — DeepSucker 博客项目说明书（给 AI 看的）

读完这份文档你应该能直接上手改代码、调样式、加文章、修 bug。按顺序看：结构 → 命令 → 坑 → 内容风格。

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
    │           └── AILayout.vue    # 「无尽能源」整页布局（门禁+四地址复制+字符级动效），layout: ai 触发
    ├── public/favicon.svg
    ├── index.md                  # 首页（layout: home，hero + features）
    ├── about.md                  # 关于我
    ├── ai.md                     # 无尽能源页（frontmatter: layout: ai）
    └── blog/
        └── hello-world.md        # 文章；新文章放这里
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

## 5. 关键机制速查

### 无尽能源页（/ai）
- `docs/ai.md` 的 frontmatter `layout: ai` 触发整页布局；`theme/index.ts` 里判断 `frontmatter.value.layout === 'ai'` 渲染 `AILayout.vue`，否则回落默认主题 Layout
- 改这些都在 `AILayout.vue`：
  - 门禁答案：`const ANSWER = '普通网友'`
  - 答错骚话：`FLIRTS` 数组（随机、不连续重复；**别写会直接暴露答案的条**）
  - 四个地址：`ENDPOINTS` 数组（本地 VM `http://192.168.68.1:8080/v1`、本地 web `http://127.0.0.1:8080/`、外部 web/api `https://sometingyellow.deepsucker.top/...`）
  - 门禁解锁状态存 `sessionStorage['ai_unlocked']`（关标签页重问）
  - 标题字符数组：`TITLE_CHARS = '无尽能源'.split('')`（用于字符级动效）
- 外部 API 需要 Bearer Key，CORS 已放行 `https://deepsucker.top`

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
