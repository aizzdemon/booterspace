import { firebaseMessagingVapidKey, getFirebaseServices, loadFirebaseModule, waitForInitialAuthUser } from "./firebase-singleton.js";

const PROMPT_INTERVAL_MS = 5 * 60 * 1000;
const PROMPT_SNOOZE_KEY = "booterspace:browserNotifications:nextPromptAt";
const PROMPT_DISMISSED_KEY = "booterspace:browserNotifications:dismissedAt";
const TOKEN_CACHE_KEY = "booterspace:browserNotifications:fcmToken";
const SERVICE_WORKER_PATH = new URL("../../firebase-messaging-sw.js", import.meta.url).pathname;
const DEFAULT_NOTIFICATION_ICON = new URL("../../favicon.ico", import.meta.url).pathname;

function appPath(path) {
  return new URL(path.replace(/^\//, ""), new URL("../../", import.meta.url)).pathname;
}

let promptTimer = null;
let setupPromise = null;
let foregroundHandlerBound = false;
let notificationListenerBound = false;
let messageListenerBound = false;
let lastNotificationCreatedAt = Date.now();
let lastMessageTimestamp = Date.now();

function isSecureNotificationContext() {
  return window.isSecureContext || ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && isSecureNotificationContext();
}

function getStoredNumber(key) {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors.
  }
}

function getPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function shouldShowPrompt() {
  if (!canUseBrowserNotifications()) return false;
  if (getPermission() === "granted") return false;
  return Date.now() >= getStoredNumber(PROMPT_SNOOZE_KEY);
}

function snoozePrompt() {
  setStoredValue(PROMPT_SNOOZE_KEY, Date.now() + PROMPT_INTERVAL_MS);
  setStoredValue(PROMPT_DISMISSED_KEY, Date.now());
}

function schedulePrompt(delay = PROMPT_INTERVAL_MS) {
  if (promptTimer) window.clearTimeout(promptTimer);
  if (getPermission() === "granted") return;
  promptTimer = window.setTimeout(() => {
    showNotificationPrompt();
  }, delay);
}

function removePrompt() {
  document.getElementById("booterNotificationPrompt")?.remove();
}

function createPromptMarkup(isDenied) {
  const helperText = isDenied
    ? "Notifications are blocked in your browser. Enable them from site settings, then click Allow again."
    : "Get browser alerts for new job alerts, messages, and account notifications.";

  return `
    <div class="booter-notification-card" role="dialog" aria-modal="true" aria-labelledby="booterNotificationTitle">
      <button class="booter-notification-close" type="button" aria-label="Remind me later">×</button>
      <div class="booter-notification-icon" aria-hidden="true">🔔</div>
      <h2 id="booterNotificationTitle">Allow notification for job alerts</h2>
      <p>${helperText}</p>
      <div class="booter-notification-actions">
        <button id="booterNotificationAllow" class="booter-notification-allow" type="button">Allow notification</button>
        <button id="booterNotificationLater" class="booter-notification-later" type="button">Later</button>
      </div>
    </div>
  `;
}

function ensurePromptStyles() {
  if (document.getElementById("booterNotificationPromptStyles")) return;
  const style = document.createElement("style");
  style.id = "booterNotificationPromptStyles";
  style.textContent = `
    #booterNotificationPrompt {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    #booterNotificationPrompt .booter-notification-card {
      position: relative;
      width: min(92vw, 430px);
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
      padding: 2rem;
      text-align: center;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #booterNotificationPrompt .booter-notification-close {
      position: absolute;
      top: 0.85rem;
      right: 1rem;
      border: 0;
      background: transparent;
      color: #64748b;
      font-size: 1.75rem;
      line-height: 1;
      cursor: pointer;
    }
    #booterNotificationPrompt .booter-notification-icon {
      width: 4rem;
      height: 4rem;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #dbeafe;
      color: #2563eb;
      font-size: 2rem;
    }
    #booterNotificationPrompt h2 {
      margin: 0 0 0.6rem;
      color: #0f172a;
      font-size: clamp(1.45rem, 5vw, 2rem);
      line-height: 1.15;
      font-weight: 800;
    }
    #booterNotificationPrompt p {
      margin: 0 auto 1.25rem;
      max-width: 22rem;
      color: #475569;
      font-size: 0.98rem;
      line-height: 1.55;
    }
    #booterNotificationPrompt .booter-notification-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    #booterNotificationPrompt button {
      font: inherit;
    }
    #booterNotificationPrompt .booter-notification-allow,
    #booterNotificationPrompt .booter-notification-later {
      border: 0;
      border-radius: 999px;
      padding: 0.8rem 1.2rem;
      font-weight: 700;
      cursor: pointer;
    }
    #booterNotificationPrompt .booter-notification-allow {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 12px 28px rgba(37, 99, 235, 0.28);
    }
    #booterNotificationPrompt .booter-notification-later {
      background: #f1f5f9;
      color: #334155;
    }
  `;
  document.head.appendChild(style);
}

async function registerMessagingServiceWorker() {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  await navigator.serviceWorker.ready;
  return registration;
}

async function saveMessagingToken(token) {
  const user = await waitForInitialAuthUser();
  if (!user || !token) return;

  const { db } = await getFirebaseServices();
  const { doc, serverTimestamp, setDoc } = await loadFirebaseModule("firebase-firestore.js");
  await setDoc(doc(db, "users", user.uid, "fcmTokens", token), {
    token,
    platform: "web",
    userAgent: navigator.userAgent,
    updatedAt: serverTimestamp()
  }, { merge: true });
  setStoredValue(TOKEN_CACHE_KEY, token);
}

async function ensureMessagingToken() {
  if (!canUseBrowserNotifications() || getPermission() !== "granted") return null;

  const { messaging } = await getFirebaseServices();
  if (!messaging) return null;

  const registration = await registerMessagingServiceWorker();
  const { getToken } = await loadFirebaseModule("firebase-messaging.js");
  const token = await getToken(messaging, {
    vapidKey: firebaseMessagingVapidKey,
    serviceWorkerRegistration: registration
  });

  if (token) await saveMessagingToken(token);
  return token || null;
}

async function showBrowserNotification(title, options = {}) {
  if (!canUseBrowserNotifications() || getPermission() !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: DEFAULT_NOTIFICATION_ICON,
    badge: DEFAULT_NOTIFICATION_ICON,
    ...options
  });
}

function notificationUrlFromPayload(payload) {
  return payload?.data?.url || appPath("notification.html");
}

async function bindForegroundMessaging() {
  if (foregroundHandlerBound || !canUseBrowserNotifications() || getPermission() !== "granted") return;
  const { messaging } = await getFirebaseServices();
  if (!messaging) return;

  const { onMessage } = await loadFirebaseModule("firebase-messaging.js");
  onMessage(messaging, (payload) => {
    const title = payload?.notification?.title || payload?.data?.title || "BooterSpace Notification";
    showBrowserNotification(title, {
      body: payload?.notification?.body || payload?.data?.body || "You have a new update",
      icon: payload?.notification?.icon || payload?.data?.icon || DEFAULT_NOTIFICATION_ICON,
      data: { url: notificationUrlFromPayload(payload) }
    });
  });
  foregroundHandlerBound = true;
}

function firestoreDateToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return 0;
}

async function bindLocalNotificationFallback() {
  if (!canUseBrowserNotifications() || getPermission() !== "granted") return;
  const user = await waitForInitialAuthUser();
  if (!user) return;

  const { db } = await getFirebaseServices();
  const { collection, onSnapshot, orderBy, query, where } = await loadFirebaseModule("firebase-firestore.js");

  if (!notificationListenerBound) {
    const q = query(collection(db, "notifications"), where("toUid", "==", user.uid), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const data = change.doc.data() || {};
        const createdAt = firestoreDateToMillis(data.createdAt);
        if (!createdAt || createdAt <= lastNotificationCreatedAt) return;
        if (data.read) return;
        lastNotificationCreatedAt = Math.max(lastNotificationCreatedAt, createdAt);
        showBrowserNotification(data.title || "BooterSpace Notification", {
          body: data.message || data.body || "You have a new notification",
          data: { url: data.url || appPath("notification.html") }
        });
      });
    });
    notificationListenerBound = true;
  }

  if (!messageListenerBound) {
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid), orderBy("timestamp", "desc"));
    onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added" && change.type !== "modified") return;
        const data = change.doc.data() || {};
        const timestamp = firestoreDateToMillis(data.timestamp);
        if (!timestamp || timestamp <= lastMessageTimestamp) return;
        const unread = Number(getMapValueForUser(data.unreadBy, user.uid) || 0);
        if (unread <= 0) return;
        lastMessageTimestamp = Math.max(lastMessageTimestamp, timestamp);
        showBrowserNotification("New message on BooterSpace", {
          body: data.lastMessage || "You have a new message",
          data: { url: `${appPath("messages.html")}?chatId=${encodeURIComponent(change.doc.id)}` }
        });
      });
    });
    messageListenerBound = true;
  }
}

function getMapValueForUser(mapValue, userId) {
  if (!mapValue || typeof mapValue !== "object" || !userId) return undefined;
  if (Object.prototype.hasOwnProperty.call(mapValue, userId)) return mapValue[userId];
  return userId.split(".").reduce((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return value[segment];
  }, mapValue);
}

async function setupBrowserNotifications() {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    if (!canUseBrowserNotifications() || getPermission() !== "granted") return;
    await ensureMessagingToken();
    await bindForegroundMessaging();
    await bindLocalNotificationFallback();
  })().catch((error) => {
    console.warn("Browser notification setup failed", error);
  }).finally(() => {
    setupPromise = null;
  });
  return setupPromise;
}

async function handleAllowClick(button) {
  button.disabled = true;
  button.textContent = "Checking...";

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      removePrompt();
      await setupBrowserNotifications();
      return;
    }
    snoozePrompt();
    removePrompt();
    schedulePrompt();
  } catch (error) {
    console.warn("Notification permission request failed", error);
    snoozePrompt();
    removePrompt();
    schedulePrompt();
  }
}

function showNotificationPrompt() {
  if (!shouldShowPrompt()) {
    schedulePrompt(Math.max(PROMPT_INTERVAL_MS, getStoredNumber(PROMPT_SNOOZE_KEY) - Date.now()));
    return;
  }

  ensurePromptStyles();
  removePrompt();

  const overlay = document.createElement("div");
  overlay.id = "booterNotificationPrompt";
  overlay.innerHTML = createPromptMarkup(getPermission() === "denied");
  document.body.appendChild(overlay);

  overlay.querySelector("#booterNotificationAllow")?.addEventListener("click", (event) => handleAllowClick(event.currentTarget));
  overlay.querySelector("#booterNotificationLater")?.addEventListener("click", () => {
    snoozePrompt();
    removePrompt();
    schedulePrompt();
  });
  overlay.querySelector(".booter-notification-close")?.addEventListener("click", () => {
    snoozePrompt();
    removePrompt();
    schedulePrompt();
  });
}

function initBrowserNotifications() {
  if (!canUseBrowserNotifications()) return;

  if (getPermission() === "granted") {
    setupBrowserNotifications();
    return;
  }

  const delay = Math.max(0, getStoredNumber(PROMPT_SNOOZE_KEY) - Date.now());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => schedulePrompt(delay || 1000), { once: true });
  } else {
    schedulePrompt(delay || 1000);
  }
}

initBrowserNotifications();

export { setupBrowserNotifications, showNotificationPrompt };
