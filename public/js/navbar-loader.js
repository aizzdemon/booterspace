(function initNavbarLoader() {
  const NAVBAR_CONTAINER_ID = 'navbar';
  const NAVBAR_CACHE_KEY = 'booterspace:navbar:html:v1';
  const NAVBAR_CACHE_TIME_KEY = 'booterspace:navbar:cachedAt:v1';
  const NAVBAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
  const NAVBAR_HTML_PATH = 'navbar.html';
  const NAVBAR_SCRIPT_SRC = 'public/js/navbar.js';

  function injectNavbarMarkup(markup) {
    const container = document.getElementById(NAVBAR_CONTAINER_ID);
    if (!container || !markup) return false;

    if (!container.innerHTML.trim()) {
      container.style.opacity = '0.01';
      container.style.transition = 'opacity 160ms ease';
    }

    container.innerHTML = markup;
    requestAnimationFrame(() => {
      container.style.opacity = '1';
    });
    return true;
  }

  function ensureNavbarScript() {
    if (document.querySelector('script[data-booter-navbar="true"]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = NAVBAR_SCRIPT_SRC;
    script.dataset.booterNavbar = 'true';
    document.body.appendChild(script);
  }

  async function fetchNavbarMarkup() {
    const response = await fetch(NAVBAR_HTML_PATH, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Navbar fetch failed (${response.status})`);
    return response.text();
  }

  function getCachedMarkup() {
    try {
      const html = localStorage.getItem(NAVBAR_CACHE_KEY);
      const cachedAt = Number(localStorage.getItem(NAVBAR_CACHE_TIME_KEY) || 0);
      if (!html || !cachedAt) return null;
      if (Date.now() - cachedAt > NAVBAR_CACHE_TTL_MS) return null;
      return html;
    } catch {
      return null;
    }
  }

  function setCachedMarkup(html) {
    try {
      localStorage.setItem(NAVBAR_CACHE_KEY, html);
      localStorage.setItem(NAVBAR_CACHE_TIME_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors (e.g. privacy mode/quota).
    }
  }

  async function loadBooterNavbar() {
    const cached = getCachedMarkup();
    if (cached) {
      injectNavbarMarkup(cached);
      ensureNavbarScript();
    }

    try {
      const fresh = await fetchNavbarMarkup();
      if (fresh !== cached) {
        injectNavbarMarkup(fresh);
      }
      setCachedMarkup(fresh);
      ensureNavbarScript();
    } catch (error) {
      if (!cached) {
        console.error('Navbar failed to load', error);
      }
    }
  }

  window.loadBooterNavbar = loadBooterNavbar;
})();
