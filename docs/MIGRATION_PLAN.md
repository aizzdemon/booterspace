# BooterSpace React + Vite Migration Plan

## Audit summary

BooterSpace currently ships as a collection of root-level HTML pages with page-specific inline scripts and shared scripts under `public/js`. Firebase is initialized through a mix of modular CDN imports and compat SDK scripts. Core data flows include:

- Authentication: email/password sign in, password reset, role-based signup, auth guards for protected pages.
- Firestore: users, jobs, messages, notifications, places/books/admin-oriented collections.
- FCM/browser notifications: root `firebase-messaging-sw.js` plus foreground notification helpers.
- Content pages: home, jobs, job details, government jobs, community, companies, hangout places, books, reviews, resume, profile, admin, messaging, posting flows.

## Migration approach

1. Establish a Vite-powered React application with React Router and Tailwind CSS.
2. Centralize Firebase SDK v10+ setup in a reusable module that reads `VITE_FIREBASE_*` variables while retaining existing fallback values.
3. Add reusable providers/hooks for auth state, Firestore reads/writes, and browser notification registration.
4. Convert high-priority functional pages into route-level React components:
   - Auth: login, signup, protected routes.
   - Jobs: browse/filter jobs, job details, post job with notifications.
   - Messaging: authenticated realtime chat backed by Firestore.
   - Profiles: edit/search profile documents.
   - Admin: review pending jobs and user/provider access.
   - Notifications: list/update current-user notifications and manage FCM permission/token.
5. Convert SEO/marketing pages into React content routes while preserving titles/descriptions and meaningful crawlable copy.
6. Leave legacy HTML files in place during transition for rollback/reference, but make React routes the primary application entry.
7. Document what was migrated, what remains, and how to verify Firebase Auth, Firestore, and FCM after deployment.

## Verification plan

- Run `npm install` to resolve the new React/Vite/Firebase dependencies.
- Run `npm run build` to validate the React application and Tailwind compilation.
- Manually verify in a browser with valid Firebase env values:
  - Sign up/sign in/password reset.
  - Jobs load from Firestore or bundled fallback, filtering works, and a protected user can post a pending job.
  - Messages stream in realtime for authenticated users.
  - Profile save/search writes and reads Firestore user documents.
  - Notification permission registers an FCM token and foreground/background notifications still use the root service worker.
  - Admin pending-job review flows work for authorized admins.
