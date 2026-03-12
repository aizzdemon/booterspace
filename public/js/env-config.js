(function attachEnvReader(globalScope) {
  const defaultFirebaseEnv = {
    VITE_FIREBASE_API_KEY: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
    VITE_FIREBASE_AUTH_DOMAIN: "kar-kardan.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "kar-kardan",
    VITE_FIREBASE_STORAGE_BUCKET: "kar-kardan.firebasestorage.app",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "554147696994",
    VITE_FIREBASE_APP_ID: "1:554147696994:web:221dcb883e3b65dcea5c3b",
    VITE_FIREBASE_MEASUREMENT_ID: "G-RRC3X485KQ"
  };

  globalScope.__ENV__ = {
    ...defaultFirebaseEnv,
    ...globalScope.__ENV__
  };

  if (typeof globalScope.getEnvVar === "function") return;

  globalScope.getEnvVar = function getEnvVar(...keys) {
    const runtimeEnv = globalScope.__ENV__ || {};
    const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

    for (const key of keys) {
      if (runtimeEnv[key]) return runtimeEnv[key];
      if (processEnv[key]) return processEnv[key];
    }

    return "";
  };
})(typeof window !== "undefined" ? window : self);
