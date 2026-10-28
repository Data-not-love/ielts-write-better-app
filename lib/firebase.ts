import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Firebase web config is public by design (it ships to every browser); access is
// enforced by firestore.rules and the API routes, not by keeping this secret.
const firebaseConfig = {
  apiKey: "AIzaSyBAwSiZLjScVY7eajey-Y_OGJU1bs5BF6A",
  authDomain: "ieltswriting-36004.firebaseapp.com",
  projectId: "ieltswriting-36004",
  storageBucket: "ieltswriting-36004.firebasestorage.app",
  messagingSenderId: "1003686782707",
  appId: "1:1003686782707:web:004e1eff8d7cb4a4443986",
  measurementId: "G-4Q1LMM63E5",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
