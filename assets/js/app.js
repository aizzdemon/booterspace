import {
  auth,
  db,
  githubProvider,
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateDoc,
  where,
} from "./firebase.js";

const $ = (id) => document.getElementById(id);
const els = {
  loginBtn: $("loginBtn"),
  logoutBtn: $("logoutBtn"),
  displayName: $("displayName"),
  email: $("email"),
  avatar: $("avatar"),
  postInput: $("postInput"),
  publishPostBtn: $("publishPostBtn"),
  postsList: $("postsList"),
  chatPeerId: $("chatPeerId"),
  chatMessage: $("chatMessage"),
  sendMessageBtn: $("sendMessageBtn"),
  messagesList: $("messagesList"),
  notificationsList: $("notificationsList"),
  markNotificationsBtn: $("markNotificationsBtn"),
  connectionCount: $("connectionCount"),
  unreadCount: $("unreadCount"),
  notificationCount: $("notificationCount"),
};

let currentUser = null;
let unsubscribers = [];

function setEmpty(listEl, message) {
  listEl.innerHTML = "";
  const li = document.createElement("li");
  li.className = "muted";
  li.textContent = message;
  listEl.append(li);
}

function teardownSubscriptions() {
  unsubscribers.forEach((fn) => fn());
  unsubscribers = [];
}

function requireFirebase() {
  if (!auth || !db) {
    alert("Firebase config missing. Copy assets/js/firebase-config.example.js to firebase-config.js and fill it.");
    return false;
  }
  return true;
}

els.loginBtn.addEventListener("click", async () => {
  if (!requireFirebase()) return;
  await signInWithPopup(auth, githubProvider);
});

els.logoutBtn.addEventListener("click", async () => {
  if (!auth) return;
  await signOut(auth);
});

els.publishPostBtn.addEventListener("click", async () => {
  if (!currentUser || !db) return;
  const body = els.postInput.value.trim();
  if (!body) return;

  await addDoc(collection(db, "posts"), {
    uid: currentUser.uid,
    author: currentUser.displayName || currentUser.email,
    body,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "notifications"), {
    uid: currentUser.uid,
    text: "Your post is now visible to your network.",
    read: false,
    createdAt: serverTimestamp(),
  });

  els.postInput.value = "";
});

els.sendMessageBtn.addEventListener("click", async () => {
  if (!currentUser || !db) return;
  const to = els.chatPeerId.value.trim();
  const text = els.chatMessage.value.trim();
  if (!to || !text) return;

  await addDoc(collection(db, "messages"), {
    from: currentUser.uid,
    to,
    text,
    read: false,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "notifications"), {
    uid: to,
    text: `New message from ${currentUser.displayName || currentUser.email}`,
    read: false,
    createdAt: serverTimestamp(),
  });

  els.chatMessage.value = "";
});

els.markNotificationsBtn.addEventListener("click", async () => {
  if (!currentUser || !db) return;
  const unreadItems = [...els.notificationsList.querySelectorAll("li[data-id]")];
  await Promise.all(
    unreadItems.map((li) => updateDoc(doc(db, "notifications", li.dataset.id), { read: true }))
  );
});

function subscribePosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      setEmpty(els.postsList, "No posts yet.");
      return;
    }
    els.postsList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const li = document.createElement("li");
      li.innerHTML = `<strong>${post.author}</strong><p>${post.body}</p>`;
      els.postsList.append(li);
    });
  });
}

function subscribeMessages() {
  const q = query(
    collection(db, "messages"),
    where("to", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    els.unreadCount.textContent = String(snapshot.docs.filter((d) => !d.data().read).length);
    if (snapshot.empty) {
      setEmpty(els.messagesList, "No direct messages.");
      return;
    }
    els.messagesList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const li = document.createElement("li");
      li.textContent = `${msg.from.slice(0, 8)}: ${msg.text}`;
      els.messagesList.append(li);
    });
  });
}

function subscribeNotifications() {
  const q = query(
    collection(db, "notifications"),
    where("uid", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    els.notificationCount.textContent = String(snapshot.docs.filter((d) => !d.data().read).length);

    if (snapshot.empty) {
      setEmpty(els.notificationsList, "No notifications.");
      return;
    }

    els.notificationsList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const note = docSnap.data();
      const li = document.createElement("li");
      li.dataset.id = docSnap.id;
      li.innerHTML = `${note.read ? "✅" : "🔔"} ${note.text}`;
      els.notificationsList.append(li);
    });
  });
}

function updateAuthedUI(user) {
  const isAuthed = Boolean(user);
  els.loginBtn.classList.toggle("hidden", isAuthed);
  els.logoutBtn.classList.toggle("hidden", !isAuthed);

  if (!isAuthed) {
    els.displayName.textContent = "Guest";
    els.email.textContent = "Sign in to unlock networking";
    els.avatar.removeAttribute("src");
    els.connectionCount.textContent = "0";
    els.unreadCount.textContent = "0";
    els.notificationCount.textContent = "0";
    setEmpty(els.messagesList, "Login to access messages.");
    setEmpty(els.notificationsList, "Login to access notifications.");
    return;
  }

  els.displayName.textContent = user.displayName || "Professional User";
  els.email.textContent = user.email || "GitHub account";
  els.avatar.src = user.photoURL || "https://placehold.co/54x54";
  els.connectionCount.textContent = "128";
}

if (auth && db) {
  onAuthStateChanged(auth, (user) => {
    teardownSubscriptions();
    currentUser = user;
    updateAuthedUI(user);

    unsubscribers.push(subscribePosts());
    if (user) {
      unsubscribers.push(subscribeMessages());
      unsubscribers.push(subscribeNotifications());
    }
  });
} else {
  updateAuthedUI(null);
  setEmpty(els.postsList, "Configure Firebase to load live feed.");
}
