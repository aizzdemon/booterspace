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
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging.js";

const firebaseApp = window.app || (getApps().length ? getApp() : null);
const auth = window.auth || (firebaseApp ? getAuth(firebaseApp) : null);
const db = window.db || (firebaseApp ? getFirestore(firebaseApp) : null);

if (!auth || !db) {
  console.warn("Navbar auth/db init failed: make sure Firebase is initialized before navbar.js");
}

const FCM_VAPID_KEY = window.FCM_VAPID_KEY || "";

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

const messageBtn = document.getElementById("messageBtn");
const messageCount = document.getElementById("messageCount");
const mMessageBtn = document.getElementById("mMessageBtn");
const mMessageCount = document.getElementById("mMessageCount");

const notificationPermissionBanner = document.getElementById("notificationPermissionBanner");
const notificationPermissionText = document.getElementById("notificationPermissionText");
const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
const dismissNotificationsPromptBtn = document.getElementById("dismissNotificationsPromptBtn");

let unsubscribeNotifications = null;
let unsubscribeForegroundMessages = null;
let messaging = null;
let swRegistration = null;
let currentFcmToken = null;
let currentTokenUid = null;

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

    // Start listeners
    startNotificationListener(user.uid);
    updateNotificationPermissionUI();
    await setupRealPushNotifications(user);
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
    messageCount?.classList.add("hidden");
    mMessageCount?.classList.add("hidden");

    notificationPermissionBanner?.classList.add("hidden");
    sessionStorage.removeItem("notificationPermissionPromptDismissed");

    if (unsubscribeNotifications) unsubscribeNotifications();
    if (unsubscribeForegroundMessages) {
      unsubscribeForegroundMessages();
      unsubscribeForegroundMessages = null;
    }

    await unregisterCurrentFcmToken();
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
    let unreadMessages = 0;
    notificationList.innerHTML = "";

    if (snap.empty) {
      notificationList.innerHTML = `
        <p class="text-center text-sm text-gray-400 py-6">
          No notifications yet
        </p>`;
      return;
    }

    const browserNotificationsAllowed = ("Notification" in window) && Notification.permission === "granted";

    snap.forEach((docSnap) => {
      const n = docSnap.data();

      if (!n.read) {
        unread++;
        if ((n.text || "").toLowerCase().includes("message")) unreadMessages++;
        maybeShowBrowserNotification(n, browserNotificationsAllowed);
      }

      notificationList.innerHTML += `
        <div class="px-4 py-3 border-b hover:bg-gray-50 ${n.read ? "" : "bg-blue-50"}">
          <p class="text-sm text-gray-800">${n.text}</p>
          <span class="text-xs text-gray-400">
            ${new Date(n.createdAt?.seconds * 1000).toLocaleString()}
          </span>
        </div>
      `;
    });

    if (unread > 0) {
      notificationCount.textContent = unread;
      notificationCount.classList.remove("hidden");

      mNotificationCount.textContent = unread;
      mNotificationCount.classList.remove("hidden");
    } else {
      notificationCount.classList.add("hidden");
      mNotificationCount.classList.add("hidden");
    }

    if (unreadMessages > 0) {
      messageCount.textContent = unreadMessages;
      messageCount.classList.remove("hidden");

      mMessageCount.textContent = unreadMessages;
      mMessageCount.classList.remove("hidden");
    } else {
      messageCount.classList.add("hidden");
      mMessageCount.classList.add("hidden");
    }
  });
}

function maybeShowBrowserNotification(notificationData, browserNotificationsAllowed) {
  if (!browserNotificationsAllowed || !notificationData?.createdAt?.seconds) return;

  const notificationTime = notificationData.createdAt.seconds * 1000;
  const now = Date.now();
  if (now - notificationTime > 20000) return;

  const title = resolveNotificationTitle(notificationData.text);
  const body = notificationData.text || "You have a new update";

  new Notification(title, {
    body,
    icon: "https://aizzdemon.github.io/booterspace/assets/images/booterspace.png"
  });
}

function resolveNotificationTitle(text = "") {
  const lower = text.toLowerCase();

  if (lower.includes("connection")) return "New connection request";
  if (lower.includes("message")) return "New message";
  if (lower.includes("job")) return "New job update";
  if (lower.includes("comment")) return "New comment";
  if (lower.includes("post")) return "New post";

  return "BooterSpace Notification";
}

// =======================
// FCM PUSH NOTIFICATIONS
// =======================

async function setupRealPushNotifications(user) {
  if (!firebaseApp || !("Notification" in window) || !("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  try {
    const messagingSupported = await isSupported();
    if (!messagingSupported) return;

    messaging = messaging || getMessaging(firebaseApp);
    swRegistration = swRegistration || await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    if (!FCM_VAPID_KEY) {
      console.warn("FCM_VAPID_KEY is missing on window; cannot fetch FCM token.");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (!token) return;

    await updateDoc(doc(db, "users", user.uid), {
      fcmTokens: arrayUnion(token),
      fcmUpdatedAt: serverTimestamp()
    });

    currentFcmToken = token;
    currentTokenUid = user.uid;

    if (unsubscribeForegroundMessages) unsubscribeForegroundMessages();
    unsubscribeForegroundMessages = onMessage(messaging, (payload) => {
      const title = payload?.notification?.title || resolveNotificationTitle(payload?.notification?.body || payload?.data?.text || "");
      const body = payload?.notification?.body || payload?.data?.text || "You have a new update";

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: payload?.notification?.icon || "https://aizzdemon.github.io/booterspace/assets/images/booterspace.png"
        });
      }
    });
  } catch (error) {
    console.error("FCM setup failed:", error);
  }
}

async function unregisterCurrentFcmToken() {
  if (!currentFcmToken || !currentTokenUid) return;

  try {
    await updateDoc(doc(db, "users", currentTokenUid), {
      fcmTokens: arrayRemove(currentFcmToken),
      fcmUpdatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn("Could not remove stored FCM token during logout:", error);
  }

  currentFcmToken = null;
  currentTokenUid = null;
}

function updateNotificationPermissionUI() {
  if (!notificationPermissionBanner || !enableNotificationsBtn || !auth?.currentUser) return;

  const promptDismissed = sessionStorage.getItem("notificationPermissionPromptDismissed") === "1";

  if (!("Notification" in window)) {
    notificationPermissionBanner.classList.remove("hidden");
    enableNotificationsBtn.classList.add("hidden");
    dismissNotificationsPromptBtn?.classList.remove("hidden");
    notificationPermissionText.textContent = "Your browser does not support push notifications.";
    return;
  }

  if (Notification.permission === "granted") {
    notificationPermissionBanner.classList.add("hidden");
    sessionStorage.removeItem("notificationPermissionPromptDismissed");
    return;
  }

  if (promptDismissed) {
    notificationPermissionBanner.classList.add("hidden");
    return;
  }

  notificationPermissionBanner.classList.remove("hidden");
  dismissNotificationsPromptBtn?.classList.remove("hidden");

  if (Notification.permission === "denied") {
    notificationPermissionText.textContent =
      "Browser notifications are blocked. Enable notifications in browser settings, then click Try Again.";
    enableNotificationsBtn.textContent = "Try Again";
  } else {
    notificationPermissionText.textContent =
      "Enable notifications to get instant alerts for new messages, connection requests, jobs, comments, and posts.";
    enableNotificationsBtn.textContent = "Allow Notifications";
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    sessionStorage.removeItem("notificationPermissionPromptDismissed");

    new Notification("Notifications enabled", {
      body: "You will now receive alerts for new messages, connection requests, jobs, comments, and posts.",
      icon: "https://aizzdemon.github.io/booterspace/assets/images/booterspace.png"
    });

    if (auth.currentUser) {
      await setupRealPushNotifications(auth.currentUser);
    }
  }

  updateNotificationPermissionUI();
}

enableNotificationsBtn?.addEventListener("click", requestNotificationPermission);

dismissNotificationsPromptBtn?.addEventListener("click", () => {
  sessionStorage.setItem("notificationPermissionPromptDismissed", "1");
  notificationPermissionBanner?.classList.add("hidden");
});

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
    !(notificationBtn && notificationBtn.contains(e.target))
  ) {
    notificationDropdown.classList.add("hidden");
  }
});

// Mobile redirect
mNotificationBtn?.addEventListener("click", () => {
  window.location.href = "notifications.html";
});

messageBtn?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

mMessageBtn?.addEventListener("click", () => {
  window.location.href = "messages.html";
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
