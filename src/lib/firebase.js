import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, isSupported as messagingSupported } from 'firebase/messaging';

const fallbackEnv = {
  VITE_FIREBASE_API_KEY: 'AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I',
  VITE_FIREBASE_AUTH_DOMAIN: 'kar-kardan.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://kar-kardan-default-rtdb.asia-southeast1.firebasedatabase.app',
  VITE_FIREBASE_PROJECT_ID: 'kar-kardan',
  VITE_FIREBASE_STORAGE_BUCKET: 'kar-kardan.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '554147696994',
  VITE_FIREBASE_APP_ID: '1:554147696994:web:221dcb883e3b65dcea5c3b',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-RRC3X485KQ',
  VITE_FIREBASE_MESSAGING_VAPID_KEY: 'BEXXcNApWgB7q2zcauzld7kL5nyI4ahXVr8xN3OSgjhtqzz2dQwkKIbMTjy4deMO2vcTseaGdWXuonaxcdpf8cI'
};

export function env(...keys) {
  for (const key of keys) {
    if (import.meta.env?.[key]) return import.meta.env[key];
    if (typeof window !== 'undefined' && window.__ENV__?.[key]) return window.__ENV__[key];
    if (fallbackEnv[key]) return fallbackEnv[key];
  }
  return '';
}

export const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  databaseURL: env('VITE_FIREBASE_DATABASE_URL', 'NEXT_PUBLIC_FIREBASE_DATABASE_URL', 'REACT_APP_FIREBASE_DATABASE_URL'),
  projectId: env('VITE_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID'),
  measurementId: env('VITE_FIREBASE_MEASUREMENT_ID', 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'REACT_APP_FIREBASE_MEASUREMENT_ID')
};

export const firebaseMessagingVapidKey = env(
  'VITE_FIREBASE_MESSAGING_VAPID_KEY',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY',
  'REACT_APP_FIREBASE_MESSAGING_VAPID_KEY'
);

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const messagingPromise = messagingSupported().then((supported) => (supported ? getMessaging(firebaseApp) : null));
export const analyticsPromise = analyticsSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null));

enableIndexedDbPersistence(db).catch((error) => {
  if (!['failed-precondition', 'unimplemented'].includes(error.code)) {
    console.warn('Firestore persistence unavailable', error);
  }
});
