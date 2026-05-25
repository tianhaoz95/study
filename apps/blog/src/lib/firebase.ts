import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDSeTPnu6jCQsAyzrfCag_G_PmgGLJ1dus",
  authDomain: "heji-study.firebaseapp.com",
  projectId: "heji-study",
  storageBucket: "heji-study.firebasestorage.app",
  messagingSenderId: "738449356267",
  appId: "1:738449356267:web:05daa7260dfc63e9d395ae",
  measurementId: "G-MDQFND7CLR",
};

export const app = initializeApp(firebaseConfig);

// Analytics is browser-only
export function initAnalytics() {
  if (typeof window !== "undefined") {
    return getAnalytics(app);
  }
}
