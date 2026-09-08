<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useData, useRouter, inBrowser } from 'vitepress'
import { useDark } from '@vueuse/core'

const { frontmatter } = useData()
const router = useRouter()
/* 坑 #3：必须共用 vitepress-theme-appearance，否则主题不同步 */
const isDark = useDark({ storageKey: 'vitepress-theme-appearance' })

const hero = computed(() => frontmatter.value.hero || {})
const features = computed(() => frontmatter.value.features || [])

const NAV = [
  { text: '首页', link: '/' },
  { text: '博客', link: '/blog/hello-world' },
  { text: '关于', link: '/about' },
  { text: '无尽能源', link: '/ai' }
]

/* 坑 #1：VitePress 的 router 只有 go()，没有 push() */
function go(to) {
  router.go(to)
}
function toggleTheme() {
  isDark.value = !isDark.value
}

/* ---------------- 滚动：顶栏收紧 + 英雄区视差 ---------------- */
const scrolled = ref(false)
const progress = ref(0)

function onScroll() {
  if (!inBrowser) return
  const y = window.scrollY || 0
  scrolled.value = y > 12
  progress.value = Math.min(y / 520, 1)
}

/* ---------------- 卡片光晕跟随 ---------------- */
function onCardMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

let rafId = 0
let observer = null

onMounted(() => {
  if (!inBrowser) return
  document.documentElement.classList.add('ds-home')
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  /* 滚动入场：给 .ds-reveal 加 .is-in */
  const targets = document.querySelectorAll('.ds-reveal')
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    )
    targets.forEach((el) => observer.observe(el))
  } else {
    targets.forEach((el) => el.classList.add('is-in'))
  }
})

onBeforeUnmount(() => {
  if (!inBrowser) return
  document.documentElement.classList.remove('ds-home')
  window.removeEventListener('scroll', onScroll)
  if (observer) observer.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="hp">
    <!-- ============ 极光背景 ============ -->
    <div class="aurora" aria-hidden="true">
      <span class="blob b1"></span>
      <span class="blob b2"></span>
      <span class="blob b3"></span>
      <span class="aurora-veil"></span>
    </div>

    <!-- ============ 顶栏 ============ -->
    <header class="topbar" :class="{ 'is-scrolled': scrolled }">
      <a class="brand" href="/" @click.prevent="go('/')">
        <span class="brand-dot"></span>
        <span class="brand-text">DeepSucker</span>
      </a>

      <nav class="nav">
        <a
          v-for="item in NAV"
          :key="item.link"
          class="nav-link"
          :href="item.link"
          @click.prevent="go(item.link)"
        >{{ item.text }}</a>
      </nav>

      <div class="topbar-actions">
        <a
          class="gh"
          href="https://github.com/ClearloveXS"
          target="_blank"
          rel="noopener"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
            <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .96-.3 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.48 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.8.55A11.5 11.5 0 0 0 23.5 12A11.5 11.5 0 0 0 12 .5Z" />
          </svg>
        </a>
        <button class="icon-btn" @click="toggleTheme" :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'">
          <svg v-if="isDark" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- ============ Hero ============ -->
    <section class="hero">
      <div class="hero-inner" :style="{ opacity: 1 - progress * 0.65, transform: `translateY(${progress * -26}px)` }">
        <div class="badge">
          <span class="pulse"></span>
          <span>{{ hero.badge || '活体实验记录 · 第 001 号' }}</span>
        </div>

        <h1 class="name" v-html="hero.name || 'DeepSucker'"></h1>

        <p class="text" v-html="hero.text || ''"></p>
        <p class="tagline" v-html="hero.tagline || ''"></p>

        <div class="actions">
          <a
            v-for="(a, i) in (hero.actions || [])"
            :key="i"
            class="btn"
            :class="i === 0 ? 'btn-primary' : 'btn-ghost'"
            :href="a.link"
            @click.prevent="go(a.link)"
          >
            <span>{{ a.text }}</span>
            <svg v-if="i === 0" class="btn-arrow" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>

      <div class="scroll-hint" :style="{ opacity: 1 - progress * 2 }">
        <span class="scroll-line"></span>
        <span class="scroll-text">向下滚动</span>
      </div>
    </section>

    <!-- ============ 特性卡片 ============ -->
    <section class="features">
      <div class="sec-head ds-reveal">
        <span class="sec-index">01</span>
        <h2 class="sec-title">本站主营项目</h2>
        <p class="sec-sub">三项均不支持退款</p>
      </div>

      <div class="cards">
        <article
          v-for="(f, i) in features"
          :key="i"
          class="card"
          :style="{ animationDelay: `${i * 90}ms` }"
          @mousemove="onCardMove"
        >
          <span class="card-glow" aria-hidden="true"></span>
          <div class="card-top">
            <span class="card-icon" v-if="f.icon">{{ f.icon }}</span>
            <span class="card-no">{{ String(i + 1).padStart(2, '0') }}</span>
          </div>
          <h3 class="card-title">{{ f.title }}</h3>
          <p class="card-details">{{ f.details }}</p>
        </article>
      </div>
    </section>

    <!-- ============ 过渡标语 ============ -->
    <section class="strip">
      <p class="strip-text ds-reveal">
        「白天上班，夜里上人」<span class="strip-dim">—— 这不是 slogan，这是排班表</span>
      </p>
    </section>

    <!-- ============ 底部 CTA ============ -->
    <section class="cta">
      <div class="cta-card ds-reveal">
        <div class="cta-copy">
          <h3 class="cta-title">准备好了吗？</h3>
          <p class="cta-sub">没有也没关系，门是单向的</p>
        </div>
        <a class="btn btn-primary" href="/blog/hello-world" @click.prevent="go('/blog/hello-world')">
          <span>进来受罪</span>
          <svg class="btn-arrow" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </section>

    <!-- ============ 页脚 ============ -->
    <footer class="foot">
      <div class="foot-line"></div>
      <div class="foot-inner">
        <p class="foot-brand">DeepSucker</p>
        <p class="foot-meta">
          VitePress · Cloudflare Pages · 内容偶尔不正经<br />
          Copyright © 2026 · 保留所有（以及部分）权利
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.hp {
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
  color: var(--vp-c-text-1);
}

/* ================= 极光背景 ================= */
.aurora {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: var(--ds-aurora-opacity);
  will-change: transform;
}
.b1 {
  width: 46vw;
  height: 46vw;
  min-width: 380px;
  min-height: 380px;
  top: -14vw;
  left: 4vw;
  background: var(--ds-g1);
  animation: ds-float 22s ease-in-out infinite;
}
.b2 {
  width: 40vw;
  height: 40vw;
  min-width: 340px;
  min-height: 340px;
  top: -8vw;
  right: 2vw;
  background: var(--ds-g2);
  animation: ds-float 26s ease-in-out infinite reverse;
}
.b3 {
  width: 36vw;
  height: 36vw;
  min-width: 300px;
  min-height: 300px;
  top: 42vh;
  left: 34vw;
  background: var(--ds-g3);
  animation: ds-float 30s ease-in-out infinite;
  opacity: calc(var(--ds-aurora-opacity) * 0.6);
}
/* 底部渐隐，避免极光压住正文 */
.aurora-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in srgb, var(--vp-c-bg) 55%, transparent) 62%,
    var(--vp-c-bg) 96%
  );
}

/* ================= 顶栏 ================= */
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px clamp(20px, 5vw, 56px);
  transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease,
    padding 0.3s ease;
  border-bottom: 1px solid transparent;
}
.topbar.is-scrolled {
  padding-top: 11px;
  padding-bottom: 11px;
  background: color-mix(in srgb, var(--vp-c-bg) 68%, transparent);
  backdrop-filter: saturate(180%) blur(18px);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  border-bottom: 1px solid var(--vp-c-divider);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  font-weight: 650;
  font-size: 16px;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.brand-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ds-grad);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-g1) 18%, transparent);
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.nav-link {
  position: relative;
  padding: 7px 13px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s ease, background 0.2s ease;
}
.nav-link:hover {
  color: var(--vp-c-text-1);
  background: var(--ds-glass);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gh,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-border);
  background: var(--ds-glass);
  color: var(--vp-c-text-2);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.gh:hover,
.icon-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--ds-hairline-strong);
  background: var(--ds-glass-strong);
  transform: translateY(-1px);
}

/* ================= Hero ================= */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 68px);
  padding: 40px clamp(20px, 5vw, 56px) 0;
  text-align: center;
}
.hero-inner {
  max-width: 900px;
  will-change: transform, opacity;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 6px 15px 6px 12px;
  margin-bottom: 32px;
  border: 1px solid var(--vp-c-border);
  border-radius: 999px;
  background: var(--ds-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
  box-shadow: var(--ds-shadow-sm);
}
.pulse {
  position: relative;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ds-g2);
}
.pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid var(--ds-g2);
  animation: ds-pulse 2.2s ease-out infinite;
}
@keyframes ds-pulse {
  0% { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(1.9); opacity: 0; }
}

.name {
  margin: 0;
  font-size: clamp(2.9rem, 8.4vw, 5.4rem);
  font-weight: 750;
  letter-spacing: -0.045em;
  line-height: 1.02;
  background: var(--ds-grad);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: ds-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.text {
  margin: 22px 0 0;
  font-size: clamp(1.25rem, 3.4vw, 1.95rem);
  font-weight: 600;
  letter-spacing: -0.028em;
  line-height: 1.35;
  color: var(--vp-c-text-1);
  animation: ds-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

.tagline {
  margin: 16px 0 0;
  font-size: clamp(0.95rem, 1.6vw, 1.08rem);
  font-weight: 400;
  letter-spacing: 0.01em;
  color: var(--vp-c-text-3);
  animation: ds-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 42px;
  animation: ds-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.26s both;
}

/* ---------- 按钮 ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 13px 26px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 570;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease,
    background 0.24s ease, border-color 0.24s ease;
}
.btn:hover {
  transform: translateY(-2px);
}
.btn:active {
  transform: translateY(0);
}
.btn-arrow {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.btn:hover .btn-arrow {
  transform: translateX(3px);
}

.btn-primary {
  background: var(--ds-grad);
  background-size: 200% 100%;
  color: #fff;
  box-shadow: 0 6px 20px -8px color-mix(in srgb, var(--ds-g1) 70%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.08);
}
.btn-primary:hover {
  background-size: 200% 100%;
  animation: ds-shimmer 3s linear infinite;
  box-shadow: 0 14px 38px -10px color-mix(in srgb, var(--ds-g1) 80%, transparent),
    0 4px 10px rgba(0, 0, 0, 0.1);
}

.btn-ghost {
  background: var(--ds-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-1);
}
.btn-ghost:hover {
  background: var(--ds-glass-strong);
  border-color: var(--ds-hairline-strong);
  box-shadow: var(--ds-shadow-sm);
}

/* ---------- 滚动提示 ---------- */
.scroll-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 56px 0 34px;
  color: var(--vp-c-text-3);
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.scroll-line {
  width: 1px;
  height: 46px;
  background: linear-gradient(to bottom, transparent, var(--vp-c-text-3), transparent);
  animation: ds-drift 2.6s ease-in-out infinite;
}

/* ================= 区块通用 ================= */
.sec-head {
  max-width: 1180px;
  margin: 0 auto 34px;
  padding: 0 clamp(20px, 5vw, 56px);
}
.sec-index {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--vp-c-text-3);
  margin-bottom: 10px;
}
.sec-title {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 680;
  letter-spacing: -0.032em;
}
.sec-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-3);
}

/* ================= 卡片 ================= */
.features {
  position: relative;
  padding: 40px 0 96px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 clamp(20px, 5vw, 56px);
}

.card {
  position: relative;
  overflow: hidden;
  padding: 26px 24px 28px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--ds-shadow-sm);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.32s ease,
    border-color 0.32s ease;
  animation: ds-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.card:hover {
  transform: translateY(-5px);
  border-color: var(--ds-hairline-strong);
  box-shadow: var(--ds-shadow-md);
}

/* 鼠标跟随光晕 */
.card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.32s ease;
  background: radial-gradient(
    320px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--ds-g1) 16%, transparent),
    transparent 68%
  );
}
.card:hover .card-glow {
  opacity: 1;
}

/* 顶部渐变细线：hover 展开 */
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--ds-grad);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.card:hover::before {
  width: 100%;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}
.card-icon {
  font-size: 26px;
  line-height: 1;
}
.card-no {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-3);
}
.card-title {
  margin: 0 0 10px;
  font-size: 1.12rem;
  font-weight: 640;
  letter-spacing: -0.02em;
}
.card-details {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.78;
  color: var(--vp-c-text-2);
}

/* ================= 标语条 ================= */
.strip {
  padding: 0 clamp(20px, 5vw, 56px) 88px;
}
.strip-text {
  max-width: 1180px;
  margin: 0 auto;
  padding: 30px 34px;
  text-align: center;
  font-size: clamp(1.05rem, 2.4vw, 1.5rem);
  font-weight: 600;
  letter-spacing: -0.022em;
  line-height: 1.6;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-grad-soft);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.strip-dim {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: var(--vp-c-text-3);
}

/* ================= 底部 CTA ================= */
.cta {
  padding: 0 clamp(20px, 5vw, 56px) 96px;
}
.cta-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: 1180px;
  margin: 0 auto;
  padding: 38px clamp(24px, 4vw, 46px);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--ds-shadow-sm);
  position: relative;
  overflow: hidden;
}
.cta-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    560px circle at 88% 12%,
    color-mix(in srgb, var(--ds-g2) 14%, transparent),
    transparent 70%
  );
}
.cta-title {
  margin: 0;
  font-size: clamp(1.3rem, 2.6vw, 1.75rem);
  font-weight: 680;
  letter-spacing: -0.03em;
}
.cta-sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-3);
}

/* ================= 页脚 ================= */
.foot {
  padding: 0 clamp(20px, 5vw, 56px) 56px;
}
.foot-line {
  max-width: 1180px;
  margin: 0 auto 26px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--vp-c-border) 15%, var(--vp-c-border) 85%, transparent);
}
.foot-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}
.foot-brand {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.02em;
  opacity: 0.85;
}
.foot-meta {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--vp-c-text-3);
  text-align: right;
}

/* ================= 响应式 ================= */
@media (max-width: 720px) {
  .topbar {
    gap: 10px;
    padding: 12px 16px;
  }
  /* 移动端保留导航，改为横向滚动（隐藏则等于没有入口） */
  .nav {
    min-width: 0;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent);
    mask-image: linear-gradient(to right, transparent, #000 8px, #000 calc(100% - 8px), transparent);
  }
  .nav::-webkit-scrollbar {
    display: none;
  }
  .nav-link {
    padding: 6px 9px;
    font-size: 13px;
    white-space: nowrap;
  }
  .gh {
    display: none;
  }
  .brand-text {
    display: none;
  }
  .hero {
    min-height: calc(100vh - 60px);
  }
  .foot-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .foot-meta {
    text-align: left;
  }
  .cta-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blob,
  .scroll-line,
  .pulse::after {
    animation: none !important;
  }
  .name,
  .text,
  .tagline,
  .actions,
  .card {
    animation: none !important;
  }
}
</style>
