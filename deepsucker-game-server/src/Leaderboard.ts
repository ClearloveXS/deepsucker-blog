// 全局排行榜：所有房间的结算成绩都汇总到同名（'global'）的这一个 DO 实例里。
// 走 HTTP 而非 WS：GET /top 给前端拉 Top10；POST /score 给 GameRoom 结算时上报。
import { DurableObject } from 'cloudflare:workers'

export interface LbEntry {
  n: string // 昵称
  s: number // 分数
  ts: number // 结算时间戳
}

// 匹配池条目：每个开着的房间在池里占一条，前端 /match 拉列表用
export interface PoolRoom {
  code: string
  playerCount: number
  registeredAt: number
  lastActiveAt: number
}
export interface LobbyPool {
  rooms: Record<string, PoolRoom> // key = 房间码
}

const KEEP_TOP = 200 // 存前 200 名，Top10 的来源足够，防 storage 无限增长
const POOL_HEARTBEAT_TIMEOUT_MS = 60 * 1000 // 心跳超时 60s：超过则视为房间已死，清理

export class Leaderboard extends DurableObject {
  private async load(): Promise<LbEntry[]> {
    return (await this.ctx.storage.get<LbEntry[]>('lb')) ?? []
  }

  private rank(list: LbEntry[]): LbEntry[] {
    return list.sort((a, b) => b.s - a.s || a.ts - b.ts) // 分高在前；同分先到先得
  }

  // ── 匹配池（lobby_pool）：复用本 DO 的 storage，不开新类 ──
  private async loadPool(): Promise<LobbyPool> {
    return (await this.ctx.storage.get<LobbyPool>('lobby_pool')) ?? { rooms: {} }
  }

  private async savePool(pool: LobbyPool): Promise<void> {
    await this.ctx.storage.put('lobby_pool', pool)
  }

  // 清掉心跳超时的条目，防止 storage 无限增长。返回清理后的池。
  private prunePool(pool: LobbyPool, now: number = Date.now()): LobbyPool {
    const cutoff = now - POOL_HEARTBEAT_TIMEOUT_MS
    const rooms: Record<string, PoolRoom> = {}
    for (const [code, r] of Object.entries(pool.rooms)) {
      if (r.lastActiveAt >= cutoff) rooms[code] = r
    }
    return { rooms }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    console.log(`[Leaderboard] fetch ${request.method} ${url.pathname}`)

    if (request.method === 'POST' && url.pathname === '/score') {
      // 任何错误都返回对应 status + 文本，不吞；console 留痕
      let rows: LbEntry[]
      try {
        rows = (await request.json()) as LbEntry[]
      } catch (e) {
        console.error('[Leaderboard] /score body parse failed:', e)
        return new Response('bad json: ' + String(e), { status: 400 })
      }
      const list = await this.load()
      for (const r of rows) {
        if (typeof r?.s === 'number' && r.s > 0) {
          list.push({ n: String(r?.n ?? '无名氏').slice(0, 16), s: r.s | 0, ts: r.ts || Date.now() })
        }
      }
      const next = this.rank(list).slice(0, KEEP_TOP)
      try {
        await this.ctx.storage.put('lb', next)
      } catch (e) {
        console.error('[Leaderboard] storage.put failed:', e)
        return new Response('storage err: ' + String(e), { status: 500 })
      }
      console.log(`[Leaderboard] /score OK, list size=${next.length}`)
      return new Response('ok')
    }

    if (request.method === 'GET' && url.pathname === '/top') {
      const top = this.rank(await this.load()).slice(0, 10)
      return new Response(JSON.stringify({ t: 'top', rows: top }), {
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*' // 博客主域与 game 子域可能不同源
        }
      })
    }

    // ── 匹配池只读：返回开着的房间列表（playerCount 降序），返回前先清超时条目 ──
    if (request.method === 'GET' && url.pathname === '/match') {
      const pruned = this.prunePool(await this.loadPool())
      await this.savePool(pruned) // 清理落盘
      const rooms = Object.values(pruned.rooms)
        .map(r => ({ code: r.code, playerCount: r.playerCount }))
        .sort((a, b) => b.playerCount - a.playerCount) // playerCount 降序
      return new Response(JSON.stringify({ t: 'match', rooms }), {
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*'
        }
      })
    }

    // ── 匹配池写入：register / heartbeat / remove ──
    if (request.method === 'POST' && url.pathname === '/match') {
      let body: any
      try {
        body = await request.json()
      } catch (e) {
        console.error('[Leaderboard] /match body parse failed:', e)
        return new Response('bad json: ' + String(e), { status: 400 })
      }
      const code = String(body?.code ?? '').slice(0, 12)
      if (!code) return new Response('missing code', { status: 400 })
      const pool = this.prunePool(await this.loadPool())
      const now = Date.now()
      const op = body?.op
      if (op === 'register' || op === 'heartbeat') {
        // heartbeat 时条目不存在 → 视作 register（补登记）
        const existing = pool.rooms[code]
        pool.rooms[code] = {
          code,
          playerCount: Number(body?.playerCount) | 0,
          registeredAt: existing?.registeredAt ?? now,
          lastActiveAt: now
        }
      } else if (op === 'remove') {
        delete pool.rooms[code]
      } else {
        await this.savePool(pool)
        return new Response('unknown op', { status: 400 })
      }
      await this.savePool(pool)
      return new Response('ok')
    }

    return new Response('not found', { status: 404 })
  }
}
