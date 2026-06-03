import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

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

export function initAnalytics() {
  if (typeof window !== 'undefined') {
    return getAnalytics(app)
  }
}
