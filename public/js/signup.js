(function signupPage() {
  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  function generateUsername(name) {
    return (name || "user").replace(/\s+/g, "").toLowerCase();
  }

  window.firebaseServicesReady.then(async ({ auth, db }) => {
    const { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } =
      await loadFirebaseModule("firebase-auth.js");
    const { doc, setDoc, serverTimestamp } = await loadFirebaseModule("firebase-firestore.js");
    const { getStorage, ref, uploadBytes, getDownloadURL } =
      await loadFirebaseModule("firebase-storage.js");

    const storage = getStorage(window.app);
    const provider = new GoogleAuthProvider();

    const form = document.getElementById("signup-form");
    const googleBtn = document.getElementById("googleSignInBtn");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const fullName = document.getElementById("name").value.trim();
      const gender = document.getElementById("gender").value;
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const mobile = document.getElementById("mobile").value.trim();
      const profilePicInput = document.getElementById("profile-pic");

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        let photoURL = "";
        if (profilePicInput?.files?.length > 0) {
          const file = profilePicInput.files[0];
          const imageRef = ref(storage, `profile_pictures/${uid}`);
          await uploadBytes(imageRef, file);
          photoURL = await getDownloadURL(imageRef);
        }

        const username = generateUsername(fullName);

        await setDoc(doc(db, "users", uid), {
          fullName,
          username,
          email,
          mobile,
          gender,
          photoURL,
          fullNameLower: fullName.toLowerCase(),
          usernameLower: username,
          emailLower: email.toLowerCase(),
          createdAt: serverTimestamp()
        });

        alert("Signup successful ✅");
        window.location.href = "index.html";
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });

    googleBtn?.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const username = generateUsername(user.displayName || "user");

        await setDoc(
          doc(db, "users", user.uid),
          {
            name: user.displayName,
            username,
            email: user.email,
            photoURL: user.photoURL,
            nameLower: (user.displayName || "").toLowerCase(),
            usernameLower: username,
            emailLower: (user.email || "").toLowerCase(),
            createdAt: serverTimestamp()
          },
          { merge: true }
        );

        alert(`Welcome ${user.displayName} ✅`);
        window.location.href = "index.html";
      } catch (error) {
        console.error(error);
        alert("Google sign-in failed");
      }
    });
  });
})();
