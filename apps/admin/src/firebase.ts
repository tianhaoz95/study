import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDSeTPnu6jCQsAyzrfCag_G_PmgGLJ1dus',
  authDomain: 'heji-study.firebaseapp.com',
  projectId: 'heji-study',
  storageBucket: 'heji-study.firebasestorage.app',
  messagingSenderId: '738449356267',
  appId: '1:738449356267:web:5c3b5f7ef3afab13d395ae',
  measurementId: 'G-QTJZ8PH9RF',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  connectAuthEmulator(auth, 'http://localhost:9095', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8086)
}

let _analytics = undefined;
if (typeof window !== 'undefined') {
  try {
    _analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Firebase Analytics is not supported or was blocked:", e);
  }
}
export const analytics = _analytics;

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    try {
      return getAnalytics(app);
    } catch (e) {
      console.warn("Firebase Analytics initialization failed:", e);
    }
  }
}
