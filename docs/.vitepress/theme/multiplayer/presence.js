// 在场层：玩家身份（昵称 + 座位色板）。无账号系统，纯本地。

const NICK_KEY = 'ds-game-nick'
const ID_KEY = 'ds-game-id'

// 座位色板（服务端按入座顺序分配 0-3）
export const BIRD_COLORS = ['#f8d347', '#ff4d8d', '#22d3ee', '#a3e635']

export function colorName(i) {
  return ['小黄', '小粉', '小青', '小柠'][i] || '小鸟'
}

export function loadNick() {
  if (typeof window === 'undefined') return '游客'
  try {
    const n = window.localStorage.getItem(NICK_KEY)
    if (n) return n
  } catch {
    /* ignore */
  }
  const n = '游客' + String(Math.floor(Math.random() * 9000) + 1000)
  try {
    window.localStorage.setItem(NICK_KEY, n)
  } catch {
    /* ignore */
  }
  return n
}

export function saveNick(n) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NICK_KEY, n)
  } catch {
    /* ignore */
  }
}

// 玩家 id：用 sessionStorage（每个标签页一个身份，方便同机多标签测试）。
// 刷新标签页 = 新身份；旧连接关闭后服务端自动释放座位。
export function loadId() {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let id = window.sessionStorage.getItem(ID_KEY)
    if (!id) {
      id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      window.sessionStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return 'p' + Math.random().toString(36).slice(2, 12)
  }
}
