(function navbarUI() {
  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  async function ensureAuthContext() {
    if (window.authReady) return window.authReady;

    if (!window.firebaseServicesReady) {
      window.firebaseServicesReady = (async () => {
        const { initializeApp, getApp, getApps } = await loadFirebaseModule("firebase-app.js");
        const { getAuth } = await loadFirebaseModule("firebase-auth.js");
        const { getFirestore } = await loadFirebaseModule("firebase-firestore.js");

        const firebaseConfig = {
          apiKey: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
          authDomain: "kar-kardan.firebaseapp.com",
          projectId: "kar-kardan",
          storageBucket: "kar-kardan.firebasestorage.app",
          messagingSenderId: "554147696994",
          appId: "1:554147696994:web:221dcb883e3b65dcea5c3b",
          measurementId: "G-RRC3X485KQ"
        };

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        window.app = app;
        window.auth = window.auth || getAuth(app);
        window.db = window.db || getFirestore(app);
        return { app: window.app, auth: window.auth, db: window.db };
      })();
    }

    window.authReady = window.firebaseServicesReady.then(async ({ auth }) => {
      const { onAuthStateChanged } = await loadFirebaseModule("firebase-auth.js");
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user || null);
        });
      });
    });

    return window.authReady;
  }

  const profileBtn = document.getElementById("profileBtn");
  const profilePic = document.getElementById("profilePic");
  const profileName = document.getElementById("profileName");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const mProfileBtn = document.getElementById("mProfileBtn");
  const mProfilePic = document.getElementById("mProfilePic");
  const mProfileName = document.getElementById("mProfileName");
  const mLoginBtn = document.getElementById("mLoginBtn");
  const mLogoutBtn = document.getElementById("mLogoutBtn");

  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  function toggleForAuth(user) {
    const isAuthed = Boolean(user && !user.isAnonymous);

    loginBtn?.classList.toggle("hidden", isAuthed);
    logoutBtn?.classList.toggle("hidden", !isAuthed);
    profileBtn?.classList.toggle("hidden", !isAuthed);

    mLoginBtn?.classList.toggle("hidden", isAuthed);
    mLogoutBtn?.classList.toggle("hidden", !isAuthed);
    mProfileBtn?.classList.toggle("hidden", !isAuthed);

    if (!isAuthed) return;

    const displayName = user.displayName || user.email || "User";
    const avatar = user.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`;

    if (profileName) profileName.textContent = displayName;
    if (profilePic) profilePic.src = avatar;
    if (mProfileName) mProfileName.textContent = displayName;
    if (mProfilePic) mProfilePic.src = avatar;
  }

  menuBtn?.addEventListener("click", () => {
    mobileMenu?.classList.toggle("hidden");
  });

  ensureAuthContext()
    .then(async (user) => {
      toggleForAuth(user);
      const { signOut } = await loadFirebaseModule("firebase-auth.js");

      const onLogout = async () => {
        await signOut(window.auth);
        window.location.href = "/login.html";
      };

      logoutBtn?.addEventListener("click", onLogout);
      mLogoutBtn?.addEventListener("click", onLogout);
    })
    .catch(() => {
      // auth-guard handles redirect
    });
})();
