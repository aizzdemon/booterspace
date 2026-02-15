import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getAuth, signInWithPopup,
  GoogleAuthProvider, onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  getFirestore, collection,
  addDoc, query,
  orderBy, limit, onSnapshot,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sendBtn = document.getElementById("sendBtn");
const msgInput = document.getElementById("msgInput");
const messagesDiv = document.getElementById("messages");

loginBtn.onclick = () => {
  signInWithPopup(auth, new GoogleAuthProvider());
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    loginScreen.hidden = true;
    chatScreen.hidden = false;
    loadMessages();
  } else {
    loginScreen.hidden = false;
    chatScreen.hidden = true;
  }
});

function loadMessages() {
  const q = query(
    collection(db, "messages"),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  onSnapshot(q, snap => {
    messagesDiv.innerHTML = "";
    snap.forEach(doc => {
      const m = doc.data();
      const div = document.createElement("div");
      div.className = "msg " +
        (m.userId === auth.currentUser.uid ? "me" : "other");
      div.textContent = m.text;
      messagesDiv.prepend(div);
    });
  });
}

sendBtn.onclick = async () => {
  if (!msgInput.value) return;
  const user = auth.currentUser;

  await addDoc(collection(db, "messages"), {
    text: msgInput.value,
    userId: user.uid,
    timestamp: serverTimestamp()
  });

  msgInput.value = "";
};
