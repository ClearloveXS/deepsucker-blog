// 匹配池 + 房间生命周期探针：验证 GET/POST /match 与空闲关房（boom）。
// 用法: node match-probe.mjs [httpBase] [wsBase]
//   httpBase 默认 http://127.0.0.1:8787（wrangler dev --local）
//   wsBase   默认 ws://127.0.0.1:8787
// 通过标准见底部断言。空闲关房验证需把 GameRoom.ts 的 IDLE_CLOSE_MS 临时改小（如 15s）。
import { WebSocket } from 'ws'

const httpBase = process.argv[2] || 'http://127.0.0.1:8787'
const wsBase = process.argv[3] || 'ws://127.0.0.1:8787'

const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

const roomA = 'MPA' + Math.random().toString(36).slice(2, 4).toUpperCase()
const roomB = 'MPB' + Math.random().toString(36).slice(2, 4).toUpperCase()

function getMatch() {
  return fetch(httpBase + '/match').then(r => r.json()).catch(e => ({ err: String(e) }))
}
function postMatch(body) {
  return fetch(httpBase + '/match', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.text()).catch(e => 'ERR:' + e)
}
function join(room, id, name) {
  const ws = new WebSocket(wsBase + '/?room=' + room)
  ws.onopen = () => ws.send(JSON.stringify({ t: 'join', id, name }))
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data) } catch { return }
    if (m.t === 'boom') log(`[${id}] 💥 收到 boom（关房）`)
    if (m.t === 'state') log(`[${id}] STATE players=${m.players.length} phase=${m.phase}`)
  }
  ws.onclose = (e) => log(`[${id}] CLOSED code=${e.code} reason=${e.reason}`)
  ws.onerror = () => log(`[${id}] WS ERROR`)
  return ws
}

const results = { steps: [] }
function check(name, cond) {
  results.steps.push({ name, ok: !!cond })
  log(cond ? `✅ ${name}` : `❌ ${name}`)
}

async function main() {
  // 0) 先清空池（防上轮残留）
  await postMatch({ op: 'remove', code: roomA, playerCount: 0 })
  await postMatch({ op: 'remove', code: roomB, playerCount: 0 })

  // 1) 房 A 两个 WS，房 B 一个 WS
  const a1 = join(roomA, 'a1', 'A1')
  const a2 = join(roomA, 'a2', 'A2')
  const b1 = join(roomB, 'b1', 'B1')
  await new Promise(r => setTimeout(r, 1500))

  const m1 = await getMatch()
  log('GET /match #1:', JSON.stringify(m1))
  const rooms1 = m1.rooms || []
  const counts1 = rooms1.map(r => r.playerCount).sort((a, b) => b - a)
  check('池中有 2 个房（房A=2人、房B=1人）', rooms1.length === 2 && counts1[0] === 2 && counts1[1] === 1)
  check('列表按 playerCount 降序', rooms1.every((r, i, arr) => i === 0 || arr[i - 1].playerCount >= r.playerCount))

  // 2) 房 B 玩家退出 → 池里只剩房 A
  b1.close()
  await new Promise(r => setTimeout(r, 1500))
  const m2 = await getMatch()
  log('GET /match #2:', JSON.stringify(m2))
  const rooms2 = m2.rooms || []
  // 房B 退出了 → 池里应只剩房A（2 人）
  check('房B 退出后不在池（只剩 1 房）', rooms2.length === 1 && rooms2[0].playerCount === 2)

  // 3) 房 A 全员退出 → 池清空
  a1.close(); a2.close()
  await new Promise(r => setTimeout(r, 1500))
  const m3 = await getMatch()
  log('GET /match #3:', JSON.stringify(m3))
  check('全员退出后池为空', !m3.rooms || m3.rooms.length === 0)

  // 4) 空闲关房验证：仅当带 idle 参数且 IDLE_CLOSE_MS 已临时改小时跑。
  //    重新开一房，干等（IDLE_CLOSE_MS 改小后约 60s 巡检触发 boom）。
  const idleTest = process.argv[4] === 'idle'
  if (idleTest) {
    const roomC = 'MPC' + Math.random().toString(36).slice(2, 4).toUpperCase()
    const c1 = join(roomC, 'c1', 'C1')
    await new Promise(r => setTimeout(r, 1500))
    const mc0 = await getMatch()
    const inPool0 = (mc0.rooms || []).some(r => r.code === roomC)
    check('房C 已登记进池（空闲关房前提）', inPool0)

    // 干等超过 IDLE_CLOSE_MS（已临时改小，如 15s），再发一个 ping 触发消息驱动的 closeIfIdle
    const waitMs = process.argv[5] ? Number(process.argv[5]) : 17 * 1000
    log(`等待 ${waitMs / 1000}s 触发空闲关房（IDLE_CLOSE_MS 已临时改小）...`)
    await new Promise(r => setTimeout(r, waitMs))
    c1.send(JSON.stringify({ t: 'ping' })) // 驱动 closeIfIdle（与 alarm 同路径）
    await new Promise(r => setTimeout(r, 1500))
    const mc1 = await getMatch()
    const inPool1 = (mc1.rooms || []).some(r => r.code === roomC)
    check('空闲超时后房C 被移出匹配池（boom）', !inPool1)
    c1.close()
  } else {
    log('（跳过空闲关房验证：未带 idle 参数，且 IDLE_CLOSE_MS 为默认 5min）')
  }

  const allOk = results.steps.every(s => s.ok)
  log(allOk ? '\n🎉 全部通过' : '\n⚠️ 有失败项')
  process.exit(allOk ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
