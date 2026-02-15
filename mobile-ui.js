/**
 * mobile-ui.js
 *
 * Mobile-specific UI enhancements for responsive multi-page websites.
 * Safe to include on every page: behavior is enabled only at <= 768px.
 */
(function mobileUIFactory(global) {
  'use strict';

  var MOBILE_MAX_WIDTH = 768;
  var GENERATED_STYLE_ID = 'mobile-ui-styles';

  var state = {
    initialized: false,
    observer: null,
    resizeHandler: null,
    navBindings: new Map(),
    collapsibleBindings: new Map(),
  };

  /**
   * Returns true when viewport is mobile-sized.
   */
  function isMobileScreen() {
    return window.innerWidth <= MOBILE_MAX_WIDTH;
  }

  /**
   * Some pages load navbar.js which already owns #menuBtn/#mobileMenu behavior.
   * If present, we avoid double-binding those elements.
   */
  function isNavbarScriptPresent() {
    return Boolean(document.querySelector('script[src*="navbar.js"]'));
  }

  /**
   * Injects lightweight mobile helper styles.
   * Uses opt-in selectors to avoid changing desktop/component logic globally.
   */
  function ensureMobileStyles() {
    if (document.getElementById(GENERATED_STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = GENERATED_STYLE_ID;
    style.textContent = [
      '@media (max-width: 768px) {',
      '  body.mobile-ui-active [data-mobile-stack],',
      '  body.mobile-ui-active .mobile-stack {',
      '    display: flex !important;',
      '    flex-direction: column !important;',
      '    gap: 0.75rem;',
      '  }',
      '',
      '  body.mobile-ui-active img,',
      '  body.mobile-ui-active video,',
      '  body.mobile-ui-active iframe,',
      '  body.mobile-ui-active table {',
      '    max-width: 100%;',
      '    width: 100%;',
      '  }',
      '',
      '  body.mobile-ui-active .mobile-ui-open {',
      '    display: block !important;',
      '  }',
      '}',
    ].join('\n');

    document.head.appendChild(style);
  }

  /**
   * Finds navigation toggle buttons using common patterns.
   */
  function getNavToggleButtons() {
    var selectors = [
      '[data-mobile-nav-toggle]',
      '.mobile-nav-toggle',
      '.hamburger',
      '#mobile-nav-toggle',
      '#menuBtn',
    ];

    return document.querySelectorAll(selectors.join(','));
  }

  /**
   * Resolves target mobile menu element for a given toggle button.
   */
  function resolveMenuElement(toggleButton) {
    var explicitSelector =
      toggleButton.getAttribute('data-mobile-menu') ||
      toggleButton.getAttribute('data-mobile-target') ||
      toggleButton.getAttribute('data-target');

    if (explicitSelector) {
      return document.querySelector(explicitSelector);
    }

    var ariaControls = toggleButton.getAttribute('aria-controls');
    if (ariaControls) {
      var byAria = document.getElementById(ariaControls);
      if (byAria) return byAria;
    }

    if (toggleButton.id === 'menuBtn') {
      return document.getElementById('mobileMenu');
    }

    return (
      toggleButton.closest('nav')?.querySelector('[data-mobile-menu], .mobile-menu, #mobile-menu') ||
      document.querySelector('[data-mobile-menu], .mobile-menu, #mobile-menu')
    );
  }

  /**
   * Opens/closes menu in a way that works with both utility-class menus
   * (hidden class) and classic display-based menus.
   */
  function setMenuState(toggleButton, menuElement, shouldOpen) {
    if (!menuElement) return;

    if (menuElement.classList.contains('hidden')) {
      menuElement.classList.toggle('hidden', !shouldOpen);
    } else {
      menuElement.classList.toggle('mobile-ui-open', shouldOpen);
    }

    toggleButton.classList.toggle('is-active', shouldOpen);
    toggleButton.setAttribute('aria-expanded', String(shouldOpen));
  }

  /**
   * Binds hamburger interactions for every menu toggle found on the page.
   */
  function bindMobileNavToggles() {
    var toggles = getNavToggleButtons();

    toggles.forEach(function (toggleButton) {
      if (state.navBindings.has(toggleButton)) return;

      // Prevent conflict with existing navbar.js behavior.
      if (toggleButton.id === 'menuBtn' && isNavbarScriptPresent()) return;

      var menuElement = resolveMenuElement(toggleButton);
      if (!menuElement) return;

      function onToggle(event) {
        event.preventDefault();
        var currentlyExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
        setMenuState(toggleButton, menuElement, !currentlyExpanded);
      }

      function onMenuClick(event) {
        var target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('a, button')) {
          setMenuState(toggleButton, menuElement, false);
        }
      }

      toggleButton.setAttribute('aria-controls', menuElement.id || 'mobile-menu');
      toggleButton.setAttribute('aria-expanded', 'false');
      toggleButton.addEventListener('click', onToggle);
      toggleButton.addEventListener('touchstart', onToggle, { passive: false });
      menuElement.addEventListener('click', onMenuClick);
      menuElement.addEventListener('touchstart', onMenuClick, { passive: true });

      state.navBindings.set(toggleButton, {
        menuElement: menuElement,
        onToggle: onToggle,
        onMenuClick: onMenuClick,
      });
    });
  }

  /**
   * Binds collapsible sections marked with data-mobile-collapsible.
   */
  function bindMobileCollapsibles() {
    var triggers = document.querySelectorAll('[data-mobile-collapsible]');

    triggers.forEach(function (trigger) {
      if (state.collapsibleBindings.has(trigger)) return;

      var targetSelector = trigger.getAttribute('data-mobile-target');
      var targetElement = targetSelector
        ? document.querySelector(targetSelector)
        : trigger.nextElementSibling;

      if (!targetElement) return;

      function onToggle(event) {
        event.preventDefault();
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!expanded));
        targetElement.hidden = expanded;
      }

      trigger.setAttribute('aria-expanded', 'false');
      targetElement.hidden = true;

      trigger.addEventListener('click', onToggle);
      trigger.addEventListener('touchstart', onToggle, { passive: false });

      state.collapsibleBindings.set(trigger, {
        targetElement: targetElement,
        onToggle: onToggle,
      });
    });
  }

  /**
   * Watches for dynamically injected HTML (e.g., fetched navbar partials)
   * and wires mobile handlers as new nodes appear.
   */
  function startObserver() {
    if (state.observer) return;

    state.observer = new MutationObserver(function () {
      if (!isMobileScreen() || !state.initialized) return;
      bindMobileNavToggles();
      bindMobileCollapsibles();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function stopObserver() {
    if (!state.observer) return;
    state.observer.disconnect();
    state.observer = null;
  }

  /**
   * Enables all mobile-only behaviors.
   */
  function initMobileUI() {
    if (state.initialized || !isMobileScreen()) return;

    document.body.classList.add('mobile-ui-active');
    ensureMobileStyles();
    bindMobileNavToggles();
    bindMobileCollapsibles();
    startObserver();

    state.initialized = true;
  }

  /**
   * Cleans up handlers/state when leaving mobile viewport.
   */
  function destroyMobileUI() {
    if (!state.initialized) return;

    state.navBindings.forEach(function (binding, toggleButton) {
      toggleButton.removeEventListener('click', binding.onToggle);
      toggleButton.removeEventListener('touchstart', binding.onToggle);
      binding.menuElement.removeEventListener('click', binding.onMenuClick);
      binding.menuElement.removeEventListener('touchstart', binding.onMenuClick);
      toggleButton.classList.remove('is-active');
      toggleButton.setAttribute('aria-expanded', 'false');
      binding.menuElement.classList.remove('mobile-ui-open');
    });

    state.collapsibleBindings.forEach(function (binding, trigger) {
      trigger.removeEventListener('click', binding.onToggle);
      trigger.removeEventListener('touchstart', binding.onToggle);
    });

    state.navBindings.clear();
    state.collapsibleBindings.clear();

    stopObserver();
    document.body.classList.remove('mobile-ui-active');

    state.initialized = false;
  }

  /**
   * Keeps behavior synced to viewport width.
   */
  function handleResponsiveState() {
    if (isMobileScreen()) {
      initMobileUI();
    } else {
      destroyMobileUI();
    }
  }

  var MobileUI = {
    isMobileScreen: isMobileScreen,
    initMobileUI: initMobileUI,
    destroyMobileUI: destroyMobileUI,
    handleResponsiveState: handleResponsiveState,
  };

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleResponsiveState, { once: true });
  } else {
    handleResponsiveState();
  }

  // Keep synced on resize
  state.resizeHandler = handleResponsiveState;
  window.addEventListener('resize', state.resizeHandler);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileUI;
  }

  global.MobileUI = MobileUI;
})(typeof window !== 'undefined' ? window : this);
