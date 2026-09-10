// 回归探针：单人开局跳转重连时序（关房不清 countdown 房间）。
// 复现：join → pick → ready → countdown → 关旧 WS → 新 WS join 同 id
// 断言：新连接必须收到 countdown 或 playing，绝不能退回 lobby。
// 用法: node relink-probe.mjs [wsBase]   默认 ws://127.0.0.1:8787
import { WebSocket } from 'ws'

const base = process.argv[2] || 'ws://127.0.0.1:8787'
const room = 'RL' + Math.random().toString(36).slice(2, 4).toUpperCase()
const id = 'p1'
const t0 = Date.now()
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a)

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(base + '/?room=' + room)
    const states = []
    ws.on('open', () => {
      ws.send(JSON.stringify({ t: 'join', id, name: '跳转测试' }))
      resolve(ws)
    })
    ws.on('message', d => {
      let m; try { m = JSON.parse(d) } catch { return }
      if (m.t === 'state') {
        states.push(m.phase)
        // 真实客户端（GameHost）行为：收到 sync 就上报加载就绪
        if (m.phase === 'sync' && !ws._sentLoaded) {
          ws._sentLoaded = true
          ws.send(JSON.stringify({ t: 'loaded' }))
        }
      }
      if (m.t === 'start') log('收到 start，seed=' + m.seed)
    })
    ws.on('error', reject)
    ws._states = states
  })
}

const send = (ws, o) => ws.send(JSON.stringify(o))
const wait = ms => new Promise(r => setTimeout(r, ms))
const waitPhase = (ws, want, timeout = 5000) =>
  new Promise((res, rej) => {
    const iv = setInterval(() => {
      if (ws._states.some(p => want.includes(p))) { clearInterval(iv); res(ws._states[ws._states.length - 1]) }
    }, 50)
    setTimeout(() => { clearInterval(iv); rej(new Error(`等待 ${want} 超时，实际: [${ws._states}]`)) }, timeout)
  })

let fail = 0
// ── 第 1 步：开局到 countdown ──
const ws1 = await connect()
await waitPhase(ws1, ['lobby'])
log('join 完成 phase=lobby')
send(ws1, { t: 'pick', game: 'flappy' })
await wait(200)
send(ws1, { t: 'ready', ready: true })
await waitPhase(ws1, ['countdown'])
log('已进入 countdown（倒计时中）')

// ── 第 2 步：模拟跳转——立刻关旧 WS，随后新 WS join 同 id ──
ws1.close()
await wait(120) // 让旧连接的 close 帧先被服务端处理（真实浏览器跳转的时序）
const ws2 = await connect()
const ph = await waitPhase(ws2, ['countdown', 'playing'], 6000)
log(`新连接收到的 phase=${ph} → ${['countdown', 'playing'].includes(ph) ? '✅ 保留开局状态' : '❌ 退回 lobby（bug 复现）'}`)
if (!['countdown', 'playing'].includes(ph)) fail++
// 倒计时到点必须进 playing
const ph2 = await waitPhase(ws2, ['playing'], 6000)
log(`随后进入 ${ph2} ✅ 单人开局成功`)

ws2.close()
// ── 第 3 步：对照——纯 lobby 空房仍应彻底清理（换一个全新房码） ──
const room2 = 'RL' + Math.random().toString(36).slice(2, 4).toUpperCase()
const ws3 = await new Promise((resolve, reject) => {
  const ws = new WebSocket(base + '/?room=' + room2)
  ws.on('open', () => {
    ws.send(JSON.stringify({ t: 'join', id: 'pX', name: '对照' }))
    resolve(ws)
  })
  ws.on('error', reject)
})
await wait(300)
ws3.close()
await wait(300)
const pool = await fetch(base.replace('ws', 'http') + '/match').then(r => r.json()).catch(e => ({ err: String(e) }))
const inPool = (pool.rooms || []).some(r => r.code === room2)
log(`空 lobby 房 ${inPool ? '❌ 仍留在匹配池' : '✅ 已自动清理（不在池）'}`)
if (inPool) fail++

console.log(fail === 0 ? '\n🎉 全部通过' : `\n⚠️ ${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)
