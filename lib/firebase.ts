import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCvTKhQTFSnymeRsElMeg6o353vy_wZOOA",
  authDomain: "chat-app-61f30.firebaseapp.com",
  projectId: "chat-app-61f30",
  storageBucket: "chat-app-61f30.firebasestorage.app",
  messagingSenderId: "9141000799",
  appId: "1:9141000799:web:b5af82ca9037be4dd399ea",
  measurementId: "G-RZ3RDQQW52"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }

