// 传输层：WebSocket 封装。JSON 序列化 + 断线自动重连（指数退避）。
// 协议细节在 room.js，这里只管连/断/收发。

export function wsUrl() {
  if (typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem('ds-game-ws')
      if (override) return override
    } catch {
      /* SSR / 隐私模式 */
    }
  }
  const dev = !!(import.meta.env && import.meta.env.DEV)
  return dev ? 'ws://localhost:8787' : 'wss://deepsucker-game-server.workers.dev'
}

export class Transport {
  constructor(url, { onOpen, onClose, onMessage } = {}) {
    this.url = url
    this.onOpen = onOpen || null
    this.onClose = onClose || null
    this.onMessage = onMessage || null
    this.ws = null
    this.closedByUser = false
    this.attempts = 0
    this.timer = null
  }

  connect() {
    this.closedByUser = false
    this.open()
  }

  open() {
    if (typeof WebSocket === 'undefined') return
    const ws = new WebSocket(this.url)
    this.ws = ws
    ws.onopen = () => {
      this.attempts = 0
      if (this.onOpen) this.onOpen()
    }
    ws.onclose = () => {
      if (this.onClose) this.onClose()
      if (this.closedByUser) return
      const delay = Math.min(8000, 500 * Math.pow(2, this.attempts++))
      this.timer = setTimeout(() => this.open(), delay)
    }
    ws.onerror = () => {
      // onclose 会紧随其后，退避逻辑在那边
    }
    ws.onmessage = ev => {
      if (typeof ev.data !== 'string') return
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (this.onMessage) this.onMessage(msg)
    }
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) {
      try {
        this.ws.send(JSON.stringify(obj))
      } catch {
        /* 正在关闭 */
      }
    }
  }

  isOpen() {
    return !!this.ws && this.ws.readyState === 1
  }

  close() {
    this.closedByUser = true
    if (this.timer) clearTimeout(this.timer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
    }
  }
}
