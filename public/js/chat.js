(function chatPage() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const sendBtn = document.getElementById("sendBtn");
  const msgInput = document.getElementById("msgInput");
  const messagesDiv = document.getElementById("messages");
  const loginScreen = document.getElementById("loginScreen");
  const chatScreen = document.getElementById("chatScreen");

  let firestoreFns;
  const getFs = async () => {
    if (!firestoreFns) {
      firestoreFns = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    }
    return firestoreFns;
  };

  window.authReady.then(async (user) => {
    loginScreen && (loginScreen.hidden = true);
    chatScreen && (chatScreen.hidden = false);

    const { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } = await getFs();

    const q = query(collection(window.db, "messages"), orderBy("timestamp", "desc"), limit(50));
    onSnapshot(q, (snap) => {
      if (!messagesDiv) return;
      messagesDiv.innerHTML = "";
      snap.forEach((docSnap) => {
        const m = docSnap.data();
        const div = document.createElement("div");
        div.className = "msg " + (m.userId === user.uid ? "me" : "other");
        div.textContent = m.text;
        messagesDiv.prepend(div);
      });
    });

    sendBtn?.addEventListener("click", async () => {
      if (!msgInput?.value) return;
      await addDoc(collection(window.db, "messages"), {
        text: msgInput.value,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
      msgInput.value = "";
    });
  });

  logoutBtn?.addEventListener("click", async () => {
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    await signOut(window.auth);
    window.location.href = "/login.html";
  });

  loginBtn?.addEventListener("click", () => {
    window.location.href = "/login.html";
  });
})();
