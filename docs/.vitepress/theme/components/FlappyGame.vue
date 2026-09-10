<script setup lang="ts">
// Flappy Bird 游戏页壳（AGENTS.md §8.4 第 3 步）
// 只做一件事：从宿主 inject gameCtx，初始化纯逻辑模块 FlappyModule，
// 注册给宿主转发 onPlayerState / sendPlayerInput。所有 canvas 渲染/物理在 module.ts。
import { inject, onMounted, onBeforeUnmount } from 'vue'
import { FlappyModule } from '../games/flappy/module.js'

const ctx = inject('gameCtx') as any
let m: FlappyModule | null = null

onMounted(() => {
  m = new FlappyModule()
  m.init(ctx)
  ctx.registerGameModule(m)
})

onBeforeUnmount(() => {
  if (m) m.destroy()
  m = null
})
</script>

<template>
  <!-- 游戏渲染由 GameHost 的 canvas 承载，本壳只驱动模块 -->
</template>
