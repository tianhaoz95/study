import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'

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

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    return getAnalytics(app)
  }
}
