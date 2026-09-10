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
const boom = ref(false) // 服务端关房（5 分钟无活跃）广播
const gotState = ref(false) // 是否已收到首个状态包（防止连接空窗期误显示大厅提示）
const subtitleOn = ref(false) // 死亡飘字（爆炸后飘过一次）
let sentLoaded = false // 本轮 sync 是否已上报就绪（避免每条 state 都重发）
let subTimer = null
const tick = ref(0)

// 延迟（ms）：读心跳 tick 触发重算，0 = 还没测出来
const latency = computed(() => {
  void tick.value
  return room.value ? room.value.latency : 0
})
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

// 死亡后飘过一行字幕（爆炸动画放完再飘）
watch(dead, d => {
  if (subTimer) {
    clearTimeout(subTimer)
    subTimer = null
  }
  if (d) {
    subTimer = setTimeout(() => {
      subtitleOn.value = true
      // 飘完自动收起（动画 7s）
      subTimer = setTimeout(() => (subtitleOn.value = false), 7000)
    }, 900)
  } else {
    subtitleOn.value = false
  }
})

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

// sync 阶段还有几人没加载好
const syncPending = computed(() => {
  void tick.value
  if (!room.value || !room.value.state.players) return 0
  return room.value.state.players.filter(p => !p.loaded).length
})

// 延迟分级：<100 绿、<250 黄、其余红
const pingLevel = computed(() => {
  const l = latency.value
  if (!l) return 'ping-unknown'
  return l < 100 ? 'ping-good' : l < 250 ? 'ping-ok' : 'ping-bad'
})

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
  gotState.value = true
  phase.value = st.phase
  // sync 阶段：游戏页已就绪 → 上报一次，全员就绪后服务端才统一开始倒计时
  if (st.phase === 'sync') {
    if (!sentLoaded) {
      sentLoaded = true
      room.value?.loaded()
    }
  } else {
    sentLoaded = false
  }
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
  }
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

// 退出本房间，回大厅并自动开始随机匹配（?match=1 触发大厅自动匹配）
function goMatch() {
  if (room.value) room.value.close()
  router.go('/games?match=1')
}

// 死亡后返回本房间的大厅（保留座位，能看见其他人继续玩）
function goLobby() {
  ctx.goLobby()
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
  r.on('boom', () => {
    // 服务端关房（全员/房主 5 分钟无活跃）：显示爆炸提示并断开连接
    boom.value = true
    if (room.value) room.value.close()
  })
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

        <div v-if="phase === 'sync'" class="overlay waiting syncbox">
          <p v-if="!connected">连接中…</p>
          <p v-else>等待其他玩家加载…<span v-if="syncPending">（还有 {{ syncPending }} 人）</span></p>
        </div>

        <div v-if="phase === 'countdown'" class="overlay countdown">
          <span class="cd-num">{{ countdownNum }}</span>
          <span class="cd-tip">准备起飞</span>
        </div>

        <!-- 右上角延迟 -->
        <div v-if="connected" class="ping-hud" :class="pingLevel">
          {{ latency > 0 ? latency + 'ms' : '—' }}
        </div>

        <!-- 死亡后飘过的字幕 -->
        <div v-if="subtitleOn" class="dead-subtitle">
          你瘫坐在椅子上，仿佛看到自己的小鸟爆炸...
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
          <div class="btn-row">
            <button class="btn" @click="backToLobby">再来一局</button>
            <button class="btn btn-ghost" @click="goMatch">退出并匹配</button>
          </div>
        </div>

        <!-- 服务端关房：5 分钟无活跃，坑位自动爆炸 -->
        <div v-if="boom" class="overlay boombox">
          <span class="boom-emoji">💥</span>
          <p class="boom-text">等太久啦，坑位自动爆炸！</p>
          <p class="boom-sub">请按返回重新开始匹配旗鼓相当的对手</p>
          <button class="btn" @click="goMatch">返回大厅</button>
        </div>

        <div v-if="connected && gotState && phase === 'lobby'" class="overlay waiting">
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
        <button v-if="dead && phase === 'playing'" class="btn-mini" @click="goLobby">返回大厅</button>
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

/* sync 等待：全员加载就绪才倒计时 */
.syncbox {
  background: rgba(14, 12, 26, 0.6);
}

.syncbox p {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

/* 右上角延迟 */
.ping-hud {
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  background: rgba(15, 14, 26, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  pointer-events: none;
}

.ping-good { color: #4ade80; }
.ping-ok { color: #fbbf24; }
.ping-bad { color: #f87171; }
.ping-unknown { color: rgba(255, 255, 255, 0.5); }

/* 死亡字幕：从右往左飘过一次 */
.dead-subtitle {
  position: absolute;
  top: 34%;
  left: 0;
  right: 0;
  white-space: nowrap;
  text-align: center;
  font-size: 15px;
  letter-spacing: 1px;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
  pointer-events: none;
  animation: subtitle-fly 7s linear forwards;
}

@keyframes subtitle-fly {
  0% { transform: translateX(110%); opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translateX(-110%); opacity: 0; }
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

/* 结算面板双按钮行 */
.btn-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--ds-hairline-strong);
  box-shadow: none;
}

/* 坑位爆炸 overlay */
.boombox {
  z-index: 10;
  gap: 12px;
}

.boom-emoji {
  font-size: 56px;
  line-height: 1;
}

.boom-text {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #fca5a5;
}

.boom-sub {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

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

/* 死亡后返回大厅的小按钮 */
.btn-mini {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid var(--ds-hairline-strong);
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.btn-mini:hover {
  border-color: var(--ds-grad);
}
</style>
