// 探针：sync 阶段——全员加载就绪才开始倒计时（慢的人不会错过倒计时）。
// 场景：A、B join → pick → ready → 断言进 sync（不是 countdown）
//       → A 发 loaded（B 故意不发）→ 断言仍在 sync（B 未就绪）
//       → 等 2s → B 发 loaded → 断言进 countdown，且 startAt 是「现在+3.5s」
//        （关键：B 收到 countdown 时刻距离 B 发 loaded 很近，说明倒计时是等 B 之后才起的）
// 用法: node sync-probe.mjs [wsBase]  默认 ws://127.0.0.1:8787
import { WebSocket } from 'ws'

const base = process.argv[2] || 'ws://127.0.0.1:8787'
const room = 'SY' + Math.random().toString(36).slice(2, 4).toUpperCase()
const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

function client(id) {
  const c = { ws: null, states: [], startPkt: null }
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
        c.lastAt = Date.now()
        if (m.phase === 'countdown') c.startPkt = { startAt: m.startAt, at: Date.now() }
      }
      if (m.t === 'start') c.startPkt = { startAt: m.at, at: Date.now() }
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
    }, 30)
    setTimeout(() => { clearInterval(iv); rej(new Error(`等待 ${want} 超时，实际: [${c.states}]`)) }, timeout)
  })

let fail = 0
const A = await client('A')
const B = await client('B')
await waitPhase(A, ['lobby'])
send(A, { t: 'pick', game: 'flappy' })
send(B, { t: 'pick', game: 'flappy' })
await wait(200)
send(A, { t: 'ready', ready: true })
send(B, { t: 'ready', ready: true })
await waitPhase(A, ['sync'])
log('✅ 全员确认后进入 sync（等待加载），而不是直接 countdown')

// 只有 A 就绪 → 不应开始倒计时
send(A, { t: 'loaded' })
await wait(1200)
if (A.states.includes('countdown')) { log('❌ 只有 A 就绪就开始了倒计时'); fail++ }
else log('✅ B 未就绪时不开始倒计时（A 在等待）')

// 等 2 秒后 B 才就绪（模拟加载慢的人）
await wait(2000)
const bLoadedAt = Date.now()
send(B, { t: 'loaded' })
await waitPhase(A, ['countdown'], 4000)
const cd = A.startPkt
if (cd) {
  const lag = cd.at - bLoadedAt // B 就绪 → 收到 countdown 的间隔
  log(`✅ B 就绪后进入倒计时（B 上报→倒计时广播 lag=${lag}ms）`)
  if (lag > 1500) { log(`⚠️ lag 偏大（${lag}ms）`); fail++ }
  const remain = cd.startAt - Date.now()
  if (remain > 2500 && remain <= 3600) log(`✅ 倒计时时长正常（剩余 ${remain}ms）`)
  else { log(`❌ 倒计时时长异常：剩余 ${remain}ms`); fail++ }
} else { log('❌ 未收到 countdown'); fail++ }

// B 也应看到完整倒计时（他没错过）
await waitPhase(B, ['countdown'], 3000)
log('✅ B（加载慢的人）也收到了倒计时，不会错过开局')

// 等待 playing 确认流程走完
await waitPhase(A, ['playing'], 8000)
log('✅ 倒计时结束后正常进入 playing')

A.ws.close(); B.ws.close()
console.log(fail === 0 ? '\n🎉 全部通过' : `\n⚠️ ${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)
