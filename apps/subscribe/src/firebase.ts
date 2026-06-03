import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDSeTPnu6jCQsAyzrfCag_G_PmgGLJ1dus",
  authDomain: "heji-study.firebaseapp.com",
  projectId: "heji-study",
  storageBucket: "heji-study.firebasestorage.app",
  messagingSenderId: "738449356267",
  appId: "1:738449356267:web:a504e1fa5144b373d395ae",
  measurementId: "G-L7EDQ0ER9K",
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8081)
}

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    return getAnalytics(app)
  }
}
