// 嵌入游戏框架 · 4 钩子契约（AGENTS.md §8.2）+ GameContext
// 子游戏（纯逻辑类，零 Vue 依赖）只需实现 GameModule 的 4 个钩子；
// 大厅 / 房间 / WS / 生命周期 / 排行榜上报等由 GameHost 注入。

import type { Room } from '../multiplayer/room.js'

/** 其他玩家在 10Hz 状态包里的样本（'w' 广播载荷） */
export interface PlayerSample {
  id: string
  y: number // 归一化 0-1
  v: number // px/s
  s: number // 分数
  a: boolean // 是否存活
  color: number // 座位色板索引 0-3
}

export type GamePhase = 'lobby' | 'countdown' | 'playing' | 'ended'

/** 结算行（服务端自动上报，客户端只读） */
export interface ResultRow {
  id: string
  name: string
  color: number
  s: number
}

/**
 * 子游戏模块：宿主按这套协议调用。
 * - init：挂载前调一次，注入 room/canvas/router 等
 * - destroy：卸载/路由切换时调，回收 RAF/监听器
 * - onPlayerState：10Hz 状态广播（其他玩家位置/分数/存活）
 * - sendPlayerInput：本地操作（点击/方向键/触屏），宿主只转发
 */
export interface GameModule {
  init(ctx: GameContext): void
  destroy(): void
  onPlayerState(samples: PlayerSample[]): void
  sendPlayerInput(input: 'flap' | { type: string; [k: string]: any }): void
}

/**
 * 宿主注入给子游戏的上下文。
 * 框架无关：所有"响应式"字段都暴露成 getter（模块逐帧裸读即可，无需 .value），
 * 方便在 Node 里用普通对象 mock 做单测。
 */
export interface GameContext {
  // 运行环境
  readonly room: Room | null
  readonly canvas: HTMLCanvasElement | null
  readonly router: any

  // 房间状态机镜像（宿主维护；读 phase/seed/startAt 驱动游戏循环）
  readonly phase: GamePhase
  readonly seed: number
  readonly startAt: number
  readonly results: ResultRow[]
  readonly connected: boolean
  readonly connectFailed: boolean
  readonly code: string

  // 子游戏向宿主注册模块实例，宿主据此转发 onPlayerState / sendPlayerInput
  registerGameModule(m: GameModule): void

  // 生命周期 / 导航辅助
  goLobby(): void
  retry(): void

  // 子游戏把本地死亡状态回报给宿主，宿主渲染 HUD「你挂了」
  setLocalDead(dead: boolean): void
}
