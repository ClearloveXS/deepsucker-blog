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

/* ---------------- 标题字符（用于动效） ---------------- */
const TITLE_CHARS = '无尽能源'.split('')

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
    <!-- 极光背景 -->
    <div class="aurora" aria-hidden="true">
      <span class="blob b1"></span>
      <span class="blob b2"></span>
      <span class="veil"></span>
    </div>

    <!-- 顶栏 -->
    <nav class="en-topbar">
      <a class="en-brand" href="/" @click.prevent="goHome">
        <span class="brand-dot"></span>
        <span>DeepSucker</span>
      </a>
      <div class="en-topbar-actions">
        <button class="en-home-btn" @click="goHome">返回主页</button>
        <button class="en-iconbtn" @click="toggleTheme" :title="isDark ? '切到浅色' : '切到深色'" :aria-label="isDark ? '切到浅色' : '切到深色'">
          <svg v-if="isDark" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>
      </div>
    </nav>

    <!-- 标题 -->
    <header class="en-header">
      <h1 class="en-title">
        <span class="en-title-inner">
          <span
            v-for="(ch, i) in TITLE_CHARS"
            :key="i"
            class="en-char"
            :style="{ animationDelay: `${i * 0.11}s` }"
          >{{ ch }}</span>
        </span>
        <span class="en-title-sheen" aria-hidden="true"></span>
      </h1>
      <p class="en-sub">取用地址 · 自给自足</p>
    </header>

    <!-- 门禁 -->
    <section v-if="!unlocked" class="en-gate">
      <div class="gate-card">
        <h2 class="gate-q">我是谁？</h2>
        <p class="gate-hint">答对方可取用</p>
        <div class="gate-row">
          <input v-model="gateAnswer" @keyup.enter="checkGate" placeholder="在此作答…" autocomplete="off" aria-label="答案" />
          <button class="gate-btn" @click="checkGate">
            进入
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <transition name="fade">
          <p v-if="gateError" class="gate-error">{{ gateError }}</p>
        </transition>
      </div>
    </section>

    <!-- 地址列表 -->
    <section v-else class="en-list">
      <div v-for="(ep, i) in ENDPOINTS" :key="i" class="ep-row ds-reveal is-in">
        <div class="ep-info">
          <span class="ep-label">{{ ep.label }}</span>
          <code class="ep-value">{{ ep.value }}</code>
        </div>
        <button class="copy-btn" :class="{ copied: copied === i }" @click="copy(i)">
          <svg v-if="copied === i" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>{{ copied === i ? '已复制' : '复制' }}</span>
        </button>
      </div>
      <p class="ep-note">外部调用需要 Bearer Key · 用完记得把电还回来</p>
    </section>
  </div>
</template>

<style scoped>
.en-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  color: var(--vp-c-text-1);
  overflow-x: clip;
}

/* ---------- 极光背景（挪到下半屏，让开标题区） ---------- */
.aurora {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: calc(var(--ds-aurora-opacity) * 0.6);
  will-change: transform;
}
.b1 {
  width: 42vw;
  height: 42vw;
  min-width: 320px;
  min-height: 320px;
  top: 46vh;
  left: -8vw;
  background: var(--ds-g1);
  animation: ds-float 26s ease-in-out infinite;
}
.b2 {
  width: 36vw;
  height: 36vw;
  min-width: 280px;
  min-height: 280px;
  top: 62vh;
  right: -6vw;
  background: var(--ds-g2);
  animation: ds-float 30s ease-in-out infinite reverse;
}
.veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    var(--vp-c-bg) 0%,
    color-mix(in srgb, var(--vp-c-bg) 70%, transparent) 28%,
    color-mix(in srgb, var(--vp-c-bg) 60%, transparent) 62%,
    var(--vp-c-bg) 96%
  );
}

/* ---------- 顶栏 ---------- */
.en-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(20px, 5vw, 56px);
  background: transparent;
  border-bottom: 1px solid var(--vp-c-divider);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.en-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 15.5px;
}
.brand-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ds-grad);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-g1) 18%, transparent);
}
.en-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.en-home-btn,
.en-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-border);
  background: var(--ds-glass);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.en-home-btn {
  padding: 0 15px;
}
.en-iconbtn {
  width: 34px;
}
.en-home-btn:hover,
.en-iconbtn:hover {
  border-color: var(--ds-hairline-strong);
  color: var(--vp-c-text-1);
  background: var(--ds-glass-strong);
  transform: translateY(-1px);
}

/* ---------- 标题 ---------- */
.en-header {
  text-align: center;
  padding: 64px 20px 8px;
}
/* ---------- 标题（字符级动效 + 持续流光 + 呼吸发光） ---------- */
.en-title {
  position: relative;
  display: inline-block;
  margin: 0;
  font-size: clamp(2.5rem, 6.8vw, 3.8rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  animation: en-glow 3.4s ease-in-out infinite;
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--ds-g2) 50%, transparent))
          drop-shadow(0 0 48px color-mix(in srgb, var(--ds-g1) 35%, transparent));
}
.en-title-inner {
  display: inline-block;
  background: linear-gradient(
    115deg,
    #f5e1ff 0%,
    #ffb3d1 28%,
    #ffffff 52%,
    #a8e6ff 78%,
    #c4b5fd 100%
  );
  background-size: 240% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  -webkit-text-stroke: 0.4px color-mix(in srgb, var(--vp-c-text-1) 22%, transparent);
  animation: en-shimmer 5s linear infinite;
}
.en-char {
  display: inline-block;
  animation: en-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* sheen 扫光 */
.en-title-sheen {
  position: absolute;
  inset: -2% -4%;
  pointer-events: none;
  overflow: hidden;
  border-radius: 0.18em;
}
.en-title-sheen::after {
  content: '';
  position: absolute;
  top: -10%;
  left: -50%;
  width: 45%;
  height: 120%;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%);
  transform: skewX(-22deg);
  animation: en-sheen 3.8s ease-in-out 1.2s infinite;
}

/* 浅色模式 sheen 走 normal，避免过亮 */
:root .en-title-sheen {
  mix-blend-mode: normal;
}
.dark .en-title-sheen {
  mix-blend-mode: screen;
}

@keyframes en-rise {
  from { opacity: 0; transform: translateY(28px) scale(0.9); filter: blur(8px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes en-shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 240% 50%; }
}
@keyframes en-glow {
  0%, 100% {
    filter: drop-shadow(0 0 18px color-mix(in srgb, var(--ds-g2) 50%, transparent))
            drop-shadow(0 0 48px color-mix(in srgb, var(--ds-g1) 35%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 26px color-mix(in srgb, var(--ds-g2) 78%, transparent))
            drop-shadow(0 0 64px color-mix(in srgb, var(--ds-g1) 55%, transparent));
  }
}
@keyframes en-sheen {
  0% { left: -50%; }
  55% { left: 110%; }
  100% { left: 110%; }
}

.en-sub {
  margin: 14px 0 0;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  animation: en-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
}

/* ---------- 门禁 ---------- */
.en-gate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px 64px;
}
.gate-card {
  width: min(430px, 100%);
  padding: 40px 34px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
  background: var(--ds-glass);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-md);
  animation: ds-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both;
}
.gate-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 84px;
  height: 2px;
  background: var(--ds-grad);
  border-radius: 2px;
}
.gate-q {
  margin: 0;
  font-size: 27px;
  font-weight: 680;
  letter-spacing: -0.03em;
}
.gate-hint {
  margin: 9px 0 24px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.gate-row {
  display: flex;
  gap: 10px;
}
.gate-row input {
  flex: 1;
  min-width: 0;
  padding: 12px 15px;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--ds-glass);
  color: var(--vp-c-text-1);
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.gate-row input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--ds-g1) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-g1) 16%, transparent);
}
.gate-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 0 20px;
  border: none;
  border-radius: 12px;
  background: var(--ds-grad);
  background-size: 200% 100%;
  color: #fff;
  font-size: 15px;
  font-weight: 560;
  cursor: pointer;
  box-shadow: 0 6px 20px -8px color-mix(in srgb, var(--ds-g1) 70%, transparent);
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease;
}
.gate-btn:hover {
  transform: translateY(-1px);
  animation: ds-shimmer 3s linear infinite;
  box-shadow: 0 12px 30px -10px color-mix(in srgb, var(--ds-g1) 80%, transparent);
}
.gate-error {
  margin: 18px 0 0;
  font-size: 14px;
  color: color-mix(in srgb, var(--ds-g2) 82%, var(--vp-c-text-2));
  min-height: 1.4em;
}

/* ---------- 地址列表 ---------- */
.en-list {
  width: min(680px, calc(100% - 40px));
  margin: 36px auto 56px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ep-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--ds-radius);
  background: var(--ds-glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--ds-shadow-sm);
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.26s ease,
    box-shadow 0.26s ease;
}
.ep-row:hover {
  transform: translateY(-2px);
  border-color: var(--ds-hairline-strong);
  box-shadow: var(--ds-shadow-md);
}
.ep-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.ep-label {
  font-size: 12.5px;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-3);
}
.ep-value {
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-text-1);
  word-break: break-all;
  background: none;
  padding: 0;
}
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 15px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.copy-btn:hover {
  border-color: var(--ds-hairline-strong);
  color: var(--vp-c-text-1);
  background: var(--ds-glass-strong);
}
.copy-btn.copied {
  border-color: color-mix(in srgb, var(--ds-g3) 55%, transparent);
  color: color-mix(in srgb, var(--ds-g3) 75%, var(--vp-c-text-1));
}
.ep-note {
  margin: 8px 2px 0;
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  opacity: 0.75;
}

/* ---------- 过渡 ---------- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 560px) {
  .gate-row {
    flex-direction: column;
  }
  .gate-btn {
    justify-content: center;
    padding: 12px 20px;
  }
  .ep-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .copy-btn {
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blob,
  .en-title,
  .en-title-inner,
  .en-title-sheen,
  .en-title-sheen::after,
  .en-char,
  .en-sub,
  .gate-card {
    animation: none !important;
  }
}
</style>
