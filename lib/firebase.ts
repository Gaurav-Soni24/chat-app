import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyArK5UykiUqF7QJv8hb57ylP8X6Ms2uxgE",
  authDomain: "chatwave-e0794.firebaseapp.com",
  projectId: "chatwave-e0794",
  storageBucket: "chatwave-e0794.firebasestorage.app",
  messagingSenderId: "120972041509",
  appId: "1:120972041509:web:c3dcc8dcf8ceb7bc93cecc",
  measurementId: "G-3YGHT9EKEL"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }

