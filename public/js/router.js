const executedScripts = new Set();

function isInternalLink(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  const href = anchor.getAttribute("href") || "";
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download") || anchor.dataset.noSpa === "true") return false;

  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin;
}

function showLoading(appRoot, loadingEl) {
  appRoot?.setAttribute("aria-busy", "true");
  loadingEl?.classList.remove("hidden");
}

function hideLoading(appRoot, loadingEl) {
  appRoot?.setAttribute("aria-busy", "false");
  loadingEl?.classList.add("hidden");
}

function extractNextView(doc) {
  const app = doc.querySelector("#app");
  if (app) return app.innerHTML;

  const main = doc.querySelector("main");
  if (main) return main.outerHTML;

  const bodyClone = doc.body.cloneNode(true);
  bodyClone.querySelectorAll("script, #navbar").forEach((node) => node.remove());
  return bodyClone.innerHTML;
}

async function runScripts(appRoot, requestUrl) {
  const scriptNodes = [...appRoot.querySelectorAll("script")];

  for (const oldScript of scriptNodes) {
    const src = oldScript.getAttribute("src");
    const key = src ? `src:${new URL(src, requestUrl).href}` : `inline:${oldScript.textContent || ""}`;
    const runOnce = oldScript.dataset.spaOnce !== "false";

    if (runOnce && executedScripts.has(key)) {
      oldScript.remove();
      continue;
    }

    const script = document.createElement("script");
    for (const { name, value } of [...oldScript.attributes]) {
      if (name === "src") {
        script.setAttribute(name, new URL(value, requestUrl).href);
      } else {
        script.setAttribute(name, value);
      }
    }
    script.textContent = oldScript.textContent;

    oldScript.replaceWith(script);
    if (runOnce) executedScripts.add(key);

    if (script.src) {
      await new Promise((resolve, reject) => {
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", reject, { once: true });
      });
    }
  }
}

async function navigate(url, { replace = false } = {}) {
  const appRoot = document.getElementById("app");
  const loadingEl = document.getElementById("app-loading");
  if (!appRoot) return;

  const nextUrl = new URL(url, window.location.href);
  if (nextUrl.href === window.location.href) return;

  showLoading(appRoot, loadingEl);

  try {
    const response = await fetch(nextUrl.href, {
      method: "GET",
      credentials: "same-origin",
      headers: { "X-Requested-With": "spa-router" }
    });
    if (!response.ok) throw new Error(`Navigation failed (${response.status})`);

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    appRoot.innerHTML = extractNextView(doc);
    document.title = doc.title || document.title;

    await runScripts(appRoot, nextUrl.href);

    if (replace) {
      history.replaceState({ spa: true }, "", nextUrl.href);
    } else {
      history.pushState({ spa: true }, "", nextUrl.href);
    }

    window.dispatchEvent(new CustomEvent("spa:navigation-end", { detail: { url: nextUrl.href } }));
  } catch (error) {
    console.error(error);
    window.location.href = nextUrl.href;
  } finally {
    hideLoading(appRoot, loadingEl);
  }
}

function onDocumentClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!anchor || !isInternalLink(anchor)) return;

  event.preventDefault();
  navigate(anchor.href);
}

function initRouter() {
  if (window.__booterRouterInitialized) return;
  window.__booterRouterInitialized = true;

  document.addEventListener("click", onDocumentClick);
  window.addEventListener("popstate", () => {
    navigate(window.location.href, { replace: true });
  });

  history.replaceState({ spa: true }, "", window.location.href);
  window.booterRouter = { navigate };
}

initRouter();
