# DeepSucker 博客

基于 [VitePress](https://vitepress.dev/) 的个人博客，托管于 Cloudflare Pages。

## 本地开发

```bash
npm install       # 安装依赖
npm run dev       # 启动本地开发服务器（默认 http://localhost:5173）
npm run build     # 构建静态站点到 docs/.vitepress/dist
npm run preview   # 本地预览构建产物
```

## 目录结构

```
docs/
├── .vitepress/
│   ├── config.mts        # 站点配置（导航、侧边栏、搜索、主题）
│   └── theme/
│       ├── index.ts      # 自定义主题入口
│       └── style.css     # 自定义样式（中文字体、配色）
├── public/
│   └── favicon.svg       # 站点图标
├── index.md              # 首页
├── about.md              # 关于页
└── blog/
    └── hello-world.md    # 博客文章（在此目录新增 .md 即可）
```

## 写新文章

1. 在 `docs/blog/` 下新建一个 `.md` 文件，例如 `my-first-post.md`
2. 用 Markdown 正常写作
3. 在 `docs/.vitepress/config.mts` 的 `sidebar` 里加一条：
   ```ts
   { text: '我的第一篇文章', link: '/blog/my-first-post' }
   ```
4. `npm run dev` 实时预览

## 部署到 Cloudflare Pages

### 方式 A：Git 集成（推荐，自动构建）

1. 把本项目推送到 GitHub / GitLab
2. 登录 [Cloudflare Pages](https://pages.cloudflare.com/) → **Create project** → **Connect to Git**
3. 选择仓库，构建配置：
   - Build command: `npm run build`
   - Build output directory: `docs/.vitepress/dist`
4. 部署完成后会得到一个 `xxx.pages.dev` 地址
5. 在 **Custom domains** 里添加 `deepsucker.top`，Cloudflare 会自动配置 DNS

### 方式 B：Wrangler CLI（手动上传）

```bash
npm i -g wrangler
wrangler login
# 构建
npm run build
# 上传
npx wrangler pages deploy docs/.vitepress/dist --project-name=deepsucker-blog
```

## 自定义域名 DNS

在 Cloudflare DNS 里为 `deepsucker.top` 添加一条 A/AAAA 记录指向 Pages，
或在 Pages 后台的 Custom domains 直接绑定（会自动生成所需记录）。
建议同时配置 `www` 并设置重定向到主域。
