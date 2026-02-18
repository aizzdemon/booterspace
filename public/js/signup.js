firebase.initializeApp({
  apiKey: "AIzaSyBeGZBE1u1-y1hDWbRouchgwkgp89D973I",
  authDomain: "kar-kardan.firebaseapp.com",
  projectId: "kar-kardan"
});

const auth = firebase.auth();
const db = firebase.firestore();
let selectedRole = "";

// Fix: explicit signup-flow flags prevent auth-state redirects before Firestore writes finish.
let isSignupFlowInProgress = false;
let didFirestoreWriteSucceed = false;

// Fix: centralized, production-safe retry helper for transient Firestore failures.
async function writeUserDocWithRetry(uid, userPayload, attempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Required: use users/{uid} document write (never .add()).
      await db.collection("users").doc(uid).set(userPayload);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        // Exponential-ish backoff to improve reliability in flaky network conditions.
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }

  throw lastError;
}

auth.onAuthStateChanged((user) => {
  // Fix: safely guard auth listener so signup never redirects before Firestore .set() succeeds.
  if (isSignupFlowInProgress && !didFirestoreWriteSucceed) return;

  // Existing signed-in users can still be redirected away from signup.
  if (user && !user.isAnonymous) {
    window.location.replace("index.html");
  }
});

const formEl = document.getElementById("signupForm");
const fields = {
  fullName: document.getElementById("name"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  gender: document.getElementById("gender"),
  password: document.getElementById("password"),
  company: document.getElementById("company"),
  gst: document.getElementById("gst"),
  pan: document.getElementById("pan")
};

const errors = {
  form: document.getElementById("formError"),
  phone: document.getElementById("phoneError"),
  gender: document.getElementById("genderError"),
  company: document.getElementById("companyError"),
  gst: document.getElementById("gstError"),
  pan: document.getElementById("panError")
};

function toggleVisibilityAndState(el, shouldShow) {
  el.classList.toggle("hidden", !shouldShow);
  // Fix: disable hidden fields so they don't participate in validation/submission.
  el.disabled = !shouldShow;
}

function resetErrors() {
  Object.values(errors).forEach((el) => {
    el.classList.add("hidden");
    if (el === errors.form) el.textContent = "";
  });
}

function selectRole(role) {
  selectedRole = role;
  document.getElementById("roleStep").classList.add("hidden");
  document.getElementById("signupForm").classList.remove("hidden");
  document.getElementById("formTitle").innerText = role === "jobSeeker" ? "Job Seeker Account" : "Job Provider Account";

  const isProvider = (role === "jobProvider");
  const isSeeker = (role === "jobSeeker");

  const providerGroup = document.getElementById("providerFieldsGroup");
  if (providerGroup) providerGroup.classList.toggle("hidden", !isProvider);

  [fields.company, fields.gst, fields.pan].forEach((el) => toggleVisibilityAndState(el, isProvider));
  toggleVisibilityAndState(fields.gender, isSeeker);

  // Clear role-specific selections when switching roles.
  if (!isSeeker) fields.gender.value = "";
  if (!isProvider) {
    fields.company.value = "";
    fields.gst.value = "";
    fields.pan.value = "";
  }
  resetErrors();

  const noteEl = document.getElementById("approvalNote");
  if (isProvider) {
    noteEl.innerText = "⚠ Job posting will be enabled after admin approval.";
    noteEl.classList.remove("hidden");
  } else {
    noteEl.innerText = "";
    noteEl.classList.add("hidden");
  }
}

function getDefaultPhotoURLByEmail(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) return "";
  if (normalizedEmail.endsWith("@gmail.com")) {
    return `https://profiles.google.com/s2/photos/profile/${encodeURIComponent(normalizedEmail)}?sz=256`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedEmail.split("@")[0] || "User")}&background=random&size=256`;
}

function setSubmitState(isSubmitting) {
  const submitBtn = formEl.querySelector('button[type="submit"]');
  if (!submitBtn) return;
  submitBtn.disabled = isSubmitting;
  submitBtn.classList.toggle("opacity-70", isSubmitting);
  submitBtn.classList.toggle("cursor-not-allowed", isSubmitting);
}

// Fix: payload strictly aligns with Firestore users/{userId} create rule allowlist + required types.
function buildUserPayload({ fullName, emailVal, phoneVal, selectedRole, genderVal, companyVal, gstVal, panVal, resolvedPhotoURL }) {
  const isProvider = selectedRole === "jobProvider";
  const payload = {
    fullName,
    fullNameLower: fullName.toLowerCase(),
    email: emailVal,
    emailLower: emailVal.toLowerCase(),
    phone: phoneVal,
    role: selectedRole,
    // Rule requires bool on create.
    jobPostAccess: isProvider ? false : true,
    // Rule requires Firestore timestamp type.
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    // Keep role fields present at create so profile shape is consistent.
    gender: isProvider ? "" : genderVal,
    company: isProvider ? companyVal : "",
    gstNumber: isProvider ? gstVal : "",
    companyPAN: isProvider ? panVal : "",
    // Allowed key in rule; default empty when resolver cannot generate URL.
    photoURL: resolvedPhotoURL || ""
  };

  return payload;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  resetErrors();

  let valid = true;

  // Fix: show explicit error messaging for all required fields.
  const missingRequired = [];
  if (!fields.fullName.value.trim()) missingRequired.push("Full Name");
  if (!fields.email.value.trim()) missingRequired.push("Email Address");
  if (!fields.password.value.trim()) missingRequired.push("Password");

  if (missingRequired.length) {
    errors.form.textContent = `⚠ Please fill required fields: ${missingRequired.join(", ")}.`;
    errors.form.classList.remove("hidden");
    valid = false;
  }

  if (!fields.phone.value.trim()) {
    errors.phone.classList.remove("hidden");
    valid = false;
  }

  if (selectedRole === "jobSeeker" && !fields.gender.value) {
    errors.gender.classList.remove("hidden");
    valid = false;
  }

  // Fix: validate company-specific fields for Job Provider users.
  if (selectedRole === "jobProvider") {
    if (!fields.company.value.trim()) {
      errors.company.classList.remove("hidden");
      valid = false;
    }
    if (!fields.gst.value.trim()) {
      errors.gst.classList.remove("hidden");
      valid = false;
    }
    if (!fields.pan.value.trim()) {
      errors.pan.classList.remove("hidden");
      valid = false;
    }
  }

  if (!valid) return;

  if (!selectedRole) {
    errors.form.textContent = "⚠ Please select an account type first.";
    errors.form.classList.remove("hidden");
    return;
  }

  const fullName = fields.fullName.value.trim();
  const emailVal = fields.email.value.trim();
  const phoneVal = fields.phone.value.trim();
  const passwordVal = fields.password.value;
  const genderVal = fields.gender.value;
  const companyVal = fields.company.value.trim();
  const gstVal = fields.gst.value.trim();
  const panVal = fields.pan.value.trim();

  let createdUser = null;

  try {
    isSignupFlowInProgress = true;
    didFirestoreWriteSucceed = false;
    setSubmitState(true);

    const cred = await auth.createUserWithEmailAndPassword(emailVal, passwordVal);
    createdUser = cred.user;
    const resolvedPhotoURL = cred.user.photoURL || getDefaultPhotoURLByEmail(emailVal);

    if (resolvedPhotoURL) {
      await cred.user.updateProfile({ photoURL: resolvedPhotoURL });
    }

    const userPayload = buildUserPayload({
      fullName,
      emailVal,
      phoneVal,
      selectedRole,
      genderVal,
      companyVal,
      gstVal,
      panVal,
      resolvedPhotoURL
    });

    await writeUserDocWithRetry(cred.user.uid, userPayload);

    didFirestoreWriteSucceed = true;

    // Fix: redirect only after Firestore write has completed successfully.
    window.location.replace("index.html");
  } catch (err) {
    // Fix: log full Firebase error details for production debugging.
    console.error("Signup failed:", err.code, err.message, err);

    // Fix: user-friendly error messaging in UI.
    if (createdUser && !didFirestoreWriteSucceed) {
      try {
        // Fix: rollback partially-created auth account if profile write fails, so user can retry cleanly.
        await createdUser.delete();
      } catch (cleanupErr) {
        console.error("Signup cleanup failed:", cleanupErr.code, cleanupErr.message, cleanupErr);
      }
      await auth.signOut().catch(() => {});
    }

    const friendlyMessages = {
      "auth/email-already-in-use": "This email is already registered. Please log in instead.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password is too weak. Please use at least 6 characters.",
      "auth/network-request-failed": "Network issue detected. Check your internet connection and try again.",
      "permission-denied": "Profile save was blocked by Firestore rules. Allowed keys: fullName, fullNameLower, email, emailLower, phone, role, jobPostAccess, gender, company, gstNumber, companyPAN, photoURL, createdAt."
    };

    const message = friendlyMessages[err.code] || "We could not create your account right now. Please try again.";
    errors.form.textContent = `⚠ ${message}`;
    errors.form.classList.remove("hidden");
  } finally {
    isSignupFlowInProgress = false;
    setSubmitState(false);
  }
});

// Keep function global for existing inline onclick attributes in signup.html
window.selectRole = selectRole;
