import { GameRoom } from './GameRoom'
import { Leaderboard } from './Leaderboard'

// ⚠️ DO 类必须从入口文件导出，否则 wrangler 报 "not exported in your entrypoint"
export { GameRoom, Leaderboard }

export interface Env {
  GAME_ROOM: DurableObjectNamespace
  LEADERBOARD: DurableObjectNamespace
}

// 一个房间码 = 一个 Durable Object 实例
// 客户端连接：wss://<host>/?room=KX7P
// 排行榜：GET /top → 全局 Top10（HTTP，无需 WS）
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    // 排行榜只读接口：转发到全局 Leaderboard DO
    if (request.method === 'GET' && url.pathname === '/top') {
      return env.LEADERBOARD.getByName('global').fetch('https://lb/top')
    }

    // 校验 Upgrade 头，避免为非法请求向 DO 计费
    const upgrade = request.headers.get('Upgrade')
    if (!upgrade || upgrade !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }
    const roomCode = (url.searchParams.get('room') ?? 'default').toUpperCase().slice(0, 12)
    const stub = env.GAME_ROOM.getByName(roomCode)
    return stub.fetch(request)
  }
}
