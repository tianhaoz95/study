import './style.css'
import { db, initAnalytics } from './firebase'
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'

initAnalytics()

// ── Theme ────────────────────────────────────────────────────
const THEME_KEY = 'heji-theme'
type Theme = 'dark' | 'light'
const HTML = document.documentElement

function applyTheme(theme: Theme) {
  HTML.dataset.theme = theme
  const sun  = document.getElementById('icon-sun')
  const moon = document.getElementById('icon-moon')
  if (sun)  sun.style.display  = theme === 'light' ? 'none' : ''
  if (moon) moon.style.display = theme === 'dark'  ? 'none' : ''
  localStorage.setItem(THEME_KEY, theme)
}

const savedTheme = (localStorage.getItem(THEME_KEY) || 'dark') as Theme
applyTheme(savedTheme)

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  applyTheme((HTML.dataset.theme as Theme) === 'dark' ? 'light' : 'dark')
})

// ── Types ─────────────────────────────────────────────────────
interface Suggestion {
  id: string
  topic: string
  email?: string
  createdAt: Date | null
}

// ── State ─────────────────────────────────────────────────────
let allSuggestions: Suggestion[] = []

// ── DOM refs ──────────────────────────────────────────────────
const listEl       = document.getElementById('suggestions-list')!
const totalEl      = document.getElementById('stat-total')!
const todayEl      = document.getElementById('stat-today')!
const searchEl     = document.getElementById('search') as HTMLInputElement
const sortEl       = document.getElementById('sort') as HTMLSelectElement
const refreshBtn   = document.getElementById('refresh-btn')!

// ── Helpers ───────────────────────────────────────────────────
function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(d: Date | null): string {
  if (!d) return ''
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function isToday(d: Date | null): boolean {
  if (!d) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Render ────────────────────────────────────────────────────
function render() {
  const q = searchEl.value.trim().toLowerCase()
  const sortVal = sortEl.value

  let filtered = q
    ? allSuggestions.filter(s =>
        s.topic.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false)
      )
    : [...allSuggestions]

  if (sortVal === 'oldest') {
    filtered.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
  } else if (sortVal === 'az') {
    filtered.sort((a, b) => a.topic.localeCompare(b.topic))
  } else {
    filtered.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="state-box">
        <span class="state-icon">💡</span>
        <span>${q ? 'No suggestions match your search.' : 'No suggestions yet.'}</span>
      </div>`
    return
  }

  listEl.innerHTML = filtered.map(s => `
    <div class="suggestion-card">
      <div class="suggestion-topic">${escapeHtml(s.topic)}</div>
      <div class="suggestion-meta">
        ${s.email ? `<span class="suggestion-email">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          ${escapeHtml(s.email)}
        </span>` : ''}
      </div>
      <div class="suggestion-date">
        ${formatDate(s.createdAt)}<br/>
        <span style="color:var(--muted)">${formatTime(s.createdAt)}</span>
      </div>
    </div>`).join('')
}

// ── Load data ─────────────────────────────────────────────────
async function load() {
  listEl.innerHTML = `<div class="state-box"><div class="spinner"></div><span>Loading…</span></div>`

  try {
    const snap = await getDocs(query(collection(db, 'topic-suggestions'), orderBy('createdAt', 'desc')))
    allSuggestions = snap.docs.map(doc => {
      const data = doc.data()
      const ts = data['createdAt'] as Timestamp | null
      return {
        id: doc.id,
        topic: String(data['topic'] ?? ''),
        email: data['email'] ? String(data['email']) : undefined,
        createdAt: ts instanceof Timestamp ? ts.toDate() : null,
      }
    })

    totalEl.textContent = String(allSuggestions.length)
    todayEl.textContent = String(allSuggestions.filter(s => isToday(s.createdAt)).length)
    render()
  } catch (err) {
    listEl.innerHTML = `<div class="state-box"><span class="state-icon">⚠️</span><span>Failed to load suggestions. Check Firestore rules.</span></div>`
  }
}

searchEl.addEventListener('input', render)
sortEl.addEventListener('change', render)
refreshBtn.addEventListener('click', load)

load()
