// ⚠️ 新版 workerd 里 DurableObject 不再是全局变量，必须显式导入
import { DurableObject } from 'cloudflare:workers'
import type { Env } from './index'
import type { LbEntry } from './Leaderboard'

export interface PlayerState {
  id: string
  name: string
  color: number // 0-3，座位顺序分配
  pick: string | null // 'flappy'
  ready: boolean
  alive: boolean // 当前是否存活（来自最近的 s 包）
  inGame: boolean // 本局是否上过场（发过 s 包）
  lastScore: number
}

export interface RoomState {
  players: Record<string, PlayerState>
  phase: 'lobby' | 'countdown' | 'playing' | 'ended'
  seed: number
  startAt: number // 服务端时间戳，倒计时目标
  results: { id: string; s: number }[] | null
}

const MAX_PLAYERS = 4
const COUNTDOWN_MS = 3500
const AUTO_RELOBBY_MS = 8000

function freshState(): RoomState {
  return { players: {}, phase: 'lobby', seed: 0, startAt: 0, results: null }
}

export class GameRoom extends DurableObject {
  // 内存缓存；休眠（hibernation）后为 null，需从 storage 恢复
  private cache: RoomState | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private async load(): Promise<RoomState> {
    if (this.cache) return this.cache
    const saved = await this.ctx.storage.get<RoomState>('room')
    this.cache = saved ?? freshState()
    return this.cache
  }

  private async save(st: RoomState): Promise<void> {
    await this.ctx.storage.put('room', st)
  }

  private send(ws: WebSocket, msg: unknown): void {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      // 连接可能正在关闭，忽略
    }
  }

  private broadcast(st: RoomState, msg: unknown, except?: WebSocket): void {
    const data = JSON.stringify(msg)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except) this.sendRaw(ws, data)
    }
  }

  private sendRaw(ws: WebSocket, data: string): void {
    try {
      ws.send(data)
    } catch {
      // ignore
    }
  }

  private broadcastState(st: RoomState, except?: WebSocket): void {
    this.broadcast(
      st,
      {
        t: 'state',
        players: Object.values(st.players),
        phase: st.phase,
        seed: st.seed,
        startAt: st.startAt,
        results: st.results,
        ts: Date.now()
      },
      except
    )
  }

  private playerOf(ws: WebSocket, st: RoomState): PlayerState | null {
    const att = ws.deserializeAttachment<{ id?: string }>()
    if (!att?.id) return null
    return st.players[att.id] ?? null
  }

  private assignColor(st: RoomState): number {
    const used = new Set(Object.values(st.players).map(p => p.color))
    for (let i = 0; i < MAX_PLAYERS; i++) {
      if (!used.has(i)) return i
    }
    return 0
  }

  // WS 握手
  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    // ⚠️ 必须 acceptWebSocket（Hibernation API），空闲才能休眠不计费
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ joinedAt: Date.now() })
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const st = await this.load()
    let msg: any
    try {
      msg = typeof message === 'string' ? JSON.parse(message) : null
    } catch {
      return
    }
    if (!msg || typeof msg.t !== 'string') return

    switch (msg.t) {
      case 'join': {
        const id = String(msg.id ?? '').slice(0, 64)
        if (!id) return
        const name = String(msg.name ?? '').trim().slice(0, 16) || '无名氏'
        const existing = st.players[id]
        if (existing) {
          // 重连：保留座位与颜色
          existing.name = name
          existing.alive = true
        } else {
          if (Object.keys(st.players).length >= MAX_PLAYERS) {
            this.send(ws, { t: 'reject', reason: 'full' })
            return
          }
          st.players[id] = {
            id,
            name,
            color: this.assignColor(st),
            pick: null,
            ready: false,
            alive: true,
            inGame: false,
            lastScore: 0
          }
        }
        ws.serializeAttachment({ id, joinedAt: Date.now() })
        await this.save(st)
        this.broadcastState(st)
        this.maybeStart(st)
        break
      }

      case 'pick': {
        const p = this.playerOf(ws, st)
        if (!p) return
        p.pick = msg.game === 'flappy' ? 'flappy' : null
        if (p.pick === null) p.ready = false
        await this.save(st)
        this.broadcastState(st)
        this.maybeStart(st)
        break
      }

      case 'ready': {
        const p = this.playerOf(ws, st)
        if (!p) return
        p.ready = !!msg.ready && p.pick !== null
        await this.save(st)
        this.broadcastState(st)
        this.maybeStart(st)
        break
      }

      case 's': {
        const p = this.playerOf(ws, st)
        if (!p || st.phase !== 'playing') return
        p.alive = !!msg.a
        p.inGame = true
        p.lastScore = Number(msg.s) | 0
        // 合并转发给其他人（不含发送者）
        this.broadcast(
          st,
          { t: 'w', ts: Date.now(), p: [{ id: p.id, y: msg.y, v: msg.v, s: msg.s, a: msg.a }] },
          ws
        )
        // 全员死亡 → 结算
        const inGame = Object.values(st.players).filter(pl => pl.inGame)
        if (inGame.length > 0 && inGame.every(pl => !pl.alive)) {
          st.phase = 'ended'
          st.results = inGame
            .map(pl => ({ id: pl.id, s: pl.lastScore }))
            .sort((a, b) => b.s - a.s)
          await this.save(st)
          this.broadcastState(st)
          this.reportScores(inGame)
          this.ctx.storage.setAlarm(Date.now() + AUTO_RELOBBY_MS)
        }
        break
      }

      case 'relobby': {
        if (st.phase !== 'ended') return
        st.phase = 'lobby'
        st.results = null
        for (const pl of Object.values(st.players)) pl.ready = false
        await this.save(st)
        this.broadcastState(st)
        break
      }

      case 'ping': {
        this.send(ws, { t: 'pong', ts: Date.now() })
        break
      }
    }

    // 兜底：alarm 没触发时（如休眠边界），消息驱动倒计时推进
    if (st.phase === 'countdown' && Date.now() >= st.startAt) {
      this.beginPlay(st)
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const st = await this.load()
    const att = ws.deserializeAttachment<{ id?: string }>()
    if (!att?.id || !st.players[att.id]) return
    // 重连竞争：若同一 id 还有别的活跃连接，则本次 close 是旧连接，忽略
    const stillConnected = this.ctx.getWebSockets().some(w => {
      if (w === ws) return false
      const a = w.deserializeAttachment<{ id?: string }>()
      return a?.id === att.id
    })
    if (stillConnected) return
    delete st.players[att.id]
    await this.save(st)
    this.broadcastState(st)
  }

  // 结算成绩上报全局排行榜（DO 间调用）。错误不吞，console 留痕便于 wrangler tail 排查。
  private reportScores(inGame: PlayerState[]): void {
    const rows: LbEntry[] = inGame
      .filter(pl => pl.lastScore > 0)
      .map(pl => ({ n: pl.name, s: pl.lastScore, ts: Date.now() }))
    if (!rows.length) {
      console.log(`[Leaderboard] ${this.ctx.id.toString()} 无人上报（全部 0 分）`)
      return
    }
    const env = this.env as unknown as Env
    const stub = env.LEADERBOARD.getByName('global')
    stub
      .fetch('https://lb/score', { method: 'POST', body: JSON.stringify(rows) })
      .then(async r => {
        const body = await r.text()
        console.log(`[Leaderboard] POST /score status=${r.status} body="${body}" rows=${rows.length}`)
      })
      .catch(e => console.error('[Leaderboard] POST /score failed:', e))
  }

  // alarm：倒计时到点 / 结算后自动回大厅
  // ⚠️ 新版 workerd 传入 AlarmInvocationInfo 对象（不是裸时间戳），取 scheduledTime
  async alarm(info: AlarmInvocationInfo | number): Promise<void> {
    const ts = typeof info === 'number' ? info : info.scheduledTime
    const st = await this.load()
    if (st.phase === 'countdown' && ts >= st.startAt) {
      this.beginPlay(st)
    } else if (st.phase === 'ended') {
      st.phase = 'lobby'
      st.results = null
      for (const pl of Object.values(st.players)) pl.ready = false
      await this.save(st)
      this.broadcastState(st)
    }
  }

  // 全员（当前在场）已选且已确认 → 倒计时
  private maybeStart(st: RoomState): void {
    if (st.phase !== 'lobby') return
    const all = Object.values(st.players)
    if (all.length === 0) return
    if (!all.every(p => p.pick === 'flappy' && p.ready)) return
    st.phase = 'countdown'
    st.seed = (Math.random() * 0x7fffffff) | 0 // 服务端单点随机，各端用 seed 复现
    st.startAt = Date.now() + COUNTDOWN_MS
    this.save(st)
    this.ctx.storage.setAlarm(st.startAt)
    this.broadcastState(st)
    this.broadcast(st, { t: 'start', seed: st.seed, at: st.startAt })
  }

  private beginPlay(st: RoomState): void {
    st.phase = 'playing'
    st.results = null
    for (const p of Object.values(st.players)) {
      p.alive = true
      p.inGame = false
      p.lastScore = 0
    }
    this.save(st)
    this.broadcastState(st)
  }
}
