import './style.css'
import { db, initAnalytics, auth, analytics } from './firebase'
import { logEvent } from 'firebase/analytics'
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User
} from 'firebase/auth'

initAnalytics()

let isAdminUser = false;

function setupAuthUI(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const mainContent = document.getElementById('main-content');
  const loginPrompt = document.getElementById('login-prompt');
  const loginMessage = document.getElementById('login-message');
  const centerSigninBtn = document.getElementById('center-signin-btn');

  // Wire up center sign-in button once
  centerSigninBtn?.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  });

  onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const avatarUrl = user.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
      const name = user.displayName || 'User';
      const email = user.email || '';
      
      let authorized = false;
      try {
        const docRef = doc(db, 'admins', email.toLowerCase());
        const docSnap = await getDoc(docRef);
        authorized = docSnap.exists();
      } catch (err) {
        console.error('Failed to verify admin status:', err);
      }

      isAdminUser = authorized;

      if (authorized) {
        if (mainContent) mainContent.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
      } else {
        if (mainContent) mainContent.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (loginMessage) loginMessage.textContent = `Access Denied: '${email}' is not authorized as an admin.`;
        if (centerSigninBtn) (centerSigninBtn as HTMLElement).style.display = 'none';
      }

      container.innerHTML = `
        <div class="user-profile">
          <img src="${avatarUrl}" class="user-avatar" id="auth-avatar" alt="${name}" />
          <div class="user-dropdown" id="auth-dropdown">
            <div class="dropdown-user-info">
              <span class="dropdown-user-name">${name}</span>
              <span class="dropdown-user-email">${email}</span>
              <span class="badge ${authorized ? 'badge-admin' : 'badge-unauthorized'}">${authorized ? 'Admin' : 'Not Authorized'}</span>
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
      isAdminUser = false;
      if (mainContent) mainContent.style.display = 'none';
      if (loginPrompt) loginPrompt.style.display = 'block';
      if (loginMessage) loginMessage.textContent = 'Please sign in with an authorized admin account to access the console.';
      if (centerSigninBtn) (centerSigninBtn as HTMLElement).style.display = 'inline-flex';
      
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

    // Load data after auth state is determined
    load();
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
  
  if (analytics) {
    logEvent(analytics, 'theme_changed', { theme })
  }
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

interface Feedback {
  id: string
  message: string
  email?: string
  rating?: number
  path?: string
  createdAt: Date | null
}

// ── State ─────────────────────────────────────────────────────
let allSuggestions: Suggestion[] = []
let allFeedback: Feedback[] = []
let activeTab: 'suggestions' | 'feedback' = 'suggestions'

// ── DOM refs ──────────────────────────────────────────────────
const listEl          = document.getElementById('suggestions-list')!
const feedbackListEl  = document.getElementById('feedback-list')!
const totalEl         = document.getElementById('stat-total')!
const todayEl         = document.getElementById('stat-today')!
const searchEl        = document.getElementById('search') as HTMLInputElement
const sortEl          = document.getElementById('sort') as HTMLSelectElement
const ratingFilterEl  = document.getElementById('rating-filter') as HTMLSelectElement
const refreshBtn      = document.getElementById('refresh-btn')!
const statTotalLabel  = document.getElementById('stat-total-label')!
const statChipAvg     = document.getElementById('stat-chip-avg')!
const statAvgEl       = document.getElementById('stat-avg')!
const pageTitleEl     = document.getElementById('page-title')!
const pageDescEl      = document.getElementById('page-desc')!
const tabSuggestions  = document.getElementById('tab-suggestions')!
const tabFeedback     = document.getElementById('tab-feedback')!

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

// ── Tabs Switching ───────────────────────────────────────────
function switchTab(tab: 'suggestions' | 'feedback') {
  activeTab = tab;
  
  if (tab === 'suggestions') {
    tabSuggestions.classList.add('active');
    tabSuggestions.setAttribute('aria-selected', 'true');
    tabSuggestions.setAttribute('tabindex', '0');
    
    tabFeedback.classList.remove('active');
    tabFeedback.setAttribute('aria-selected', 'false');
    tabFeedback.setAttribute('tabindex', '-1');
    
    listEl.style.display = 'flex';
    feedbackListEl.style.display = 'none';
    
    pageTitleEl.textContent = 'Topic Suggestions';
    pageDescEl.textContent = 'Suggestions submitted by blog readers via the Suggest Topic form.';
    statTotalLabel.textContent = 'total suggestions';
    statChipAvg.style.display = 'none';
    
    searchEl.placeholder = 'Filter by topic or email…';
    ratingFilterEl.style.display = 'none';
    
    sortEl.innerHTML = `
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="az">A → Z</option>
    `;
    sortEl.value = 'newest';
  } else {
    tabFeedback.classList.add('active');
    tabFeedback.setAttribute('aria-selected', 'true');
    tabFeedback.setAttribute('tabindex', '0');
    
    tabSuggestions.classList.remove('active');
    tabSuggestions.setAttribute('aria-selected', 'false');
    tabSuggestions.setAttribute('tabindex', '-1');
    
    listEl.style.display = 'none';
    feedbackListEl.style.display = 'flex';
    
    pageTitleEl.textContent = 'Reader Feedback';
    pageDescEl.textContent = 'Ratings and feedback submitted by blog readers.';
    statTotalLabel.textContent = 'total feedback';
    statChipAvg.style.display = 'flex';
    
    searchEl.placeholder = 'Filter by message, path, or email…';
    ratingFilterEl.style.display = 'block';
    
    sortEl.innerHTML = `
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
      <option value="rating-desc">Highest rating</option>
      <option value="rating-asc">Lowest rating</option>
    `;
    sortEl.value = 'newest';
  }
  
  searchEl.value = '';
  ratingFilterEl.value = 'all';
  
  render();
  updateStats();
}

function updateStats() {
  if (activeTab === 'suggestions') {
    totalEl.textContent = String(allSuggestions.length);
    todayEl.textContent = String(allSuggestions.filter(s => isToday(s.createdAt)).length);
  } else {
    totalEl.textContent = String(allFeedback.length);
    todayEl.textContent = String(allFeedback.filter(f => isToday(f.createdAt)).length);
    
    const ratedFeedback = allFeedback.filter(f => typeof f.rating === 'number');
    if (ratedFeedback.length > 0) {
      const avg = ratedFeedback.reduce((sum, f) => sum + (f.rating ?? 0), 0) / ratedFeedback.length;
      statAvgEl.textContent = `${avg.toFixed(1)} ★`;
    } else {
      statAvgEl.textContent = '—';
    }
  }
}

// ── Render ────────────────────────────────────────────────────
function renderSuggestions() {
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

function renderFeedback() {
  const q = searchEl.value.trim().toLowerCase()
  const sortVal = sortEl.value
  const ratingFilterVal = ratingFilterEl.value

  let filtered = [...allFeedback]

  // Filter by search query (message, email, path)
  if (q) {
    filtered = filtered.filter(f =>
      f.message.toLowerCase().includes(q) ||
      (f.email?.toLowerCase().includes(q) ?? false) ||
      (f.path?.toLowerCase().includes(q) ?? false)
    )
  }

  // Filter by rating
  if (ratingFilterVal !== 'all') {
    const minRating = parseInt(ratingFilterVal, 10)
    if (ratingFilterVal === '5') {
      filtered = filtered.filter(f => f.rating === 5)
    } else {
      filtered = filtered.filter(f => typeof f.rating === 'number' && f.rating >= minRating)
    }
  }

  // Sorting
  if (sortVal === 'oldest') {
    filtered.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
  } else if (sortVal === 'rating-desc') {
    filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } else if (sortVal === 'rating-asc') {
    filtered.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999))
  } else {
    // default: newest first
    filtered.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
  }

  if (filtered.length === 0) {
    feedbackListEl.innerHTML = `
      <div class="state-box">
        <span class="state-icon">💬</span>
        <span>No feedback matches your filters.</span>
      </div>`
    return
  }

  feedbackListEl.innerHTML = filtered.map(f => {
    // Build rating stars
    let starsHtml = ''
    if (typeof f.rating === 'number') {
      starsHtml = `<div class="feedback-rating" aria-label="${f.rating} out of 5 stars">`
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<span class="feedback-star ${i <= f.rating ? 'filled' : ''}">★</span>`
      }
      starsHtml += '</div>'
    } else {
      starsHtml = `<span style="font-size:0.75rem;color:var(--muted)">No rating</span>`
    }

    // Direct link to the post
    let pathUrl = f.path ?? '/'
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      pathUrl = `http://localhost:4321${f.path ?? ''}`
    }

    const pathBadge = f.path ? `
      <a href="${pathUrl}" target="_blank" rel="noopener noreferrer" class="feedback-path">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 10.8 10.8 7.8 16.2 13.2 13.2 16.2 7.8"/>
        </svg>
        ${escapeHtml(f.path)}
      </a>
    ` : ''

    const emailBadge = f.email ? `
      <span class="feedback-email">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        ${escapeHtml(f.email)}
      </span>
    ` : ''

    return `
      <div class="feedback-card">
        <div class="feedback-header">
          ${starsHtml}
          <div class="feedback-date">
            ${formatDate(f.createdAt)}<br/>
            <span style="color:var(--muted)">${formatTime(f.createdAt)}</span>
          </div>
        </div>
        <div class="feedback-message">${escapeHtml(f.message)}</div>
        ${(emailBadge || pathBadge) ? `
          <div class="feedback-footer">
            <div class="feedback-meta-left">
              ${emailBadge}
              ${pathBadge}
            </div>
          </div>
        ` : ''}
      </div>
    `
  }).join('')
}

function render() {
  if (activeTab === 'suggestions') {
    renderSuggestions();
  } else {
    renderFeedback();
  }
}

// ── Load data ─────────────────────────────────────────────────
async function load() {
  if (!isAdminUser) {
    return
  }

  listEl.innerHTML = `<div class="state-box"><div class="spinner"></div><span>Loading…</span></div>`
  feedbackListEl.innerHTML = `<div class="state-box"><div class="spinner"></div><span>Loading…</span></div>`

  try {
    const suggestionsPromise = getDocs(query(collection(db, 'topic-suggestions'), orderBy('createdAt', 'desc')));
    const feedbackPromise = getDocs(query(collection(db, 'feedback'), orderBy('createdAt', 'desc')));

    const [suggestionsSnap, feedbackSnap] = await Promise.all([suggestionsPromise, feedbackPromise]);

    allSuggestions = suggestionsSnap.docs.map(doc => {
      const data = doc.data()
      const ts = data['createdAt'] as Timestamp | null
      return {
        id: doc.id,
        topic: String(data['topic'] ?? ''),
        email: data['email'] ? String(data['email']) : undefined,
        createdAt: ts instanceof Timestamp ? ts.toDate() : null,
      }
    });

    allFeedback = feedbackSnap.docs.map(doc => {
      const data = doc.data()
      const ts = data['createdAt'] as Timestamp | null
      return {
        id: doc.id,
        message: String(data['message'] ?? ''),
        email: data['email'] ? String(data['email']) : undefined,
        rating: typeof data['rating'] === 'number' ? data['rating'] : undefined,
        path: data['path'] ? String(data['path']) : undefined,
        createdAt: ts instanceof Timestamp ? ts.toDate() : null,
      }
    });

    updateStats();
    render();
  } catch (err) {
    console.error('Failed to load data:', err);
    listEl.innerHTML = `<div class="state-box"><span class="state-icon">⚠️</span><span>Failed to load suggestions. Check Firestore rules.</span></div>`
    feedbackListEl.innerHTML = `<div class="state-box"><span class="state-icon">⚠️</span><span>Failed to load feedback. Check Firestore rules.</span></div>`
  }
}

let searchTimeout: number | null = null;
searchEl.addEventListener('input', () => {
  render()
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (analytics && searchEl.value.trim()) {
      logEvent(analytics, 'admin_search', { query_length: searchEl.value.trim().length })
    }
  }, 1000) as unknown as number
})

sortEl.addEventListener('change', () => {
  if (analytics) {
    logEvent(analytics, 'admin_sort', { sort_order: sortEl.value })
  }
  render()
})

ratingFilterEl.addEventListener('change', () => {
  if (analytics) {
    logEvent(analytics, 'admin_rating_filter', { rating_filter: ratingFilterEl.value })
  }
  render()
})

refreshBtn.addEventListener('click', () => {
  if (analytics) {
    logEvent(analytics, 'admin_refresh')
  }
  load()
})

tabSuggestions.addEventListener('click', () => {
  if (activeTab !== 'suggestions') {
    if (analytics) {
      logEvent(analytics, 'admin_tab_switch', { tab: 'suggestions' })
    }
    switchTab('suggestions')
  }
})

tabSuggestions.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    tabSuggestions.click();
  }
})

tabFeedback.addEventListener('click', () => {
  if (activeTab !== 'feedback') {
    if (analytics) {
      logEvent(analytics, 'admin_tab_switch', { tab: 'feedback' })
    }
    switchTab('feedback')
  }
})

tabFeedback.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    tabFeedback.click();
  }
})

