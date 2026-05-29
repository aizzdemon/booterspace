importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

/*
  Firebase Cloud Messaging Service Worker
  File Name: firebase-messaging-sw.js
  IMPORTANT:
  - Place this file in the ROOT of your GitHub project
  - Example:
      /
      firebase-messaging-sw.js
*/

firebase.initializeApp({
  apiKey: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
  authDomain: "kar-kardan.firebaseapp.com",
  databaseURL: "https://kar-kardan-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kar-kardan",
  storageBucket: "kar-kardan.firebasestorage.app",
  messagingSenderId: "554147696994",
  appId: "1:554147696994:web:221dcb883e3b65dcea5c3b",
  measurementId: "G-RRC3X485KQ"
});

const messaging = firebase.messaging();

function scopedUrl(path) {
  const value = path || "notification.html";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\//, ""), self.registration.scope).href;
}

/*
  Background Notifications
  Works when:
  - Website closed
  - Tab minimized
  - Browser running in background
*/

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background Message:", payload);

  const notification = payload.notification || {};

  const notificationTitle =
    notification.title ||
    payload.data?.title ||
    "BooterSpace Notification";

  const notificationOptions = {
    body:
      notification.body ||
      payload.data?.body ||
      "You have a new update.",
      
    icon:
      notification.icon ||
      payload.data?.icon ||
      scopedUrl("favicon.ico"),

    badge:
      payload.data?.badge ||
      scopedUrl("favicon.ico"),

    image:
      payload.data?.image || undefined,

    vibrate: [200, 100, 200],

    requireInteraction: false,

    data: {
      url:
        scopedUrl(payload.data?.url || "notification.html")
    }
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

/*
  Notification Click Handling
*/

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked");

  event.notification.close();

  const targetUrl = scopedUrl(
    event.notification?.data?.url || "notification.html"
  );

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {

      // Focus existing tab
      for (const client of clientList) {
        if (
          client.url.includes(targetUrl) &&
          "focus" in client
        ) {
          return client.focus();
        }
      }

      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/*
  Service Worker Install
*/

self.addEventListener("install", (event) => {
  console.log("FCM Service Worker Installed");
  self.skipWaiting();
});

/*
  Service Worker Activate
*/

self.addEventListener("activate", (event) => {
  console.log("FCM Service Worker Activated");

  event.waitUntil(
    self.clients.claim()
  );
});
