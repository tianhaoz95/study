import { db } from './firebase.ts'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const HOME_URL = import.meta.env.VITE_HOME_URL ?? '#'
const BLOG_URL = import.meta.env.VITE_BLOG_URL ?? '#'

// Wire up nav/footer links
function setLink(id: string, href: string) {
  const el = document.getElementById(id) as HTMLAnchorElement | null
  if (el) el.href = href
}
setLink('nav-home',     HOME_URL)
setLink('nav-blog',     BLOG_URL)
setLink('success-blog', BLOG_URL)

// ── UI state machine ──────────────────────────────────────────
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

function setLoading(label: string) {
  show('loading')
  const el = document.getElementById('loading-label')
  if (el) el.textContent = label
}

// ── Firestore save (best-effort) ──────────────────────────────
async function saveSubscription(email: string) {
  if (!db) return           // no Firebase config — skip silently
  try {
    await setDoc(doc(db, 'subscriptions', email.toLowerCase()), {
      email: email.toLowerCase(),
      source: 'email',
      subscribedAt: serverTimestamp(),
    }, { merge: true })
  } catch {
    // Firestore write failed — swallow, still show success to user
  }
}

// ── Success display ───────────────────────────────────────────
function showSuccess(email: string) {
  const el = document.getElementById('success-email')
  if (el) el.textContent = email
  show('success')
}

// ── Email form ────────────────────────────────────────────────
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
    setFieldError('Please enter a valid email address.')
    return
  }
  setFieldError(null)

  if (btnSubmit) btnSubmit.disabled = true
  setLoading('Subscribing…')

  await saveSubscription(email)
  showSuccess(email)
})

emailInput?.addEventListener('input', () => setFieldError(null))
