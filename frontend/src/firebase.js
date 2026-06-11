import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnFxJmrkc4s67XKoHKRxZ1MVwhsFG2JKs",
  authDomain: "ai-image-generator-a6c1c.firebaseapp.com",
  projectId: "ai-image-generator-a6c1c",
  storageBucket: "ai-image-generator-a6c1c.firebasestorage.app",
  messagingSenderId: "62390414402",
  appId: "1:62390414402:web:668318fec72a774f3511db",
  measurementId: "G-6PL2ZQT4LB",
};

// ONLY ONCE
const app = initializeApp(firebaseConfig);

// exports
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;