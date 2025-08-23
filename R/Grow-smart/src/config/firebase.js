// Firebase Configuration for GrowSmart
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyBTkLK39ymDYTHt48RQKBHZz-2ZoY5vpJ8",
  authDomain: "grow-smart-cd01a.firebaseapp.com",
  projectId: "grow-smart-cd01a",
  storageBucket: "grow-smart-cd01a.appspot.com",
  messagingSenderId: "451061049547",
  appId: "1:451061049547:web:9cbe85e136cb0f3ef5d34e"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);