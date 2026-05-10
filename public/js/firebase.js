(function initFirebaseBridge() {
  if (window.firebaseServicesReady) return;

  const singletonModule = import("./firebase-singleton.js");

  window.loadFirebaseModule = async (moduleName) => {
    const { loadFirebaseModule } = await singletonModule;
    return loadFirebaseModule(moduleName);
  };

  window.firebaseServicesReady = singletonModule.then(({ getFirebaseServices, firebaseMessagingVapidKey }) => {
    window.firebaseMessagingVapidKey = firebaseMessagingVapidKey;
    return getFirebaseServices();
  });

  window.firebaseMessagingReady = window.firebaseServicesReady.then(({ messaging }) => messaging);
})();
