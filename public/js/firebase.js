(function initFirebaseBridge() {
  if (window.firebaseServicesReady) return;

  const singletonModule = import("./firebase-singleton.js");

  window.loadFirebaseModule = async (moduleName) => {
    const { loadFirebaseModule } = await singletonModule;
    return loadFirebaseModule(moduleName);
  };

  window.firebaseServicesReady = singletonModule.then(({ getFirebaseServices }) => getFirebaseServices());
})();
