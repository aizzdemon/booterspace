(function chatPage() {
  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const sendBtn = document.getElementById("sendBtn");
  const msgInput = document.getElementById("msgInput");
  const messagesDiv = document.getElementById("messages");
  const loginScreen = document.getElementById("loginScreen");
  const chatScreen = document.getElementById("chatScreen");

  window.authReady.then(async (user) => {
    if (loginScreen) loginScreen.hidden = true;
    if (chatScreen) chatScreen.hidden = false;

    const { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } =
      await loadFirebaseModule("firebase-firestore.js");

    const messagesQuery = query(
      collection(window.db, "messages"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    onSnapshot(messagesQuery, (snap) => {
      if (!messagesDiv) return;
      messagesDiv.innerHTML = "";

      snap.forEach((docSnap) => {
        const message = docSnap.data();
        const messageEl = document.createElement("div");
        messageEl.className = `msg ${message.userId === user.uid ? "me" : "other"}`;
        messageEl.textContent = message.text;
        messagesDiv.prepend(messageEl);
      });
    });

    sendBtn?.addEventListener("click", async () => {
      const text = msgInput?.value?.trim();
      if (!text) return;

      await addDoc(collection(window.db, "messages"), {
        text,
        userId: user.uid,
        timestamp: serverTimestamp()
      });

      msgInput.value = "";
    });
  });

  logoutBtn?.addEventListener("click", async () => {
    const { signOut } = await loadFirebaseModule("firebase-auth.js");
    await signOut(window.auth);
    window.location.href = "/login.html";
  });

  loginBtn?.addEventListener("click", () => {
    window.location.href = "/login.html";
  });
})();
