import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDSeTPnu6jCQsAyzrfCag_G_PmgGLJ1dus",
  authDomain: "heji-study.firebaseapp.com",
  projectId: "heji-study",
  storageBucket: "heji-study.firebasestorage.app",
  messagingSenderId: "738449356267",
  appId: "1:738449356267:web:84170c6793a17a90d395ae",
  measurementId: "G-WXHVJNXNTX",
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  connectAuthEmulator(auth, 'http://localhost:9095', { disableWarnings: true })
}

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : undefined

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    return getAnalytics(app)
  }
}
