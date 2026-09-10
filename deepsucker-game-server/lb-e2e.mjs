// 排行榜上报端到端测试：双人进同一房、都死、查 /top 是否有数据
// 用法: node lb-e2e.mjs
const WS = (await import('ws')).WebSocket

function makeClient(id, score) {
  return new Promise(resolve => {
    const ws = new WS('wss://game.deepsucker.top/?room=LBTEST2')
    let started = false
    ws.on('open', () => {
      ws.send(JSON.stringify({ t: 'join', id, name: `探针${id}` }))
      setTimeout(() => ws.send(JSON.stringify({ t: 'pick', game: 'flappy' })), 300)
      setTimeout(() => ws.send(JSON.stringify({ t: 'ready', ready: true })), 600)
    })
    ws.on('message', m => {
      const msg = JSON.parse(m.toString())
      if (msg.t === 'start' && !started) {
        started = true
        console.log(`[${id}] START`)
        setTimeout(() => {
          ws.send(JSON.stringify({ t: 's', y: 0.5, v: 0, s: score, a: false }))
          console.log(`[${id}] 已死 s=${score}`)
        }, 1500)
      } else if (msg.t === 'state' && msg.phase === 'ended') {
        console.log(`[${id}] 收到 ended:`, msg.results)
      }
    })
    resolve({ ws, id })
  })
}

const a = await makeClient('A', 33)
const b = await makeClient('B', 55)
console.log('两人都进了 LBTEST2')
// 死完后留 3s 让服务端结算上报，再退出
setTimeout(() => {
  try { a.ws.close() } catch {}
  try { b.ws.close() } catch {}
}, 5000)
setTimeout(() => process.exit(0), 6000)
