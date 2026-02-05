import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getApp, getApps } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const firebaseApp = window.app || (getApps().length ? getApp() : null);
const auth = window.auth || (firebaseApp ? getAuth(firebaseApp) : null);
const db = window.db || (firebaseApp ? getFirestore(firebaseApp) : null);

if (!auth || !db) {
  console.warn("Navbar auth/db init failed: make sure Firebase is initialized before navbar.js");
}

// =======================
// NAV ELEMENTS
// =======================

// Desktop
const profileBtn = document.getElementById("profileBtn");
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Mobile
const mProfileBtn = document.getElementById("mProfileBtn");
const mProfilePic = document.getElementById("mProfilePic");
const mProfileName = document.getElementById("mProfileName");
const mLoginBtn = document.getElementById("mLoginBtn");
const mLogoutBtn = document.getElementById("mLogoutBtn");

// Notifications
const notificationBtn = document.getElementById("notificationBtn");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationList = document.getElementById("notificationList");
const notificationCount = document.getElementById("notificationCount");

const mNotificationBtn = document.getElementById("mNotificationBtn");
const mNotificationCount = document.getElementById("mNotificationCount");

let unsubscribeNotifications = null;

// =======================
// AUTH LISTENER
// =======================

auth && onAuthStateChanged(auth, async (user) => {
  if (user) {
    // UI
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    profileBtn.classList.remove("hidden");

    mLoginBtn.classList.add("hidden");
    mLogoutBtn.classList.remove("hidden");
    mProfileBtn.classList.remove("hidden");

    // Profile
    const snap = await getDoc(doc(db, "users", user.uid));

    let name = "User";
    let photo = "https://api.dicebear.com/7.x/thumbs/svg?seed=" + user.uid;

    if (snap.exists()) {
      const data = snap.data();
      name = data.name || name;
      photo = data.photoURL || photo;
    }

    profileName.textContent = name;
    profilePic.src = photo;

    mProfileName.textContent = name;
    mProfilePic.src = photo;

    // 🔥 Start notifications listener
    startNotificationListener(user.uid);

  } else {
    // Logged out
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    profileBtn.classList.add("hidden");

    mLoginBtn.classList.remove("hidden");
    mLogoutBtn.classList.add("hidden");
    mProfileBtn.classList.add("hidden");

    notificationCount.classList.add("hidden");
    mNotificationCount.classList.add("hidden");

    if (unsubscribeNotifications) unsubscribeNotifications();
  }
});

// =======================
// REAL-TIME NOTIFICATIONS
// =======================

function startNotificationListener(uid) {
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc")
  );

  unsubscribeNotifications = onSnapshot(q, (snap) => {
    let unread = 0;
    notificationList.innerHTML = "";

    if (snap.empty) {
      notificationList.innerHTML = `
        <p class="text-center text-sm text-gray-400 py-6">
          No notifications yet
        </p>`;
      return;
    }

    snap.forEach((docSnap) => {
      const n = docSnap.data();

      if (!n.read) unread++;

      notificationList.innerHTML += `
        <div class="px-4 py-3 border-b hover:bg-gray-50 ${n.read ? "" : "bg-blue-50"}">
          <p class="text-sm text-gray-800">${n.text}</p>
          <span class="text-xs text-gray-400">
            ${new Date(n.createdAt?.seconds * 1000).toLocaleString()}
          </span>
        </div>
      `;
    });

    // Badge update
    if (unread > 0) {
      notificationCount.textContent = unread;
      notificationCount.classList.remove("hidden");

      mNotificationCount.textContent = unread;
      mNotificationCount.classList.remove("hidden");
    } else {
      notificationCount.classList.add("hidden");
      mNotificationCount.classList.add("hidden");
    }
  });
}

// =======================
// DROPDOWN TOGGLE + MARK READ
// =======================

notificationBtn?.addEventListener("click", async () => {
  notificationDropdown.classList.toggle("hidden");

  if (!notificationDropdown.classList.contains("hidden")) {
    markAllNotificationsRead();
  }
});

document.addEventListener("click", (e) => {
  if (
    notificationDropdown &&
    !notificationDropdown.contains(e.target) &&
    !notificationBtn.contains(e.target)
  ) {
    notificationDropdown.classList.add("hidden");
  }
});

// Mobile redirect
mNotificationBtn?.addEventListener("click", () => {
  window.location.href = "notifications.html";
});

// =======================
// MARK ALL READ
// =======================

async function markAllNotificationsRead() {
  if (!auth.currentUser) return;

  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!snap.exists()) return;

  const notifSnap = await getDocs(
    collection(db, "users", auth.currentUser.uid, "notifications")
  );

  notifSnap.forEach(async (d) => {
    if (!d.data().read) {
      await updateDoc(d.ref, { read: true });
    }
  });
}

// =======================
// LOGOUT
// =======================

logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

mLogoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// =======================
// MOBILE MENU
// =======================

const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");

menuBtn?.addEventListener("click", () => {
  if (!mobileMenu) return;
  const isHidden = mobileMenu.classList.toggle("hidden");
  menuBtn.setAttribute("aria-expanded", String(!isHidden));
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu.classList.add("hidden");
    menuBtn?.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    mobileMenu?.classList.add("hidden");
    menuBtn?.setAttribute("aria-expanded", "false");
  }
});
