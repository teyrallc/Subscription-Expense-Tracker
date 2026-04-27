import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDhOFQqqUj_ztuRHuI6jSs1-awODL6Cu_M",
  authDomain: "subscription-redcorder.firebaseapp.com",
  projectId: "subscription-redcorder",
  storageBucket: "subscription-redcorder.firebasestorage.app",
  messagingSenderId: "191070973086",
  appId: "1:191070973086:web:73ff6a15ef6e27a8e59f8f",
  measurementId: "G-PH9LMHELVL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
