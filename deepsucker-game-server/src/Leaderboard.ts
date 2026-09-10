// 全局排行榜：所有房间的结算成绩都汇总到同名（'global'）的这一个 DO 实例里。
// 走 HTTP 而非 WS：GET /top 给前端拉 Top10；POST /score 给 GameRoom 结算时上报。
import { DurableObject } from 'cloudflare:workers'

export interface LbEntry {
  n: string // 昵称
  s: number // 分数
  ts: number // 结算时间戳
}

const KEEP_TOP = 200 // 存前 200 名，Top10 的来源足够，防 storage 无限增长

export class Leaderboard extends DurableObject {
  private async load(): Promise<LbEntry[]> {
    return (await this.ctx.storage.get<LbEntry[]>('lb')) ?? []
  }

  private rank(list: LbEntry[]): LbEntry[] {
    return list.sort((a, b) => b.s - a.s || a.ts - b.ts) // 分高在前；同分先到先得
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/score') {
      try {
        const rows = (await request.json()) as LbEntry[]
        const list = await this.load()
        for (const r of rows) {
          if (typeof r?.s === 'number' && r.s > 0) {
            list.push({ n: String(r?.n ?? '无名氏').slice(0, 16), s: r.s | 0, ts: r.ts || Date.now() })
          }
        }
        await this.ctx.storage.put('lb', this.rank(list).slice(0, KEEP_TOP))
      } catch {
        // 上报失败不拖垮调用方（GameRoom 结算流程）
      }
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

    return new Response('not found', { status: 404 })
  }
}
