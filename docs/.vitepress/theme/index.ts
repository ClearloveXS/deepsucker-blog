import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineComponent, h } from 'vue'
import { useData } from 'vitepress'
import HomeLayout from './layouts/HomeLayout.vue'
import AILayout from './layouts/AILayout.vue'
import GufengLayout from './layouts/GufengLayout.vue'
import GameLobby from './components/GameLobby.vue'
import FlappyGame from './components/FlappyGame.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GameLobby', GameLobby)
    app.component('FlappyGame', FlappyGame)
    app.component('GameHost', GameHost)
    app.component('ErrorBoundary', ErrorBoundary)
  },
  Layout: defineComponent({
    name: 'Layout',
    setup() {
      const { frontmatter } = useData()
      return () => {
        const layout = frontmatter.value.layout
        // 完全自定义的整页布局
        if (layout === 'home') return h(HomeLayout)
        if (layout === 'ai') return h(AILayout)
        if (layout === 'gufeng') return h(GufengLayout) // 巨构：行深般若（古风整页）
        return h(DefaultTheme.Layout as any)
      }
    }
  })
} satisfies Theme
