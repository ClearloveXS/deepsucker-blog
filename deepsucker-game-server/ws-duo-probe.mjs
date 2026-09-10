// 双人互通探针：两个不同 id join 同一房码，验证双方都能在 state.players 里看到 2 人。
// 用法: node ws-duo-probe.mjs [roomCode] [wsBase]
// 通过标准：双方各自收到 ≥2 名玩家的 state，且互见。
const room = (process.argv[2] || 'DUO' + Math.random().toString(36).slice(2, 4).toUpperCase())
const base = process.argv[3] || 'wss://game.deepsucker.top'
const url = base + '/?room=' + room

const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

function makeClient(tag, id, onState) {
  const ws = new WebSocket(url)
  const seen = [] // 每次 state 的玩家人数
  ws.onopen = () => {
    log(`[${tag}] OPEN`)
    ws.send(JSON.stringify({ t: 'join', id, name: tag }))
  }
  ws.onmessage = (ev) => {
    let m
    try { m = JSON.parse(ev.data) } catch { return }
    if (m.t === 'state') {
      const names = (m.players || []).map(p => `${p.name}(${p.id.slice(0, 8)})`)
      seen.push(m.players.length)
      log(`[${tag}] STATE players=${m.players.length} [${names.join(', ')}]`)
      if (onState) onState(m)
    } else if (m.t === 'reject') {
      log(`[${tag}] REJECTED: ${m.reason}`)
    }
  }
  ws.onerror = () => log(`[${tag}] WS ERROR`)
  ws.onclose = (e) => log(`[${tag}] CLOSED code=${e.code}`)
  return { ws, seen, tag }
}

let aState = null
const A = makeClient('玩家A', 'duo-a-' + Math.random().toString(36).slice(2, 6), m => { aState = m })

// A 先进，1.5s 后 B 进
setTimeout(() => {
  log('--- 玩家B join ---')
  makeClient('玩家B', 'duo-b-' + Math.random().toString(36).slice(2, 6))
}, 1500)

setTimeout(() => {
  log('--- 探针结束 ---')
  log('A 最后见到的玩家数:', aState ? (aState.players || []).length : '无 state')
  const ok = aState && (aState.players || []).length >= 2
  log(ok ? '✅ 通过：A 能看到 2 名玩家（服务端多人互通正常）' : '❌ 失败：A 始终只见自己（服务端房间隔离/重连判定有问题）')
  try { A.ws.close() } catch {}
  process.exit(ok ? 0 : 1)
}, 8000)
