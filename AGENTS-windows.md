# AGENTS-windows.md — Windows 开发系统注意事项

> 这是 `AGENTS.md` 的 Windows 专属补充。跨平台通用部分（项目结构、设计系统、内容风格、通用坑、验证清单）见主文件。本文件只放：**工作路径、命令、平台坑**。

## 工作区

- 项目根：`E:\AI\workbdspace\个人网站\deepsucker-blog`
- 路径含中文「个人网站」，实测 npm / Vite / VitePress 全链路正常，**不用挪**
- 命令里写路径统一用正斜杠 `E:/AI/...`，Git Bash 和 Node 都认；反斜杠在 JSON/JS 里要转义

## 常用命令

```bash
cd "E:/AI/workbdspace/个人网站/deepsucker-blog"

# 本地预览（热更新），用后台任务跑（Windows 没有 setsid）
npm run dev -- --port 5173

# 构建，同时是 SSR 报错检查（见 AGENTS.md 坑 #2）
# ⚠️ 构建前必须先用 Python 删 dist（见下方坑 #5），并停掉 dev server
"C:/Users/UserName/.workbuddy/binaries/python/versions/3.13.12/python.exe" -c "import shutil; shutil.rmtree(r'E:\AI\workbdspace\个人网站\deepsucker-blog\docs\.vitepress\dist', ignore_errors=True)"
npm run build

# 提交推送
git add -A && git commit -m "说明" && git push
```

### 首次克隆后必做配置

```bash
cd "E:/AI/workbdspace/个人网站/deepsucker-blog"

# 换行符：避免 CRLF 污染（否则推上去 Cloudflare Linux 构建可能出问题）
git config core.autocrlf input

# 长路径：node_modules 嵌套深，Windows 260 字符上限会炸
git config core.longpaths true

# 提交身份
git config user.name "ClearloveXS"
git config user.email "hello@deepsucker.top"
```

### dev server 健康检查

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
# 端口检查：netstat -ano | findstr 5173（Linux 的 ss 没有）
```

## Windows 专属坑

### #1 `setsid` 不存在
Ubuntu 那套后台守护命令 `setsid bash -c '...' &` 在 Windows 没有。改用工具的"后台任务"方式起 dev server。

### #2 PowerShell 执行策略
可能禁止 `npm.ps1`。用 **Git Bash** 跑 npm 命令最省事。

### #3 端口 / 进程检查
- Windows：`netstat -ano | findstr 5173`（Linux 的 `ss -tlnp | grep 5173` 没有）

### #4 路径分隔符
- 写命令用正斜杠 `E:/AI/...`
- 反斜杠在 JSON/JS/TS 字符串里要写成 `\\`

### #5 **`npm run build` 清不掉 dist（大坑）**
VitePress 构建第一步是清空 `docs/.vitepress/dist`，在 **中文路径 + Windows** 下会失败：
- 报错：`tryTrash ... genie-trash ... Some operations were aborted`（安全删除组件 `genie-trash` 处理不了中文路径）
- `rm -rf` / `mv` / PowerShell `Remove-Item` / `cmd rd /s /q` 也都会被这层拦

**唯一可行解法（已验证）**：用 Python 绕过，构建前先手动清：
```bash
"C:/Users/UserName/.workbuddy/binaries/python/versions/3.13.12/python.exe" -c "import shutil; shutil.rmtree(r'E:\AI\workbdspace\个人网站\deepsucker-blog\docs\.vitepress\dist', ignore_errors=True)"
```
清完再 `npm run build`。

**附加：build 时必须停掉 dev server**。Vite 的文件监听会锁住目录（dist 在 docs 下，dev 也在 watch docs），导致连重命名都 `Permission denied`。推荐流程：
1. 停 dev server
2. Python 清 dist
3. `npm run build`
4. （可选）重启 dev server

### #6 git 推送走 HTTPS
本机 SSH key 没配（`.ssh/` 下的 id_ed25519 是 Ubuntu 机的 key），所以 push/pull 走 HTTPS。GitHub HTTPS 现在要求 **Personal Access Token (PAT)** 代替密码：
- 首次 push 会弹凭据框，输入 GitHub 用户名 + PAT（不是密码）
- PAT 申请：`https://github.com/settings/tokens` → Generate new token (classic)，勾 `repo` 权限
- Windows 凭据管理器可能缓存旧密码，错了就 `控制面板 → 凭据管理器 → Windows 凭据` 删掉 `git:https://github.com` 那条再重试
