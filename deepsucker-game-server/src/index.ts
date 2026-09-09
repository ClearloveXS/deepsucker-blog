import { GameRoom } from './GameRoom'

// ⚠️ DO 类必须从入口文件导出，否则 wrangler 报 "not exported in your entrypoint"
export { GameRoom }

export interface Env {
  GAME_ROOM: DurableObjectNamespace
}

// 一个房间码 = 一个 Durable Object 实例
// 客户端连接：wss://<host>/?room=KX7P
export default {
  async fetch(request: Request, env: Env) {
    // 校验 Upgrade 头，避免为非法请求向 DO 计费
    const upgrade = request.headers.get('Upgrade')
    if (!upgrade || upgrade !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 })
    }
    const url = new URL(request.url)
    const roomCode = (url.searchParams.get('room') ?? 'default').toUpperCase().slice(0, 12)
    const stub = env.GAME_ROOM.getByName(roomCode)
    return stub.fetch(request)
  }
}
