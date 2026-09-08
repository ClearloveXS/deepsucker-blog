# AGENTS.md — DeepSucker 博客项目说明书（给 AI 看的）

读完这份文档你应该能直接上手改代码、调样式、加文章、修 bug。按顺序看：结构 → 命令 → 坑 → 内容风格。

## 1. 项目是什么

- **VitePress 1.6.4** 静态博客，中文为主，托管在 Cloudflare Pages
- 线上地址：`https://deepsucker.top`（预览：`https://deepsucker-blog.pages.dev`）
- 仓库：`git@github.com:ClearloveXS/deepsucker-blog.git`，分支 `master`
- 风格定位：**简约风 + 幽默抽象 + 冷面荒诞 + 带点色**（参考 Wait But Why / xkcd 的冷幽默路线）

## 2. 目录结构（只列要动的）

```
deepsucker-blog/
├── package.json                  # scripts: dev / build / preview
├── AGENTS.md                     # 本文件
└── docs/                         # ← 站点根目录（VitePress root）
    ├── .vitepress/
    │   ├── config.mts            # 导航、侧边栏、搜索、页脚、appearance
    │   ├── dist/                 # 构建产物，别手改（gitignore 了）
    │   └── theme/
    │       ├── index.ts          # 自定义主题入口：包装 Layout
    │       ├── style.css         # 全站简约风样式（所有 CSS 变量在这）
    │       └── layouts/
    │           └── AILayout.vue  # 「无尽能源」整页布局（门禁+四地址复制）
    ├── public/favicon.svg
    ├── index.md                  # 首页（layout: home，hero + features）
    ├── about.md                  # 关于我
    ├── ai.md                     # 无尽能源页（frontmatter: layout: ai）
    └── blog/
        └── hello-world.md        # 文章；新文章放这里
```

## 3. 常用命令

```bash
cd /home/luqi/opencodespace/deepsucker-blog

npm run dev -- --host     # 本地预览 http://localhost:5173/（热更新）
npm run build             # 构建，同时是 SSR 报错检查（见坑 #2）
git add -A && git commit -m "说明" && git push   # 推送后 Cloudflare 自动部署（约 1~2 分钟）
```

- 提交身份：`git -c user.name="ClearloveXS" -c user.email="hello@deepsucker.top" commit ...`
- **Cloudflare Pages 构建配置**：build command `npm run build`，output dir `docs/.vitepress/dist`（改这两处要同步 CF 后台）
- dev 服务器是后台进程，可能被会话杀掉。确认/重启：
  ```bash
  ss -tlnp | grep 5173 || (setsid bash -c 'exec npm run dev -- --host > /tmp/opencode/vitepress-dev.log 2>&1' < /dev/null &)
  ```

## 4. 坑（血泪教训，务必遵守）

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

### #7 网络环境（本机在国内）
- `github.com:443` 直连经常被拒，但 `api.github.com` 通；下载 release 包走镜像：`https://gh-proxy.com/https://github.com/...`
- **SSH 是通的**（key 在 `~/.ssh/id_ed25519`），git push/pull 用 SSH 没问题
- 验证线上：`curl -sI https://deepsucker.top/xxx`

## 5. 关键机制速查

### 无尽能源页（/ai）
- `docs/ai.md` 的 frontmatter `layout: ai` 触发整页布局；`theme/index.ts` 里判断 `frontmatter.value.layout === 'ai'` 渲染 `AILayout.vue`，否则回落默认主题 Layout
- 改这些都在 `AILayout.vue`：
  - 门禁答案：`const ANSWER = '普通网友'`
  - 答错骚话：`FLIRTS` 数组（随机、不连续重复；**别写会直接暴露答案的条**）
  - 四个地址：`ENDPOINTS` 数组（本地 VM `http://192.168.68.1:8080/v1`、本地 web `http://127.0.0.1:8080/`、外部 web/api `https://sometingyellow.deepsucker.top/...`）
  - 门禁解锁状态存 `sessionStorage['ai_unlocked']`（关标签页重问）
- 外部 API 需要 Bearer Key，CORS 已放行 `https://deepsucker.top`

### 加新文章
1. `docs/blog/xxx.md` 建文件
2. `config.mts` 的 `sidebar` 里加一行 `{ text: '标题', link: '/blog/xxx' }`
3. `npm run build` 验证，推送

### 样式
- 所有颜色/字体变量在 `style.css` 顶部 `:root` / `.dark`，改配色只动这里
- 当前是简约风：白底 `#ffffff` / 深色 `#0a0a0b`，单色 `#18181b`，发丝线 `#e4e4e7`，系统无衬线字体
- 页底半透明小注释用 `<div class="site-note">...</div>`（样式在 style.css）
- VitePress 内部类名带 `.VP` 前缀（如 `.VPNav`、`.VPFeature`、`.VPButton`），覆盖前先查 `node_modules/vitepress/dist/client/theme-default/`

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
