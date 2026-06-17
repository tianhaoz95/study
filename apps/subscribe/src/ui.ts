type Theme = 'dark' | 'light'
type Lang  = 'en' | 'zh'

const THEME_KEY = 'heji-theme'
const LANG_KEY  = 'heji-lang'
const HTML      = document.documentElement

const translations: Record<Lang, Record<string, string>> = {
  en: {
    'nav-brand':         'AI/ML Deep Dives',
    'nav-blog':          'Blog',
    'eyebrow':           'Personal Research Blog',
    'heading-1':         'Deep dives into',
    'heading-2':         'AI & ML research.',
    'intro-desc':        'Frontier models, research papers, and open-source implementations — explored with interactive visualizations and annotated source code.',
    'feat-1-title':      'Research papers, made readable',
    'feat-1-desc':       'Dense math and jargon translated into clear explanations and diagrams.',
    'feat-2-title':      'Interactive visualizations',
    'feat-2-desc':       'Intuitions you can see and explore, not just read about.',
    'feat-3-title':      'Source code walkthroughs',
    'feat-3-desc':       'Annotated open-source implementations from the models you care about.',
    'topics-label':      'Recent topics',
    'card-title':        'Stay in the loop',
    'card-sub-1':        'Get notified when new AI/ML deep dives drop.',
    'card-sub-2':        'No noise — just the signal.',
    'email-placeholder': 'you@example.com',
    'btn-submit':        'Subscribe',
    'card-legal':        'No spam, ever. Unsubscribe at any time.',
    'loading-label':     'Subscribing…',
    'success-title':     "You're in!",
    'success-msg':       "You'll hear from me when the next deep dive drops.",
    'success-blog':      'Read the latest post →',
    'error-email':       'Please enter a valid email address.',
  },
  zh: {
    'nav-brand':         'AI/ML 深度解析',
    'nav-blog':          '博客',
    'eyebrow':           '个人研究博客',
    'heading-1':         '深入探索',
    'heading-2':         'AI 与 ML 研究。',
    'intro-desc':        '解析前沿模型、研究论文与开源实现——配合交互式可视化和注释源码。',
    'feat-1-title':      '研究论文解析',
    'feat-1-desc':       '将密集的数学公式和术语转化为清晰的解释与图表。',
    'feat-2-title':      '交互式可视化',
    'feat-2-desc':       '可直观感受与探索的直觉，而非仅仅阅读文字。',
    'feat-3-title':      '源码精读',
    'feat-3-desc':       '对你关注模型的注释开源实现深度解析。',
    'topics-label':      '近期主题',
    'card-title':        '订阅更新',
    'card-sub-1':        '第一时间获取 AI/ML 深度文章更新。',
    'card-sub-2':        '只有信号，没有噪音。',
    'email-placeholder': '你的邮箱',
    'btn-submit':        '订阅',
    'card-legal':        '绝不发垃圾邮件，随时可退订。',
    'loading-label':     '订阅中…',
    'success-title':     '订阅成功！',
    'success-msg':       '下次深度文章发布时，你将第一时间收到通知。',
    'success-blog':      '阅读最新文章 →',
    'error-email':       '请输入有效的邮箱地址。',
  },
}

export function t(key: string): string {
  const lang = (localStorage.getItem(LANG_KEY) || 'en') as Lang
  return translations[lang][key] ?? key
}

import { logEvent } from 'firebase/analytics'
import { analytics } from './firebase'

export function applyTheme(theme: Theme) {
  HTML.dataset.theme = theme
  const sun  = document.getElementById('icon-sun')
  const moon = document.getElementById('icon-moon')
  if (sun)  sun.style.display  = theme === 'light' ? 'none' : ''
  if (moon) moon.style.display = theme === 'dark'  ? 'none' : ''
  localStorage.setItem(THEME_KEY, theme)

  if (analytics) {
    logEvent(analytics, 'theme_changed', { theme })
  }
}

export function applyLang(lang: Lang) {
  HTML.lang = lang === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const val = translations[lang][el.dataset.i18n!]
    if (val != null) el.textContent = val
  })
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(el => {
    const val = translations[lang][el.dataset.i18nPlaceholder!]
    if (val != null) el.placeholder = val
  })
  const btn = document.getElementById('lang-toggle')
  if (btn) btn.textContent = lang === 'zh' ? 'EN' : '中'
  localStorage.setItem(LANG_KEY, lang)

  if (analytics) {
    logEvent(analytics, 'language_changed', { language: lang })
  }
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
