importScripts("https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js");

function getEnvVar(...keys) {
  const runtimeEnv = (typeof window !== "undefined" && window.__ENV__) || (typeof self !== "undefined" && self.__ENV__) || {};
  const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

  for (const key of keys) {
    if (runtimeEnv[key]) return runtimeEnv[key];
    if (processEnv[key]) return processEnv[key];
  }

  return "";
}

firebase.initializeApp({
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY", "REACT_APP_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "REACT_APP_FIREBASE_PROJECT_ID"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", "REACT_APP_FIREBASE_APP_ID")
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "BooterSpace Notification";
  const body = payload?.notification?.body || payload?.data?.text || "You have a new update";

  self.registration.showNotification(title, {
    body,
    icon: payload?.notification?.icon || "https://aizzdemon.github.io/booterspace/assets/images/booterspace.png",
    data: {
      url: payload?.data?.url || "/notification.html"
    }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/notification.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});
