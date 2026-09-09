<script setup>
import { ref, onErrorCaptured } from 'vue'

// 错误边界：捕获「游戏组件」子树在 setup / 渲染 / 生命周期里的报错，
// 显示降级 UI 而不是整页白屏（当初白屏 bug 就是 setup 直接崩、无任何提示）。
// 返回 false 阻止错误继续向上冒泡，由本组件自行兜底。
const err = ref(null)

onErrorCaptured((e) => {
  err.value = e
  // eslint-disable-next-line no-console
  console.error('[GameErrorBoundary] 游戏组件渲染出错：', e)
  return false
})

function reload() {
  if (typeof window !== 'undefined') window.location.reload()
}
</script>

<template>
  <div v-if="err" class="game-error">
    <div class="game-error-card">
      <p class="game-error-title">错误了😵</p>
      <p class="game-error-sub">直接开摆</p>
      <details v-if="err && err.stack" class="game-error-detail">
        <summary>技术细节</summary>
        <pre>{{ err.stack }}</pre>
      </details>
      <button class="game-error-btn" @click="reload">刷新重试</button>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.game-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}
.game-error-card {
  max-width: 480px;
  width: 100%;
  padding: 24px;
  border-radius: 16px;
  background: var(--ds-glass, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--ds-hairline, rgba(255, 255, 255, 0.12));
  text-align: center;
}
.game-error-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.game-error-sub {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  letter-spacing: 1px;
}
.game-error-detail {
  margin: 0 0 16px;
  text-align: left;
  font-size: 12px;
}
.game-error-detail summary {
  cursor: pointer;
  color: var(--vp-c-text-2);
}
.game-error-detail pre {
  margin: 8px 0 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--vp-c-text-2);
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
}
.game-error-btn {
  padding: 10px 22px;
  font-size: 14px;
  border-radius: 999px;
  border: none;
  color: #fff;
  background: var(--ds-grad, linear-gradient(135deg, #7c5cff, #22d3ee));
  cursor: pointer;
}
</style>
