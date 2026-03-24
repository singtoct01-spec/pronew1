import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC1_QLRSkUiJR3efRouW4boRynRn35jaqM",
  authDomain: "kpbom-a0784.firebaseapp.com",
  projectId: "kpbom-a0784",
  storageBucket: "kpbom-a0784.firebasestorage.app",
  messagingSenderId: "616586200705",
  appId: "1:616586200705:web:513fcc79545e34c1546f80",
  measurementId: "G-ZKE0BKK17H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
