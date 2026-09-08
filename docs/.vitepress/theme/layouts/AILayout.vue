<script setup>
import { ref, onMounted } from 'vue'
import { useDark } from '@vueuse/core'
import { useRouter } from 'vitepress'

const router = useRouter()
const isDark = useDark({ storageKey: 'vitepress-theme-appearance' })
function toggleTheme() {
  isDark.value = !isDark.value
}
function goHome() {
  router.go('/')
}

/* ---------------- 答题门禁 ---------------- */
const ANSWER = '普通网友'
const FLIRTS = [
  '哦，答错了？我还以为你比这聪明点呢。',
  '这答案……很有创意，可惜是错的。',
  '连我是谁都不知道，你还来我这逛什么？',
  '你的记忆力，跟你那不稳定的网速一样感人。',
  '又错了，我开始怀疑你的智商了。',
  '就这？AI 看了都得替你尴尬。',
  '这就像让色盲分辨红绿灯。',
  '你这回答，透着一股没读过书的从容。',
  '再错下去，我怀疑你脑子是不是开了飞行模式。',
  '给你个提示吧，虽然不确定你脑子有没有信号。',
  '这答案……让我想想……哦对，是错的。',
  '你是真在答题，还是闭着眼乱按键盘？',
  '我是谁你都不知道，那你还登我主页干嘛？',
  '错了。不过我喜欢你的勇气，错得挺有底气。',
  '你这回答，像极了电量 1% 的手机——惊喜满满。',
  '我严重怀疑你是用脚在审题。',
  '答错了，但起码诚实——你是真不知道。',
  '你脑子是不是在缓冲？转两秒再答。',
  '这就像让一个不会游泳的人表演后空翻。',
  '本来想给你提示的，现在不太确定了。'
]

const unlocked = ref(false)
const gateAnswer = ref('')
const gateError = ref('')
let lastFlirt = -1

function pickFlirt() {
  let i
  do {
    i = Math.floor(Math.random() * FLIRTS.length)
  } while (i === lastFlirt && FLIRTS.length > 1)
  lastFlirt = i
  return FLIRTS[i]
}

function checkGate() {
  if (gateAnswer.value.trim() === ANSWER) {
    unlocked.value = true
    sessionStorage.setItem('ai_unlocked', '1')
  } else {
    gateError.value = pickFlirt()
  }
}

/* ---------------- 四个地址 + 复制 ---------------- */
const ENDPOINTS = [
  { label: '本地模型 API', value: 'http://192.168.68.1:8080/v1' },
  { label: '本地 Web 界面', value: 'http://127.0.0.1:8080/' },
  { label: '外部 Web 界面', value: 'https://sometingyellow.deepsucker.top/' },
  { label: '外部 API 调用', value: 'https://sometingyellow.deepsucker.top/v1' }
]

const copied = ref(-1)

async function copy(i) {
  const text = ENDPOINTS[i].value
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = i
    setTimeout(() => {
      if (copied.value === i) copied.value = -1
    }, 1500)
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  if (sessionStorage.getItem('ai_unlocked') === '1') unlocked.value = true
})
</script>

<template>
  <div class="en-page">
    <!-- 顶栏 -->
    <nav class="en-topbar">
      <a class="en-brand" href="/">DeepSucker</a>
      <div class="en-topbar-actions">
        <button class="en-home-btn" @click="goHome">返回主页</button>
        <button class="en-iconbtn" @click="toggleTheme" :title="isDark ? '切到浅色' : '切到深色'">
          {{ isDark ? '☀' : '☾' }}
        </button>
      </div>
    </nav>

    <!-- 标题 -->
    <header class="en-header">
      <h1 class="en-title">无尽能源</h1>
      <p class="en-sub">取用地址 · 自给自足</p>
    </header>

    <!-- 门禁 -->
    <section v-if="!unlocked" class="en-gate">
      <div class="gate-card">
        <h2 class="gate-q">我是谁？</h2>
        <p class="gate-hint">答对方可取用</p>
        <div class="gate-row">
          <input v-model="gateAnswer" @keyup.enter="checkGate" placeholder="在此作答…" autocomplete="off" />
          <button class="gate-btn" @click="checkGate">进入</button>
        </div>
        <transition name="fade">
          <p v-if="gateError" class="gate-error">{{ gateError }}</p>
        </transition>
      </div>
    </section>

    <!-- 地址列表 -->
    <section v-else class="en-list">
      <div v-for="(ep, i) in ENDPOINTS" :key="i" class="ep-row">
        <div class="ep-info">
          <span class="ep-label">{{ ep.label }}</span>
          <code class="ep-value">{{ ep.value }}</code>
        </div>
        <button class="copy-btn" @click="copy(i)">
          {{ copied === i ? '✓ 已复制' : '复制' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.en-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--vp-c-text-1);
}

/* 顶栏 */
.en-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: color-mix(in srgb, var(--vp-c-bg) 85%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--vp-c-border);
}
.en-brand {
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 15px;
}
.en-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.en-home-btn {
  padding: 7px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.en-home-btn:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}
.en-iconbtn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-border);
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
}
.en-iconbtn:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

/* 标题 */
.en-header {
  text-align: center;
  padding: 56px 20px 8px;
}
.en-title {
  margin: 0;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.en-sub {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* 门禁 */
.en-gate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px 48px;
}
.gate-card {
  width: min(400px, 100%);
  padding: 36px 32px 30px;
  text-align: center;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  box-shadow: 0 4px 24px -12px rgba(0, 0, 0, 0.12);
}
.gate-q {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.gate-hint {
  margin: 8px 0 22px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.gate-row {
  display: flex;
  gap: 10px;
}
.gate-row input {
  flex: 1;
  padding: 11px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 15px;
  font-family: inherit;
}
.gate-row input:focus {
  outline: none;
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
}
.gate-btn {
  padding: 0 22px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-size: 15px;
  cursor: pointer;
}
.gate-btn:hover {
  opacity: 0.85;
}
.gate-error {
  margin: 16px 0 0;
  font-size: 14px;
  color: #b45309;
  min-height: 1.2em;
}
.dark .gate-error {
  color: #f59e0b;
}

/* 地址列表 */
.en-list {
  width: min(680px, calc(100% - 40px));
  margin: 32px auto 48px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ep-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg);
  transition: border-color 0.15s;
}
.ep-row:hover {
  border-color: var(--vp-c-text-3);
}
.ep-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.ep-label {
  font-size: 12.5px;
  color: var(--vp-c-text-3);
}
.ep-value {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 14px;
  color: var(--vp-c-text-1);
  word-break: break-all;
  background: none;
  padding: 0;
}
.copy-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover {
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

/* 过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
