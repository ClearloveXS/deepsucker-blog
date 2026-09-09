// 在场层：玩家身份（昵称 + 座位色板）。无账号系统，纯本地。

const NICK_KEY = 'ds-game-nick'
const ID_KEY = 'ds-game-id'

// 座位色板（服务端按入座顺序分配 0-3）
export const BIRD_COLORS = ['#f8d347', '#ff4d8d', '#22d3ee', '#a3e635']

export function colorName(i) {
  return ['小黄', '小粉', '小青', '小柠'][i] || '小鸟'
}

// 20 个网络梗风格搞怪昵称（按需增减）
// 风格：网络流行语 / 废话文学 / 反讽 / 自嘲 —— 避免冒犯性、擦边、政治
const FUNNY_NICKS = [
  '孤勇者泪流满面',
  '开会假装记笔记的椅子',
  '凌晨三点等回复的电饭煲',
  '月亮不睡我不睡',
  '临时工本工',
  '气氛组组长',
  '退堂鼓表演艺术家',
  '周末加班的灵魂',
  '摸鱼大师',
  '高级废品',
  '充值玩家（余额 0）',
  '废话文学冠军',
  '火星来的网友',
  '资深躺平选手',
  '单身贵族贫困版',
  '圆周率第三位',
  '想得美本美',
  '加班摸鱼两不误',
  '咸鱼本鱼翻了身',
  'NPC 觉醒第 3 天'
]

export function loadNick() {
  if (typeof window === 'undefined') return FUNNY_NICKS[0]
  try {
    const n = window.localStorage.getItem(NICK_KEY)
    if (n) return n
  } catch {
    /* ignore */
  }
  const n = FUNNY_NICKS[(Math.random() * FUNNY_NICKS.length) | 0]
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
