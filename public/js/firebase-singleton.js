const FIREBASE_VERSION = "10.13.2";

const moduleCache = new Map();
let servicesPromise = null;

const defaultFirebaseEnv = {
  VITE_FIREBASE_API_KEY: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
  VITE_FIREBASE_AUTH_DOMAIN: "kar-kardan.firebaseapp.com",
  VITE_FIREBASE_DATABASE_URL: "https://kar-kardan-default-rtdb.asia-southeast1.firebasedatabase.app",
  VITE_FIREBASE_PROJECT_ID: "kar-kardan",
  VITE_FIREBASE_STORAGE_BUCKET: "kar-kardan.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "554147696994",
  VITE_FIREBASE_APP_ID: "1:554147696994:web:221dcb883e3b65dcea5c3b",
  VITE_FIREBASE_MEASUREMENT_ID: "G-RRC3X485KQ",
  VITE_FIREBASE_MESSAGING_VAPID_KEY: "BEXXcNApWgB7q2zcauzld7kL5nyI4ahXVr8xN3OSgjhtqzz2dQwkKIbMTjy4deMO2vcTseaGdWXuonaxcdpf8cI"
};

function getEnvVar(...keys) {
  const runtimeEnv = (typeof window !== "undefined" && window.__ENV__) || (typeof self !== "undefined" && self.__ENV__) || {};
  const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

  for (const key of keys) {
    if (runtimeEnv[key]) return runtimeEnv[key];
    if (processEnv[key]) return processEnv[key];
    if (defaultFirebaseEnv[key]) return defaultFirebaseEnv[key];
  }

  return "";
}

export const firebaseMessagingVapidKey = getEnvVar(
  "VITE_FIREBASE_MESSAGING_VAPID_KEY",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY",
  "REACT_APP_FIREBASE_MESSAGING_VAPID_KEY"
) || "BEXXcNApWgB7q2zcauzld7kL5nyI4ahXVr8xN3OSgjhtqzz2dQwkKIbMTjy4deMO2vcTseaGdWXuonaxcdpf8cI";

const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY", "REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "REACT_APP_FIREBASE_AUTH_DOMAIN"),
  databaseURL: getEnvVar("VITE_FIREBASE_DATABASE_URL", "NEXT_PUBLIC_FIREBASE_DATABASE_URL", "REACT_APP_FIREBASE_DATABASE_URL"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", "REACT_APP_FIREBASE_APP_ID"),
  measurementId: getEnvVar("VITE_FIREBASE_MEASUREMENT_ID", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", "REACT_APP_FIREBASE_MEASUREMENT_ID")
};

export function loadFirebaseModule(moduleName) {
  if (!moduleCache.has(moduleName)) {
    const moduleUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/${moduleName}`;
    moduleCache.set(moduleName, import(moduleUrl));
  }

  return moduleCache.get(moduleName);
}

export async function getFirebaseServices() {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const { initializeApp, getApp, getApps } = await loadFirebaseModule("firebase-app.js");
      const { getAuth } = await loadFirebaseModule("firebase-auth.js");
      const { getFirestore } = await loadFirebaseModule("firebase-firestore.js");
      const { getMessaging, isSupported } = await loadFirebaseModule("firebase-messaging.js");

      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const messaging = (await isSupported()) ? getMessaging(app) : null;

      return { app, auth, db, messaging };
    })();
  }

  return servicesPromise;
}

export async function waitForInitialAuthUser() {
  const { auth } = await getFirebaseServices();
  const { onAuthStateChanged } = await loadFirebaseModule("firebase-auth.js");

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}
