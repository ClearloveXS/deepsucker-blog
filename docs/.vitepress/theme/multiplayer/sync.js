// 同步层：远端鸟渲染缓冲。
// 策略：渲染时刻 = 游戏时钟 - 100ms（留出网络余量），样本间线性插值，
// 超出最新样本后短距外推 ≤200ms，再超出则冻结在最后位置。

export const RENDER_DELAY = 100
export const MAX_EXTRAP = 200

export class RemoteBird {
  constructor() {
    this.samples = []
  }

  // t: 接收时刻的游戏时钟（ms）；y: 归一化 0-1；v: px/s
  push(t, y, v) {
    this.samples.push({ t, y, v })
    if (this.samples.length > 96) this.samples.splice(0, this.samples.length - 96)
  }

  // 返回渲染时刻应显示的 y（归一化）。无样本返回 null。
  sample(t) {
    const rt = t - RENDER_DELAY
    const s = this.samples
    if (!s.length) return null
    const first = s[0]
    const last = s[s.length - 1]
    if (rt <= first.t) return first.y
    if (rt >= last.t) {
      const dt = rt - last.t
      if (dt <= MAX_EXTRAP && s.length > 1) {
        const prev = s[s.length - 2]
        const span = last.t - prev.t
        const slope = span > 0 ? (last.y - prev.y) / span : 0
        return last.y + slope * dt
      }
      return last.y
    }
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i - 1].t <= rt) {
        const a = s[i - 1]
        const b = s[i]
        const span = b.t - a.t
        const k = span > 0 ? (rt - a.t) / span : 0
        return a.y + (b.y - a.y) * k
      }
    }
    return first.y
  }

  reset() {
    this.samples = []
  }
}
