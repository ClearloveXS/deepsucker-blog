// 房间层：协议状态机 + 时钟同步。
// 时钟：gameTime = Date.now() + clockOffset；offset 用所有带 ts 的消息做 EMA 平滑。
// 事件：on('state'|'w'|'start'|'err'|'open'|'close', cb)

import { Transport, wsUrl } from './transport.js'
import { loadId } from './presence.js'

export class Room {
  constructor(code, { nick } = {}) {
    this.code = String(code).toUpperCase()
    this.id = loadId()
    this.nick = nick || ''
    this.state = {
      players: [],
      phase: 'lobby',
      seed: 0,
      startAt: 0,
      results: null
    }
    this.clockOffset = 0
    this.connected = false
    this._handlers = {}
    this._pingTimer = null

    this.transport = new Transport(wsUrl() + '/?room=' + this.code, {
      onOpen: () => {
        this.connected = true
        this.join()
        this.emit('open')
      },
      onClose: () => {
        this.connected = false
        this.emit('close')
      },
      onMessage: msg => this.handle(msg)
    })
  }

  on(ev, cb) {
    ;(this._handlers[ev] ||= []).push(cb)
    return this
  }

  emit(ev, payload) {
    const list = this._handlers[ev]
    if (list) for (const cb of list) cb(payload)
  }

  // 任何带 ts 的消息都是时钟样本
  sampleClock(ts) {
    if (typeof ts !== 'number') return
    const off = ts - Date.now()
    if (Math.abs(off) > 5000) return // 异常样本丢弃
    this.clockOffset =
      this.clockOffset === 0
        ? off
        : this.clockOffset + (off - this.clockOffset) * 0.15
  }

  // 当前游戏时钟（ms）
  now() {
    return Date.now() + this.clockOffset
  }

  get me() {
    return this.state.players.find(p => p.id === this.id) || null
  }

  connect() {
    this.transport.connect()
    this._pingTimer = setInterval(() => this.ping(), 2000)
  }

  join() {
    this.transport.send({ t: 'join', id: this.id, name: this.nick })
  }

  setNick(nick) {
    this.nick = nick
    // join 幂等：重发即更新昵称
    if (this.connected) this.join()
  }

  pick(game) {
    this.transport.send({ t: 'pick', game })
  }

  ready() {
    this.transport.send({ t: 'ready', ready: true })
  }

  relobby() {
    this.transport.send({ t: 'relobby' })
  }

  // 10Hz 状态包：y 归一化 0-1
  sendState(y, v, s, a) {
    this.transport.send({ t: 's', y, v, s, a })
  }

  ping() {
    this.transport.send({ t: 'ping', ts: Date.now() })
  }

  close() {
    if (this._pingTimer) clearInterval(this._pingTimer)
    this.transport.close()
  }

  handle(msg) {
    if (typeof msg.ts === 'number') this.sampleClock(msg.ts)
    switch (msg.t) {
      case 'state':
        this.state = {
          players: msg.players || [],
          phase: msg.phase || 'lobby',
          seed: msg.seed || 0,
          startAt: msg.startAt || 0,
          results: msg.results || null
        }
        this.emit('state', this.state)
        break
      case 'start':
        this.state.seed = msg.seed
        this.state.startAt = msg.at
        this.emit('start', { seed: msg.seed, at: msg.at })
        break
      case 'w':
        this.emit('w', msg.p || [])
        break
      case 'pong':
        this.sampleClock(msg.ts)
        break
      case 'reject':
        this.emit('err', msg.reason || 'unknown')
        break
      default:
        break
    }
  }
}
