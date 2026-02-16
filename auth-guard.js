// auth-guard.js

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";

// Call this on any protected page
export function authGuard() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Not logged in → go to login page
      window.location.replace("login.html");
    }
  });
}
