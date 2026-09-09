<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vitepress'
import { Room } from '../multiplayer/room.js'
import { RemoteBird } from '../multiplayer/sync.js'
import { BIRD_COLORS, loadNick } from '../multiplayer/presence.js'
import { G, newBird, stepBird, ensurePipes, pipeX } from '../multiplayer/game.js'

const router = useRouter()

// 房间码：VitePress 的 route 对象不含 query，且 SSR 阶段没有 window
// → 只能在 onMounted（浏览器）里从 location.search 取，故用 ref 而非顶层常量
const code = ref('')

const canvasRef = ref(null)
const room = ref(null)
const connected = ref(false)
const err = ref('')
const phase = ref('lobby')
const startAt = ref(0)
const seed = ref(0)
const score = ref(0)
const iDead = ref(false)
const results = ref([])
const tick = ref(0)
const sawGame = ref(false)
const connectFailed = ref(false)

let ctxRef = null
// 渐变缓存：坐标只依赖 G 常量，建一次复用。
// 原先每帧新建 ~8 个渐变对象（144fps 下每秒 ~1100 个），纯 GC 压力。
let skyGrad = null
let glow1Grad = null
let glow2Grad = null
let pipeGrad = null
let raf = 0
let tickTimer = 0
let bird = newBird()
let lastT = null
let acc = 0
let lastSend = 0
// 大厅静态帧标记：大厅画面不变，只在进入时画一帧，避免每帧全场景重绘
let lobbyNeedsDraw = true
const pipes = []
const remotes = new Map()
let connectTimer = null

function clearConnectTimer() {
  if (connectTimer) {
    clearTimeout(connectTimer)
    connectTimer = null
  }
}

const myId = computed(() => (room.value ? room.value.id : ''))
const meColor = computed(() => {
  const me = room.value ? room.value.me : null
  return me ? me.color : 0
})

const countdownNum = computed(() => {
  // 读一下 10Hz 心跳 tick，否则 startAt-now 的变化不触发重算，倒计时数字会冻结
  void tick.value
  if (phase.value !== 'countdown' || !room.value) return 3
  const remain = startAt.value - room.value.now()
  return Math.min(3, Math.max(1, Math.ceil(remain / 1000)))
})

function resetLocal() {
  bird = newBird()
  iDead.value = false
  score.value = 0
  pipes.length = 0
  acc = 0
  lastT = null
  lastSend = 0
  for (const rb of remotes.values()) rb.reset()
}

function frame() {
  raf = requestAnimationFrame(frame)
  if (!room.value) return
  const t = room.value.now()
  // 大厅阶段画面是静态的（无管道无飞行），只画一帧背景；
  // 高刷屏（144Hz）下原来每帧全场景重绘 = 纯空转耗电
  if (phase.value === 'lobby') {
    if (lobbyNeedsDraw) {
      render(t)
      lobbyNeedsDraw = false
    }
    return
  }
  lobbyNeedsDraw = true
  if (phase.value === 'playing') {
    if (lastT === null) lastT = t
    let dtMs = t - lastT
    if (dtMs < 0) dtMs = 0
    if (dtMs > 250) dtMs = 250
    lastT = t
    acc += dtMs
    while (acc >= G.STEP_MS) {
      const st = t - acc
      const ev = stepBird(bird, G.STEP_MS / 1000, st, startAt.value, pipes)
      if (ev.scored) score.value++
      if (ev.died) iDead.value = true
      acc -= G.STEP_MS
    }
    ensurePipes(pipes, seed.value, t, startAt.value)
    if (t - lastSend >= G.SEND_MS) {
      lastSend = t
      room.value.sendState(bird.y / G.H, bird.v, score.value, bird.alive)
    }
  }
  render(t)
}

function flap() {
  if (!room.value) return
  const t = room.value.now()
  if (phase.value === 'playing' && bird.alive && t >= startAt.value) {
    bird.v = G.FLAP_V
  }
}

function onKey(e) {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault()
    flap()
  }
}

function onState(st) {
  phase.value = st.phase
  startAt.value = st.startAt
  seed.value = st.seed
  if (st.phase === 'playing') {
    sawGame.value = true
    resetLocal()
    // 物理从 startAt 精确开始（状态包可能晚几十 ms 到达）
    lastT = st.startAt
  }
  if (st.phase === 'ended') {
    sawGame.value = true
    results.value = (st.results || [])
      .map(r => {
        const p = st.players.find(pl => pl.id === r.id)
        return {
          id: r.id,
          name: p ? p.name : '未知',
          color: p ? p.color : 0,
          s: r.s
        }
      })
      .sort((a, b) => b.s - a.s)
  }
  if (st.phase === 'lobby') {
    for (const rb of remotes.values()) rb.reset()
  }
}

function onW(list) {
  if (!room.value) return
  const t = room.value.now()
  for (const p of list) {
    let rb = remotes.get(p.id)
    if (!rb) {
      rb = new RemoteBird()
      remotes.set(p.id, rb)
    }
    rb.push(t, p.y, p.v)
  }
  const ids = new Set(room.value.state.players.map(p => p.id))
  for (const id of [...remotes.keys()]) {
    if (!ids.has(id)) remotes.delete(id)
  }
}

function goLobby() {
  router.go(`/games?room=${code.value}`)
}

function backToLobby() {
  if (room.value) room.value.relobby()
  setTimeout(goLobby, 400)
}

// 结算 8s 后服务端自动回大厅；若用户还停在游戏页，跟回去
watch(
  () => phase.value,
  ph => {
    if (ph === 'lobby' && sawGame.value && connected.value) {
      setTimeout(goLobby, 600)
    }
  }
)

function drawBird(ctx, x, y, color, alpha, t, v) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  const tilt = Math.max(-0.5, Math.min(0.9, v / 600))
  ctx.rotate(tilt)
  // 身体
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, G.BIRD_R, 0, Math.PI * 2)
  ctx.fill()
  // 翅膀（随时间扇动）
  const wing = Math.sin(t / 70) * 4
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.ellipse(-5, 2 + wing * 0.3, 8, 5, -0.3 + wing * 0.05, 0, Math.PI * 2)
  ctx.fill()
  // 眼睛
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(6, -5, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(7.5, -5, 2, 0, Math.PI * 2)
  ctx.fill()
  // 嘴
  ctx.fillStyle = '#ff9f43'
  ctx.beginPath()
  ctx.moveTo(12, 0)
  ctx.lineTo(24, 3)
  ctx.lineTo(12, 8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawPipe(ctx, x, y, h, isTop) {
  if (h <= 0) return
  // 管体渐变已缓存（0→PIPE_W），这里平移坐标系对齐管子位置，避免每帧新建渐变
  ctx.save()
  ctx.translate(x, 0)
  ctx.fillStyle = pipeGrad
  ctx.fillRect(0, y, G.PIPE_W, h)
  // 管口
  const capH = 14
  const capY = isTop ? y + h - capH : y
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(-4, capY, G.PIPE_W + 8, capH)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1
  ctx.strokeRect(-4, capY, G.PIPE_W + 8, capH)
  ctx.restore()
}

function render(t) {
  const ctx = ctxRef
  if (!ctx) return
  // 天空 / 极光光斑：渐变已缓存（见 setupCanvas），不再每帧新建
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, G.W, G.H)
  ctx.fillStyle = glow1Grad
  ctx.fillRect(0, 0, G.W, G.H)
  ctx.fillStyle = glow2Grad
  ctx.fillRect(0, 0, G.W, G.H)

  // 管道
  for (const p of pipes) {
    const x = pipeX(p.i, t, startAt.value)
    if (x > G.W + 10 || x + G.PIPE_W < -10) continue
    const topH = p.gapY - G.PIPE_GAP / 2
    const botY = p.gapY + G.PIPE_GAP / 2
    drawPipe(ctx, x, 0, topH, true)
    drawPipe(ctx, x, botY, G.H - G.GROUND_H - botY, false)
  }

  // 地面
  ctx.fillStyle = '#0e0c1a'
  ctx.fillRect(0, G.H - G.GROUND_H, G.W, G.GROUND_H)
  ctx.fillStyle = 'rgba(124,92,255,0.55)'
  ctx.fillRect(0, G.H - G.GROUND_H, G.W, 2)

  // 远端鸟（虚：半透明 + 名字）
  if (room.value) {
    for (const [id, rb] of remotes) {
      const y = rb.sample(t)
      if (y == null) continue
      const p = room.value.state.players.find(pl => pl.id === id)
      const color = BIRD_COLORS[p ? p.color : 0]
      drawBird(ctx, G.BIRD_X, y * G.H, color, 0.45, t, 0)
      if (p) {
        ctx.save()
        ctx.globalAlpha = 0.55
        ctx.font = '10px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = color
        ctx.fillText(p.name, G.BIRD_X, y * G.H - G.BIRD_R - 8)
        ctx.restore()
      }
    }
  }

  // 本地鸟（实）
  drawBird(ctx, G.BIRD_X, bird.y, BIRD_COLORS[meColor.value], bird.alive ? 1 : 0.55, t, bird.v)

  // 分数
  if (phase.value === 'playing' || phase.value === 'ended') {
    ctx.font = '700 48px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillText(String(score.value), G.W / 2, 72)
  }
}

function setupCanvas() {
  const cv = canvasRef.value
  if (!cv) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  cv.width = G.W * dpr
  cv.height = G.H * dpr
  const ctx = cv.getContext('2d')
  ctx.scale(dpr, dpr)
  ctxRef = ctx
  // 重建渐变缓存（坐标只依赖 G 常量，与 dpr 无关——ctx 已 scale）
  skyGrad = ctx.createLinearGradient(0, 0, 0, G.H)
  skyGrad.addColorStop(0, '#141225')
  skyGrad.addColorStop(0.6, '#1b1836')
  skyGrad.addColorStop(1, '#241f42')
  glow1Grad = ctx.createRadialGradient(G.W * 0.75, G.H * 0.2, 10, G.W * 0.75, G.H * 0.2, 260)
  glow1Grad.addColorStop(0, 'rgba(255,77,141,0.16)')
  glow1Grad.addColorStop(1, 'rgba(255,77,141,0)')
  glow2Grad = ctx.createRadialGradient(G.W * 0.2, G.H * 0.55, 10, G.W * 0.2, G.H * 0.55, 240)
  glow2Grad.addColorStop(0, 'rgba(34,211,238,0.12)')
  glow2Grad.addColorStop(1, 'rgba(34,211,238,0)')
  pipeGrad = ctx.createLinearGradient(0, 0, G.PIPE_W, 0)
  pipeGrad.addColorStop(0, '#7c5cff')
  pipeGrad.addColorStop(1, '#22d3ee')
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

function reconnect() {
  connectFailed.value = false
  connectRoom()
}

onMounted(() => {
  code.value = (new URLSearchParams(window.location.search).get('room') || '').toUpperCase()
  setupCanvas()
  connectRoom()
  window.addEventListener('keydown', onKey)
  tickTimer = setInterval(() => (tick.value = Date.now()), 100)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(tickTimer)
  window.removeEventListener('keydown', onKey)
  if (room.value) room.value.close()
})
</script>

<template>
  <div class="flappy-wrap">
    <div class="flappy-frame">
      <canvas ref="canvasRef" class="flappy-canvas" @pointerdown="flap"></canvas>

      <div v-if="phase === 'countdown'" class="overlay countdown">
        <span class="cd-num">{{ countdownNum }}</span>
        <span class="cd-tip">准备起飞</span>
      </div>

      <div v-if="phase === 'ended'" class="overlay results">
        <h3>本局结束</h3>
        <ul>
          <li v-for="(r, i) in results" :key="r.id" :class="{ me: r.id === myId }">
            <span class="rank">{{ i + 1 }}</span>
            <span class="dot" :style="{ background: BIRD_COLORS[r.color] }"></span>
            <span class="nm">{{ r.name }}{{ r.id === myId ? '（你）' : '' }}</span>
            <span class="sc">{{ r.s }}</span>
          </li>
        </ul>
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
          <button class="btn" @click="reconnect">重试连接</button>
        </template>
      </div>

      <div v-if="err" class="overlay errbox">
        <p>{{ err }}</p>
      </div>
    </div>

    <div class="flappy-hud">
      <span class="room-tag">房间 {{ code }}</span>
      <span class="hud-tip">点击 / 空格 = 扇翅膀</span>
      <span v-if="iDead" class="dead-tag">你挂了，观战中</span>
    </div>
  </div>
</template>

<style scoped>
.flappy-wrap {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flappy-frame {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--ds-hairline);
  box-shadow: var(--ds-shadow-md);
  background: #141225;
}

.flappy-canvas {
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

.flappy-hud {
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
