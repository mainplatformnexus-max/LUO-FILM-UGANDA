import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyBAnK_DfXl3A29MK6gWh5jkBird81I5gVs",
  authDomain: "luo-movies.firebaseapp.com",
  databaseURL: "https://luo-movies-default-rtdb.firebaseio.com",
  projectId: "luo-movies",
  storageBucket: "luo-movies.firebasestorage.app",
  messagingSenderId: "949104157796",
  appId: "1:949104157796:web:f3c87eabd306c46ec06b71",
  measurementId: "G-NSGXF3N91S",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const database = getDatabase(app)
export const storage = getStorage(app)

// Initialize analytics only on client-side
export const getAnalyticsInstance = () => {
  if (typeof window !== "undefined") {
    return getAnalytics(app)
  }
  return null
}
