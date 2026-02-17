# React Chat System (Connection-Request Based)

This demo now follows a realistic contact flow:

1. A user sends a connection request.
2. The recipient accepts the request.
3. Only accepted users appear in Connected Contacts and can chat.
4. Mobile numbers can be saved/updated per accepted contact.

## Features

- Pending connection requests panel with Accept action.
- Connected contacts list (accepted requests only).
- One-to-one chat thread per accepted contact.
- Save mobile number in chat header for the selected contact.
- Search contacts by name, number, or message text.

## Run locally

```bash
cd react-chat
npm install
npm run dev
```

## Build

```bash
npm run build
```
