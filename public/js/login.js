(function loginPage() {
  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  const showMessage = (msg, isError = false) => {
    const box = document.getElementById("status-message");
    if (!box) return;

    box.textContent = msg;
    box.className = `p-3 rounded-lg text-sm mb-4 text-center ${
      isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
    }`;
    box.classList.remove("hidden");
  };

  window.firebaseServicesReady.then(async ({ auth }) => {
    const {
      onAuthStateChanged,
      signInWithEmailAndPassword,
      sendPasswordResetEmail
    } = await loadFirebaseModule("firebase-auth.js");

    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("next") || "index.html";

    onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        window.location.replace(nextPath);
      }
    });

    document.getElementById("signin-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("email")?.value || "";
      const password = document.getElementById("password")?.value || "";

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage("Sign-in successful! Redirecting...");
        setTimeout(() => {
          window.location.href = nextPath;
        }, 1500);
      } catch (error) {
        showMessage("Sign-in Failed: " + error.message, true);
      }
    });

    document.getElementById("forgotPasswordBtn")?.addEventListener("click", async () => {
      const email = document.getElementById("email")?.value || "";
      if (!email) {
        showMessage("Please enter your email address first.", true);
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent! Please check your inbox.");
      } catch (error) {
        showMessage("Failed to send reset email: " + error.message, true);
      }
    });
  });
})();
