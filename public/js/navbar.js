(function navbarUI() {
  if (window.__navbarUIInitialized) return;
  window.__navbarUIInitialized = true;

  const loadFirebaseModule =
    window.loadFirebaseModule ||
    ((moduleName) => import(`https://www.gstatic.com/firebasejs/10.12.5/${moduleName}`));

  let notificationsUnsubscribe = null;

  async function ensureAuthContext() {
    if (window.authReady) return window.authReady;

    if (!window.firebaseServicesReady) {
      window.firebaseServicesReady = (async () => {
        const { initializeApp, getApp, getApps } = await loadFirebaseModule("firebase-app.js");
        const { getAuth } = await loadFirebaseModule("firebase-auth.js");
        const { getFirestore } = await loadFirebaseModule("firebase-firestore.js");

        const firebaseConfig = {
          apiKey: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
          authDomain: "kar-kardan.firebaseapp.com",
          projectId: "kar-kardan",
          storageBucket: "kar-kardan.firebasestorage.app",
          messagingSenderId: "554147696994",
          appId: "1:554147696994:web:221dcb883e3b65dcea5c3b",
          measurementId: "G-RRC3X485KQ"
        };

        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        window.app = app;
        window.auth = window.auth || getAuth(app);
        window.db = window.db || getFirestore(app);
        return { app: window.app, auth: window.auth, db: window.db };
      })();
    }

    window.authReady = window.firebaseServicesReady.then(async ({ auth }) => {
      const { onAuthStateChanged } = await loadFirebaseModule("firebase-auth.js");
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user || null);
        });
      });
    });

    return window.authReady;
  }

  function getNavbarElements() {
    return {
      profileBtn: document.getElementById("profileBtn"),
      profilePic: document.getElementById("profilePic"),
      profileName: document.getElementById("profileName"),
      loginBtn: document.getElementById("loginBtn"),
      logoutBtn: document.getElementById("logoutBtn"),
      mProfileBtn: document.getElementById("mProfileBtn"),
      mProfilePic: document.getElementById("mProfilePic"),
      mProfileName: document.getElementById("mProfileName"),
      mLoginBtn: document.getElementById("mLoginBtn"),
      mLogoutBtn: document.getElementById("mLogoutBtn"),
      menuBtn: document.getElementById("menuBtn"),
      mobileMenu: document.getElementById("mobileMenu"),
      notificationBtn: document.getElementById("notificationBtn"),
      notificationDropdown: document.getElementById("notificationDropdown"),
      notificationList: document.getElementById("notificationList"),
      notificationCount: document.getElementById("notificationCount"),
      mNotificationBtn: document.getElementById("mNotificationBtn"),
      mNotificationCount: document.getElementById("mNotificationCount")
    };
  }

  function resolveProfileName(user, profileData) {
    return profileData?.fullName || user.displayName || user.email || "User";
  }

  function resolveProfilePhoto(user, profileData) {
    if (profileData?.photoURL) return profileData.photoURL;
    if (profileData?.avatar) return profileData.avatar;
    if (user.photoURL) return user.photoURL;

    const email = (user.email || "").trim().toLowerCase();
    if (email.endsWith("@gmail.com")) {
      return `https://profiles.google.com/s2/photos/profile/${encodeURIComponent(email)}?sz=256`;
    }

    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.uid}`;
  }

  async function getProfileData(uid) {
    try {
      const { doc, getDoc } = await loadFirebaseModule("firebase-firestore.js");
      const profileRef = doc(window.db, "users", uid);
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
      mLogoutBtn,
      notificationCount,
      mNotificationCount,
      notificationList
    } = elements;

    loginBtn?.classList.toggle("hidden", isAuthed);
    logoutBtn?.classList.toggle("hidden", !isAuthed);
    profileBtn?.classList.toggle("hidden", !isAuthed);

    mLoginBtn?.classList.toggle("hidden", isAuthed);
    mLogoutBtn?.classList.toggle("hidden", !isAuthed);
    mProfileBtn?.classList.toggle("hidden", !isAuthed);

    if (!isAuthed) {
      if (notificationCount) notificationCount.classList.add("hidden");
      if (mNotificationCount) mNotificationCount.classList.add("hidden");
      if (notificationList) {
        notificationList.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">Login to see notifications</p>';
      }
      return;
    }

    const profileData = await getProfileData(user.uid);
    const displayName = resolveProfileName(user, profileData);
    const avatar = resolveProfilePhoto(user, profileData);

    if (profileName) profileName.textContent = displayName;
    if (profilePic) profilePic.src = avatar;
    if (mProfileName) mProfileName.textContent = displayName;
    if (mProfilePic) mProfilePic.src = avatar;
  }

  function resolveNotificationMeta(type = "", text = "") {
    const normalizedType = type.toLowerCase();
    const lower = text.toLowerCase();

    if (normalizedType.includes("message") || lower.includes("message")) return { icon: "💬", title: "New message" };
    if (normalizedType.includes("connection") || lower.includes("connection") || lower.includes("request")) return { icon: "🤝", title: "Connection request" };
    if (normalizedType.includes("job") || lower.includes("job")) return { icon: "💼", title: "New job post" };
    if (normalizedType.includes("comment") || lower.includes("comment")) return { icon: "💭", title: "New comment" };
    if (normalizedType.includes("post") || lower.includes("post")) return { icon: "📝", title: "New post" };
    return { icon: "🔔", title: "Notification" };
  }

  function resolveNotificationTarget(notificationData = {}) {
    const rawLink = (notificationData.link || notificationData.url || "").toString().trim();
    if (rawLink) return rawLink;

    const targetUid = notificationData.fromUid || notificationData.fromId || notificationData.senderId;
    if (targetUid) return `messages.html?composeTo=${encodeURIComponent(targetUid)}`;
    return "notification.html";
  }

  function renderNotificationDropdown(listEl, notifications) {
    if (!listEl) return;

    if (!notifications.length) {
      listEl.innerHTML = '<p class="text-center text-sm text-gray-400 py-6">No new notifications</p>';
      return;
    }

    listEl.innerHTML = notifications.map(({ id, data }) => {
      const body = (data.message || data.text || "New update").toString();
      const { icon, title } = resolveNotificationMeta(data.type || "", body);
      const link = resolveNotificationTarget(data);
      const isUnread = !data.read;

      return `
        <a href="${link}" class="block px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${isUnread ? "bg-blue-50/40" : ""}">
          <div class="flex items-start gap-2">
            <span>${icon}</span>
            <div class="min-w-0">
              <p class="text-[11px] font-semibold text-slate-800">${title}</p>
              <p class="text-xs text-slate-700 line-clamp-2">${body}</p>
            </div>
          </div>
        </a>
      `;
    }).join("");
  }

  async function bindNotificationCenter(user, elements) {
    const {
      notificationList,
      notificationCount,
      mNotificationCount,
      notificationDropdown
    } = elements;

    if (!notificationList || !notificationCount || !mNotificationCount) return;

    if (notificationsUnsubscribe) {
      notificationsUnsubscribe();
      notificationsUnsubscribe = null;
    }

    if (!user) {
      renderNotificationDropdown(notificationList, []);
      notificationCount.classList.add("hidden");
      mNotificationCount.classList.add("hidden");
      notificationDropdown?.classList.add("hidden");
      return;
    }

    const { collection, onSnapshot, query, where } = await loadFirebaseModule("firebase-firestore.js");
    const q = query(collection(window.db, "notifications"), where("toUid", "==", user.uid));

    notificationsUnsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
      rows.sort((a, b) => ((b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0)));
      renderNotificationDropdown(notificationList, rows.slice(0, 8));

      const unreadCount = rows.reduce((count, row) => count + (row.data.read ? 0 : 1), 0);
      notificationCount.textContent = String(unreadCount);
      mNotificationCount.textContent = String(unreadCount);
      notificationCount.classList.toggle("hidden", unreadCount === 0);
      mNotificationCount.classList.toggle("hidden", unreadCount === 0);
    }, () => {
      notificationList.innerHTML = '<p class="text-center text-sm text-red-400 py-6">Failed to load notifications</p>';
    });
  }

  function initNavbarInteractions() {
    const elements = getNavbarElements();
    const {
      loginBtn,
      mLoginBtn,
      menuBtn,
      mobileMenu,
      logoutBtn,
      mLogoutBtn,
      notificationBtn,
      notificationDropdown,
      mNotificationBtn
    } = elements;

    if (!loginBtn && !mLoginBtn) {
      window.__navbarUIInitialized = false;
      return false;
    }

    menuBtn?.addEventListener("click", () => {
      mobileMenu?.classList.toggle("hidden");
    });

    notificationBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      notificationDropdown?.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!notificationDropdown || !notificationBtn || !(target instanceof Element)) return;
      const clickedInside = notificationDropdown.contains(target) || notificationBtn.contains(target);
      if (!clickedInside) notificationDropdown.classList.add("hidden");
    });

    mNotificationBtn?.addEventListener("click", () => {
      window.location.href = "notification.html";
    });

    ensureAuthContext()
      .then(async () => {
        const { onAuthStateChanged, signOut } = await loadFirebaseModule("firebase-auth.js");

        onAuthStateChanged(window.auth, async (user) => {
          await toggleForAuth(user, elements);
          bindNotificationCenter(user, elements);
        });

        const onLogout = async () => {
          await signOut(window.auth);
          window.location.href = "login.html";
        };

        logoutBtn?.addEventListener("click", onLogout);
        mLogoutBtn?.addEventListener("click", onLogout);
      })
      .catch(() => {
        // auth-guard handles redirect
      });

    return true;
  }

  if (!initNavbarInteractions()) {
    const observer = new MutationObserver(() => {
      if (initNavbarInteractions()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
