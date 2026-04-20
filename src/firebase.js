import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC0nuATe5xK9A2qr7rK4c4zDSiIwQQMNsQ",
  authDomain: "agromari-dashboard.firebaseapp.com",
  projectId: "agromari-dashboard",
  storageBucket: "agromari-dashboard.firebasestorage.app",
  messagingSenderId: "273759646475",
  appId: "1:273759646475:web:5fdca85f7ceee92dbe680e",
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
