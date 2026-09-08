<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useDark } from '@vueuse/core'
import { inBrowser } from 'vitepress'

const isDark = useDark({ storageKey: 'vitepress-theme-appearance' })
function toggleTheme() {
  isDark.value = !isDark.value
}

/* ---------------- 答题门禁 ---------------- */
const ANSWER = '普通网友'
const FLIRTS = [
  '答错啦～再想想，我是谁呢？( wink )',
  '嗯？这答案……有点意思，但不对哦～',
  '差一点点就对了，再来一次嘛～',
  '连我是谁都记不住，你对我上心了吗？',
  '再猜猜？猜对了我请你喝奶茶 🧋',
  '嘿，别蒙了，认真想想我是谁～',
  '答案就在你心里，那个最普通的存在～',
  '又错了！你是不是把我想得太特别了？',
  '提示：我很普通，普通到让你想不起～',
  '再试一次嘛，乖～( 捏脸 )',
  '嗯哼？这都不对，看来得给你点颜色看看～',
  '别急，深呼吸，想想那个最不起眼的我～',
  '答非所问哦～我是谁，你心里没数吗？',
  '就差一点点！再想想～',
  '哎呀，又让我等。我是谁呀？( 拉衣角 )',
  '提示：网友 + 普通，加在一起～',
  '你是不是故意答错，想多看我几眼？',
  '再猜！猜对有奖，猜错……罚你再看一遍～'
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

/* ---------------- 设置（端点 / Key / 模型） ---------------- */
const LS_KEY = 'ai_settings'

function defaultBaseUrl() {
  if (!inBrowser) return 'https://sometingyellow.deepsucker.top/v1'
  const h = location.hostname
  const lan =
    h === 'localhost' ||
    h === '127.0.0.1' ||
    /^192\.168\./.test(h) ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  return lan ? 'http://192.168.68.1:8080/v1' : 'https://sometingyellow.deepsucker.top/v1'
}

const settings = ref({ baseUrl: defaultBaseUrl(), apiKey: '', model: '' })
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (s) settings.value = { ...settings.value, ...s }
  } catch {}
}
function saveSettings() {
  localStorage.setItem(LS_KEY, JSON.stringify(settings.value))
  fetchModels()
}

/* ---------------- 模型列表 ---------------- */
const models = ref([])
async function fetchModels() {
  try {
    const headers = {}
    if (settings.value.apiKey) headers['Authorization'] = 'Bearer ' + settings.value.apiKey
    const r = await fetch(settings.value.baseUrl.replace(/\/+$/, '') + '/models', { headers })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const d = await r.json()
    models.value = (d.data || []).map((m) => m.id)
    if (!settings.value.model && models.value.length) settings.value.model = models.value[0]
  } catch {
    models.value = []
  }
}

/* ---------------- 聊天 ---------------- */
const SYSTEM =
  '你是「灵犀」，DeepSucker 博客（deepsucker.top）的本地问灵。风格：简洁、风趣，偶尔带点骚气但别太露骨。用中文回答。'

const messages = ref([])
const input = ref('')
const loading = ref(false)
const error = ref('')
const msgList = ref(null)

async function scrollBottom() {
  await nextTick()
  if (msgList.value) msgList.value.scrollTop = msgList.value.scrollHeight
}

function authHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (settings.value.apiKey) h['Authorization'] = 'Bearer ' + settings.value.apiKey
  return h
}

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return
  error.value = ''
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  await scrollBottom()
  loading.value = true

  const aiMsg = { role: 'assistant', content: '' }
  messages.value.push(aiMsg)

  const base = settings.value.baseUrl.replace(/\/+$/, '')
  const history = messages.value
    .filter((m) => m.content)
    .map((m) => ({ role: m.role, content: m.content }))
  const body = {
    model: settings.value.model || undefined,
    messages: [{ role: 'system', content: SYSTEM }, ...history],
    stream: true
  }

  try {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      let msg = 'HTTP ' + res.status
      try {
        const e = await res.json()
        if (e.error?.message) msg = e.error.message
      } catch {}
      throw new Error(msg)
    }

    if (res.body && res.body.getReader) {
      // 流式（SSE）
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const j = JSON.parse(data)
            const delta = j.choices?.[0]?.delta?.content
            if (delta) {
              aiMsg.content += delta
              await scrollBottom()
            }
          } catch {}
        }
      }
    } else {
      // 非流式兜底
      const d = await res.json()
      aiMsg.content = d.choices?.[0]?.message?.content || ''
    }

    if (!aiMsg.content) aiMsg.content = '（灵犀沉默了，也许模型还没加载好？）'
  } catch (e) {
    error.value = e.message || '连接失败'
    if (!aiMsg.content) messages.value.pop()
  } finally {
    loading.value = false
    await scrollBottom()
  }
}

function clearChat() {
  messages.value = []
  error.value = ''
}

onMounted(() => {
  loadSettings()
  if (sessionStorage.getItem('ai_unlocked') === '1') unlocked.value = true
  fetchModels()
})
</script>

<template>
  <div class="ai-page">
    <!-- 祥云水印 -->
    <svg class="ai-clouds" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M120 120 a34 34 0 1 1 52 -24 a26 26 0 1 1 42 12" />
        <path d="M980 160 a30 30 0 1 1 46 -20 a22 22 0 1 1 38 10" />
        <path d="M240 470 a28 28 0 1 1 44 -18 a20 20 0 1 1 34 8" />
        <path d="M860 460 a32 32 0 1 1 50 -22 a24 24 0 1 1 40 10" />
      </g>
    </svg>

    <!-- 顶栏 -->
    <nav class="ai-topbar">
      <a class="ai-brand" href="/">DeepSucker</a>
      <div class="ai-topbar-actions">
        <button class="ai-iconbtn" @click="toggleTheme" :title="isDark ? '切到浅色' : '切到深色'">
          {{ isDark ? '☀' : '☾' }}
        </button>
        <button class="ai-iconbtn" @click="showSettings = !showSettings" title="设置">⚙</button>
      </div>
    </nav>

    <!-- 巨构：飞檐 + 月洞门 + 印章 -->
    <header class="ai-header">
      <svg class="ai-roof" viewBox="0 0 320 100" aria-hidden="true">
        <defs>
          <linearGradient id="roofG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#d9ba7c" />
            <stop offset="1" stop-color="#87683c" />
          </linearGradient>
        </defs>
        <path
          fill="url(#roofG)"
          d="M160 14 C 120 14 96 24 56 38 C 34 45 20 52 8 66 L 16 70 C 30 58 46 52 70 46 C 104 38 128 32 160 32 C 192 32 216 38 250 46 C 274 52 290 58 304 70 L 312 66 C 300 52 286 45 264 38 C 224 24 200 14 160 14 Z"
        />
        <line x1="160" y1="14" x2="160" y2="4" stroke="#9e2b25" stroke-width="3" stroke-linecap="round" />
        <circle cx="160" cy="4" r="4" fill="#9e2b25" />
      </svg>

      <div class="ai-moongate">
        <h1 class="ai-title">灵犀阁</h1>
        <p class="ai-sub">本地问灵 · 心有灵犀一点通</p>
      </div>

      <span class="ai-seal" aria-hidden="true">灵</span>
    </header>

    <!-- 设置面板 -->
    <transition name="slide">
      <div v-if="showSettings" class="ai-settings">
        <div class="set-row">
          <label>API 地址</label>
          <input v-model="settings.baseUrl" placeholder="http://192.168.68.1:8080/v1" />
        </div>
        <div class="set-row">
          <label>API Key</label>
          <input v-model="settings.apiKey" type="password" placeholder="留空则不鉴权" />
        </div>
        <div class="set-row">
          <label>模型</label>
          <div class="set-model">
            <select v-model="settings.model">
              <option value="" disabled>选择模型…</option>
              <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
            </select>
            <input v-if="!models.length" v-model="settings.model" placeholder="手填模型名" />
            <button class="ai-mini" @click="fetchModels">刷新</button>
          </div>
        </div>
        <div class="set-foot">
          <span v-if="models.length" class="set-hint">已连上 {{ models.length }} 个模型</span>
          <span v-else class="set-hint warn">未取到模型列表（检查地址 / Key）</span>
          <button class="ai-save" @click="saveSettings">保存设置</button>
        </div>
      </div>
    </transition>

    <!-- 门禁 -->
    <section v-if="!unlocked" class="ai-gate">
      <div class="gate-card">
        <span class="gate-seal" aria-hidden="true">问</span>
        <h2 class="gate-q">我是谁？</h2>
        <p class="gate-hint">答对方可入阁</p>
        <div class="gate-row">
          <input v-model="gateAnswer" @keyup.enter="checkGate" placeholder="在此作答…" autocomplete="off" />
          <button class="gate-btn" @click="checkGate">入阁</button>
        </div>
        <transition name="fade">
          <p v-if="gateError" class="gate-error">{{ gateError }}</p>
        </transition>
      </div>
    </section>

    <!-- 聊天 -->
    <section v-else class="ai-chat">
      <div class="chat-messages" ref="msgList">
        <div v-if="!messages.length" class="chat-empty">灵犀已至，问点什么吧。</div>
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <div class="msg-bubble">{{ m.content }}</div>
        </div>
        <div v-if="loading && !messages.length" class="msg assistant">
          <div class="msg-bubble typing">…</div>
        </div>
      </div>

      <transition name="fade">
        <p v-if="error" class="chat-error">{{ error }}</p>
      </transition>

      <div class="chat-input">
        <textarea
          v-model="input"
          @keydown.enter.exact.prevent="send"
          placeholder="问灵犀…"
          rows="1"
        ></textarea>
        <button class="send-btn" @click="send" :disabled="loading">问</button>
      </div>
      <button class="clear-btn" @click="clearChat">清空对话</button>
    </section>
  </div>
</template>

<style scoped>
.ai-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 16px 28px;
  overflow: hidden;
  color: var(--vp-c-text-1);
}

.ai-clouds {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--ds-gold);
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
}

/* 顶栏 */
.ai-topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 4px;
}
.ai-brand {
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--ds-gold-2);
  text-decoration: none;
  font-size: 18px;
}
.ai-topbar-actions {
  display: flex;
  gap: 8px;
}
.ai-iconbtn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  color: var(--ds-gold-2);
  font-size: 17px;
  cursor: pointer;
  transition: all 0.2s;
}
.ai-iconbtn:hover {
  border-color: var(--ds-gold);
  color: var(--ds-cinnabar);
  transform: translateY(-1px);
}

/* 巨构头部 */
.ai-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 6px;
}
.ai-roof {
  width: 240px;
  max-width: 70vw;
  filter: drop-shadow(0 4px 10px rgba(176, 141, 87, 0.35));
}
.ai-moongate {
  margin-top: -6px;
  width: 168px;
  height: 168px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: radial-gradient(circle at 50% 35%, var(--vp-c-bg-soft), var(--vp-c-bg));
  border: 2px solid var(--ds-gold);
  box-shadow:
    0 0 0 6px var(--vp-c-bg),
    0 0 0 7px var(--ds-gold),
    inset 0 0 24px rgba(176, 141, 87, 0.18);
}
.ai-title {
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 0.14em;
  margin: 0;
  background: linear-gradient(120deg, var(--ds-ink), var(--ds-gold-2));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dark .ai-title {
  background: linear-gradient(120deg, #f3ead6, var(--ds-gold));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ai-sub {
  margin: 6px 0 0;
  font-size: 12.5px;
  letter-spacing: 0.18em;
  color: var(--vp-c-text-3);
}
.ai-seal {
  position: absolute;
  top: 6px;
  right: calc(50% - 120px);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ds-cinnabar);
  color: #fff8ec;
  font-size: 24px;
  font-weight: 700;
  border-radius: 6px;
  transform: rotate(8deg);
  box-shadow: 0 4px 12px rgba(158, 43, 37, 0.4);
}

/* 设置面板 */
.ai-settings {
  position: relative;
  z-index: 2;
  margin: 14px auto 0;
  width: min(560px, 100%);
  padding: 16px 18px;
  border: 1px solid var(--ds-gold);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 10px 30px -14px rgba(0, 0, 0, 0.4);
}
.set-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.set-row label {
  font-size: 12.5px;
  letter-spacing: 0.08em;
  color: var(--ds-gold-2);
}
.set-row input,
.set-model select,
.set-model input {
  padding: 9px 11px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-family: inherit;
}
.set-model {
  display: flex;
  gap: 8px;
}
.set-model select,
.set-model input {
  flex: 1;
}
.ai-mini {
  padding: 0 14px;
  border: 1px solid var(--ds-gold);
  border-radius: 8px;
  background: transparent;
  color: var(--ds-gold-2);
  cursor: pointer;
  font-size: 13px;
}
.ai-mini:hover {
  background: var(--vp-c-brand-soft);
}
.set-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.set-hint {
  font-size: 12.5px;
  color: var(--vp-c-text-3);
}
.set-hint.warn {
  color: var(--ds-cinnabar);
}
.ai-save {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--ds-gold), var(--ds-gold-3));
  color: #fff8ec;
  cursor: pointer;
  font-size: 14px;
  letter-spacing: 0.06em;
}
.ai-save:hover {
  filter: brightness(1.05);
}

/* 门禁 */
.ai-gate {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}
.gate-card {
  width: min(420px, 100%);
  padding: 34px 30px 30px;
  text-align: center;
  background: linear-gradient(180deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  border: 2px solid var(--ds-gold);
  border-radius: 14px;
  box-shadow:
    0 0 0 6px var(--vp-c-bg),
    0 0 0 7px var(--vp-c-border),
    0 18px 40px -18px rgba(0, 0, 0, 0.5);
}
.gate-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 14px;
  background: var(--ds-cinnabar);
  color: #fff8ec;
  font-size: 30px;
  font-weight: 700;
  border-radius: 8px;
  transform: rotate(-6deg);
  box-shadow: 0 6px 16px rgba(158, 43, 37, 0.4);
}
.gate-q {
  margin: 0;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: var(--vp-c-text-1);
}
.gate-hint {
  margin: 8px 0 20px;
  font-size: 13px;
  letter-spacing: 0.14em;
  color: var(--vp-c-text-3);
}
.gate-row {
  display: flex;
  gap: 10px;
}
.gate-row input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 9px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 15px;
  font-family: inherit;
}
.gate-row input:focus {
  outline: none;
  border-color: var(--ds-gold);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}
.gate-btn {
  padding: 0 22px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--ds-gold), var(--ds-gold-3));
  color: #fff8ec;
  font-size: 15px;
  letter-spacing: 0.1em;
  cursor: pointer;
}
.gate-btn:hover {
  filter: brightness(1.06);
}
.gate-error {
  margin: 16px 0 0;
  font-size: 14.5px;
  color: var(--ds-cinnabar);
  min-height: 1.2em;
}

/* 聊天 */
.ai-chat {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: 18px;
  min-height: 0;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 320px);
}
.chat-empty {
  text-align: center;
  color: var(--vp-c-text-3);
  letter-spacing: 0.1em;
  margin-top: 40px;
}
.msg {
  display: flex;
}
.msg.user {
  justify-content: flex-end;
}
.msg.assistant {
  justify-content: flex-start;
}
.msg-bubble {
  max-width: 78%;
  padding: 11px 15px;
  border-radius: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
}
.msg.user .msg-bubble {
  background: linear-gradient(135deg, var(--ds-gold), var(--ds-gold-3));
  color: #fff8ec;
  border-bottom-right-radius: 4px;
}
.msg.assistant .msg-bubble {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  border-bottom-left-radius: 4px;
}
.msg-bubble.typing {
  color: var(--vp-c-text-3);
  letter-spacing: 0.2em;
}
.chat-error {
  margin: 6px 4px;
  font-size: 13.5px;
  color: var(--ds-cinnabar);
}
.chat-input {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid var(--ds-gold);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.chat-input textarea {
  flex: 1;
  resize: none;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 15px;
  font-family: inherit;
  line-height: 1.6;
  max-height: 120px;
  padding: 6px 4px;
}
.chat-input textarea:focus {
  outline: none;
}
.send-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--ds-gold), var(--ds-gold-3));
  color: #fff8ec;
  font-size: 15px;
  letter-spacing: 0.12em;
  cursor: pointer;
}
.send-btn:hover:not(:disabled) {
  filter: brightness(1.06);
}
.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.clear-btn {
  align-self: flex-end;
  margin-top: 8px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 12.5px;
  letter-spacing: 0.08em;
  cursor: pointer;
}
.clear-btn:hover {
  color: var(--ds-cinnabar);
}

/* 过渡 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: all 0.28s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
