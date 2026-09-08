import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineComponent, h } from 'vue'
import { useData } from 'vitepress'
import AILayout from './layouts/AILayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: defineComponent({
    name: 'Layout',
    setup() {
      const { frontmatter } = useData()
      return () =>
        frontmatter.value.layout === 'ai'
          ? h(AILayout)
          : h(DefaultTheme.Layout as any)
    }
  })
} satisfies Theme
