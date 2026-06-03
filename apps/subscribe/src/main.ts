import { db, initAnalytics, auth } from './firebase.ts'
import { initUI, t } from './ui.ts'
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const HOME_URL = import.meta.env.VITE_HOME_URL ?? '#'
const BLOG_URL = import.meta.env.VITE_BLOG_URL ?? '#'

function setLink(id: string, href: string) {
  const el = document.getElementById(id) as HTMLAnchorElement | null
  if (el) el.href = href
}
setLink('nav-home',     HOME_URL)
setLink('nav-blog',     BLOG_URL)
setLink('success-blog', BLOG_URL)

type Screen = 'signup' | 'loading' | 'success'

function show(screen: Screen) {
  const ids: Record<Screen, string> = {
    signup:  'card-signup',
    loading: 'card-loading',
    success: 'card-success',
  }
  for (const [key, id] of Object.entries(ids)) {
    const el = document.getElementById(id)
    if (el) el.hidden = key !== screen
  }
}

function setLoading() {
  show('loading')
  const el = document.getElementById('loading-label')
  if (el) el.textContent = t('loading-label')
}

async function saveSubscription(email: string) {
  if (!db) return
  try {
    await setDoc(doc(db, 'subscriptions', email.toLowerCase()), {
      email: email.toLowerCase(),
      source: 'email',
      subscribedAt: serverTimestamp(),
    }, { merge: true })
  } catch {
    // swallow — still show success
  }
}

function showSuccess(email: string) {
  const el = document.getElementById('success-email')
  if (el) el.textContent = email
  show('success')
}

const emailForm  = document.getElementById('email-form')  as HTMLFormElement | null
const emailInput = document.getElementById('email-input') as HTMLInputElement | null
const btnSubmit  = document.getElementById('btn-submit')  as HTMLButtonElement | null
const fieldError = document.getElementById('field-error') as HTMLParagraphElement | null

function setFieldError(msg: string | null) {
  if (!fieldError || !emailInput) return
  if (msg) {
    fieldError.textContent = msg
    fieldError.hidden = false
    emailInput.classList.add('error')
  } else {
    fieldError.hidden = true
    emailInput.classList.remove('error')
  }
}

emailForm?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = emailInput?.value.trim() ?? ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError(t('error-email'))
    return
  }
  setFieldError(null)
  if (btnSubmit) btnSubmit.disabled = true
  setLoading()
  await saveSubscription(email)
  showSuccess(email)
})

emailInput?.addEventListener('input', () => setFieldError(null))

// Topic chips — injected at build time from blog post tags
const chipsEl = document.querySelector<HTMLElement>('.topic-chips')
if (chipsEl) {
  chipsEl.innerHTML = __RECENT_TOPICS__
    .map(t => `<span class="chip">${t}</span>`)
    .join('')
}
