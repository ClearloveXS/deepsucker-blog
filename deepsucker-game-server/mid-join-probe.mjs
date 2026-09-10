// 探针：房主开局后，后来的人中途加入占座（观战/参战）+ 结算正确。
// 场景：A join→pick→ready→playing；B playing 中 join → 收 playing state（带 seed/startAt）；
//       A、B 都发死亡包 → 结算 results 应含两人；/match 池里无此房。
// 用法: node mid-join-probe.mjs [wsBase]  默认 ws://127.0.0.1:8787
import { WebSocket } from 'ws'

const base = process.argv[2] || 'ws://127.0.0.1:8787'
const httpBase = base.replace('ws', 'http')
const room = 'MJ' + Math.random().toString(36).slice(2, 4).toUpperCase()
const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

function client(id) {
  const c = { ws: null, states: [], results: null, startPkt: null }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base + '/?room=' + room)
    c.ws = ws
    ws.on('open', () => {
      ws.send(JSON.stringify({ t: 'join', id, name: '玩家' + id }))
      resolve(c)
    })
    ws.on('message', d => {
      let m; try { m = JSON.parse(d) } catch { return }
      if (m.t === 'state') {
        c.states.push(m.phase)
        if (m.phase === 'playing') c.startPkt = { seed: m.seed, startAt: m.startAt, players: m.players.length }
        if (m.phase === 'ended') c.results = m.results
      }
    })
    ws.on('error', reject)
  })
}
const send = (c, o) => c.ws.send(JSON.stringify(o))
const wait = ms => new Promise(r => setTimeout(r, ms))
const waitPhase = (c, want, timeout = 6000) =>
  new Promise((res, rej) => {
    const iv = setInterval(() => {
      if (c.states.some(p => want.includes(p))) { clearInterval(iv); res(c.states[c.states.length - 1]) }
    }, 50)
    setTimeout(() => { clearInterval(iv); rej(new Error(`等待 ${want} 超时，实际: [${c.states}]`)) }, timeout)
  })

let fail = 0
const A = await client('A')
await waitPhase(A, ['lobby'])
send(A, { t: 'pick', game: 'flappy' })
await wait(200)
send(A, { t: 'ready', ready: true })
await waitPhase(A, ['playing'])
log('✅ A 单人开局进入 playing')

// B 中途加入
const B = await client('B')
await waitPhase(B, ['playing'])
if (B.startPkt && B.startPkt.seed && B.startPkt.players === 2) {
  log('✅ B 中途加入：收到 playing state（seed/startAt 齐，座位=2）')
} else {
  log(`❌ B 中途加入异常: ${JSON.stringify(B.startPkt)}`)
  fail++
}
// A 应看到 B 占座
await wait(300)
const aLast = A.startPkt
if (aLast && aLast.players === 2) log('✅ A 看到 B 已占座（players=2）')
else { log(`❌ A 未见 B 占座: ${JSON.stringify(aLast)}`); fail++ }

// 匹配池应无此房（开局时已移除）
const pool1 = await fetch(httpBase + '/match').then(r => r.json())
if ((pool1.rooms || []).some(r => r.code === room)) { log('❌ 开局中的房仍留在匹配池'); fail++ }
else log('✅ 匹配池无此房')

// A、B 陆续死亡 → 结算含两人。B 先发几个活包（真实客户端 10Hz 持续上报，上过场才参与结算）
send(B, { t: 's', y: 0.5, v: 0, s: 1, a: true })
await wait(200)
send(B, { t: 's', y: 0.6, v: 0, s: 2, a: true })
await wait(200)
send(A, { t: 's', y: 0.9, v: 300, s: 7, a: false })
await wait(300)
send(B, { t: 's', y: 0.8, v: 300, s: 3, a: false })
await waitPhase(A, ['ended'], 6000)
if (A.results && A.results.length === 2 && A.results[0].s >= A.results[1].s) {
  log(`✅ 结算正确：${JSON.stringify(A.results)}（A=7 B=3，降序）`)
} else {
  log(`❌ 结算异常: ${JSON.stringify(A.results)}`)
  fail++
}

A.ws.close(); B.ws.close()
await wait(400)
const pool2 = await fetch(httpBase + '/match').then(r => r.json())
if ((pool2.rooms || []).some(r => r.code === room)) { log('❌ 结束后房间仍留在匹配池'); fail++ }
else log('✅ 全员退出后匹配池干净')

console.log(fail === 0 ? '\n🎉 全部通过' : `\n⚠️ ${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)
