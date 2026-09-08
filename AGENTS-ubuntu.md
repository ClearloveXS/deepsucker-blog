# AGENTS-ubuntu.md — Linux / macOS 开发系统注意事项

> 这是 `AGENTS.md` 的 Linux / macOS 专属补充。跨平台通用部分（项目结构、设计系统、内容风格、通用坑、验证清单）见主文件。本文件只放：**工作路径、命令、平台坑**。

> ⚠️ 注意：本文件描述的是**旧环境**（Ubuntu + OpenCodeSpace），当前主开发已迁到 Windows（看 `AGENTS-windows.md`）。保留这份是为了以后迁回去 / 在云端容器里继续开发时能直接读。

## 工作区

- 项目根：`/home/luqi/opencodespace/deepsucker-blog`
- 旧环境，2026-08 之前在用

## 常用命令

```bash
cd /home/luqi/opencodespace/deepsucker-blog

# 本地预览（热更新），--host 让局域网也能访问
npm run dev -- --host

# 构建
npm run build

# 提交推送
git add -A && git commit -m "说明" && git push
```

### dev server 后台启动

dev 服务器是后台进程，可能被会话杀掉。用 `setsid` 守护：

```bash
ss -tlnp | grep 5173 || (setsid bash -c 'exec npm run dev -- --host > /tmp/vitepress-dev.log 2>&1' < /dev/null &)
```

含义：先看 5173 端口在不在（说明 dev 还在跑），不在就用 `setsid` 启一个完全脱离当前会话的后台进程，输出到 `/tmp/vitepress-dev.log`。

## Ubuntu 专属坑

### #1 SSH key 配好可直接 push
- Key 在 `~/.ssh/id_ed25519`，已加到 GitHub
- 仓库用 SSH 协议：`git@github.com:ClearloveXS/deepsucker-blog.git`
- 验证连通：`ssh -T git@github.com`（应输出 `Hi ClearloveXS! You've successfully authenticated...`）

### #2 网络环境
- 旧环境下 `github.com:443` 直连经常被拒，但 SSH 走 22 端口是通的
- 下载 release 包走镜像：`https://gh-proxy.com/https://github.com/...`
- 验证线上：`curl -sI https://deepsucker.top/xxx`
