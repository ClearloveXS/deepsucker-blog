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

    <!-- 标题 -->
    <header class="ai-header">
      <h1 class="ai-title">灵犀阁</h1>
      <p class="ai-sub">本地问灵 · llamacpp</p>
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
        <button class="send-btn" @click="send" :disabled="loading">发送</button>
      </div>
      <button class="clear-btn" @click="clearChat">清空对话</button>
    </section>
  </div>
</template>

<style scoped>
.ai-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--vp-c-text-1);
}

/* 顶栏 */
.ai-topbar {
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
.ai-brand {
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 15px;
}
.ai-topbar-actions {
  display: flex;
  gap: 6px;
}
.ai-iconbtn {
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
.ai-iconbtn:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

/* 标题 */
.ai-header {
  text-align: center;
  padding: 48px 20px 8px;
}
.ai-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.ai-sub {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

/* 设置面板 */
.ai-settings {
  width: min(560px, calc(100% - 40px));
  margin: 20px auto 0;
  padding: 18px 20px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.set-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.set-row label {
  font-size: 12.5px;
  color: var(--vp-c-text-3);
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
.set-row input:focus,
.set-model select:focus,
.set-model input:focus {
  outline: none;
  border-color: var(--vp-c-text-3);
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
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 13px;
}
.ai-mini:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
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
  color: #b45309;
}
.dark .set-hint.warn {
  color: #f59e0b;
}
.ai-save {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  cursor: pointer;
  font-size: 14px;
}
.ai-save:hover {
  opacity: 0.85;
}

/* 门禁 */
.ai-gate {
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

/* 聊天 */
.ai-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: min(720px, calc(100% - 40px));
  margin: 24px auto 0;
  min-height: 0;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 2px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 340px);
}
.chat-empty {
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 14px;
  margin-top: 48px;
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
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
}
.msg.user .msg-bubble {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  border-bottom-right-radius: 4px;
}
.msg.assistant .msg-bubble {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  border-bottom-left-radius: 4px;
}
.chat-error {
  margin: 6px 2px;
  font-size: 13.5px;
  color: #b45309;
}
.dark .chat-error {
  color: #f59e0b;
}
.chat-input {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}
.chat-input:focus-within {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
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
  padding: 9px 20px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-size: 14px;
  cursor: pointer;
}
.send-btn:hover:not(:disabled) {
  opacity: 0.85;
}
.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.clear-btn {
  align-self: flex-end;
  margin-top: 10px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 12.5px;
  cursor: pointer;
}
.clear-btn:hover {
  color: var(--vp-c-text-1);
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
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
