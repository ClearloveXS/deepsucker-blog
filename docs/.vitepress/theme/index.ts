import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineComponent, h } from 'vue'
import { useData } from 'vitepress'
import HomeLayout from './layouts/HomeLayout.vue'
import AILayout from './layouts/AILayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: defineComponent({
    name: 'Layout',
    setup() {
      const { frontmatter } = useData()
      return () => {
        const layout = frontmatter.value.layout
        // 完全自定义的两个整页布局
        if (layout === 'home') return h(HomeLayout)
        if (layout === 'ai') return h(AILayout)
        return h(DefaultTheme.Layout as any)
      }
    }
  })
} satisfies Theme
