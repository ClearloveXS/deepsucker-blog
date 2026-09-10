// 游戏 manifest 协议 + 构建期扫描器（AGENTS.md §8.3）
// 宿主用 import.meta.glob 静态发现 docs/games/<id>/manifest.json，
// 新增游戏只需丢 manifest.json + 4 钩子实现，无需改 GameLobby.vue。

export interface GameManifest {
  id: string // 'flappy' / 'pong' / ...
  name: string // 显示名
  version: string // '1.0.0'
  minPlayers: number // 1
  maxPlayers: number // 4
  preview: string // '/images/games/xxx.svg'
  tagline: string // 大厅卡片副标题
  module: string // '/components/FlappyGame.vue'（运行时入口，文档用）
  route: string // '/games/flappy'
}

// theme/games/manifest.ts → ../../../games/*/manifest.json = docs/games/*/manifest.json
const modules = import.meta.glob('../../../games/*/manifest.json', {
  eager: true
}) as Record<string, { default: unknown }>

function isManifest(x: unknown): x is GameManifest {
  if (!x || typeof x !== 'object') return false
  const m = x as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.route === 'string' &&
    typeof m.preview === 'string'
  )
}

/** 扫描所有游戏 manifest，按 id 排序返回。缺失字段会被类型守卫过滤掉，不致崩溃。 */
export function scanGames(): GameManifest[] {
  const out: GameManifest[] = []
  for (const path of Object.keys(modules)) {
    const data = modules[path]?.default
    if (isManifest(data)) out.push(data)
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}
