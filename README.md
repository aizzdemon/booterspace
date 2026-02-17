# Booterspace — Full-Stack Professional Networking Starter

Booterspace is now structured as a modern LinkedIn-style web app starter powered by **Firebase + GitHub authentication**, with real-time features for:

- Community feed posts
- Direct messages (chat)
- Notification center
- GitHub sign-in via Firebase Auth
- One-command Firebase Hosting deployment from GitHub Actions

## Stack

- **Frontend**: HTML + CSS + vanilla JavaScript modules
- **Backend (BaaS)**: Firebase Authentication + Firestore
- **Deployment**: Firebase Hosting
- **CI/CD**: GitHub Actions

## Project Structure

```text
.
├── index.html
├── assets/
│   ├── css/main.css
│   └── js/
│       ├── app.js
│       ├── firebase.js
│       └── firebase-config.example.js
├── .github/workflows/firebase-hosting.yml
├── firebase.json
└── .firebaserc
```

## Firebase Setup

1. Create a Firebase project.
2. Enable **Authentication → GitHub provider** in Firebase console.
3. Enable **Cloud Firestore**.
4. Copy config template:

```bash
cp assets/js/firebase-config.example.js assets/js/firebase-config.js
```

5. Fill `assets/js/firebase-config.js` with your Firebase credentials.

## Local Run

Use any static server:

```bash
python -m http.server 4173
```

Open `http://localhost:4173`.

## Firestore Collections Used

- `posts`: feed updates
- `messages`: direct chat messages
- `notifications`: user notifications

## GitHub + Firebase Deployment

1. Install firebase CLI locally and login:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

2. Set your project in `.firebaserc`.
3. In GitHub repo secrets, add:
   - `FIREBASE_TOKEN` (from `firebase login:ci`)
4. Push to `main` to auto-deploy with `.github/workflows/firebase-hosting.yml`.

## Notes

- Keep `assets/js/firebase-config.js` out of commits if it contains sensitive config variants.
- Use Firebase security rules before production launch.
