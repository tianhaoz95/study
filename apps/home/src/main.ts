const BLOG_URL      = import.meta.env.VITE_BLOG_URL      ?? '#'
const SUBSCRIBE_URL = import.meta.env.VITE_SUBSCRIBE_URL  ?? '#'
const GITHUB_URL    = import.meta.env.VITE_GITHUB_URL     ?? 'https://github.com'

// Wire up all links
function setLink(id: string, href: string) {
  const el = document.getElementById(id) as HTMLAnchorElement | null
  if (el) el.href = href
}

setLink('nav-blog',         BLOG_URL)
setLink('nav-subscribe',    SUBSCRIBE_URL)
setLink('nav-github',       GITHUB_URL)
setLink('hero-blog',        BLOG_URL)
setLink('hero-subscribe',   SUBSCRIBE_URL)
setLink('card-blog',        BLOG_URL)
setLink('card-subscribe',   SUBSCRIBE_URL)
setLink('card-github',      GITHUB_URL)
setLink('footer-blog',      BLOG_URL)
setLink('footer-subscribe', SUBSCRIBE_URL)
setLink('footer-github',    GITHUB_URL)

// Year
const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())
