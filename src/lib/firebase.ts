import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0514337464",
  appId: "1:792788288028:web:05659742041e249ea995d9",
  apiKey: "AIzaSyDR7KKptJ5NycOzw87W5wGkxRz3mtJRtP0",
  authDomain: "gen-lang-client-0514337464.firebaseapp.com",
  storageBucket: "gen-lang-client-0514337464.firebasestorage.app",
  messagingSenderId: "792788288028",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040");
