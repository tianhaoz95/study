import './style.css'
import { db, initAnalytics, auth } from './firebase'
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User
} from 'firebase/auth'

initAnalytics()

function setupAuthUI(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      const avatarUrl = user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
      const name = user.displayName || 'User';
      const email = user.email || '';
      
      container.innerHTML = `
        <div class="user-profile">
          <img src="${avatarUrl}" class="user-avatar" id="auth-avatar" alt="${name}" />
          <div class="user-dropdown" id="auth-dropdown">
            <div class="dropdown-user-info">
              <span class="dropdown-user-name">${name}</span>
              <span class="dropdown-user-email">${email}</span>
            </div>
            <button class="btn-signout" id="auth-signout-btn">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      `;

      const avatar = container.querySelector('#auth-avatar');
      const dropdown = container.querySelector('#auth-dropdown');
      const signoutBtn = container.querySelector('#auth-signout-btn');

      avatar?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('is-open');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown?.classList.remove('is-open');
      });

      signoutBtn?.addEventListener('click', async () => {
        try {
          await signOut(auth);
        } catch (err) {
          console.error('Sign out failed:', err);
        }
      });
    } else {
      container.innerHTML = `
        <button class="btn-signin" id="auth-signin-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Sign In
        </button>
      `;

      const signinBtn = container.querySelector('#auth-signin-btn');
      signinBtn?.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (err) {
          console.error('Sign in failed:', err);
        }
      });
    }
  });
}

setupAuthUI('auth-container')

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
