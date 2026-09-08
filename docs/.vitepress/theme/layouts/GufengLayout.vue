<script setup>
// ============================================================
// 巨构：行深般若 —— 整页古风布局（第二篇博客专用）
// 固定深墨色调（不随全站明暗切换）：朱/金/月白/黛
// 性能红线：无 backdrop-filter、无 blur 动画、reveal 只动 opacity+transform
// ============================================================
import { ref, onMounted } from 'vue'
import { useRouter, inBrowser } from 'vitepress'

const router = useRouter()
const root = ref(null)

// 五观：图 + 诗 + 短评
const GUANS = [
  {
    no: '一觀', name: '天柱', img: '/images/gufeng/tianzhu.jpg',
    poem: ['誰把丹砂潑上天', '三株赤柱立雲巔', '松低碧海人如粟', '獨立蒼茫即是禪'],
    note: '柱不是柱，是垂落的經幡。雲海以下是人間，雲海以上是問題——而紅衣人站在中間，本身就是答案。'
  },
  {
    no: '二觀', name: '赤峽', img: '/images/gufeng/chixia.jpg',
    poem: ['十萬丹崖燒未休', '一橋斜掛入雲流', '白衣不借扶搖力', '獨把斜陽踏作舟'],
    note: '整面峽谷是凝固的火焰，棧道是火裡唯一的退路——也是唯一的進路。白衣人沒有翅膀，但衣袂起來的時候，比翅膀好看。'
  },
  {
    no: '三觀', name: '松風', img: '/images/gufeng/songfeng.jpg',
    poem: ['萬仞青崖一萼紅', '松根蟠住古今風', '雲深不許人知處', '坐看滄溟日夜東'],
    note: '青灰萬仞之間只許一點紅——這一點紅就是整幅畫的眼。松把風盤住，人把心放空，雲在腳下假装海。'
  },
  {
    no: '四觀', name: '佛殿', img: '/images/gufeng/fodian.jpg',
    poem: ['千柱承雲起梵宮', '晨光一線破鴻蒙', '三人行到山窮處', '始信須彌芥子中'],
    note: '須彌藏芥子，芥子納須彌。三個剪影朝聖的方向，也是光進來的方向——巨構再大，不過是給晨光畫的框。'
  },
  {
    no: '五觀', name: '長橋', img: '/images/gufeng/changqiao.jpg',
    poem: ['一橋飛渡九天紅', '橋下滄波橋上虹', '行到水窮雲起處', '此身已在畫圖中'],
    note: '橋沒有盡頭，盡頭只有雲。右側那個白衣人看了很久——他不是在看橋，是在看「路原來可以這樣走」。'
  }
]

// reveal 入场
onMounted(() => {
  if (!inBrowser || !root.value) return
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    }
  }, { threshold: 0.12 })
  root.value.querySelectorAll('.gf-reveal').forEach(el => io.observe(el))
})

function goHome() { router.go('/') }
</script>

<template>
  <div ref="root" class="gf-page">
    <!-- 顶栏 -->
    <header class="gf-top">
      <button class="gf-back" type="button" @click="goHome">
        <span class="gf-back-arrow">←</span> 歸山
      </button>
      <div class="gf-top-mark">巨構 · 行深般若</div>
    </header>

    <!-- ============ Hero：竖排题字 + 天柱图 ============ -->
    <section class="gf-hero">
      <div class="gf-hero-img" aria-hidden="true">
        <img src="/images/gufeng/tianzhu.jpg" alt="" loading="eager" decoding="async" />
      </div>
      <div class="gf-hero-inner">
        <div class="gf-hero-vertical">
          <h1 class="gf-hero-title">
            <span class="gf-t-char" style="--i:0">行</span>
            <span class="gf-t-char" style="--i:1">深</span>
            <span class="gf-t-char" style="--i:2">般</span>
            <span class="gf-t-char" style="--i:3">若</span>
          </h1>
          <span class="gf-hero-sub">巨構</span>
          <span class="gf-seal" aria-hidden="true"><i>般若</i></span>
          <span class="gf-hero-eyebrow">第二篇 · AI 巨構</span>
        </div>
      </div>
      <div class="gf-scroll-hint" aria-hidden="true">
        <span>下行觀山</span>
        <i></i>
      </div>
    </section>

    <!-- ============ 引：心经 ============ -->
    <section class="gf-intro gf-reveal">
      <p class="gf-sutra">
        觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。
        <span class="gf-sutra-from">——《心經》</span>
      </p>
      <div class="gf-prose">
        <p>古人行深，要入定、要觀想、要十年面壁，方能照見諸相非相。</p>
        <p>如今行深，只要一句話——</p>
        <p>一句話說完，萬仞高樓平地起，雲海自腳底生。</p>
      </div>
      <div class="gf-rule" aria-hidden="true"><i></i><b>◆</b><i></i></div>
    </section>

    <!-- ============ 五观 ============ -->
    <section v-for="(g, idx) in GUANS" :key="g.no" class="gf-guan">
      <div class="gf-guan-head gf-reveal">
        <span class="gf-guan-no">{{ g.no }}</span>
        <span class="gf-guan-line" aria-hidden="true"></span>
        <span class="gf-guan-name">{{ g.name }}</span>
      </div>
      <figure class="gf-figure gf-reveal">
        <img :src="g.img" :alt="g.no + '·' + g.name" loading="lazy" decoding="async" />
      </figure>
      <div class="gf-poem-wrap gf-reveal">
        <div class="gf-poem">
          <span v-for="line in g.poem" :key="line" class="gf-poem-line">{{ line }}</span>
        </div>
        <p class="gf-note">{{ g.note }}</p>
      </div>
      <div v-if="idx < GUANS.length - 1" class="gf-rule gf-reveal" aria-hidden="true"><i></i><b>◆</b><i></i></div>
    </section>

    <!-- ============ 何谓巨构 ============ -->
    <section class="gf-chapter gf-reveal">
      <h2 class="gf-h2"><span class="gf-h2-no">釋</span>何謂巨構</h2>
      <div class="gf-prose">
        <p>巨構，megastructure——建築學的舊詞，科幻圈的老梗。它的定義可以寫一本書，但你的脊椎只需要半秒就能讀懂：當「巨大」大到擊穿想象力的那一刻，人會本能地安靜下來。</p>
        <p>康德管這叫<b class="gf-gold">崇高</b>：對象的巨大先把人擊潰，再由理性把人接住——這一擊一接之間，就是震撼的來源。</p>
        <p>而中式巨構多了一味別處沒有的藥引：<b class="gf-gold">留白</b>。樓再高，高不過雲；雲再滿，滿不過空。朱樓千丈，最後都收進一片什麼都沒有的雲海裡——巨大負責震撼，空負責原諒。</p>
        <p>所以它不需要翻譯。<b class="gf-gold">高處的建築、流動的雲、一個很小的人</b>——這三個符號，任何一個人類都能直接讀取「此處不是凡間」。成都有位眼鏡店老闆，用 AI 做了一段南天門立於雲海的視頻，沒有一句台詞，搬運到海外四天播放破五百萬。評論區什麼語言都有，意思卻是同一個。</p>
      </div>
    </section>

    <!-- ============ 行深般若 ============ -->
    <section class="gf-chapter gf-reveal">
      <h2 class="gf-h2"><span class="gf-h2-no">觀</span>行深般若</h2>
      <div class="gf-prose">
        <p>「行深般若」——走到智慧的深處去。古人走這條路，靠的是閉目：把心沉下去，在黑暗裡觀想須彌山、觀想樓閣、觀想蓮台。</p>
        <p>AI 把這件事反了過來：它把「觀想」直接變成了「看見」。</p>
        <p>從前畫一座這樣的樓，要十年功力、要懂透視、要渲染農場燒掉一個月。如今是一行字。這不是取代——這是<b class="gf-gold">平權</b>：每個人心裡都有一座不敢說的樓，怕說出來被笑幼稚、被笑中二。現在 AI 替你把它蓋出來了，蓋得比你想象的還高。</p>
        <p>B 站 UP 主「巨構ai」的《巨構》系列已經更到四十多集：《沒有告別》一百三十四萬播放，《永恆的沉默》一百五十五萬，《烈日永照的黃金鄉》近五百萬。彈幕裡沒有梗，只有成片成片的「臥槽」和「起雞皮疙瘩了」——這叫<b class="gf-gold">全民製作人</b>：當工具不再設限，震撼就成了人人可得的日用品。</p>
        <p>行到深時你會發現：般若不在樓裡，不在雲裡，在「敢想」裡。</p>
      </div>
      <blockquote class="gf-quote">
        巨構原從心上栽，AI 揮一筆，萬仞眼前開。
      </blockquote>
    </section>

    <!-- ============ 造山之术 ============ -->
    <section class="gf-chapter gf-reveal">
      <h2 class="gf-h2"><span class="gf-h2-no">術</span>造山之術</h2>
      <div class="gf-prose">
        <p>想親手造一座？社區已經把方法論趟出來了。中式巨構的提示詞，核心是把畫面拆成八個部分，缺一不可：</p>
      </div>
      <div class="gf-formula">
        <div class="gf-f-item"><b>場景主體</b><span>雲海正殿 / 懸空玉橋 / 天階 / 山門</span></div>
        <div class="gf-f-item"><b>鏡頭機位</b><span>低機位仰拍、鏡頭貼地、超廣角 18mm</span></div>
        <div class="gf-f-item"><b>空間尺度</b><span>巨柱、高簷、遠處宮闕、長廊透視</span></div>
        <div class="gf-f-item"><b>人物參照</b><span>一到三個小人影，背對鏡頭，只作尺度</span></div>
        <div class="gf-f-item"><b>中式材質</b><span>朱紅柱、白玉階、紫檀斗拱、青銅欄、古松</span></div>
        <div class="gf-f-item"><b>光影氛圍</b><span>暖金斜陽、冷青天空、長陰影、漫射薄霧</span></div>
        <div class="gf-f-item"><b>鏡頭質感</b><span>電影攝影、寬畫幅、膠片顆粒</span></div>
        <div class="gf-f-item"><b>負面詞</b><span>去掉文字、水印、霓虹、3D 渲染感</span></div>
      </div>
      <div class="gf-prose">
        <p>口訣只有一句：<b class="gf-gold">巨柱撐天、小人作尺、雲海收尾、側光開臉</b>。文生圖、文生視頻工具皆可上手；想看天花板長什麼樣，去把「巨構ai」的合集刷完，比看十篇教程有用。</p>
      </div>
    </section>

    <!-- ============ 观山：原视频 ============ -->
    <section class="gf-chapter gf-reveal">
      <h2 class="gf-h2"><span class="gf-h2-no">山</span>觀山</h2>
      <div class="gf-prose">
        <p>本文所觀五圖，皆出自 B 站 UP 主「巨構ai」的視頻《巨構：行深般若【AI全民制作人】》。原片配樂一起，樓才是活的：</p>
      </div>
      <div class="gf-video">
        <iframe
          src="https://player.bilibili.com/player.html?bvid=BV1bhuc6VEym&page=1&high_quality=1&danmaku=0&autoplay=0"
          scrolling="no" frameborder="0" allowfullscreen
          title="巨构：行深般若【AI全民制作人】"
        ></iframe>
      </div>
      <div class="gf-links">
        <a class="gf-link" href="https://www.bilibili.com/video/BV1bhuc6VEym/" target="_blank" rel="noopener">
          <b>原視頻</b><span>巨構：行深般若【AI全民制作人】</span>
        </a>
        <a class="gf-link" href="https://space.bilibili.com/273460306/" target="_blank" rel="noopener">
          <b>UP 主</b><span>巨構ai 的個人空間 · 《巨構》合集持續更新</span>
        </a>
        <a class="gf-link" href="https://search.bilibili.com/all?keyword=AI%E5%B7%A8%E6%9E%84" target="_blank" rel="noopener">
          <b>更多</b><span>B 站搜「AI 巨構」· 抖音搜「AI巨構」話題</span>
        </a>
      </div>
    </section>

    <!-- ============ 尾声 ============ -->
    <section class="gf-end gf-reveal">
      <div class="gf-rule" aria-hidden="true"><i></i><b>◆</b><i></i></div>
      <div class="gf-jie">
        <p>樓高千尺，不過一念。</p>
        <p>人小如塵，亦是諸天。</p>
        <p>AI 為筆，心為紙硯——</p>
        <p>行到深時，般若自見。</p>
      </div>
      <div class="gf-end-mark">
        <span class="gf-seal gf-seal-end" aria-hidden="true"><i>觀山</i></span>
        <p class="gf-colophon">
          圖自 B 站 @巨構ai《巨構：行深般若》<br />
          詩為 DeepSucker 自賦 · 二〇二六年九月九日 夜
        </p>
      </div>
      <button class="gf-back gf-back-end" type="button" @click="goHome">
        <span class="gf-back-arrow">←</span> 歸山
      </button>
    </section>
  </div>
</template>

<style scoped>
/* ============ 基调：固定深墨（不随主题） ============ */
.gf-page {
  --gf-ink: #0f0b08;
  --gf-ink-2: #181009;
  --gf-zhu: #c2352a;          /* 朱砂 */
  --gf-zhu-deep: #8f1f18;
  --gf-gold: #c9a05c;         /* 金 */
  --gf-gold-hi: #e6c07a;
  --gf-yue: #e9dfca;          /* 月白 */
  --gf-yue-dim: #a1937c;
  --gf-dai: #3d4a48;          /* 黛 */
  --gf-kai: 'STKaiti', 'Kaiti SC', 'KaiTi', 'BiauKai', 'DFKai-SB', serif;
  --gf-song: 'STSong', 'SimSun', 'Songti SC', 'Noto Serif SC', serif;

  position: relative;
  min-height: 100dvh;
  color: var(--gf-yue);
  font-family: var(--gf-song);
  background:
    radial-gradient(1200px 700px at 85% -5%, rgba(194, 53, 42, 0.14), transparent 60%),
    radial-gradient(900px 600px at 8% 30%, rgba(201, 160, 92, 0.06), transparent 55%),
    linear-gradient(180deg, var(--gf-ink) 0%, var(--gf-ink-2) 48%, var(--gf-ink) 100%);
  overflow-x: hidden;
}
/* 宣纸颗粒：噪点 tile，与全站同法但色调偏暖 */
.gf-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
}
.gf-page > * { position: relative; z-index: 1; }

/* ============ 顶栏 ============ */
.gf-top {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
  background: linear-gradient(180deg, rgba(15, 11, 8, 0.88), rgba(15, 11, 8, 0));
}
.gf-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--gf-kai);
  font-size: 15px;
  letter-spacing: 0.2em;
  color: var(--gf-yue-dim);
  background: none;
  border: 1px solid rgba(201, 160, 92, 0.28);
  border-radius: 999px;
  padding: 7px 16px;
  cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}
.gf-back:hover { color: var(--gf-gold-hi); border-color: var(--gf-gold); transform: translateX(-3px); }
.gf-back-arrow { font-size: 16px; }
.gf-top-mark {
  font-family: var(--gf-kai);
  font-size: 13px;
  letter-spacing: 0.35em;
  color: rgba(201, 160, 92, 0.55);
}

/* ============ Hero ============ */
.gf-hero {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}
.gf-hero-img {
  position: absolute;
  inset: 0;
}
.gf-hero-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 40%;
  /* 左缘渐隐入墨，让竖排字有处可立 */
  mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 34%, #000 62%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 34%, #000 62%);
}
.gf-hero-img::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15,11,8,0.45) 0%, transparent 22%, transparent 68%, var(--gf-ink) 100%);
}
.gf-hero-inner {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 90px 7vw 0; /* 顶留 fixed 顶栏位置 */
}
/* 竖排正确姿势：外层正常横向 flex（row-reverse = 从右往左的古风阅读序），
   每个子元素自己 writing-mode——绝不在 writing-mode 容器里再开 flex，
   否则主轴方向翻转，列序/字序全乱（2026-09-09 实测踩坑） */
.gf-hero-vertical {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  gap: 30px;
}
.gf-hero-vertical > * {
  writing-mode: vertical-rl;
}
.gf-hero-eyebrow {
  font-family: var(--gf-kai);
  font-size: 14px;
  letter-spacing: 0.5em;
  color: var(--gf-yue-dim);
  padding-top: 8px;
}
.gf-hero-title {
  margin: 0;
  font-family: var(--gf-kai);
  font-weight: 700;
  font-size: clamp(54px, 7.5vw, 92px); /* 四字竖排总高约 400px，防溢出视口 */
  line-height: 1;
  letter-spacing: 0.1em; /* 竖排下即纵向字距 */
  color: var(--gf-yue);
  text-shadow: 0 0 34px rgba(194, 53, 42, 0.35), 0 2px 0 rgba(0,0,0,0.6);
}
.gf-t-char {
  display: inline-block; /* 沿 inline 轴（垂直）自然下排；inline-block 才能做 transform */
  opacity: 0;
  transform: translateY(26px);
  animation: gf-rise 0.9s cubic-bezier(0.2, 0.8, 0.25, 1) forwards;
  animation-delay: calc(0.18s * var(--i) + 0.15s);
}
@keyframes gf-rise {
  to { opacity: 1; transform: translateY(0); }
}
.gf-hero-sub {
  font-family: var(--gf-kai);
  font-size: clamp(22px, 2.6vw, 32px);
  letter-spacing: 0.62em;
  color: var(--gf-gold);
  padding-top: 10px;
}
/* 印章：单文本 + 自身 writing-mode，字序自上而下（不用 flex 排字） */
.gf-seal {
  writing-mode: vertical-rl;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 84px;
  margin-top: 14px;
  background: linear-gradient(150deg, #c9402f 0%, var(--gf-zhu) 45%, var(--gf-zhu-deep) 100%);
  border-radius: 7px;
  box-shadow: inset 0 0 0 2px rgba(233, 223, 202, 0.28), inset 0 0 14px rgba(90, 12, 8, 0.75), 0 3px 14px rgba(0, 0, 0, 0.5);
  transform: rotate(-2deg);
}
.gf-seal i {
  font-style: normal;
  font-family: var(--gf-kai);
  font-weight: 700;
  font-size: 26px;
  line-height: 1.15;
  color: #f3e9d6;
  text-shadow: 0 0 4px rgba(120, 20, 12, 0.9);
}
.gf-scroll-hint {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--gf-yue-dim);
}
.gf-scroll-hint span {
  font-family: var(--gf-kai);
  font-size: 12px;
  letter-spacing: 0.5em;
  padding-left: 0.5em;
}
.gf-scroll-hint i {
  width: 1px;
  height: 42px;
  background: linear-gradient(180deg, var(--gf-gold), transparent);
  animation: gf-drip 2.2s ease-in-out infinite;
  transform-origin: top;
}
@keyframes gf-drip {
  0% { transform: scaleY(0.3); opacity: 0.4; }
  55% { transform: scaleY(1); opacity: 1; }
  100% { transform: scaleY(1); opacity: 0.25; }
}

/* ============ reveal 通用 ============ */
.gf-reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.85s ease, transform 0.85s cubic-bezier(0.2, 0.8, 0.25, 1);
}
.gf-reveal.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .gf-reveal { opacity: 1; transform: none; transition: none; }
  .gf-t-char { opacity: 1; transform: none; animation: none; }
  .gf-scroll-hint i { animation: none; }
}

/* ============ 引 ============ */
.gf-intro {
  max-width: 760px;
  margin: 0 auto;
  padding: 9vh 26px 4vh;
  text-align: center;
}
.gf-sutra {
  font-family: var(--gf-kai);
  font-size: clamp(19px, 2.4vw, 25px);
  line-height: 2.1;
  letter-spacing: 0.14em;
  color: var(--gf-gold-hi);
  margin: 0 0 5vh;
}
.gf-sutra-from {
  display: block;
  margin-top: 14px;
  font-size: 0.62em;
  letter-spacing: 0.4em;
  color: var(--gf-yue-dim);
}
.gf-prose p {
  font-size: 17px;
  line-height: 2.15;
  letter-spacing: 0.06em;
  color: rgba(233, 223, 202, 0.86);
  margin: 0 0 1.1em;
  text-align: justify;
}
.gf-intro .gf-prose p { text-align: center; }

/* 金线分隔 */
.gf-rule {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 460px;
  margin: 6vh auto 0;
}
.gf-rule i {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 160, 92, 0.55));
}
.gf-rule i:last-child {
  background: linear-gradient(90deg, rgba(201, 160, 92, 0.55), transparent);
}
.gf-rule b {
  font-size: 10px;
  color: var(--gf-gold);
}

/* ============ 五观 ============ */
.gf-guan { padding: 7vh 0 0; }
.gf-guan-head {
  display: flex;
  align-items: baseline;
  gap: 18px;
  max-width: 1080px;
  margin: 0 auto 3.5vh;
  padding: 0 26px;
}
.gf-guan-no {
  font-family: var(--gf-kai);
  font-size: 15px;
  letter-spacing: 0.42em;
  color: var(--gf-gold);
  white-space: nowrap;
}
.gf-guan-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(201, 160, 92, 0.5), transparent 85%);
  transform: translateY(-4px);
}
.gf-guan-name {
  font-family: var(--gf-kai);
  font-weight: 700;
  font-size: clamp(26px, 3.6vw, 40px);
  letter-spacing: 0.3em;
  color: var(--gf-yue);
  white-space: nowrap;
}
.gf-figure {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 20px;
}
.gf-figure img {
  display: block;
  width: 100%;
  border-radius: 6px;
  border: 1px solid rgba(201, 160, 92, 0.22);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55), 0 0 0 6px rgba(15, 11, 8, 0.6);
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.25, 1);
}
.gf-figure img:hover { transform: scale(1.008); }

/* 诗：竖排（桌面） */
.gf-poem-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 4.5vh 26px 0;
  display: flex;
  align-items: center;
  gap: 5vw;
}
/* vertical-rl 的 block 轴是"水平从右往左"，
   每句诗 display:block 即自然从右到左各成一列——绝不开 flex（会乱序折列） */
.gf-poem {
  writing-mode: vertical-rl;
  padding: 26px 30px;
  border-right: 1px solid rgba(201, 160, 92, 0.35);
  border-left: 1px solid rgba(201, 160, 92, 0.12);
  background: linear-gradient(180deg, rgba(194, 53, 42, 0.05), transparent 70%);
  flex-shrink: 0;
}
.gf-poem-line {
  display: block; /* 沿 block 轴排列 = 从右往左每句一列，列内文字自上而下 */
  margin-left: 20px; /* 列间距 */
  font-family: var(--gf-kai);
  font-size: clamp(20px, 2.3vw, 27px);
  letter-spacing: 0.34em;
  line-height: 1;
  color: var(--gf-yue);
}
.gf-poem-line:first-child { color: var(--gf-gold-hi); }
.gf-note {
  flex: 1;
  font-size: 16.5px;
  line-height: 2.1;
  letter-spacing: 0.06em;
  color: var(--gf-yue-dim);
  margin: 0;
  text-align: justify;
}

/* ============ 章节 ============ */
.gf-chapter {
  max-width: 780px;
  margin: 0 auto;
  padding: 10vh 26px 0;
}
.gf-h2 {
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--gf-kai);
  font-weight: 700;
  font-size: clamp(26px, 3.4vw, 36px);
  letter-spacing: 0.26em;
  color: var(--gf-yue);
  margin: 0 0 4vh;
}
.gf-h2-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  font-size: 24px;
  letter-spacing: 0;
  color: #f3e9d6;
  background: linear-gradient(150deg, #c9402f, var(--gf-zhu-deep));
  border-radius: 6px;
  box-shadow: inset 0 0 0 1.5px rgba(233, 223, 202, 0.3), 0 3px 12px rgba(0, 0, 0, 0.45);
  transform: rotate(-2deg);
}
.gf-gold { color: var(--gf-gold-hi); font-weight: 600; }
.gf-quote {
  margin: 5vh 0 0;
  padding: 22px 26px;
  border-left: 3px solid var(--gf-zhu);
  background: linear-gradient(90deg, rgba(194, 53, 42, 0.09), transparent 80%);
  font-family: var(--gf-kai);
  font-size: clamp(18px, 2.2vw, 22px);
  letter-spacing: 0.16em;
  line-height: 1.9;
  color: var(--gf-gold-hi);
}

/* 造山公式 */
.gf-formula {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 3.5vh 0;
}
.gf-f-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 15px 18px;
  border: 1px solid rgba(201, 160, 92, 0.2);
  border-radius: 6px;
  background: rgba(233, 223, 202, 0.025);
  transition: border-color 0.3s ease, background 0.3s ease;
}
.gf-f-item:hover {
  border-color: rgba(201, 160, 92, 0.55);
  background: rgba(233, 223, 202, 0.05);
}
.gf-f-item b {
  font-family: var(--gf-kai);
  font-size: 16.5px;
  letter-spacing: 0.22em;
  color: var(--gf-gold-hi);
}
.gf-f-item span {
  font-size: 13.5px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: var(--gf-yue-dim);
}

/* 视频 */
.gf-video {
  position: relative;
  margin: 3.5vh 0 0;
  padding-top: 56.25%;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(201, 160, 92, 0.28);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.gf-video iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.gf-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 3vh;
}
.gf-link {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 13px 18px;
  border: 1px solid rgba(201, 160, 92, 0.18);
  border-radius: 6px;
  text-decoration: none;
  transition: border-color 0.25s ease, transform 0.25s ease, background 0.25s ease;
}
.gf-link:hover {
  border-color: var(--gf-gold);
  background: rgba(233, 223, 202, 0.03);
  transform: translateX(4px);
}
.gf-link b {
  font-family: var(--gf-kai);
  font-size: 15px;
  letter-spacing: 0.25em;
  color: var(--gf-gold);
  white-space: nowrap;
}
.gf-link span {
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--gf-yue-dim);
}

/* ============ 尾声 ============ */
.gf-end {
  max-width: 760px;
  margin: 0 auto;
  padding: 10vh 26px 14vh;
  text-align: center;
}
.gf-end .gf-rule { margin: 0 auto 7vh; }
.gf-jie p {
  font-family: var(--gf-kai);
  font-size: clamp(19px, 2.5vw, 25px);
  letter-spacing: 0.22em;
  line-height: 2.2;
  color: var(--gf-yue);
  margin: 0;
}
.gf-jie p:last-child { color: var(--gf-gold-hi); }
.gf-end-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin: 7vh 0 5vh;
}
.gf-seal-end { width: 46px; height: 76px; margin-top: 0; }
.gf-seal-end i { font-size: 23px; }
.gf-colophon {
  font-size: 12.5px;
  line-height: 2;
  letter-spacing: 0.12em;
  color: var(--gf-yue-dim);
  text-align: left;
  margin: 0;
}
.gf-back-end { margin: 0 auto; }

/* ============ 响应式 ============ */
@media (max-width: 860px) {
  .gf-poem-wrap { flex-direction: column; align-items: stretch; gap: 3vh; }
  .gf-poem {
    writing-mode: horizontal-tb;
    border-right: none;
    border-left: 3px solid var(--gf-zhu);
    padding: 18px 22px;
    text-align: center;
    background: linear-gradient(90deg, rgba(194, 53, 42, 0.07), transparent 75%);
  }
  .gf-poem-line { letter-spacing: 0.3em; margin-left: 0; margin-bottom: 12px; }
  .gf-poem-line:last-child { margin-bottom: 0; }
  .gf-formula { grid-template-columns: 1fr; }
  .gf-hero-img img {
    mask-image: linear-gradient(180deg, #000 42%, rgba(0,0,0,0.35) 72%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 42%, rgba(0,0,0,0.35) 72%, transparent 100%);
    object-position: 50% 30%;
  }
  /* 文字叠图区加底部暗带，保证竖排标题/副题可读 */
  .gf-hero-inner::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(180deg, transparent 32%, rgba(15, 11, 8, 0.62) 72%, rgba(15, 11, 8, 0.85) 100%);
  }
  .gf-hero-inner { align-items: flex-end; padding: 0 8vw 16vh; }
  .gf-guan-head { flex-wrap: wrap; }
}
</style>
