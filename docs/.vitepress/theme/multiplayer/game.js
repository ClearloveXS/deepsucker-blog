// 游戏核心：纯函数，无 DOM / Vue 依赖，便于无头测试。
// 所有客户端用同一 seed + 同一游戏时钟 → 管道与物理完全一致。

import { pipeGapY } from './prng.js'

export const G = {
  W: 400,
  H: 600,
  GRAVITY: 1400, // px/s^2
  FLAP_V: -420, // px/s
  PIPE_SPEED: 160, // px/s
  PIPE_GAP: 150,
  PIPE_W: 70,
  PIPE_SPACING: 220,
  GROUND_H: 80,
  BIRD_X: 100,
  BIRD_R: 16,
  STEP_MS: 1000 / 120, // 固定物理步长
  SEND_MS: 100 // 10Hz 状态包
}

// 第 i 根管道在游戏时钟 t 时的 x 坐标（px）
export function pipeX(i, t, startAt) {
  const elapsed = (t - startAt) / 1000
  return G.W + 100 + i * G.PIPE_SPACING - G.PIPE_SPEED * elapsed
}

export function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw))
  const ny = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= r * r
}

export function newBird() {
  return { y: G.H * 0.45, v: 0, alive: true }
}

// 单步推进本地鸟。bird: {y,v,alive}；pipes: [{i,gapY,scored}]（可变）
// 返回 { died, scored }
export function stepBird(bird, dt, t, startAt, pipes) {
  if (t < startAt || !bird.alive) return { died: false, scored: false }
  bird.v += G.GRAVITY * dt
  bird.y += bird.v * dt
  if (bird.y < G.BIRD_R) {
    bird.y = G.BIRD_R
    bird.v = Math.max(bird.v, 0)
  }
  const floor = G.H - G.GROUND_H - G.BIRD_R
  if (bird.y >= floor) {
    bird.y = floor
    bird.alive = false
    return { died: true, scored: false }
  }
  let scored = false
  for (const p of pipes) {
    const x = pipeX(p.i, t, startAt)
    if (x > G.W + 10 || x + G.PIPE_W < -10) continue
    if (G.BIRD_X + G.BIRD_R > x && G.BIRD_X - G.BIRD_R < x + G.PIPE_W) {
      const topH = p.gapY - G.PIPE_GAP / 2
      const botY = p.gapY + G.PIPE_GAP / 2
      if (
        circleRect(G.BIRD_X, bird.y, G.BIRD_R, x, -10, G.PIPE_W, topH + 10) ||
        circleRect(G.BIRD_X, bird.y, G.BIRD_R, x, botY, G.PIPE_W, G.H - G.GROUND_H - botY)
      ) {
        bird.alive = false
        return { died: true, scored }
      }
    }
    if (!p.scored && x + G.PIPE_W < G.BIRD_X - G.BIRD_R) {
      p.scored = true
      scored = true
    }
  }
  return { died: false, scored }
}

// 按需生成即将进入屏幕的管道，移除已出屏的。pipes 为可变数组。
export function ensurePipes(pipes, seed, t, startAt) {
  let nextI = 0
  for (const p of pipes) {
    if (p.i + 1 > nextI) nextI = p.i + 1
  }
  while (pipeX(nextI, t, startAt) < G.W + G.PIPE_SPACING * 2) {
    pipes.push({
      i: nextI,
      gapY: pipeGapY(seed, nextI, G.H, G.GROUND_H, G.PIPE_GAP),
      scored: false
    })
    nextI++
  }
  while (pipes.length && pipeX(pipes[0].i, t, startAt) < -G.PIPE_W - 20) {
    pipes.shift()
  }
  return pipes
}
