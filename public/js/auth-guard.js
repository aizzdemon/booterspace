(function setupAuthGuard() {
  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  window.authReady = window.firebaseServicesReady
    .then(async ({ auth }) => {
      const { onAuthStateChanged } = await loadFirebaseModule("firebase-auth.js");

      return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          if (!user) {
            window.location.replace("/login.html");
            return;
          }

          resolve(user);
        });
      });
    })
    .catch((error) => {
      console.error("Auth guard initialization failed", error);
      window.location.replace("/login.html");
      throw error;
    });
})();
