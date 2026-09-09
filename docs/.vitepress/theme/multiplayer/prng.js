// 确定性 PRNG：所有客户端用同一 seed 生成完全相同的管道序列
// mulberry32 —— 32 位状态，周期 2^32，足够本游戏用

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 第 i 根管子的间隙中心 Y（px）。
// 每个索引独立播种（seed 与 i 混合），无需重放历史状态，按需生成即可。
export function pipeGapY(seed, i, H, groundH, gap) {
  const rand = mulberry32((seed ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0)
  const min = gap / 2 + 40
  const max = H - groundH - gap / 2 - 40
  return min + rand() * (max - min)
}
