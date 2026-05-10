# Browser Notification Implementation Notes

## Current status

Browser notification setup is now wired on the frontend for BooterSpace pages.

Users see a centered opt-in prompt that says **"Allow notification for job alerts"** on a blurred background when browser notifications are not already allowed. If the user allows notifications, the prompt stops appearing. If the user closes, postpones, or blocks notifications, the app waits five minutes before showing the prompt again.

## Implemented frontend flow

1. Each frontend HTML page loads `public/js/browser-notifications.js`.
2. The notification module checks for secure-context, Notification API, and Service Worker support.
3. If permission is not granted, it shows the opt-in prompt in the middle of the screen.
4. When the user clicks the allow button, it calls `Notification.requestPermission()` from that user gesture.
5. If permission is granted, it registers `firebase-messaging-sw.js`.
6. It uses Firebase Messaging `getToken()` with the configured VAPID key.
7. It stores the generated token under `users/{uid}/fcmTokens/{token}` for the signed-in user.
8. It binds Firebase Messaging `onMessage()` so foreground FCM messages can still display browser notifications.
9. It also listens to Firestore notifications and unread chats as a frontend fallback while the app is open.

## Remaining backend requirement

For true push notifications when the site is closed, a trusted backend sender is still required. A Firebase Cloud Function or server should read saved user FCM tokens and send FCM payloads whenever a job alert, message, or account notification is created.

Frontend pages can now collect permission and tokens, but frontend code must not send privileged FCM server requests directly because that would expose server credentials.
