import { initAnalytics, auth, analytics } from './firebase'
import { initUI } from './ui'
import { initViz } from './viz'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User
} from 'firebase/auth'

initAnalytics()
initUI()
initViz()

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

import { logEvent } from 'firebase/analytics'

const BLOG_URL      = import.meta.env.VITE_BLOG_URL      ?? '#'
const SUBSCRIBE_URL = import.meta.env.VITE_SUBSCRIBE_URL  ?? '#'
const GITHUB_URL    = import.meta.env.VITE_GITHUB_URL     ?? 'https://github.com'

// Wire up all links and track clicks
function setLink(id: string, href: string) {
  const el = document.getElementById(id) as HTMLAnchorElement | null
  if (el) {
    el.href = href
    el.addEventListener('click', () => {
      if (analytics) {
        const category = id.startsWith('hero-') 
          ? 'hero_action_click' 
          : (id.startsWith('card-') ? 'card_click' : 'nav_link_click')
        logEvent(analytics, category, {
          element_id: id,
          destination_url: href
        })
      }
    })
  }
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

// Post count (injected at build time from apps/blog/src/pages/posts/)
const postCountEl = document.getElementById('post-count')
if (postCountEl) postCountEl.textContent = String(__POST_COUNT__)
