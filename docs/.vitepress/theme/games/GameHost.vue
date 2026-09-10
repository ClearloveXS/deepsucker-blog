<script setup lang="ts">
// 通用游戏宿主（AGENTS.md §8.1 / §8.4 第 1 步）
// 负责：Room 连接与心跳、provide gameCtx、转发 onPlayerState / sendPlayerInput、
// phase 路由衔接（countdown→playing→ended→lobby）、结算/倒计时 overlay、
// 错误边界、5 秒 WS 重连降级。子游戏只写 4 钩子 + 自身渲染。
import { ref, computed, onMounted, onBeforeUnmount, provide, triggerRef, watch } from 'vue'
import { useRouter } from 'vitepress'
import { Room } from '../multiplayer/room.js'
import { BIRD_COLORS, loadNick } from '../multiplayer/presence.js'
import type { GameContext, GameModule, ResultRow } from './types'

const props = defineProps<{ gameId: string }>()
const router = useRouter()

// ── 响应式状态（宿主维护，提供给子游戏 + 驱动 overlay） ──
const code = ref('')
const room = ref(null)
const connected = ref(false)
const connectFailed = ref(false)
const phase = ref('lobby')
const startAt = ref(0)
const seed = ref(0)
const results = ref<ResultRow[]>([])
const dead = ref(false)
const tick = ref(0)
const err = ref('')
const sawGame = ref(false)
const canvasRef = ref(null)

let currentModule: GameModule | null = null
let connectTimer: ReturnType<typeof setTimeout> | null = null
let tickTimer = 0

function clearConnectTimer() {
  if (connectTimer) {
    clearTimeout(connectTimer)
    connectTimer = null
  }
}

// ── 注入给子游戏的上下文 ──
const ctx: GameContext = {
  get room() {
    return room.value
  },
  get canvas() {
    return canvasRef.value
  },
  router,
  get phase() {
    return phase.value
  },
  get seed() {
    return seed.value
  },
  get startAt() {
    return startAt.value
  },
  get results() {
    return results.value
  },
  get connected() {
    return connected.value
  },
  get connectFailed() {
    return connectFailed.value
  },
  get code() {
    return code.value
  },
  registerGameModule(m: GameModule) {
    currentModule = m
  },
  goLobby() {
    router.go(`/games?room=${code.value}`)
  },
  retry() {
    connectFailed.value = false
    connectRoom()
  },
  setLocalDead(d: boolean) {
    dead.value = d
  }
}
provide('gameCtx', ctx)

const myId = computed(() => (room.value ? room.value.id : ''))

const countdownNum = computed(() => {
  // 读一下心跳 tick，否则 startAt-now 的变化不触发重算，倒计时数字会冻结
  void tick.value
  if (phase.value !== 'countdown' || !room.value) return 3
  const remain = startAt.value - room.value.now()
  return Math.min(3, Math.max(1, Math.ceil(remain / 1000)))
})

function onState(st: any) {
  // 关键：Room.handle() 里 this.state = {...} 整体替换普通对象，不经 Vue setter，
  // 必须手动 triggerRef 强制依赖 room 的 computed 刷新（坑 #11）。
  triggerRef(room)
  phase.value = st.phase
  startAt.value = st.startAt
  seed.value = st.seed
  if (st.phase === 'playing' || st.phase === 'ended') sawGame.value = true
  if (st.phase === 'ended') {
    results.value = (st.results || [])
      .map((r: any) => {
        const p = (st.players || []).find((pl: any) => pl.id === r.id)
        return { id: r.id, name: p ? p.name : '未知', color: p ? p.color : 0, s: r.s }
      })
      .sort((a: ResultRow, b: ResultRow) => b.s - a.s)
    // 调试用：结算时拉一次 Top10，立刻显示在结束面板下方（让客户端能验证上报链路）
    fetchTop10()
  }
}

/* 调试用：拉全局 Top10。3 秒后拉第二次（给服务端上报留时间）。 */
const topRows = ref<{ n: string; s: number; ts: number }[]>([])
const topStatus = ref('') // 'loading' | 'ok' | 'err' | 'empty'
let topTimer: any = null
async function fetchTop10() {
  if (topTimer) { clearTimeout(topTimer); topTimer = null }
  try {
    const httpBase = (await import('../multiplayer/transport.js')).wsUrl().replace(/^ws/, 'http')
    const res = await fetch(httpBase + '/top')
    if (!res.ok) {
      topStatus.value = 'err'
      return
    }
    const data = await res.json()
    topRows.value = Array.isArray(data.rows) ? data.rows : []
    topStatus.value = topRows.value.length ? 'ok' : 'empty'
  } catch {
    topStatus.value = 'err'
  }
  // 3 秒后复查（服务端可能晚一点才完成 storage.put）
  topTimer = setTimeout(() => { topStatus.value = 'loading'; fetchTop10() }, 3000)
}

function onW(list: any[]) {
  if (!room.value) return
  const samples = (list || []).map((p: any) => {
    const pl = room.value!.state.players.find((x: any) => x.id === p.id)
    return { id: p.id, y: p.y, v: p.v, s: p.s || 0, a: p.a, color: pl ? pl.color : 0 }
  })
  if (currentModule) currentModule.onPlayerState(samples)
}

function onPrimary() {
  if (currentModule) currentModule.sendPlayerInput('flap')
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault()
    onPrimary()
  }
}

function backToLobby() {
  if (room.value) room.value.relobby()
  setTimeout(() => ctx.goLobby(), 400)
}

function connectRoom() {
  clearConnectTimer()
  connectFailed.value = false
  if (room.value) room.value.close()
  const r = new Room(code.value, { nick: loadNick() })
  room.value = r
  r.on('state', onState)
  r.on('w', onW)
  r.on('open', () => {
    connected.value = true
    connectFailed.value = false
    clearConnectTimer()
  })
  r.on('close', () => (connected.value = false))
  r.on('err', reason => {
    err.value = reason === 'full' ? '房间已满（4 人）' : '连接失败，请刷新重试'
    connectFailed.value = true
    clearConnectTimer()
  })
  r.connect()
  // 5 秒连不上 → 显示「连接失败，点重试」，而不是一直「连接中…」
  connectTimer = setTimeout(() => {
    if (!connected.value) connectFailed.value = true
  }, 5000)
}

// 结算 8s 后服务端自动回大厅；若用户还停在游戏页，跟回去
watch(phase, ph => {
  if (ph === 'lobby' && sawGame.value && connected.value) {
    setTimeout(() => ctx.goLobby(), 600)
  }
})

function colorFor(i: number) {
  return BIRD_COLORS[i] || '#fff'
}

onMounted(() => {
  code.value = (new URLSearchParams(window.location.search).get('room') || '').toUpperCase()
  window.addEventListener('keydown', onKey)
  tickTimer = setInterval(() => (tick.value = Date.now()), 100)
  connectRoom()
})

onBeforeUnmount(() => {
  clearInterval(tickTimer)
  window.removeEventListener('keydown', onKey)
  if (room.value) room.value.close()
  if (currentModule) currentModule.destroy()
})
</script>

<template>
  <ErrorBoundary>
    <div class="ghost-wrap">
      <div class="ghost-frame">
        <canvas ref="canvasRef" class="ghost-canvas" @pointerdown="onPrimary"></canvas>

        <div v-if="phase === 'countdown'" class="overlay countdown">
          <span class="cd-num">{{ countdownNum }}</span>
          <span class="cd-tip">准备起飞</span>
        </div>

        <div v-if="phase === 'ended'" class="overlay results">
          <h3>本局结束</h3>
          <ul>
            <li v-for="(r, i) in results" :key="r.id" :class="{ me: r.id === myId }">
              <span class="rank">{{ i + 1 }}</span>
              <span class="dot" :style="{ background: colorFor(r.color) }"></span>
              <span class="nm">{{ r.name }}{{ r.id === myId ? '（你）' : '' }}</span>
              <span class="sc">{{ r.s }}</span>
            </li>
          </ul>
          <div class="lb-mini">
            <div class="lb-mini-head">排行榜 Top10（调试上报链路）</div>
            <p v-if="topStatus === 'loading'" class="lb-mini-status">拉取中…</p>
            <p v-else-if="topStatus === 'err'" class="lb-mini-status err">拉取失败（/top 接口不可达）</p>
            <p v-else-if="topStatus === 'empty'" class="lb-mini-status empty">排行榜暂无数据（本局分数是否上报了？）</p>
            <ol v-else class="lb-mini-list">
              <li v-for="(r, i) in topRows.slice(0, 5)" :key="i">
                <span class="lm-rank">{{ i + 1 }}</span>
                <span class="lm-name">{{ r.n }}</span>
                <span class="lm-score">{{ r.s }}</span>
              </li>
            </ol>
          </div>
          <button class="btn" @click="backToLobby">回大厅再来一局</button>
        </div>

        <div v-if="connected && phase === 'lobby'" class="overlay waiting">
          <p>当前在大厅中，先选游戏再开局</p>
          <button class="btn" @click="goLobby">去大厅</button>
        </div>

        <div v-if="!connected" class="overlay connecting">
          <p v-if="!connectFailed">连接中…（房间 {{ code }}）</p>
          <template v-else>
            <p>连接失败，请点击重试</p>
            <button class="btn" @click="retry">重试连接</button>
          </template>
        </div>

        <div v-if="err" class="overlay errbox">
          <p>{{ err }}</p>
        </div>

        <!-- 子游戏挂载点：本壳只驱动模块，渲染由宿主 canvas 承载 -->
        <slot />
      </div>

      <div class="ghost-hud">
        <span class="room-tag">房间 {{ code }}</span>
        <span class="hud-tip">点击 / 空格 = 主操作</span>
        <span v-if="dead" class="dead-tag">你挂了，观战中</span>
      </div>
    </div>
  </ErrorBoundary>
</template>

<style scoped>
.ghost-wrap {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ghost-frame {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--ds-hairline);
  box-shadow: var(--ds-shadow-md);
  background: #141225;
}

.ghost-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 3;
  touch-action: manipulation;
  cursor: pointer;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(14, 12, 26, 0.72);
  color: #fff;
  text-align: center;
  padding: 20px;
}

.countdown {
  background: rgba(14, 12, 26, 0.35);
}

.cd-num {
  font-size: 96px;
  font-weight: 800;
  line-height: 1;
  background: var(--ds-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.cd-tip {
  font-size: 14px;
  letter-spacing: 4px;
  color: var(--vp-c-text-2);
}

.results h3 {
  margin: 0 0 6px;
  font-size: 20px;
}

.results ul {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}

.results li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 10px;
  background: var(--ds-glass);
  border: 1px solid var(--ds-hairline);
  font-size: 14px;
}

.results li.me {
  border-color: var(--ds-hairline-strong);
  box-shadow: var(--ds-shadow-glow);
}

.rank {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--vp-c-text-2);
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nm {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc {
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
}

.btn {
  padding: 10px 22px;
  font-size: 14px;
  border-radius: 999px;
  border: none;
  color: #fff;
  background: var(--ds-grad);
  cursor: pointer;
  box-shadow: var(--ds-shadow-glow);
}

.btn:hover {
  transform: translateY(-1px);
}

/* 调试用：结算面板内嵌的 Top10 小面板 */
.lb-mini {
  margin: 14px 0 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(15, 14, 26, 0.4);
  border: 1px dashed rgba(255, 255, 255, 0.18);
  text-align: left;
}
.lb-mini-head {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}
.lb-mini-status {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.lb-mini-status.err { color: #f87171; }
.lb-mini-status.empty { color: #fbbf24; }
.lb-mini-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.lb-mini-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lm-rank { width: 18px; color: var(--vp-c-text-3); }
.lm-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lm-score { font-weight: 700; font-variant-numeric: tabular-nums; }

.waiting p,
.connecting p {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.errbox {
  background: rgba(14, 12, 26, 0.85);
}

.errbox p {
  margin: 0;
  font-size: 14px;
  color: #fca5a5;
}

.ghost-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.room-tag {
  font-family: var(--vp-font-family-mono);
  letter-spacing: 2px;
}

.dead-tag {
  color: #fca5a5;
}
</style>
