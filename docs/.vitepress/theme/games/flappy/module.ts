// Flappy Bird · 四人同屏 —— 纯逻辑模块（零 Vue 依赖，可独立单测）
// 宿主 GameHost 注入 ctx（room / canvas / phase / startAt / seed / results），
// 本模块只实现 4 钩子：init / destroy / onPlayerState / sendPlayerInput。
// 渲染与物理全部在这里，宿主只负责 canvas 元素 + overlay + 生命周期。
import { G, newBird, stepBird, ensurePipes, pipeX } from '../../multiplayer/game.js'
import { RemoteBird } from '../../multiplayer/sync.js'
import { BIRD_COLORS } from '../../multiplayer/presence.js'
import type { GameContext, GameModule, PlayerSample } from '../types'

const BOOM_MS = 700 // 爆炸动画时长
const DEAD_COLOR = '#15151c' // 炸焦后的鸟

export class FlappyModule implements GameModule {
  ctx!: GameContext
  bird = newBird()
  pipes: any[] = []
  remotes = new Map<string, RemoteBird>()
  score = 0
  raf = 0
  lastT: number | null = null
  acc = 0
  lastSend = 0
  lobbyNeedsDraw = true
  lastPhase = 'lobby'
  ctxRef: CanvasRenderingContext2D | null = null
  // 渐变缓存（坐标只依赖 G 常量，建一次复用，避免每帧新建）
  skyGrad: CanvasGradient | null = null
  glow1Grad: CanvasGradient | null = null
  glow2Grad: CanvasGradient | null = null
  pipeGrad: CanvasGradient | null = null
  // 死亡爆炸：boomAt=爆炸起始时刻（房间时钟），particles=碎片方向速度
  boomAt: number | null = null
  boomY = 0
  particles: { dx: number; dy: number; a: number }[] = []

  init(ctx: GameContext): void {
    this.ctx = ctx
    // canvas 在宿主 onMounted 后才就绪（子组件先挂载），首帧惰性 setup
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    for (const rb of this.remotes.values()) rb.reset()
    this.remotes.clear()
  }

  resetLocal() {
    this.bird = newBird()
    this.score = 0
    this.pipes.length = 0
    this.acc = 0
    this.lastT = null
    this.lastSend = 0
    this.boomAt = null
    this.boomY = 0
    this.particles.length = 0
    for (const rb of this.remotes.values()) rb.reset()
    this.ctx.setLocalDead(false)
  }

  // 死亡瞬间炸开：生成一圈碎片，记录爆炸起点
  triggerBoom(t: number) {
    this.boomAt = t
    this.boomY = this.bird.y
    this.particles = []
    const n = 20
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5
      const sp = 80 + Math.random() * 200
      this.particles.push({ dx: Math.cos(ang) * sp, dy: Math.sin(ang) * sp, a: 0.5 + Math.random() * 0.6 })
    }
  }

  // 主循环：读 ctx.phase / ctx.startAt / ctx.seed 驱动物理与渲染
  frame = () => {
    this.raf = requestAnimationFrame(this.frame)
    const room = this.ctx.room
    if (!room) return
    const t = room.now()

    const cv = this.ctx.canvas
    if (cv && !this.ctxRef) this.setupCanvas(cv)
    if (!this.ctxRef) return

    const phase = this.ctx.phase
    if (phase !== this.lastPhase) {
      if (phase === 'playing') {
        this.resetLocal()
        this.lastT = this.ctx.startAt // 物理从 startAt 精确开始
      } else if (phase === 'lobby' || phase === 'sync') {
        for (const rb of this.remotes.values()) rb.reset()
      }
      this.lastPhase = phase
    }

    // 大厅 / sync（全员加载同步）阶段画面静态，只画一帧背景，避免每帧全场景重绘
    if (phase === 'lobby' || phase === 'sync') {
      if (this.lobbyNeedsDraw) {
        this.render(t)
        this.lobbyNeedsDraw = false
      }
      return
    }
    this.lobbyNeedsDraw = true

    if (phase === 'playing') {
      if (this.lastT === null) this.lastT = t
      let dtMs = t - this.lastT
      if (dtMs < 0) dtMs = 0
      if (dtMs > 250) dtMs = 250
      this.lastT = t
      this.acc += dtMs
      while (this.acc >= G.STEP_MS) {
        const st = t - this.acc
        const ev = stepBird(this.bird, G.STEP_MS / 1000, st, this.ctx.startAt, this.pipes)
        if (ev.scored) this.score++
        if (ev.died) {
          this.ctx.setLocalDead(true)
          if (this.boomAt === null) this.triggerBoom(t) // 只炸一次
        }
        this.acc -= G.STEP_MS
      }
      ensurePipes(this.pipes, this.ctx.seed, t, this.ctx.startAt)
      if (t - this.lastSend >= G.SEND_MS) {
        this.lastSend = t
        room.sendState(this.bird.y / G.H, this.bird.v, this.score, this.bird.alive)
      }
    }
    this.render(t)
  }

  onPlayerState(samples: PlayerSample[]): void {
    const room = this.ctx.room
    if (!room) return
    const t = room.now()
    for (const p of samples) {
      let rb = this.remotes.get(p.id)
      if (!rb) {
        rb = new RemoteBird()
        this.remotes.set(p.id, rb)
      }
      rb.push(t, p.y, p.v)
    }
    const ids = new Set(room.state.players.map((x: any) => x.id))
    for (const id of [...this.remotes.keys()]) {
      if (!ids.has(id)) this.remotes.delete(id)
    }
  }

  sendPlayerInput(input: 'flap' | { type: string; [k: string]: any }): void {
    const type = typeof input === 'string' ? input : input.type
    if (type !== 'flap') return
    const room = this.ctx.room
    if (!room) return
    const t = room.now()
    // 只在 playing 且已过 startAt 且自己还活着时才能扇翅膀
    if (this.ctx.phase === 'playing' && this.bird.alive && t >= this.ctx.startAt) {
      this.bird.v = G.FLAP_V
    }
  }

  // ── 渲染相关（原 FlappyGame.vue 的 drawXxx + render，仅改读 ctx 镜像） ──
  setupCanvas(cv: HTMLCanvasElement) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = G.W * dpr
    cv.height = G.H * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    this.ctxRef = ctx
    this.skyGrad = ctx.createLinearGradient(0, 0, 0, G.H)
    this.skyGrad.addColorStop(0, '#141225')
    this.skyGrad.addColorStop(0.6, '#1b1836')
    this.skyGrad.addColorStop(1, '#241f42')
    this.glow1Grad = ctx.createRadialGradient(G.W * 0.75, G.H * 0.2, 10, G.W * 0.75, G.H * 0.2, 260)
    this.glow1Grad.addColorStop(0, 'rgba(255,77,141,0.16)')
    this.glow1Grad.addColorStop(1, 'rgba(255,77,141,0)')
    this.glow2Grad = ctx.createRadialGradient(G.W * 0.2, G.H * 0.55, 10, G.W * 0.2, G.H * 0.55, 240)
    this.glow2Grad.addColorStop(0, 'rgba(34,211,238,0.12)')
    this.glow2Grad.addColorStop(1, 'rgba(34,211,238,0)')
    this.pipeGrad = ctx.createLinearGradient(0, 0, G.PIPE_W, 0)
    this.pipeGrad.addColorStop(0, '#7c5cff')
    this.pipeGrad.addColorStop(1, '#22d3ee')
  }

  drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha: number, t: number, v: number) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    const tilt = Math.max(-0.5, Math.min(0.9, v / 600))
    ctx.rotate(tilt)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0, 0, G.BIRD_R, 0, Math.PI * 2)
    ctx.fill()
    const wing = Math.sin(t / 70) * 4
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.ellipse(-5, 2 + wing * 0.3, 8, 5, -0.3 + wing * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(6, -5, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(7.5, -5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff9f43'
    ctx.beginPath()
    ctx.moveTo(12, 0)
    ctx.lineTo(24, 3)
    ctx.lineTo(12, 8)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  drawName(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, color: string) {
    if (!name) return
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(10, 8, 20, 0.85)'
    ctx.strokeText(name, x, y)
    ctx.fillStyle = color
    ctx.fillText(name, x, y)
  }

  // 爆炸：碎片（带重力）+ 一圈扩散的冲击波
  drawBoom(ctx: CanvasRenderingContext2D, t: number) {
    if (this.boomAt == null) return
    const k = (t - this.boomAt) / BOOM_MS
    if (k < 0 || k > 1) return
    const x = G.BIRD_X
    const y = this.boomY
    const d = (k * BOOM_MS) / 1000
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      ctx.globalAlpha = Math.max(0, 1 - k) * p.a
      ctx.fillStyle = i % 2 === 0 ? '#ff9f43' : '#ff4d8d'
      ctx.beginPath()
      ctx.arc(x + p.dx * d, y + p.dy * d + 420 * d * d, 2 + 4 * (1 - k), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = Math.max(0, 0.7 - k * 0.7)
    ctx.strokeStyle = '#fff3d6'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 8 + k * 52, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // 颜色插值：把鸟从原色渐变到焦黑
  mixColor(a: string, b: string, k: number): string {
    const pa = this.hex2rgb(a)
    const pb = this.hex2rgb(b)
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * k)
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * k)
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * k)
    return `rgb(${r},${g},${bl})`
  }

  hex2rgb(h: string): [number, number, number] {
    if (h && h.startsWith('#')) {
      const s = h.slice(1)
      const v = s.length === 3 ? s.split('').map(c => c + c).join('') : s
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
    }
    return [255, 255, 255]
  }

  drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, isTop: boolean) {
    if (h <= 0) return
    ctx.save()
    ctx.translate(x, 0)
    ctx.fillStyle = this.pipeGrad as CanvasGradient
    ctx.fillRect(0, y, G.PIPE_W, h)
    const capH = 14
    const capY = isTop ? y + h - capH : y
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(-4, capY, G.PIPE_W + 8, capH)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(-4, capY, G.PIPE_W + 8, capH)
    ctx.restore()
  }

  render(t: number) {
    const ctx = this.ctxRef
    if (!ctx) return
    ctx.fillStyle = this.skyGrad as CanvasGradient
    ctx.fillRect(0, 0, G.W, G.H)
    ctx.fillStyle = this.glow1Grad as CanvasGradient
    ctx.fillRect(0, 0, G.W, G.H)
    ctx.fillStyle = this.glow2Grad as CanvasGradient
    ctx.fillRect(0, 0, G.W, G.H)

    for (const p of this.pipes) {
      const x = pipeX(p.i, t, this.ctx.startAt)
      if (x > G.W + 10 || x + G.PIPE_W < -10) continue
      const topH = p.gapY - G.PIPE_GAP / 2
      const botY = p.gapY + G.PIPE_GAP / 2
      this.drawPipe(ctx, x, 0, topH, true)
      this.drawPipe(ctx, x, botY, G.H - G.GROUND_H - botY, false)
    }

    ctx.fillStyle = '#0e0c1a'
    ctx.fillRect(0, G.H - G.GROUND_H, G.W, G.GROUND_H)
    ctx.fillStyle = 'rgba(124,92,255,0.55)'
    ctx.fillRect(0, G.H - G.GROUND_H, G.W, 2)

    const room = this.ctx.room
    if (room) {
      for (const [id, rb] of this.remotes) {
        const y = rb.sample(t)
        if (y == null) continue
        const p = room.state.players.find((pl: any) => pl.id === id)
        const color = BIRD_COLORS[p ? p.color : 0]
        this.drawBird(ctx, G.BIRD_X, y * G.H, color, 0.45, t, 0)
        if (p) {
          ctx.save()
          ctx.globalAlpha = 0.9
          this.drawName(ctx, G.BIRD_X, y * G.H - G.BIRD_R - 8, p.name, color)
          ctx.restore()
        }
      }
    }

    // 本地鸟（实）。逐帧裸读 me，避免 Room.state 整体替换导致的 computed 缓存过期（坑 #11）
    const me = room ? room.me : null
    const myColor = BIRD_COLORS[me ? me.color : 0]
    let birdColor = myColor
    let birdAlpha = this.bird.alive ? 1 : 0.55
    if (this.boomAt != null) {
      const k = (t - this.boomAt) / BOOM_MS
      this.drawBoom(ctx, t)
      // 爆炸过程中渐变成焦黑，炸完就是一只黑鸟
      birdColor = this.mixColor(myColor, DEAD_COLOR, Math.min(1, Math.max(0, k)))
      birdAlpha = this.bird.alive ? 1 : 0.9
    }
    this.drawBird(ctx, G.BIRD_X, this.bird.y, birdColor, birdAlpha, t, this.bird.v)
    if (me && me.name) {
      ctx.save()
      ctx.globalAlpha = this.bird.alive ? 0.9 : 0.5
      this.drawName(ctx, G.BIRD_X, this.bird.y - G.BIRD_R - 8, me.name, myColor)
      ctx.restore()
    }

    if (this.ctx.phase === 'playing' || this.ctx.phase === 'ended') {
      ctx.font = '700 48px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillText(String(this.score), G.W / 2, 72)
    }
  }
}
