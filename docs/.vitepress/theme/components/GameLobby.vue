<script setup>
import { ref, computed, onMounted, onBeforeUnmount, triggerRef } from 'vue'
import { useRouter } from 'vitepress'
import { Room } from '../multiplayer/room.js'
import { BIRD_COLORS, loadNick, saveNick } from '../multiplayer/presence.js'

const router = useRouter()

// 4 位房间码，去掉 O/0/I/1 防混淆
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// ⚠️ VitePress 的 useData() 不返回 route（那要 useRoute()），
//    且 route 对象本身也不含 query —— 房间码只能从 window.location.search 读，
//    而 SSR 阶段没有 window，所以必须在 onMounted 里读，不能放 setup 顶层。
function codeFromLocation() {
  if (typeof window === 'undefined') return ''
  return (new URLSearchParams(window.location.search).get('room') || '').toUpperCase()
}

function randomCode() {
  let c = ''
  for (let i = 0; i < 4; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]
  return c
}

const code = ref('')

const nick = ref(loadNick())
const room = ref(null)
const connected = ref(false)
const err = ref('')
const copied = ref(false)
const connectFailed = ref(false)
let connectTimer = null

function clearConnectTimer() {
  if (connectTimer) {
    clearTimeout(connectTimer)
    connectTimer = null
  }
}

function createRoom() {
  clearConnectTimer()
  if (room.value) room.value.close()
  connectFailed.value = false
  const r = new Room(code.value, { nick: nick.value })
  room.value = r
  r.on('open', () => {
    connected.value = true
    err.value = ''
    connectFailed.value = false
    clearConnectTimer()
  })
  r.on('close', () => {
    connected.value = false
  })
  r.on('err', reason => {
    err.value = reason === 'full' ? '房间已满（4 人）' : '连接失败，请刷新重试'
    connectFailed.value = true
    clearConnectTimer()
  })
  r.on('state', st => {
    // 关键：Room.handle() 里是 this.state = {...} 整体替换普通对象，
    // 不经过 Vue 响应式 setter，UI 的 computed（status/me/seats…）不会重算。
    // 必须手动 triggerRef 强制依赖 room 的 computed 全部刷新，
    // 否则 me 永远是 null → 点预览图选游戏被吞 → 开始按钮永远不出现。
    triggerRef(room)
    if (st.phase === 'countdown') router.go(`/games/flappy?room=${code.value}`)
  })
  r.connect()
  // 5 秒连不上 → 显示「连接失败，点重试」，而不是一直「连接中…」
  connectTimer = setTimeout(() => {
    if (!connected.value) connectFailed.value = true
  }, 5000)
}

function retry() {
  connectFailed.value = false
  createRoom()
}

onMounted(() => {
  // 先定房间码：URL 里有的直接用，没有就新生成一个并写回 URL 方便分享
  const fromUrl = codeFromLocation()
  code.value = fromUrl || randomCode()
  if (!fromUrl) router.go(`/games?room=${code.value}`)
  createRoom()
})
onBeforeUnmount(() => {
  if (room.value) room.value.close()
})

const me = computed(() => (room.value ? room.value.me : null))
const myId = computed(() => (room.value ? room.value.id : ''))
const players = computed(() => (room.value ? room.value.state.players : []))
const pickedBy = computed(() => players.value.filter(p => p.pick === 'flappy'))
const iPicked = computed(() => !!(me.value && me.value.pick))
const iReady = computed(() => !!(me.value && me.value.ready))

const seats = computed(() => {
  const out = [null, null, null, null]
  for (const p of players.value) {
    if (p.color >= 0 && p.color < 4) out[p.color] = p
  }
  return out
})

const status = computed(() => {
  if (err.value) return err.value
  if (connectFailed.value) return '连接失败，请点击重试'
  if (!connected.value || !room.value) return '连接中…'
  if (room.value.state.phase === 'countdown') {
    return players.value.length <= 1 ? '单机开打，倒计时开始！' : '全员确认，倒计时开始！'
  }
  if (!players.value.length) return '等待玩家加入…（把房间码发给他们）'
  // 单人模式：选好游戏点开始就行，不需要"等待其他人"
  if (players.value.length === 1) {
    return iPicked.value ? '点下方"开始游戏"按钮即可开局' : '点上方预览图选游戏'
  }
  const pending = players.value.filter(p => p.pick !== 'flappy' || !p.ready).length
  return pending ? `等待 ${pending} 人选择并确认` : '全员就绪'
})

/* 单人模式判定：房内只有 1 个玩家（自己），按钮和文案切到"立即开始" */
const isSolo = computed(() => players.value.length <= 1)

function onNickChange() {
  const n = nick.value.trim().slice(0, 16)
  if (!n) return
  nick.value = n
  saveNick(n)
  if (room.value) room.value.setNick(n)
}

function onCardClick() {
  if (!room.value || !me.value || iPicked.value) return
  room.value.pick('flappy')
}

function onConfirm() {
  if (room.value && iPicked.value && !iReady.value) room.value.ready()
}

function copyCode() {
  try {
    navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1200)
  } catch {
    /* 剪贴板不可用就算了 */
  }
}
</script>

<template>
  <div class="lobby">
    <div class="lobby-head">
      <div class="room-box">
        <span class="room-label">房间码</span>
        <span class="room-code">{{ code }}</span>
        <button class="copy-btn" @click="copyCode">{{ copied ? '已复制' : '复制' }}</button>
      </div>
      <div class="nick-box">
        <input
          v-model="nick"
          class="nick-input"
          maxlength="16"
          placeholder="你的昵称"
          @change="onNickChange"
        />
        <span class="conn-dot" :class="{ on: connected }"></span>
      </div>
    </div>

    <p class="status">{{ status }}</p>
    <button v-if="connectFailed" class="retry-btn" @click="retry">重试连接</button>

    <div class="card">
      <div class="preview" :class="{ picked: iPicked }" @click="onCardClick">
        <img src="/images/games/flappy-bird.svg" alt="Flappy Bird 预览图" />
        <span v-if="pickedBy.length" class="pick-badge">
          {{ pickedBy.map(p => p.name).join('、') }} 已选择
        </span>
        <span v-if="!iPicked" class="hover-hint">点击选择</span>
      </div>
      <div class="card-body">
        <div class="card-title">
          <h3>Flappy Bird · 四人同屏</h3>
          <p>同一片管道，各控一只鸟。自己的鸟是实的，别人的是虚的——谁先撞管谁尴尬。</p>
        </div>
        <div class="confirm-row">
          <button
            v-if="iPicked && !iReady"
            class="confirm-btn"
            :title="isSolo ? '开始游戏（单机立即开始）' : '确认开始'"
            @click="onConfirm"
          >{{ isSolo ? '开始' : '✓' }}</button>
          <span v-else-if="iReady" class="ready-tag">{{ isSolo ? '即将开始…' : '已确认 · 等其他人' }}</span>
          <span v-else class="pick-hint">点上方预览图选择本局游戏</span>
        </div>
      </div>
    </div>

    <div class="seats">
      <div v-for="(p, i) in seats" :key="i" class="seat" :class="{ empty: !p }">
        <span class="seat-dot" :style="p ? { background: BIRD_COLORS[p.color] } : {}"></span>
        <span class="seat-name">{{ p ? p.name + (p.id === myId ? '（你）' : '') : '空位' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.lobby-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.room-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 12px;
  background: var(--ds-glass);
  border: 1px solid var(--ds-hairline);
}

.room-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.room-code {
  font-family: var(--vp-font-family-mono);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 4px;
  background: var(--ds-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.copy-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid var(--ds-hairline);
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.copy-btn:hover {
  border-color: var(--ds-hairline-strong);
}

.nick-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nick-input {
  width: 140px;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid var(--ds-hairline);
  background: var(--ds-glass);
  color: var(--vp-c-text-1);
  outline: none;
}

.nick-input:focus {
  border-color: var(--ds-hairline-strong);
}

.conn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
}

.conn-dot.on {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
}

.status {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  text-align: center;
}

.retry-btn {
  align-self: center;
  padding: 8px 20px;
  font-size: 13px;
  border-radius: 999px;
  border: none;
  color: #fff;
  background: var(--ds-grad, linear-gradient(135deg, #7c5cff, #22d3ee));
  cursor: pointer;
}

.retry-btn:hover {
  transform: translateY(-1px);
}

.card {
  border-radius: 16px;
  overflow: hidden;
  background: var(--ds-glass);
  border: 1px solid var(--ds-hairline);
  box-shadow: var(--ds-shadow-md);
}

.preview {
  position: relative;
  cursor: pointer;
  line-height: 0;
}

.preview img {
  width: 100%;
  display: block;
  transition: transform 0.3s ease;
}

.preview:hover img {
  transform: scale(1.02);
}

.preview.picked {
  outline: 2px solid transparent;
  background:
    linear-gradient(var(--ds-glass), var(--ds-glass)) padding-box,
    var(--ds-grad) border-box;
}

.pick-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(15, 14, 26, 0.75);
  border: 1px solid var(--ds-hairline-strong);
  color: #fff;
}

.hover-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  letter-spacing: 2px;
  color: #fff;
  background: rgba(15, 14, 26, 0.35);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.preview:hover .hover-hint {
  opacity: 1;
}

.card-body {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.card-title h3 {
  margin: 0 0 6px;
  font-size: 17px;
}

.card-title p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.confirm-row {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.confirm-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: var(--ds-grad);
  cursor: pointer;
  box-shadow: var(--ds-shadow-glow);
  transition: transform 0.15s ease;
}

.confirm-btn:hover {
  transform: scale(1.08);
}

.ready-tag,
.pick-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.ready-tag {
  color: #4ade80;
}

.seats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.seat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 12px;
  background: var(--ds-glass);
  border: 1px solid var(--ds-hairline);
}

.seat.empty {
  opacity: 0.45;
  border-style: dashed;
}

.seat-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}

.seat-name {
  font-size: 12px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .card-body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
