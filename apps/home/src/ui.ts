type Theme = 'dark' | 'light'
type Lang  = 'en' | 'zh'

const THEME_KEY = 'heji-theme'
const LANG_KEY  = 'heji-lang'
const HTML      = document.documentElement

const translations: Record<Lang, Record<string, string>> = {
  en: {
    'nav-blog':       'Blog',
    'nav-subscribe':  'Subscribe',
    'hero-tag':       'AI · ML · Research',
    'hero-title-1':   'Writing at the edge of',
    'hero-title-2':   'what machines can do',
    'hero-sub':       'Deep dives into frontier AI/ML research — transformers, diffusion models, and everything being built at the boundary of possibility.',
    'btn-blog':       'Read the blog',
    'btn-subscribe':  'Get updates',
    'stat-posts':     'post',
    'stat-open':      'open source',
    'stat-frontier':  'frontier',
    'stat-frontier-l':'models only',
    'card1-title':    'Technical blog',
    'card1-desc':     'Paper breakdowns, architecture diagrams, and interactive visualizations. Built for readers who want the actual math.',
    'card2-title':    'Stay in the loop',
    'card2-desc':     'Subscribe to get notified when new deep dives drop. No noise — just the signal when something worth reading lands.',
    'card3-title':    'Open experiments',
    'card3-desc':     'All benchmarks, minimal reproductions, and exploratory code are open-source. Fork and run anything.',
    'footer-tagline': 'Built with curiosity.',
    'footer-blog':    'Blog',
    'footer-sub':     'Subscribe',
    'footer-github':  'GitHub',
  },
  zh: {
    'nav-blog':       '博客',
    'nav-subscribe':  '订阅',
    'hero-tag':       'AI · 机器学习 · 研究',
    'hero-title-1':   '探索',
    'hero-title-2':   'AI 的边界',
    'hero-sub':       '深入探索前沿 AI/ML 研究——Transformer、扩散模型，以及一切正在边界上构建的技术。',
    'btn-blog':       '阅读博客',
    'btn-subscribe':  '获取更新',
    'stat-posts':     '篇文章',
    'stat-open':      '开源',
    'stat-frontier':  '前沿',
    'stat-frontier-l':'专属模型',
    'card1-title':    '技术博客',
    'card1-desc':     '论文解析、架构图解与交互式可视化。专为想看懂数学细节的读者而写。',
    'card2-title':    '订阅更新',
    'card2-desc':     '订阅后，每当新深度文章发布，你将第一时间收到通知。只有信号，没有噪音。',
    'card3-title':    '开源实验',
    'card3-desc':     '所有基准测试、最小复现和探索性代码均已开源。随时 Fork 并运行。',
    'footer-tagline': '用好奇心构建。',
    'footer-blog':    '博客',
    'footer-sub':     '订阅',
    'footer-github':  'GitHub',
  },
}

export function t(key: string): string {
  const lang = (localStorage.getItem(LANG_KEY) || 'en') as Lang
  return translations[lang][key] ?? key
}

export function applyTheme(theme: Theme) {
  HTML.dataset.theme = theme
  const sun  = document.getElementById('icon-sun')
  const moon = document.getElementById('icon-moon')
  if (sun)  sun.style.display  = theme === 'light' ? 'none' : ''
  if (moon) moon.style.display = theme === 'dark'  ? 'none' : ''
  localStorage.setItem(THEME_KEY, theme)
}

export function applyLang(lang: Lang) {
  HTML.lang = lang === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const val = translations[lang][el.dataset.i18n!]
    if (val != null) el.textContent = val
  })
  const btn = document.getElementById('lang-toggle')
  if (btn) btn.textContent = lang === 'zh' ? 'EN' : '中'
  localStorage.setItem(LANG_KEY, lang)
}

export function initUI() {
  const theme = (localStorage.getItem(THEME_KEY) || 'dark') as Theme
  const lang  = (localStorage.getItem(LANG_KEY)  || 'en')  as Lang
  applyTheme(theme)
  applyLang(lang)

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    applyTheme((HTML.dataset.theme as Theme) === 'dark' ? 'light' : 'dark')
  })
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    applyLang((localStorage.getItem(LANG_KEY) || 'en') === 'en' ? 'zh' : 'en')
  })
}
