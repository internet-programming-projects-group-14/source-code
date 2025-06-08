import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-9CaDSTOOspptxWhBz7twbXmeov0JNSk",
  authDomain: "vital-signal.firebaseapp.com",
  projectId: "vital-signal",
  storageBucket: "vital-signal.firebasestorage.app",
  messagingSenderId: "793688644592",
  appId: "1:793688644592:web:1ff3ee41f5327ebe6a5b35",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
