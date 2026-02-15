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
where,
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
const appId = 'booterspace-chat'; // App ID for shared artifacts

if (!auth || !db) {
console.warn("Navbar auth/db init failed: make sure Firebase is initialized before navbar.js");
}

window.FCM_VAPID_KEY = import.meta?.env?.VITE_FCM_VAPID_KEY || window.FCM_VAPID_KEY;
const FCM_VAPID_KEY = typeof window.FCM_VAPID_KEY === "string" ? window.FCM_VAPID_KEY.trim() : "";

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
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const dashboardLink = document.getElementById("dashboardLink");
const mDashboardLink = document.getElementById("mDashboardLink");

const notificationPermissionBanner = document.getElementById("notificationPermissionBanner");
const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
const dismissNotificationsPromptBtn = document.getElementById("dismissNotificationsPromptBtn");

let unsubscribeNotifications = null;
let unsubscribeRequests = null;
let unsubscribeForegroundMessages = null;
let activeUnreadCount = 0;
let activeRequestCount = 0;
let activeUnreadMessages = 0;
const liveNotifications = new Map();

// =======================
// AUTH LISTENER
// =======================

auth && onAuthStateChanged(auth, async (user) => {
if (user && !user.isAnonymous) {
if (unsubscribeNotifications) unsubscribeNotifications();
liveNotifications.clear();

loginBtn?.classList.add("hidden");
logoutBtn?.classList.remove("hidden");
profileBtn?.classList.remove("hidden");

mLoginBtn?.classList.add("hidden");
mLogoutBtn?.classList.remove("hidden");
mProfileBtn?.classList.remove("hidden");

const snap = await getDoc(doc(db, "users", user.uid));
let name = "User";
let photo = "https://api.dicebear.com/7.x/thumbs/svg?seed=" + user.uid;
let hasPostJobAccess = false;

if (snap.exists()) {
  const data = snap.data();
  name = data.name || data.fullName || name;
  photo = data.photoURL || photo;
  hasPostJobAccess = data.canPostJobs === true;
}

dashboardLink?.classList.toggle("hidden", !hasPostJobAccess);
mDashboardLink?.classList.toggle("hidden", !hasPostJobAccess);

if (profileName) profileName.textContent = name;
if (profilePic) profilePic.src = photo;
if (mProfileName) mProfileName.textContent = name;
if (mProfilePic) mProfilePic.src = photo;

// Start Listeners
startNotificationListener(user.uid);
setupConnectionRequestListener(user.uid);
updateNotificationPermissionUI();
setupRealPushNotifications(user);
} else {
loginBtn?.classList.remove("hidden");
logoutBtn?.classList.add("hidden");
profileBtn?.classList.add("hidden");

mLoginBtn?.classList.remove("hidden");
mLogoutBtn?.classList.add("hidden");
mProfileBtn?.classList.add("hidden");
dashboardLink?.classList.add("hidden");
mDashboardLink?.classList.add("hidden");

notificationCount?.classList.add("hidden");
mNotificationCount?.classList.add("hidden");

if (unsubscribeNotifications) unsubscribeNotifications();
if (unsubscribeRequests) unsubscribeRequests();
liveNotifications.clear();
notificationList && (notificationList.innerHTML = `<p class="text-center text-sm text-gray-400 py-6">No notifications yet</p>`);


}
});

// =======================
// CONNECTION REQUESTS LISTENER (New logic)
// =======================

function setupConnectionRequestListener(userId) {
// Listen for connection requests where current user is the recipient
const q = query(
collection(db, 'artifacts', appId, 'public', 'data', 'connection_requests'),
where('toId', '==', userId),
where('status', '==', 'pending')
);

unsubscribeRequests = onSnapshot(q, (snapshot) => {
activeRequestCount = snapshot.size;
renderTotalBadge();
}, (err) => console.error("Request listener error:", err));
}

// =======================
// REAL-TIME NOTIFICATIONS
// =======================

function startNotificationListener(uid) {
const userScopedQuery = query(
collection(db, "users", uid, "notifications"),
orderBy("createdAt", "desc")
);

unsubscribeNotifications = onSnapshot(userScopedQuery, (snap) => {
upsertNotificationsFromSnapshot(snap, "user");
renderNotifications();
}, (err) => console.error("User notification listener error:", err));
}

function upsertNotificationsFromSnapshot(snap, source) {
snap.docChanges().forEach((change) => {
const key = `${source}:${change.doc.id}`;
if (change.type === "removed") {
  liveNotifications.delete(key);
  return;
}
liveNotifications.set(key, {
  id: change.doc.id,
  ref: change.doc.ref,
  source,
  ...change.doc.data()
});
});
}

function getNotificationLink(notification) {
if (!notification) return "notifications.html";

const rawLink = (notification.link || notification.url || "").toString().trim();
if (rawLink) return rawLink;

if (notification.jobId) return `job-detail.html?id=${encodeURIComponent(notification.jobId)}`;
if (notification.chatId) return `messages.html?chatId=${encodeURIComponent(notification.chatId)}`;
if (notification.fromId || notification.senderId || notification.userIdRef) {
const target = notification.fromId || notification.senderId || notification.userIdRef;
return `messages.html?composeTo=${encodeURIComponent(target)}`;
}

const text = (notification.text || "").toLowerCase();
if (notification.type === "job_posted" || text.includes("job")) return "jobs.html";
if (notification.type === "message" || text.includes("message")) return "messages.html";

return "notifications.html";
}

async function markVisibleNotificationsAsRead() {
const unreadItems = Array.from(liveNotifications.values()).filter((n) => !n.read && n.ref);
if (!unreadItems.length) {
  activeUnreadCount = 0;
  renderTotalBadge();
  return;
}

try {
  await Promise.all(unreadItems.map((n) => updateDoc(n.ref, { read: true })));
  unreadItems.forEach((n) => {
    n.read = true;
  });
  activeUnreadCount = 0;
  activeUnreadMessages = 0;
  renderTotalBadge();
  updateMessageBadge(0);
  renderNotifications();
} catch (error) {
  console.error("Failed to mark notifications as read:", error);
}
}

function renderNotifications() {
const items = Array.from(liveNotifications.values()).sort((a, b) => {
  const aMillis = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
  const bMillis = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
  return bMillis - aMillis;
});

activeUnreadCount = 0;
activeUnreadMessages = 0;
notificationList.innerHTML = "";

if (!items.length && activeRequestCount === 0) {
  notificationList.innerHTML = `<p class="text-center text-sm text-gray-400 py-6">No notifications yet</p>`;
}

items.forEach((n) => {
  if (!n.read) {
    activeUnreadCount++;
    if ((n.text || "").toLowerCase().includes("message")) activeUnreadMessages++;
  }

  const createdAtMillis = n.createdAt?.seconds ? n.createdAt.seconds * 1000 : null;
  const targetHref = getNotificationLink(n);
  notificationList.innerHTML += `
    <a href="${targetHref}" class="block px-4 py-3 border-b hover:bg-gray-50 ${n.read ? "" : "bg-blue-50"}">
      <p class="text-sm text-gray-800">${n.text || "You have a new notification."}</p>
      <span class="text-xs text-gray-400">${createdAtMillis ? new Date(createdAtMillis).toLocaleString() : "Just now"}</span>
    </a>`;
});

renderTotalBadge();
updateMessageBadge(activeUnreadMessages);
}

function renderTotalBadge() {
const total = activeUnreadCount + activeRequestCount;
if (total > 0) {
if (notificationCount) {
notificationCount.textContent = total;
notificationCount.classList.remove("hidden");
}
if (mNotificationCount) {
mNotificationCount.textContent = total;
mNotificationCount.classList.remove("hidden");
}
} else {
notificationCount?.classList.add("hidden");
mNotificationCount?.classList.add("hidden");
}
}

function updateMessageBadge(count) {
if (count > 0) {
if (messageCount) {
messageCount.textContent = count;
messageCount.classList.remove("hidden");
}
if (mMessageCount) {
mMessageCount.textContent = count;
mMessageCount.classList.remove("hidden");
}
} else {
messageCount?.classList.add("hidden");
mMessageCount?.classList.add("hidden");
}
}

// =======================
// FCM & PERMISSIONS (Kept existing)
// =======================

async function setupRealPushNotifications(user) {
if (!firebaseApp || !("Notification" in window) || !("serviceWorker" in navigator)) return;
if (Notification.permission !== "granted") return;

try {
const messagingSupported = await isSupported();
if (!messagingSupported) return;

const messaging = getMessaging(firebaseApp);
const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });

if (token) {
  await updateDoc(doc(db, "users", user.uid), {
    fcmTokens: arrayUnion(token),
    fcmUpdatedAt: serverTimestamp()
  });
}


} catch (err) {
console.warn("FCM Setup failed", err);
}
}

function updateNotificationPermissionUI() {
if (Notification.permission === "granted") {
notificationPermissionBanner?.classList.add("hidden");
} else {
notificationPermissionBanner?.classList.remove("hidden");
}
}

// =======================
// EVENT LISTENERS
// =======================

notificationBtn?.addEventListener("click", () => {
notificationDropdown?.classList.toggle("hidden");
if (!notificationDropdown?.classList.contains("hidden")) {
markVisibleNotificationsAsRead();
}
});

mNotificationBtn?.addEventListener("click", async () => {
await markVisibleNotificationsAsRead();
window.location.href = "notifications.html";
});

logoutBtn?.addEventListener("click", async () => {
await signOut(auth);
window.location.href = "login.html";
});

mLogoutBtn?.addEventListener("click", async () => {
await signOut(auth);
window.location.href = "login.html";
});

menuBtn?.addEventListener("click", () => {
mobileMenu?.classList.toggle("hidden");
menuBtn.setAttribute("aria-expanded", String(!mobileMenu?.classList.contains("hidden")));
});

document.addEventListener("click", (event) => {
if (!mobileMenu || !menuBtn) return;
if (mobileMenu.classList.contains("hidden")) return;

const target = event.target;
if (!(target instanceof Node)) return;

if (!mobileMenu.contains(target) && !menuBtn.contains(target)) {
  mobileMenu.classList.add("hidden");
  menuBtn.setAttribute("aria-expanded", "false");
}
});
