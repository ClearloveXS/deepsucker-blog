// 单人开局全链路探针：JOIN → PICK → READY → 观察STATE phase 变化
// 用法: node ws-probe.mjs [roomCode] [wsBase] [ready延迟秒] —— 延迟用于多人同屏测试
const room = (process.argv[2] || 'PRB' + Math.random().toString(36).slice(2, 5).toUpperCase())
const base = process.argv[3] || 'wss://game.deepsucker.top'
const readyDelayMs = (Number(process.argv[4]) || 0) * 1000
const url = base + '/?room=' + room
const id = 'probe-' + Math.random().toString(36).slice(2, 8)

const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

log('connecting', url, 'id=', id)
const ws = new WebSocket(url)

let phase = 'init'
let picked = false
let readied = false

ws.onopen = () => {
  log('OPEN')
  ws.send(JSON.stringify({ t: 'join', id, name: '探针机器人' }))
}
ws.onmessage = (ev) => {
  let m
  try { m = JSON.parse(ev.data) } catch { log('NON-JSON:', String(ev.data).slice(0, 120)); return }
  if (m.t === 'state') {
    const newPhase = m.phase
    const players = (m.players || []).map(p => `${p.name}(pick=${p.pick},ready=${p.ready})`)
    log(`STATE phase=${newPhase} players=[${players.join(', ')}]`)
    if (newPhase !== phase) {
      phase = newPhase
      log(`>>> PHASE: ${phase}`)
      if (phase === 'lobby' && !picked) {
        picked = true
        log('send PICK flappy')
        setTimeout(() => ws.send(JSON.stringify({ t: 'pick', game: 'flappy' })), 200)
      } else if (phase === 'lobby' && picked && !readied) {
        readied = true
        log('send READY true')
        setTimeout(() => ws.send(JSON.stringify({ t: 'ready', ready: true })), 200 + readyDelayMs)
      }
    } else if (phase === 'lobby') {
      // phase 没变但玩家状态可能变了（pick 生效后服务端会重推 state）
      const me = (m.players || []).find(p => p.id === id)
      if (me && me.pick === 'flappy' && !readied) {
        readied = true
        log('me.pick=flappy 生效, send READY true')
        setTimeout(() => ws.send(JSON.stringify({ t: 'ready', ready: true })), 200 + readyDelayMs)
      }
    }
  } else if (m.t === 'start') {
    log(`>>> START seed=${m.seed} at=${m.at} (in ${(m.at - Date.now()) / 1000}s)`)
  } else if (m.t === 'reject') {
    log(`>>> REJECTED: ${m.reason}`)
  } else if (m.t === 'pong') {
    // ignore
  } else {
    log('MSG', JSON.stringify(m).slice(0, 200))
  }
}
ws.onerror = (e) => log('ERROR', e.message || e.type || 'ws error')
ws.onclose = (e) => log('CLOSED code=', e.code, 'reason=', e.reason || '')

setTimeout(() => {
  log('--- probe end (25s), final phase =', phase, '---')
  try { ws.close() } catch {}
  process.exit(0)
}, 25000)
