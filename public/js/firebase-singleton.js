const FIREBASE_VERSION = "10.12.5";

const moduleCache = new Map();
let servicesPromise = null;

function getEnvVar(...keys) {
  const runtimeEnv = (typeof window !== "undefined" && window.__ENV__) || (typeof self !== "undefined" && self.__ENV__) || {};
  const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

  for (const key of keys) {
    if (runtimeEnv[key]) return runtimeEnv[key];
    if (processEnv[key]) return processEnv[key];
  }

  return "";
}

const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY", "REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "REACT_APP_FIREBASE_AUTH_DOMAIN"),
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

      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      return { app, auth, db };
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
