# React Chat System (Google Firebase Read/Write)

This chat app now uses **Google Firebase (Auth + Firestore)** for all core data operations.

## Firebase-backed features

- User profile bootstrap in `chat_users/{uid}`.
- Discover users from Firestore to send connection requests.
- Send/receive/accept connection requests in `chat_connection_requests`.
- Auto-create one-to-one conversations in `chat_conversations` after acceptance.
- Read/write messages in `chat_conversations/{conversationId}/messages`.
- Save mobile numbers per contact in `chat_users/{uid}/contacts/{contactId}`.
- Live UI updates using Firestore `onSnapshot` listeners.

## Local run

```bash
cd react-chat
npm install
npm run dev
```

## Build

```bash
npm run build
```

> Note: Firestore security rules must allow the signed-in user to read/write these collections.
