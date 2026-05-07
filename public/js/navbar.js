import { getFirebaseServices, loadFirebaseModule, waitForInitialAuthUser } from "./firebase-singleton.js";

const navbarState = globalThis.__booterNavbarState || {
  initialized: false,
  notificationsUnsubscribe: null,
  authUnsubscribe: null,
  activeNotificationUid: null,
  messagesUnsubscribe: null,
  activeMessageUid: null,
  boundNav: null
};

globalThis.__booterNavbarState = navbarState;

if (!navbarState.initialized) {
  navbarState.initialized = true;
  window.addEventListener("navbar:ready", () => initNavbarUI());
}

initNavbarUI();

function getNavbarElements() {
  return {
    navRoot: document.querySelector("#navbar nav"),
    profileBtn: document.getElementById("profileBtn"),
    profilePic: document.getElementById("profilePic"),
    profileName: document.getElementById("profileName"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    mProfileBtn: document.getElementById("mProfileBtn"),
    mProfilePic: document.getElementById("mProfilePic"),
    mProfileName: document.getElementById("mProfileName"),
    mLoginBtn: document.getElementById("mLoginBtn"),
    desktopStartBtn: document.getElementById("desktopStartBtn"),
    mSignupBtn: document.getElementById("mSignupBtn"),
    mLogoutBtn: document.getElementById("mLogoutBtn"),
    menuBtn: document.getElementById("menuBtn"),
    mobileMenu: document.getElementById("mobileMenu"),
    notificationBtn: document.getElementById("notificationBtn"),
    notificationDropdown: document.getElementById("notificationDropdown"),
    notificationList: document.getElementById("notificationList"),
    notificationCount: document.getElementById("notificationCount"),
    mNotificationBtn: document.getElementById("mNotificationBtn"),
    mNotificationCount: document.getElementById("mNotificationCount"),
    messageBtn: document.getElementById("messageBtn"),
    messageDropdown: document.getElementById("messageDropdown"),
    messageNotificationList: document.getElementById("messageNotificationList"),
    messageCount: document.getElementById("messageCount"),
    mMessageCount: document.getElementById("mMessageCount")
  };
}

function normalizeProfileName(value) {
  const name = (value || "").toString().trim();
  if (!name) return "";
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(name)) return "";
  return name;
}

function resolveProfileName(user, profileData) {
  return (
    normalizeProfileName(profileData?.fullName) ||
    normalizeProfileName(profileData?.name) ||
    normalizeProfileName(profileData?.username) ||
    normalizeProfileName(user.displayName) ||
    "User"
  );
}

function resolveProfilePhoto(user, profileData) {
  if (user.photoURL) return user.photoURL;
  if (profileData?.photoURL) return profileData.photoURL;
  if (profileData?.avatar) return profileData.avatar;
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`;
}

async function getProfileData(uid) {
  try {
    const { db } = await getFirebaseServices();
    const { doc, getDoc } = await loadFirebaseModule("firebase-firestore.js");
    const profileRef = doc(db, "users", uid);
    const profileSnap = await getDoc(profileRef);
    return profileSnap.exists() ? profileSnap.data() : null;
  } catch {
    return null;
  }
}

async function toggleForAuth(user, elements) {
  const isAuthed = Boolean(user && !user.isAnonymous);
  const {
    profileBtn,
    profilePic,
    profileName,
    loginBtn,
    logoutBtn,
    mProfileBtn,
    mProfilePic,
    mProfileName,
    mLoginBtn,
    desktopStartBtn,
    mSignupBtn,
    mLogoutBtn,
    notificationCount,
    mNotificationCount,
    notificationList,
    messageCount,
    mMessageCount,
    messageNotificationList
  } = elements;

  loginBtn?.classList.toggle("hidden", isAuthed);
  logoutBtn?.classList.toggle("hidden", !isAuthed);
  profileBtn?.classList.toggle("hidden", !isAuthed);

  mLoginBtn?.classList.toggle("hidden", isAuthed);
  desktopStartBtn?.classList.toggle("hidden", isAuthed);
  mSignupBtn?.classList.toggle("hidden", isAuthed);
  mLogoutBtn?.classList.toggle("hidden", !isAuthed);
  mProfileBtn?.classList.toggle("hidden", !isAuthed);

  if (!isAuthed) {
    if (notificationCount) notificationCount.classList.add("hidden");
    if (mNotificationCount) mNotificationCount.classList.add("hidden");
    if (messageCount) messageCount.classList.add("hidden");
    if (mMessageCount) mMessageCount.classList.add("hidden");
    if (notificationList) {
      notificationList.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">Login to see notifications</p>';
    }
    if (messageNotificationList) {
      messageNotificationList.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">Login to see message notifications</p>';
    }
    return;
  }

  const profileData = await getProfileData(user.uid);
  const displayName = resolveProfileName(user, profileData);
  const avatar = resolveProfilePhoto(user, profileData);
  const fallbackAvatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`;

  if (profileName) profileName.textContent = displayName;
  if (profilePic) {
    profilePic.src = avatar;
    profilePic.onerror = () => {
      profilePic.onerror = null;
      profilePic.src = fallbackAvatar;
    };
  }
  if (mProfileName) mProfileName.textContent = displayName;
  if (mProfilePic) {
    mProfilePic.src = avatar;
    mProfilePic.onerror = () => {
      mProfilePic.onerror = null;
      mProfilePic.src = fallbackAvatar;
    };
  }
}

function resolveNotificationLabel(type = "", text = "") {
  const normalizedType = type.toLowerCase();
  const lower = text.toLowerCase();
  if (normalizedType.includes("chat") || normalizedType.includes("dm") || lower.includes("chat")) return "💬";
  if (normalizedType.includes("message") || lower.includes("message")) return "💬";
  if (normalizedType.includes("connection") || lower.includes("connection")) return "🤝";
  if (normalizedType.includes("job") || lower.includes("job")) return "💼";
  if (normalizedType.includes("comment") || lower.includes("comment")) return "💭";
  if (normalizedType.includes("post") || lower.includes("post")) return "📝";
  return "🔔";
}

function resolveNotificationTarget(notificationData = {}) {
  const rawLink = (notificationData.link || notificationData.url || "").toString().trim();
  if (rawLink) return rawLink;
  if (notificationData.jobId) return `job-detail.html?id=${encodeURIComponent(notificationData.jobId)}`;
  if (notificationData.chatId) return `messages.html?chatId=${encodeURIComponent(notificationData.chatId)}`;

  const targetUid = notificationData.fromUid || notificationData.fromId || notificationData.senderId || notificationData.userIdRef;
  if (targetUid) return `messages.html?composeTo=${encodeURIComponent(targetUid)}`;

  const lower = (notificationData.text || notificationData.message || "").toLowerCase();
  if ((notificationData.type || "").toLowerCase().includes("job") || lower.includes("job")) return "jobs.html";
  if ((notificationData.type || "").toLowerCase().includes("message") || lower.includes("message")) return "messages.html";
  return "notification.html";
}

function renderNotificationDropdown(listEl, notifications) {
  if (!listEl) return;
  if (!notifications.length) {
    listEl.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">No new notifications</p>';
    return;
  }

  listEl.innerHTML = notifications.map(({ data }) => {
    const body = (data.message || data.text || "New update").toString();
    const icon = resolveNotificationLabel(data.type || "", body);
    const link = resolveNotificationTarget(data);
    const isUnread = !data.read;

    return `
      <a href="${link}" class="block px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${isUnread ? "bg-blue-50/40" : ""}">
        <div class="flex items-start gap-2">
          <span>${icon}</span>
          <div class="min-w-0">
            <p class="text-xs text-slate-700 line-clamp-2">${body}</p>
            <p class="text-[10px] text-slate-400 mt-1">${data.type || "notification"}</p>
          </div>
        </div>
      </a>
    `;
  }).join("");
}

function escapeHtml(value = "") {
  return value.toString().replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function getChatPartnerId(chat, uid) {
  return (chat.participants || []).find((participant) => participant !== uid) || null;
}

function getMapValueForUser(mapValue, userId) {
  if (!mapValue || typeof mapValue !== "object" || !userId) return undefined;
  if (Object.prototype.hasOwnProperty.call(mapValue, userId)) return mapValue[userId];

  return userId.split(".").reduce((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return value[segment];
  }, mapValue);
}

async function getUserDisplayName(uid) {
  if (!uid) return "User";
  const profile = await getProfileData(uid);
  return normalizeProfileName(profile?.fullName) || normalizeProfileName(profile?.name) || normalizeProfileName(profile?.username) || profile?.email || "User";
}

function renderMessageDropdown(listEl, chats, namesByUid, uid) {
  if (!listEl) return;
  if (!chats.length) {
    listEl.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">No new messages</p>';
    return;
  }

  listEl.innerHTML = chats.map(({ id, data, unreadCount }) => {
    const partnerId = getChatPartnerId(data, uid);
    const senderName = namesByUid.get(partnerId) || "User";
    const preview = data.lastMessage || "Sent you a message";
    return `
      <a href="messages.html?chatId=${encodeURIComponent(id)}" class="block px-4 py-3 border-b border-slate-100 hover:bg-blue-50">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">${escapeHtml(senderName.charAt(0).toUpperCase())}</div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-800 truncate">${escapeHtml(senderName)}</p>
            <p class="text-xs text-slate-500 truncate">${escapeHtml(preview)}</p>
          </div>
          <span class="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">${unreadCount > 99 ? "99+" : unreadCount}</span>
        </div>
      </a>
    `;
  }).join("");
}

async function bindMessageCenter(user, elements) {
  const { messageNotificationList, messageCount, mMessageCount, messageDropdown } = elements;
  if (!messageNotificationList || !messageCount || !mMessageCount) return;

  if (navbarState.messagesUnsubscribe && navbarState.activeMessageUid !== user?.uid) {
    navbarState.messagesUnsubscribe();
    navbarState.messagesUnsubscribe = null;
    navbarState.activeMessageUid = null;
  }

  if (!user) {
    renderMessageDropdown(messageNotificationList, [], new Map(), "");
    messageCount.classList.add("hidden");
    mMessageCount.classList.add("hidden");
    messageDropdown?.classList.add("hidden");
    return;
  }

  if (navbarState.activeMessageUid === user.uid && navbarState.messagesUnsubscribe) {
    return;
  }

  const { db } = await getFirebaseServices();
  const { collection, onSnapshot, orderBy, query, where } = await loadFirebaseModule("firebase-firestore.js");
  const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid), orderBy("timestamp", "desc"));

  navbarState.messagesUnsubscribe = onSnapshot(q, async (snap) => {
    const unreadChats = snap.docs
      .map((d) => {
        const data = d.data() || {};
        return { id: d.id, data, unreadCount: Number(getMapValueForUser(data.unreadBy, user.uid) || 0) };
      })
      .filter((chat) => getMapValueForUser(chat.data.deletedFor, user.uid) !== true)
      .filter((chat) => chat.unreadCount > 0);

    const uniquePartnerIds = [...new Set(unreadChats.map((chat) => getChatPartnerId(chat.data, user.uid)).filter(Boolean))];
    const namesByUid = new Map(await Promise.all(uniquePartnerIds.map(async (uid) => [uid, await getUserDisplayName(uid)])));
    const totalUnread = unreadChats.reduce((sum, chat) => sum + chat.unreadCount, 0);

    renderMessageDropdown(messageNotificationList, unreadChats, namesByUid, user.uid);
    messageCount.textContent = totalUnread > 99 ? "99+" : String(totalUnread);
    mMessageCount.textContent = totalUnread > 99 ? "99+" : String(totalUnread);
    messageCount.classList.toggle("hidden", totalUnread === 0);
    mMessageCount.classList.toggle("hidden", totalUnread === 0);
  }, () => {
    messageNotificationList.innerHTML = '<p class="text-center text-sm text-red-400 py-6">Failed to load messages</p>';
  });

  navbarState.activeMessageUid = user.uid;
}

async function bindNotificationCenter(user, elements) {
  const { notificationList, notificationCount, mNotificationCount, notificationDropdown } = elements;
  if (!notificationList || !notificationCount || !mNotificationCount) return;

  if (navbarState.notificationsUnsubscribe && navbarState.activeNotificationUid !== user?.uid) {
    navbarState.notificationsUnsubscribe();
    navbarState.notificationsUnsubscribe = null;
    navbarState.activeNotificationUid = null;
  }

  if (!user) {
    renderNotificationDropdown(notificationList, []);
    notificationCount.classList.add("hidden");
    mNotificationCount.classList.add("hidden");
    notificationDropdown?.classList.add("hidden");
    return;
  }

  if (navbarState.activeNotificationUid === user.uid && navbarState.notificationsUnsubscribe) {
    return;
  }

  const { db } = await getFirebaseServices();
  const { collection, onSnapshot, orderBy, query, where } = await loadFirebaseModule("firebase-firestore.js");
  const ref = collection(db, "notifications");
  const q = query(ref, where("toUid", "==", user.uid), orderBy("createdAt", "desc"));

  navbarState.notificationsUnsubscribe = onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
    const unreadCount = rows.filter((row) => !row.data.read).length;

    renderNotificationDropdown(notificationList, rows);
    notificationCount.textContent = String(unreadCount);
    mNotificationCount.textContent = String(unreadCount);
    notificationCount.classList.toggle("hidden", unreadCount === 0);
    mNotificationCount.classList.toggle("hidden", unreadCount === 0);
  }, () => {
    notificationList.innerHTML = '<p class="text-center text-sm text-red-400 py-6">Failed to load notifications</p>';
  });

  navbarState.activeNotificationUid = user.uid;
}

async function initNavbarUI() {
  const elements = getNavbarElements();
  const { loginBtn, mLoginBtn, menuBtn, mobileMenu, logoutBtn, mLogoutBtn, notificationBtn, notificationDropdown, mNotificationBtn, messageBtn, messageDropdown } = elements;

  if (!loginBtn && !mLoginBtn) return;
  if (elements.navRoot && navbarState.boundNav === elements.navRoot) return;
  navbarState.boundNav = elements.navRoot;

  menuBtn?.addEventListener("click", () => {
    mobileMenu?.classList.toggle("hidden");
  });

  notificationBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    messageDropdown?.classList.add("hidden");
    notificationDropdown?.classList.toggle("hidden");
  });

  messageBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    notificationDropdown?.classList.add("hidden");
    messageDropdown?.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const clickedInsideNotifications = notificationDropdown && notificationBtn && (notificationDropdown.contains(target) || notificationBtn.contains(target));
    const clickedInsideMessages = messageDropdown && messageBtn && (messageDropdown.contains(target) || messageBtn.contains(target));
    if (!clickedInsideNotifications) notificationDropdown?.classList.add("hidden");
    if (!clickedInsideMessages) messageDropdown?.classList.add("hidden");
  });

  mNotificationBtn?.addEventListener("click", () => {
    const nav = globalThis.booterRouter;
    if (nav?.navigate) {
      nav.navigate("notification.html");
      return;
    }
    window.location.href = "notification.html";
  });

  try {
    await waitForInitialAuthUser();
    const { auth } = await getFirebaseServices();
    const { onAuthStateChanged, signOut } = await loadFirebaseModule("firebase-auth.js");

    if (navbarState.authUnsubscribe) navbarState.authUnsubscribe();
    navbarState.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      await toggleForAuth(user, elements);
      await bindNotificationCenter(user, elements);
      await bindMessageCenter(user, elements);
    });

    const onLogout = async () => {
      await signOut(auth);
      const nav = globalThis.booterRouter;
      if (nav?.navigate) {
        nav.navigate("login.html");
        return;
      }
      window.location.href = "login.html";
    };

    logoutBtn?.addEventListener("click", onLogout);
    mLogoutBtn?.addEventListener("click", onLogout);
  } catch {
    // auth-guard handles redirect
  }
}
