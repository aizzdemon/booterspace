import { getFirebaseAnalytics, loadFirebaseModule } from "./firebase-singleton.js";

const PAGE_VIEW_EVENT = "page_view";
const TRACKED_CLICK_EVENTS = new Set([
  "apply_job_clicked",
  "login_clicked",
  "signup_clicked",
  "resume_upload_clicked",
  "chat_open_clicked"
]);

let analyticsReadyPromise = null;
let clickTrackingBound = false;
let lastTrackedPageKey = "";
const recentResumeUploadClicks = new WeakMap();

// Load Firebase Analytics once and keep logEvent() behind a small reusable helper.
async function getAnalyticsLogger() {
  if (!analyticsReadyPromise) {
    analyticsReadyPromise = (async () => {
      const [analytics, { logEvent }] = await Promise.all([
        getFirebaseAnalytics(),
        loadFirebaseModule("firebase-analytics.js")
      ]);

      // Keep pages functional in unsupported contexts.
      if (!analytics) return null;
      return { analytics, logEvent };
    })().catch((error) => {
      console.warn("Firebase Analytics unavailable", error);
      return null;
    });
  }

  return analyticsReadyPromise;
}

function getPagePath() {
  return `${window.location.pathname}${window.location.search}` || "/";
}

function getPageTitle() {
  return document.title || "BooterSpace";
}

function buildEventParams(extraParams = {}) {
  return {
    page_title: getPageTitle(),
    page_location: window.location.href,
    page_path: getPagePath(),
    ...extraParams
  };
}

// Public utility for existing and future features to log custom Firebase events.
export async function trackAnalyticsEvent(eventName, params = {}) {
  if (!TRACKED_CLICK_EVENTS.has(eventName) && eventName !== PAGE_VIEW_EVENT) {
    console.warn(`Skipped unknown analytics event: ${eventName}`);
    return;
  }

  const logger = await getAnalyticsLogger();
  if (!logger) return;

  logger.logEvent(logger.analytics, eventName, buildEventParams(params));
}

// Page views are deduped by path/search/title so repeated script execution cannot double count.
export function trackPageView() {
  const pageKey = `${getPagePath()}|${getPageTitle()}`;
  if (pageKey === lastTrackedPageKey) return;

  lastTrackedPageKey = pageKey;
  trackAnalyticsEvent(PAGE_VIEW_EVENT);
}

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function inferClickEvent(element) {
  const explicitEvent = element.dataset.analyticsEvent;
  if (TRACKED_CLICK_EVENTS.has(explicitEvent)) return explicitEvent;

  const href = element.getAttribute("href") || "";
  const id = normalizeText(element.id);
  const label = normalizeText(element.getAttribute("aria-label") || element.textContent || element.value || "");
  const combined = `${id} ${normalizeText(element.className)} ${label} ${href.toLowerCase()}`;

  if (combined.includes("apply") && combined.includes("job")) return "apply_job_clicked";
  if (label === "apply now" || combined.includes("apply now")) return "apply_job_clicked";
  if (combined.includes("resume") && (combined.includes("upload") || combined.includes("file"))) return "resume_upload_clicked";
  if (combined.includes("login") || combined.includes("log in") || combined.includes("sign in")) return "login_clicked";
  if (combined.includes("signup") || combined.includes("sign up") || combined.includes("create account")) return "signup_clicked";
  if (combined.includes("messages.html") || combined.includes("message") || combined.includes("chat")) return "chat_open_clicked";

  return "";
}

function describeClickedElement(element) {
  return {
    element_id: element.id || "",
    element_text: normalizeText(element.getAttribute("aria-label") || element.textContent || element.value || "").slice(0, 100),
    element_href: element.getAttribute("href") || ""
  };
}

function getTrackableElement(eventTarget) {
  if (!(eventTarget instanceof Element)) return null;

  return eventTarget.closest([
    "[data-analytics-event]",
    "button",
    "a[href]",
    "input[type='button']",
    "input[type='submit']",
    "input[type='file']",
    "label[for]"
  ].join(","));
}

function getFileInputForLabel(labelElement) {
  const targetId = labelElement.getAttribute("for");
  if (!targetId) return null;
  const target = document.getElementById(targetId);
  return target?.matches?.("input[type='file']") ? target : null;
}

// Use one delegated click listener for all current and dynamically-rendered buttons/links.
function bindClickTracking() {
  if (clickTrackingBound) return;
  clickTrackingBound = true;

  document.addEventListener("click", (event) => {
    const element = getTrackableElement(event.target);
    if (!element) return;

    const labelFileInput = element.matches("label[for]") ? getFileInputForLabel(element) : null;
    const analyticsElement = labelFileInput || element;
    const eventName = inferClickEvent(analyticsElement);
    if (!eventName) return;

    if (eventName === "resume_upload_clicked") {
      recentResumeUploadClicks.set(analyticsElement, Date.now());
    }

    trackAnalyticsEvent(eventName, describeClickedElement(element));
  });

  // File-picker changes are tracked too, because uploads may be triggered by native input UI.
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;

    const eventName = inferClickEvent(input) || "resume_upload_clicked";
    const recentClickAt = recentResumeUploadClicks.get(input) || 0;
    if (eventName === "resume_upload_clicked" && Date.now() - recentClickAt > 2000) {
      trackAnalyticsEvent(eventName, {
        element_id: input.id || "",
        file_count: input.files?.length || 0
      });
    }
  });
}

function initAnalyticsTracking() {
  bindClickTracking();
  trackPageView();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAnalyticsTracking, { once: true });
} else {
  initAnalyticsTracking();
}

// SPA route changes reuse the same document, so track virtual page views as navigation ends.
window.addEventListener("spa:navigation-end", trackPageView);
window.addEventListener("popstate", () => window.setTimeout(trackPageView, 0));

window.booterAnalytics = {
  trackAnalyticsEvent,
  trackPageView
};
