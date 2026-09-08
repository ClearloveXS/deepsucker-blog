import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'DeepSucker',
  description: '一个会写代码的骚人 —— 记录代码、生活与那些说不出口的事',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#b08d57' }],
    // 宋体衬线字体（Noto Serif SC），古意轻奢
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700;900&display=swap'
      }
    ]
  ],

  themeConfig: {
    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/blog/hello-world' },
      { text: '灵犀阁', link: '/ai' },
      { text: '关于', link: '/about' }
    ],

    // 侧边栏（博客列表）
    sidebar: [
      {
        text: '博客',
        items: [
          { text: '你好，世界', link: '/blog/hello-world' }
        ]
      },
      {
        text: '其他',
        items: [
          { text: '灵犀阁 · 本地问灵', link: '/ai' },
          { text: '关于我', link: '/about' }
        ]
      }
    ],

    // 社交图标（放到 GitHub / 邮箱等）
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ClearloveXS' }
    ],

    // 本地搜索（无需后端）
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文章', buttonAriaLabel: '搜索文章' },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件'
          }
        }
      }
    },

    // 页脚
    footer: {
      message: '用 VitePress 构建 · 托管于 Cloudflare Pages · 内容偶尔不正经',
      copyright: 'Copyright © 2026 DeepSucker · 保留所有（以及部分）权利'
    },

    // 文档编辑链接（接入 GitHub 后可开启）
    outline: { label: '本页目录' },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    lastUpdated: { text: '最后更新于' },

    // 返回顶部
    returnToTopLabel: '返回顶部',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
