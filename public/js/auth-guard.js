(function setupAuthGuard() {
  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  const loginUrl = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;

  window.authReady = window.firebaseServicesReady
    .then(async ({ auth }) => {
      const { onAuthStateChanged } = await loadFirebaseModule("firebase-auth.js");

      return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          if (!user || user.isAnonymous) {
            window.location.replace(loginUrl);
            return;
          }

          resolve(user);
        });
      });
    })
    .catch((error) => {
      console.error("Auth guard initialization failed", error);
      window.location.replace(loginUrl);
      throw error;
    });
})();
