import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyANltQ7YlQS5GSOeSFJomfVLFZwYY87l5k',
  authDomain: 'paradigm-studio-b5227.firebaseapp.com',
  projectId: 'paradigm-studio-b5227',
  storageBucket: 'paradigm-studio-b5227.firebasestorage.app',
  messagingSenderId: '607922628678',
  appId: '1:607922628678:web:de71c4d22fd8ef7c664247',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
