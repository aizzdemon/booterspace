(function initFirebaseGlobal() {
  const FIREBASE_VERSION = "10.12.5";
  const firebaseConfig = {
    apiKey: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
    authDomain: "kar-kardan.firebaseapp.com",
    projectId: "kar-kardan",
    storageBucket: "kar-kardan.firebasestorage.app",
    messagingSenderId: "554147696994",
    appId: "1:554147696994:web:221dcb883e3b65dcea5c3b",
    measurementId: "G-RRC3X485KQ"
  };

  const moduleCache = new Map();

  function loadFirebaseModule(moduleName) {
    if (!moduleCache.has(moduleName)) {
      const moduleUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/${moduleName}`;
      moduleCache.set(moduleName, import(moduleUrl));
    }

    return moduleCache.get(moduleName);
  }

  window.loadFirebaseModule = loadFirebaseModule;

  window.firebaseServicesReady = (async () => {
    const { initializeApp, getApp, getApps } = await loadFirebaseModule("firebase-app.js");
    const { getAuth } = await loadFirebaseModule("firebase-auth.js");
    const { getFirestore } = await loadFirebaseModule("firebase-firestore.js");

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    window.app = app;
    window.auth = getAuth(app);
    window.db = getFirestore(app);

    return { app: window.app, auth: window.auth, db: window.db };
  })();
})();
