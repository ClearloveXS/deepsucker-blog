<script setup>
// ============================================================
// 巨构：行深般若 —— 整页古风布局（第二篇博客专用 · 大卷版）
// 固定深墨色调（不随全站明暗切换）：朱/金/月白/黛
// 性能红线：无 backdrop-filter、无 blur 动画、reveal 只动 opacity+transform、
//          图片全部懒加载（hero 除外）
// 竖排红线：writing-mode 容器内绝不再开 flex；每句 display:block 沿 block 轴成列
// ============================================================
import { ref, onMounted } from 'vue'
import { useRouter, inBrowser } from 'vitepress'

const router = useRouter()
const root = ref(null)

// ---------- 五观（图自 B 站 @巨构ai） ----------
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
    note: '青灰萬仞之間只許一點紅——這一點紅就是整幅畫的眼。松把風盤住，人把心放空，雲在腳下假裝海。'
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

// ---------- 续四观（本站 AI 自绘） ----------
const XU_GUANS = [
  {
    no: '六觀', name: '雪頂', img: '/images/gufeng/xueding.jpg',
    poem: ['雪壓千檐玉作堆', '天風吹我上高台', '紅衣掃得山門雪', '一線春從雲外來'],
    note: '雪把一切聲音都吸收了，巨構只剩輪廓，人只剩動作——掃雪這個動作，一掃就是一生。'
  },
  {
    no: '七觀', name: '夜航', img: '/images/gufeng/yemu.jpg',
    poem: ['萬點燈浮接斗河', '瓊樓人比星辰多', '夜深不敢高聲語', '恐落銀河入戶波'],
    note: '白天看樓，夜裡看燈。燈是巨構的心跳——萬燈齊上時，整座樓閣開始呼吸。'
  },
  {
    no: '八觀', name: '雨幕', img: '/images/gufeng/yumu.jpg',
    poem: ['千線萬線織珠簾', '隔斷紅塵不記年', '雨裡樓臺深不見', '一僧一傘一橋懸'],
    note: '雨是天地的簾子，把紅塵隔在簾外。橋上僧人走得很慢——反正簾子這邊，沒有要趕的事。'
  },
  {
    no: '九觀', name: '沙海', img: '/images/gufeng/shahai.jpg',
    poem: ['大漠沙如雪浪翻', '孤城高插紫霄垣', '駝鈴搖碎斜陽影', '一路黃金到玉門'],
    note: '城牆再長，長不過絲路；駝鈴再遠，遠不過斜陽。巨構與沙漠的關係，是互相成全的孤獨。'
  }
]

// ---------- 开篇词 ----------
const LINJIANGXIAN = [
  '雲外朱樓千丈起', '人間一粒塵埃', '松風過耳盡天籟', '白衣登絕棧', '赤足踏空來',
  '行到雲深無彼岸', '回眸俱是蓮台', '巨構原從心上栽', 'AI 揮一筆', '萬仞眼前開'
]

// ---------- 巨构简史 ----------
const TIMELINE = [
  { era: '傳說時代', title: '巴別塔', text: '《創世記》裡人類第一次「以巨構通天」的嘗試——被神叫停的爛尾樓。從此「造一座通天的塔」寫進了人類的集體夢。' },
  { era: '前 212 年', title: '阿房宮', text: '「覆壓三百餘里，隔離天日。」——杜牧沒見過它，卻替它寫下了史上最華麗的悼詞。巨構的第一屬性從來是想象。' },
  { era: '北魏', title: '懸空寺', text: '把樓閣掛上懸崖。中式巨構的原教旨主義：不是征服天空，是借住天空。' },
  { era: '1931', title: '帝國大廈', text: '381 米的人造山峰，工業時代的巨物崇拜頂點。金剛爬上去的那一年，巨構正式成為大眾文化。' },
  { era: '1973', title: '《與拉瑪相會》', text: '克拉克寫下「巨大的沉默物」（BDO）：一艘 50 公里的飛船路過太陽系，一言不發。科幻巨物美學的源頭。' },
  { era: '2021', title: '《沙丘》', text: '維倫紐瓦把巨物拍成宗教：飛船像墓碑一樣緩緩降下，配樂像遠古的號角。巨物美學電影化的頂點。' },
  { era: '2024 —', title: 'AI 巨構', text: '一句話起萬仞。巨構從「國家的工程」變成「每個人的睡前一小時」——巴別塔的夢，如今人人可續。' }
]

// ---------- 造山工具谱 ----------
const TOOLS = [
  { name: '可靈 AI 3.0', from: '快手', text: '單次 2 分鐘業界最長，中文理解最強，國風場景天然適配，全球用戶破億——造中式巨構的首選爐鼎。' },
  { name: '即夢 / Seedance 2.0', from: '字節', text: '會「導演思維」自動分鏡，圖文音視四維輸入；與剪映深度打通，生成即剪輯，一條龍出片。' },
  { name: '豆包', from: '字節', text: '完全免費、零門檻，內置 Seedance。新手的第一座山，先爬這座。' },
  { name: 'Vidu Q3', from: '生數 · 清華系', text: '音畫同步 + 首尾幀控制——鏡頭「從哪開始、到哪結束」，完全聽你的。' },
  { name: 'Runway Gen-4.5', from: '海外標杆', text: '電影級畫質、工具鏈最全，運動筆刷獨步天下。$15/月起，有預算的上這個。' },
  { name: '剪映', from: '字節', text: '億級用戶的「最後一公里」：AI 生成素材，剪映裡成片。不會剪映的巨構師，不是好導演。' }
]

// ---------- 巨构杂咏（五绝六首） ----------
const ZAYONG = [
  { title: '登天梯', lines: ['一級一重天', '天高人自寒', '回頭無舊路', '雲是故鄉山'] },
  { title: '叩門', lines: ['門高不見頂', '門下鎖深更', '我是敲門者', '一叩萬古聲'] },
  { title: '望月樓', lines: ['樓高先得月', '月小不盈懷', '忽作巡天鏡', '清光遍九垓'] },
  { title: '摘星閣', lines: ['閣迥星辰近', '伸手便可捫', '摘得一顆看', '原是舊鄉魂'] },
  { title: '鎮海樓', lines: ['海立千尋壁', '樓壓萬丈瀾', '風濤來足底', '碎作萬堆煙'] },
  { title: '夢構', lines: ['夢裡起高樓', '樓成夢亦休', '醒來呼 AI', '一夜又重頭'] }
]

// ---------- 观山者说 ----------
const CREATORS = [
  { name: '巨構ai', platform: 'B 站 · 小紅書', text: '中式巨構流派的天花板：《巨構》合集四十餘集，B 站一周漲粉 15 萬、累計 29 萬+。本文五觀之圖的出處。' },
  { name: '命比夢長', platform: '抖音', text: '《萬物生》——中式機械朋克系列劇，兩集播放破 7500 萬。證明 AI 不只能造景，還能講長故事。' },
  { name: '白袋子', platform: '抖音', text: '《零號檔案》——SCP 風 AI 怪談宇宙，四集 1.1 億播放。把文字怪談拍成了視覺大片。' },
  { name: '「中式天庭」作者', platform: '抖音', text: '南天門立於雲海，無一句台詞，海外 4 天 500 萬播放、抖音一年 50 萬粉，ChineseHeaven 話題出海，現已盈利。' }
]

const FILMS = [
  { title: '巨構：沒有告別', heat: '134 萬播放', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E6%B2%A1%E6%9C%89%E5%91%8A%E5%88%AB' },
  { title: '巨構：永恆的沉默', heat: '155 萬播放', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E6%B0%B8%E6%81%92%E7%9A%84%E6%B2%89%E9%BB%98' },
  { title: '巨構：烈日永照的黃金鄉', heat: '489 萬播放', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E9%BB%83%E9%87%91%E9%84%89' },
  { title: '巨構：山海須彌', heat: 'AI全民製作人系列', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E5%B1%B1%E6%B5%B7%E9%A0%88%E5%BD%8C' },
  { title: '巨構AI：如果道教可以成仙', heat: '中式合集', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E5%A6%82%E6%9E%9C%E9%81%93%E6%95%99%E5%8F%AF%E4%BB%A5%E6%88%90%E4%BB%99' },
  { title: '巨構AI：瓊樓賽博，浮生一夢', heat: '中式合集', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E7%93%8A%E6%A8%93%E8%B3%BD%E5%8D%9A' },
  { title: '巨構AI：混凝土潮汐', heat: '科幻合集', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E6%B7%B7%E5%87%9D%E5%9C%9F%E6%BD%AE%E6%B1%90' },
  { title: '巨構AI：遞歸的夢境', heat: '科幻合集', link: 'https://search.bilibili.com/all?keyword=%E5%B7%A8%E6%9E%84%20%E9%81%9E%E6%AD%B8%E7%9A%84%E5%A4%A2%E5%A2%83' }
]

// ---------- 巨构四问 ----------
const FAQS = [
  { q: 'AI 巨構算藝術嗎？', a: '畫筆從不為畫作負責——相機發明時，畫家們也說藝術完了。震撼是真的，感動是真的，就夠了。更何況，提示詞背後那個人的審美，才是作品真正的底片。' },
  { q: '看多了會審美疲勞嗎？', a: '會，而且已經開始了：飛簷+雲海+南天門的固定模板正在批量複製——2025 年韋氏詞典給這類東西發了個年度詞彙：Slop（AI 批量生產的無靈魂內容）。解藥只有一個：敘事。《沒有告別》講離別，《永恆的沉默》講時間——樓是殼，情緒是核。' },
  { q: '版權怎麼算？', a: '各平台規則不一，商用前先查工具協議；引用別人的圖，註明出處（本站五觀之圖就標了 UP 主）。至於 AI 圖的版權歸屬，法律還在追技術的路上——先體面，再等法。' },
  { q: '新手怎麼入門？', a: '三步：刷完「巨構ai」合集找感覺 → 抄「造山之術」的公式出第一張 → 發出去，哪怕只有三個贊。第一座山別追求完美，先追求「哇」。' }
]

// ---------- 卷目 ----------
const TOC = [
  { id: 'guan-1', mark: '觀', name: '五觀五詩' },
  { id: 'guan-6', mark: '續', name: '續觀新境' },
  { id: 'shi', mark: '釋', name: '何謂巨構' },
  { id: 'jian-shi', mark: '史', name: '巨構簡史' },
  { id: 'banruo', mark: '觀', name: '行深般若' },
  { id: 'shu', mark: '術', name: '造山之術' },
  { id: 'yong', mark: '詠', name: '巨構雜詠' },
  { id: 'qun', mark: '群', name: '觀山者說' },
  { id: 'wen', mark: '問', name: '巨構四問' },
  { id: 'shan', mark: '山', name: '觀山' }
]

function scrollToId(id) {
  if (!inBrowser) return
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

    <!-- ============ Hero ============ -->
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

    <!-- ============ 引：心经 + 临江仙 ============ -->
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
      <div class="gf-ci-wrap">
        <div class="gf-ci-head">調寄臨江仙 · 巨構</div>
        <div class="gf-poem gf-ci">
          <span v-for="line in LINJIANGXIAN" :key="line" class="gf-poem-line gf-ci-line">{{ line }}</span>
        </div>
      </div>
      <div class="gf-rule" aria-hidden="true"><i></i><b>◆</b><i></i></div>
    </section>

    <!-- ============ 卷目 ============ -->
    <nav class="gf-toc gf-reveal" aria-label="卷目">
      <div class="gf-toc-head">卷 目</div>
      <div class="gf-toc-grid">
        <button v-for="t in TOC" :key="t.id" class="gf-toc-item" type="button" @click="scrollToId(t.id)">
          <b>{{ t.mark }}</b><span>{{ t.name }}</span>
        </button>
      </div>
    </nav>

    <!-- ============ 五观 ============ -->
    <section v-for="(g, idx) in GUANS" :key="g.no" :id="idx === 0 ? 'guan-1' : undefined" class="gf-guan">
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

    <!-- ============ 续四观 ============ -->
    <section class="gf-xu-banner gf-reveal" id="guan-6">
      <div class="gf-rule" aria-hidden="true"><i></i><b>◆</b><i></i></div>
      <p class="gf-xu-text">
        以上五觀，圖自 B 站 UP 主「巨構ai」；<br />
        以下四觀，<b class="gf-gold">為本站 AI 自繪</b>——雪、夜、雨、沙，各補一境，各賦一絕。
      </p>
      <div class="gf-rule" aria-hidden="true"><i></i><b>◆</b><i></i></div>
    </section>

    <section v-for="(g, idx) in XU_GUANS" :key="g.no" class="gf-guan">
      <div class="gf-guan-head gf-reveal">
        <span class="gf-guan-no">{{ g.no }}</span>
        <span class="gf-guan-line" aria-hidden="true"></span>
        <span class="gf-guan-name">{{ g.name }}</span>
        <span class="gf-guan-tag">本站 AI 自繪</span>
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
      <div v-if="idx < XU_GUANS.length - 1" class="gf-rule gf-reveal" aria-hidden="true"><i></i><b>◆</b><i></i></div>
    </section>

    <!-- ============ 释 · 何谓巨构 ============ -->
    <section class="gf-chapter gf-reveal" id="shi">
      <h2 class="gf-h2"><span class="gf-h2-no">釋</span>何謂巨構</h2>
      <div class="gf-prose">
        <p>巨構，megastructure——建築學的舊詞，科幻圈的老梗。它的定義可以寫一本書，但你的脊椎只需要半秒就能讀懂：當「巨大」大到擊穿想象力的那一刻，人會本能地安靜下來。</p>
        <p>康德管這叫<b class="gf-gold">崇高</b>：對象的巨大先把人擊潰，再由理性把人接住——這一擊一接之間，就是震撼的來源。</p>
        <p>而中式巨構多了一味別處沒有的藥引：<b class="gf-gold">留白</b>。樓再高，高不過雲；雲再滿，滿不過空。朱樓千丈，最後都收進一片什麼都沒有的雲海裡——巨大負責震撼，空負責原諒。</p>
        <p>所以它不需要翻譯。<b class="gf-gold">高處的建築、流動的雲、一個很小的人</b>——這三個符號，任何一個人類都能直接讀取「此處不是凡間」。成都有位眼鏡店老闆，用 AI 做了一段南天門立於雲海的視頻，沒有一句台詞，搬運到海外四天播放破五百萬。評論區什麼語言都有，意思卻是同一個。</p>
      </div>
    </section>

    <!-- ============ 史 · 巨构简史 ============ -->
    <section class="gf-chapter gf-reveal" id="jian-shi">
      <h2 class="gf-h2"><span class="gf-h2-no">史</span>巨構簡史</h2>
      <div class="gf-prose">
        <p>巨構不是新東西，它是人類最古老的夢。一部巨構史，就是一部「人如何面對自己的渺小」的歷史：</p>
      </div>
      <div class="gf-timeline">
        <div v-for="t in TIMELINE" :key="t.title" class="gf-tl-item">
          <div class="gf-tl-dot" aria-hidden="true"></div>
          <div class="gf-tl-era">{{ t.era }}</div>
          <div class="gf-tl-body">
            <b>{{ t.title }}</b>
            <p>{{ t.text }}</p>
          </div>
        </div>
      </div>
      <div class="gf-prose">
        <p>看出規律了嗎：巨構的門檻一路在下探——從帝王的舉國之力，到工業的鋼筋水泥，到電影的特效工業，再到今天的一句話。<b class="gf-gold">巴別塔的夢做了四千年，終於輪到每個人親手續寫。</b></p>
      </div>
    </section>

    <!-- ============ 观 · 行深般若 ============ -->
    <section class="gf-chapter gf-reveal" id="banruo">
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

    <!-- ============ 术 · 造山之术 ============ -->
    <section class="gf-chapter gf-reveal" id="shu">
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
        <p>口訣只有一句：<b class="gf-gold">巨柱撐天、小人作尺、雲海收尾、側光開臉</b>。再往下，是爐鼎的選擇——2026 年的文生視頻江湖，六件法器各有千秋：</p>
      </div>
      <div class="gf-tools">
        <div v-for="t in TOOLS" :key="t.name" class="gf-tool">
          <div class="gf-tool-head"><b>{{ t.name }}</b><span>{{ t.from }}</span></div>
          <p>{{ t.text }}</p>
        </div>
      </div>
      <div class="gf-prose">
        <p>文生圖同理：Midjourney、SD/FLUX、即夢、通義萬相皆可起稿。選哪件法器不重要——重要的是你想造一座什麼樣的山。</p>
      </div>
    </section>

    <!-- ============ 咏 · 巨构杂咏 ============ -->
    <section class="gf-chapter gf-chapter-wide gf-reveal" id="yong">
      <h2 class="gf-h2"><span class="gf-h2-no">詠</span>巨構雜詠</h2>
      <div class="gf-prose">
        <p>五絕六首，寫盡巨物邊上的小事——梯、門、月、星、海、夢。</p>
      </div>
      <div class="gf-zayong">
        <div v-for="z in ZAYONG" :key="z.title" class="gf-zy-item">
          <div class="gf-zy-title">{{ z.title }}</div>
          <div class="gf-poem gf-zy-poem">
            <span v-for="line in z.lines" :key="line" class="gf-poem-line gf-zy-line">{{ line }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 群 · 观山者说 ============ -->
    <section class="gf-chapter gf-reveal" id="qun">
      <h2 class="gf-h2"><span class="gf-h2-no">群</span>觀山者說</h2>
      <div class="gf-prose">
        <p>造山的人多了，便成了一個江湖。2026 年，抖音上半年至少 9 條 AI 視頻播放破億，大多是人文國風一路；而「巨物審美」（megalophilia）這條支流，養出了一批奇人：</p>
      </div>
      <div class="gf-creators">
        <div v-for="c in CREATORS" :key="c.name" class="gf-creator">
          <div class="gf-creator-head"><b>{{ c.name }}</b><span>{{ c.platform }}</span></div>
          <p>{{ c.text }}</p>
        </div>
      </div>
      <div class="gf-prose">
        <p>江湖也有隱憂：飛簷、雲海、南天門的固定模板正被批量複製，2025 年韋氏詞典乾脆把年度詞彙給了 <b class="gf-gold">Slop</b>——AI 批量生產的無靈魂內容。但數據同樣證明：美學向作品的長尾留存，遠超獵奇。護城河從來不是工具，是<b class="gf-gold">你想通過這座樓，說一句什麼話</b>。</p>
        <p>若問從哪看起——這份片單，按震撼程度排序：</p>
      </div>
      <div class="gf-films">
        <a v-for="f in FILMS" :key="f.title" class="gf-film" :href="f.link" target="_blank" rel="noopener">
          <b>{{ f.title }}</b><span>{{ f.heat }}</span>
        </a>
      </div>
    </section>

    <!-- ============ 问 · 巨构四问 ============ -->
    <section class="gf-chapter gf-reveal" id="wen">
      <h2 class="gf-h2"><span class="gf-h2-no">問</span>巨構四問</h2>
      <div class="gf-faqs">
        <div v-for="f in FAQS" :key="f.q" class="gf-faq">
          <div class="gf-faq-q">{{ f.q }}</div>
          <p class="gf-faq-a">{{ f.a }}</p>
        </div>
      </div>
    </section>

    <!-- ============ 山 · 观山 ============ -->
    <section class="gf-chapter gf-reveal" id="shan">
      <h2 class="gf-h2"><span class="gf-h2-no">山</span>觀山</h2>
      <div class="gf-prose">
        <p>本文五觀之圖，皆出自 B 站 UP 主「巨構ai」的視頻《巨構：行深般若【AI全民制作人】》。原片配樂一起，樓才是活的：</p>
      </div>
      <div class="gf-video">
        <iframe
          src="https://player.bilibili.com/player.html?bvid=BV1bhuc6VEym&page=1&high_quality=1&danmaku=0&autoplay=0"
          scrolling="no" frameborder="0" allowfullscreen
          title="巨构：行深般若【AI全民制作人】"
          loading="lazy"
        ></iframe>
      </div>
      <div class="gf-links">
        <a class="gf-link" href="https://www.bilibili.com/video/BV1bhuc6VEym/" target="_blank" rel="noopener">
          <b>原視頻</b><span>巨構：行深般若【AI全民制作人】</span>
        </a>
        <a class="gf-link" href="https://space.bilibili.com/273460306/" target="_blank" rel="noopener">
          <b>UP 主</b><span>巨構ai 的個人空間 · 《巨構》合集持續更新</span>
        </a>
        <a class="gf-link" href="https://search.bilibili.com/all?keyword=AI%E5%B7%A8%E6%A7%8B" target="_blank" rel="noopener">
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
          五觀圖自 B 站 @巨構ai《巨構：行深般若》<br />
          續觀四圖為本站 AI 自繪 · 詩皆 DeepSucker 自賦<br />
          二〇二六年九月九日 夜
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
  --gf-zhu: #c2352a;
  --gf-zhu-deep: #8f1f18;
  --gf-gold: #c9a05c;
  --gf-gold-hi: #e6c07a;
  --gf-yue: #e9dfca;
  --gf-yue-dim: #a1937c;
  --gf-dai: #3d4a48;
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
.gf-hero-img { position: absolute; inset: 0; }
.gf-hero-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 40%;
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
  padding: 90px 7vw 0;
}
/* 竖排：外层 row-reverse（从右读），子元素各自 writing-mode */
.gf-hero-vertical {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  gap: 30px;
}
.gf-hero-vertical > * { writing-mode: vertical-rl; }
.gf-hero-eyebrow {
  font-family: var(--gf-kai);
  font-size: 13px;
  letter-spacing: 0.5em;
  color: var(--gf-yue-dim);
  padding-top: 8px;
}
.gf-hero-title {
  margin: 0;
  font-family: var(--gf-kai);
  font-weight: 700;
  font-size: clamp(54px, 7.5vw, 92px);
  line-height: 1;
  letter-spacing: 0.1em;
  color: var(--gf-yue);
  text-shadow: 0 0 34px rgba(194, 53, 42, 0.35), 0 2px 0 rgba(0,0,0,0.6);
}
.gf-t-char {
  display: inline-block;
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
/* 印章：单文本 + 自身 writing-mode */
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
  letter-spacing: 0.12em;
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

/* 开篇词（临江仙）：竖排词卷 */
.gf-ci-wrap {
  margin: 6vh auto 0;
  max-width: 640px;
}
.gf-ci-head {
  font-family: var(--gf-kai);
  font-size: 15px;
  letter-spacing: 0.5em;
  padding-left: 0.5em;
  color: var(--gf-gold);
  margin-bottom: 2.5vh;
}
.gf-ci {
  /* vertical-rl 容器内禁止开 flex（主轴翻转会打乱字序）；块级 + fit-content 居中即可 */
  width: fit-content;
  margin: 0 auto;
  border: 1px solid rgba(201, 160, 92, 0.25);
  border-radius: 6px;
  background: rgba(233, 223, 202, 0.02);
}
.gf-ci-line { font-size: clamp(17px, 2vw, 22px); }

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
.gf-rule b { font-size: 10px; color: var(--gf-gold); }

/* ============ 卷目 ============ */
.gf-toc {
  max-width: 640px;
  margin: 4vh auto 0;
  padding: 0 26px;
}
.gf-toc-head {
  font-family: var(--gf-kai);
  font-size: 16px;
  letter-spacing: 0.62em;
  padding-left: 0.62em;
  text-align: center;
  color: var(--gf-gold);
  margin-bottom: 2.5vh;
}
.gf-toc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.gf-toc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  background: rgba(233, 223, 202, 0.02);
  border: 1px solid rgba(201, 160, 92, 0.18);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
}
.gf-toc-item:hover {
  border-color: var(--gf-gold);
  background: rgba(233, 223, 202, 0.05);
  transform: translateY(-2px);
}
.gf-toc-item b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  font-family: var(--gf-kai);
  font-size: 15px;
  color: #f3e9d6;
  background: linear-gradient(150deg, #c9402f, var(--gf-zhu-deep));
  border-radius: 4px;
}
.gf-toc-item span {
  font-family: var(--gf-kai);
  font-size: 14.5px;
  letter-spacing: 0.22em;
  color: var(--gf-yue);
}

/* ============ 观（五观+续观通用） ============ */
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
.gf-guan-tag {
  font-family: var(--gf-kai);
  font-size: 12px;
  letter-spacing: 0.2em;
  color: var(--gf-zhu);
  border: 1px solid rgba(194, 53, 42, 0.5);
  border-radius: 999px;
  padding: 3px 10px;
  white-space: nowrap;
  transform: translateY(-6px);
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
.gf-poem {
  writing-mode: vertical-rl;
  padding: 26px 30px;
  border-right: 1px solid rgba(201, 160, 92, 0.35);
  border-left: 1px solid rgba(201, 160, 92, 0.12);
  background: linear-gradient(180deg, rgba(194, 53, 42, 0.05), transparent 70%);
  flex-shrink: 0;
}
.gf-poem-line {
  display: block;
  margin-left: 20px;
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

/* 续观分界横幅 */
.gf-xu-banner { padding: 8vh 26px 2vh; }
.gf-xu-banner .gf-rule { margin: 0 auto; }
.gf-xu-text {
  font-family: var(--gf-kai);
  font-size: clamp(16px, 2vw, 20px);
  line-height: 2.4;
  letter-spacing: 0.12em;
  text-align: center;
  color: var(--gf-yue);
  margin: 0;
  padding: 4.5vh 0;
}

/* ============ 章节 ============ */
.gf-chapter {
  max-width: 780px;
  margin: 0 auto;
  padding: 10vh 26px 0;
}
.gf-chapter-wide { max-width: 980px; }
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

/* ============ 时间轴 ============ */
.gf-timeline {
  margin: 4vh 0 5vh;
  padding-left: 22px;
  border-left: 1px solid rgba(201, 160, 92, 0.3);
}
.gf-tl-item {
  position: relative;
  padding: 0 0 4vh 26px;
}
.gf-tl-item:last-child { padding-bottom: 0; }
.gf-tl-dot {
  position: absolute;
  left: -22px;
  top: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--gf-gold);
  box-shadow: 0 0 0 4px rgba(201, 160, 92, 0.15), 0 0 12px rgba(201, 160, 92, 0.5);
  transform: translateX(-50%);
  margin-left: 0.5px;
}
.gf-tl-era {
  font-family: var(--gf-kai);
  font-size: 13px;
  letter-spacing: 0.3em;
  color: var(--gf-gold);
  margin-bottom: 6px;
}
.gf-tl-body b {
  font-family: var(--gf-kai);
  font-size: 19px;
  letter-spacing: 0.14em;
  color: var(--gf-yue);
}
.gf-tl-body p {
  font-size: 15px;
  line-height: 1.95;
  letter-spacing: 0.04em;
  color: var(--gf-yue-dim);
  margin: 6px 0 0;
  text-align: justify;
}

/* ============ 造山公式 / 工具谱 ============ */
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
.gf-tools {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 3.5vh 0 4vh;
}
.gf-tool {
  padding: 16px 18px;
  border: 1px solid rgba(201, 160, 92, 0.18);
  border-radius: 6px;
  background: rgba(233, 223, 202, 0.02);
  transition: border-color 0.3s ease, transform 0.3s ease;
}
.gf-tool:hover { border-color: rgba(201, 160, 92, 0.5); transform: translateY(-2px); }
.gf-tool-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.gf-tool-head b {
  font-family: var(--gf-kai);
  font-size: 16.5px;
  letter-spacing: 0.1em;
  color: var(--gf-gold-hi);
}
.gf-tool-head span {
  font-size: 12px;
  letter-spacing: 0.15em;
  color: var(--gf-zhu);
}
.gf-tool p {
  font-size: 13.5px;
  line-height: 1.85;
  letter-spacing: 0.03em;
  color: var(--gf-yue-dim);
  margin: 0;
  text-align: justify;
}

/* ============ 杂咏诗卷 ============ */
.gf-zayong {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 4vh;
}
.gf-zy-item {
  border: 1px solid rgba(201, 160, 92, 0.2);
  border-radius: 6px;
  background: rgba(233, 223, 202, 0.02);
  padding: 20px 16px 24px;
  text-align: center;
  transition: border-color 0.3s ease, transform 0.3s ease;
}
.gf-zy-item:hover { border-color: rgba(201, 160, 92, 0.5); transform: translateY(-3px); }
.gf-zy-title {
  font-family: var(--gf-kai);
  font-size: 17px;
  letter-spacing: 0.35em;
  padding-left: 0.35em;
  color: var(--gf-gold-hi);
  margin-bottom: 18px;
}
.gf-zy-poem {
  /* vertical-rl 容器内禁止开 flex；fit-content + auto 外边距居中 */
  width: fit-content;
  margin: 0 auto;
  padding: 0;
  border: none;
  background: none;
}
.gf-zy-line { font-size: 19px; margin-left: 13px; }

/* ============ 观山者说 ============ */
.gf-creators {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 3.5vh 0 4vh;
}
.gf-creator {
  padding: 16px 18px;
  border: 1px solid rgba(201, 160, 92, 0.18);
  border-radius: 6px;
  background: rgba(233, 223, 202, 0.02);
  transition: border-color 0.3s ease;
}
.gf-creator:hover { border-color: rgba(201, 160, 92, 0.5); }
.gf-creator-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.gf-creator-head b {
  font-family: var(--gf-kai);
  font-size: 17px;
  letter-spacing: 0.1em;
  color: var(--gf-gold-hi);
}
.gf-creator-head span {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--gf-zhu);
}
.gf-creator p {
  font-size: 13.5px;
  line-height: 1.85;
  letter-spacing: 0.03em;
  color: var(--gf-yue-dim);
  margin: 0;
  text-align: justify;
}
.gf-films {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 3vh;
}
.gf-film {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  border: 1px solid rgba(201, 160, 92, 0.16);
  border-radius: 6px;
  text-decoration: none;
  transition: border-color 0.25s ease, transform 0.25s ease, background 0.25s ease;
}
.gf-film:hover {
  border-color: var(--gf-gold);
  background: rgba(233, 223, 202, 0.03);
  transform: translateX(3px);
}
.gf-film b {
  font-family: var(--gf-kai);
  font-size: 14.5px;
  letter-spacing: 0.06em;
  color: var(--gf-yue);
}
.gf-film span {
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--gf-yue-dim);
  white-space: nowrap;
}

/* ============ FAQ ============ */
.gf-faqs { display: flex; flex-direction: column; gap: 14px; }
.gf-faq {
  border: 1px solid rgba(201, 160, 92, 0.18);
  border-left: 3px solid var(--gf-zhu);
  border-radius: 6px;
  background: rgba(233, 223, 202, 0.02);
  padding: 18px 22px;
}
.gf-faq-q {
  font-family: var(--gf-kai);
  font-size: 18px;
  letter-spacing: 0.14em;
  color: var(--gf-gold-hi);
  margin-bottom: 10px;
}
.gf-faq-a {
  font-size: 15px;
  line-height: 2;
  letter-spacing: 0.04em;
  color: var(--gf-yue-dim);
  margin: 0;
  text-align: justify;
}

/* ============ 视频 ============ */
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
  /* 词卷随 .gf-poem 横排降级，勿开 flex */
  .gf-ci { padding: 20px 14px; }
  .gf-zayong { grid-template-columns: repeat(2, 1fr); }
  .gf-formula,
  .gf-tools,
  .gf-creators,
  .gf-films { grid-template-columns: 1fr; }
  .gf-hero-img img {
    mask-image: linear-gradient(180deg, #000 42%, rgba(0,0,0,0.35) 72%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 42%, rgba(0,0,0,0.35) 72%, transparent 100%);
    object-position: 50% 30%;
  }
  .gf-hero-inner::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(180deg, transparent 32%, rgba(15, 11, 8, 0.62) 72%, rgba(15, 11, 8, 0.85) 100%);
  }
  .gf-hero-inner { align-items: flex-end; padding: 0 8vw 16vh; }
  .gf-guan-head { flex-wrap: wrap; }
  .gf-toc-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .gf-zayong { grid-template-columns: 1fr; }
}
</style>
