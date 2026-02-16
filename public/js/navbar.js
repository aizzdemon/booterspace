(function navbarUI() {
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

    if (!isAuthed) {
      return;
    }

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

  window.authReady
    .then(async (user) => {
      toggleForAuth(user);
      const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

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
