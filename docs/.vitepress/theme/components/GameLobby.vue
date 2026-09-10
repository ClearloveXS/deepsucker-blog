<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, triggerRef } from 'vue'
import { useRouter } from 'vitepress'
import { Room } from '../multiplayer/room.js'
import { wsUrl } from '../multiplayer/transport.js'
import { BIRD_COLORS, loadNick, saveNick } from '../multiplayer/presence.js'
import { scanGames } from '../games/manifest'

const router = useRouter()

// 4 位房间码，去掉 O/0/I/1 防混淆
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

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

// 游戏卡由 manifest 自动扫描得到（AGENTS.md §8.3）：新增游戏只需丢 manifest.json
const games = scanGames()

function clearConnectTimer() {
  if (connectTimer) {
    clearTimeout(connectTimer)
    connectTimer = null
  }
}

const joinCode = ref('')
const joinErr = ref('')

function joinRoom() {
  const c = joinCode.value.trim().toUpperCase()
  if (!/^[A-Z2-9]{4}$/.test(c)) {
    joinErr.value = '房间码是 4 位大写字母/数字（不含 0、1）'
    return
  }
  if (c === code.value) {
    joinErr.value = '你已经在这个房间里了'
    return
  }
  joinErr.value = ''
  router.go(`/games?room=${c}`)
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
    triggerRef(room)
    if (st.phase === 'countdown') {
      // 我选的游戏决定跳哪个游戏页（manifest.route）
      const target = games.find(g => g.id === me.value?.pick)
      router.go((target ? target.route : '/games/flappy') + '?room=' + code.value)
    }
  })
  r.connect()
  connectTimer = setTimeout(() => {
    if (!connected.value) connectFailed.value = true
  }, 5000)
}

function retry() {
  connectFailed.value = false
  createRoom()
}

onMounted(() => {
  const fromUrl = codeFromLocation()
  code.value = fromUrl || randomCode()
  if (!fromUrl) router.go(`/games?room=${code.value}`)
  createRoom()
  loadLeaderboard()
})
onBeforeUnmount(() => {
  if (room.value) room.value.close()
})

const me = computed(() => (room.value ? room.value.me : null))
const myId = computed(() => (room.value ? room.value.id : ''))
const players = computed(() => (room.value ? room.value.state.players : []))
const myPick = computed(() => (me.value ? me.value.pick : ''))
const iReady = computed(() => !!(me.value && me.value.ready))
const iPicked = (game: { id: string }) => myPick.value === game.id
const pickedBy = (game: { id: string }) => players.value.filter(p => p.pick === game.id)

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
  if (players.value.length === 1) {
    return myPick.value ? '点下方"开始游戏"按钮即可开局' : '点上方预览图选游戏'
  }
  const pending = players.value.filter(p => !p.pick || !p.ready).length
  return pending ? `等待 ${pending} 人选择并确认` : '全员就绪'
})

const isSolo = computed(() => players.value.length <= 1)

function onNickChange() {
  const n = nick.value.trim().slice(0, 16)
  if (!n) return
  nick.value = n
  saveNick(n)
  if (room.value) room.value.setNick(n)
}

function onCardClick(game: { id: string }) {
  if (!room.value || !me.value || iPicked(game)) return
  room.value.pick(game.id)
}

function onConfirm() {
  if (room.value && myPick.value && !iReady.value) room.value.ready()
}

function copyCode() {
  try {
    const url = window.location.origin + window.location.pathname + '?room=' + code.value
    navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => (copied.value = false), 1200)
  } catch {
    /* 剪贴板不可用就算了 */
  }
}

const lbRows = ref([])

function fmtTime(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function loadLeaderboard() {
  try {
    const httpBase = wsUrl().replace(/^ws/, 'http')
    const res = await fetch(httpBase + '/top')
    if (!res.ok) return
    const data = await res.json()
    lbRows.value = Array.isArray(data.rows) ? data.rows : []
  } catch {
    /* 排行榜拉不到不阻塞大厅 */
  }
}
</script>

<template>
  <div class="lobby">
    <div class="lobby-head">
      <div class="room-box">
        <span class="room-label">房间码</span>
        <span class="room-code">{{ code }}</span>
        <button class="copy-btn" @click="copyCode">{{ copied ? '已复制链接' : '复制邀请链接' }}</button>
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

    <div class="join-row">
      <input
        v-model="joinCode"
        class="join-input"
        maxlength="4"
        placeholder="输入好友的房间码加入"
        @keyup.enter="joinRoom"
      />
      <button class="join-btn" @click="joinRoom">加入</button>
    </div>
    <p v-if="joinErr" class="join-err">{{ joinErr }}</p>

    <p class="status">{{ status }}</p>
    <button v-if="connectFailed" class="retry-btn" @click="retry">重试连接</button>

    <div class="cards">
      <div v-for="game in games" :key="game.id" class="card">
        <div class="preview" :class="{ picked: iPicked(game) }" @click="onCardClick(game)">
          <img :src="game.preview" :alt="game.name + ' 预览图'" />
          <span v-if="pickedBy(game).length" class="pick-badge">
            {{ pickedBy(game).map(p => p.name).join('、') }} 已选择
          </span>
          <span v-if="!iPicked(game)" class="hover-hint">点击选择</span>
        </div>
        <div class="card-body">
          <div class="card-title">
            <h3>{{ game.name }}</h3>
            <p>{{ game.tagline }}</p>
          </div>
          <div class="confirm-row">
            <button
              v-if="iPicked(game) && !iReady"
              class="confirm-btn"
              :title="isSolo ? '开始游戏（单机立即开始）' : '确认开始'"
              @click="onConfirm"
            >{{ isSolo ? '开始' : '✓' }}</button>
            <span v-else-if="iPicked(game) && iReady" class="ready-tag">{{ isSolo ? '即将开始…' : '已确认 · 等其他人' }}</span>
            <span v-else class="pick-hint">点上方预览图选择本局游戏</span>
          </div>
        </div>
      </div>
    </div>

    <div class="seats">
      <div v-for="(p, i) in seats" :key="i" class="seat" :class="{ empty: !p }">
        <span class="seat-dot" :style="p ? { background: BIRD_COLORS[p.color] } : {}"></span>
        <span class="seat-name">{{ p ? p.name + (p.id === myId ? '（你）' : '') : '空位' }}</span>
      </div>
    </div>

    <div class="lb">
      <h3 class="lb-title">排行榜 · Top10</h3>
      <p v-if="!lbRows.length" class="lb-empty">还没有人上榜，打一局抢个第一</p>
      <ol v-else class="lb-list">
        <li v-for="(r, i) in lbRows" :key="i" class="lb-item">
          <span class="lb-rank" :class="{ g1: i === 0, g2: i === 1, g3: i === 2 }">{{ i + 1 }}</span>
          <span class="lb-name">{{ r.n }}</span>
          <span class="lb-score">{{ r.s }} 分</span>
          <span class="lb-time">{{ fmtTime(r.ts) }}</span>
        </li>
      </ol>
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

.cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.join-row {
  display: flex;
  gap: 10px;
}

.join-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid var(--ds-hairline);
  background: var(--ds-glass);
  color: var(--vp-c-text-1);
  outline: none;
  letter-spacing: 2px;
}

.join-input:focus {
  border-color: var(--ds-hairline-strong);
}

.join-btn {
  padding: 10px 22px;
  font-size: 14px;
  border-radius: 10px;
  border: none;
  color: #fff;
  background: var(--ds-grad);
  cursor: pointer;
  flex-shrink: 0;
}

.join-btn:hover {
  transform: translateY(-1px);
}

.join-err {
  margin: -6px 0 0;
  font-size: 12px;
  color: #f87171;
}

.lb {
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--ds-glass);
  border: 1px solid var(--ds-hairline);
}

.lb-title {
  margin: 0 0 10px;
  font-size: 14px;
  letter-spacing: 1px;
}

.lb-empty {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 6px 0;
}

.lb-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lb-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.lb-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--vp-c-divider);
  color: var(--vp-c-text-1);
  flex-shrink: 0;
}

.lb-rank.g1 { background: #f8d347; color: #3a2c00; }
.lb-rank.g2 { background: #c8cdd6; color: #2b2f36; }
.lb-rank.g3 { background: #d8a06a; color: #3a2410; }

.lb-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lb-score {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.lb-time {
  font-size: 11px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .card-body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
