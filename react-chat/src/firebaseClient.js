import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I',
  authDomain: 'kar-kardan.firebaseapp.com',
  projectId: 'kar-kardan',
  storageBucket: 'kar-kardan.firebasestorage.app',
  messagingSenderId: '554147696994',
  appId: '1:554147696994:web:221dcb883e3b65dcea5c3b',
  measurementId: 'G-RRC3X485KQ',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
