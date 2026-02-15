/**
 * mobile-ui.js
 *
 * Mobile-only UI behavior manager for responsive, multi-page websites.
 * This script is safe to include on every page; it activates only when
 * the viewport width is 768px or less.
 */
(function mobileUIFactory(global) {
  'use strict';

  var MOBILE_MAX_WIDTH = 768;
  var STYLE_ELEMENT_ID = 'mobile-ui-generated-styles';

  // Keep internal state isolated so desktop behavior is never altered unexpectedly.
  var state = {
    isInitialized: false,
    navToggleButton: null,
    mobileMenu: null,
    cleanupTasks: [],
  };

  /**
   * Detects whether the current viewport qualifies as mobile.
   * @returns {boolean}
   */
  function isMobileScreen() {
    return window.innerWidth <= MOBILE_MAX_WIDTH;
  }

  /**
   * Adds a CSS class to enable mobile styling hooks and injects small,
   * mobile-only helper styles for stacking/scaling layout components.
   */
  function applyMobileLayoutAdjustments() {
    document.body.classList.add('is-mobile-ui');

    if (!document.getElementById(STYLE_ELEMENT_ID)) {
      var style = document.createElement('style');
      style.id = STYLE_ELEMENT_ID;
      style.textContent = [
        '@media (max-width: 768px) {',
        '  body.is-mobile-ui .row,',
        '  body.is-mobile-ui .columns,',
        '  body.is-mobile-ui .card-grid,',
        '  body.is-mobile-ui .content-grid,',
        '  body.is-mobile-ui [data-mobile-stack] {',
        '    display: flex;',
        '    flex-direction: column;',
        '    gap: 0.75rem;',
        '  }',
        '',
        '  body.is-mobile-ui img,',
        '  body.is-mobile-ui video,',
        '  body.is-mobile-ui iframe,',
        '  body.is-mobile-ui table {',
        '    max-width: 100%;',
        '    width: 100%;',
        '  }',
        '',
        '  body.is-mobile-ui .mobile-menu.is-open {',
        '    display: block;',
        '  }',
        '}',
      ].join('\n');
      document.head.appendChild(style);

      state.cleanupTasks.push(function removeInjectedStyles() {
        var existing = document.getElementById(STYLE_ELEMENT_ID);
        if (existing) existing.remove();
      });
    }
  }

  /**
   * Wires up a hamburger button to open/close the mobile navigation.
   * Supports common selector fallbacks so it can work across pages.
   */
  function setupMobileNavigationToggle() {
    var toggleButton =
      document.querySelector('[data-mobile-nav-toggle]') ||
      document.querySelector('.mobile-nav-toggle') ||
      document.querySelector('.hamburger') ||
      document.querySelector('#mobile-nav-toggle');

    var mobileMenu =
      document.querySelector('[data-mobile-menu]') ||
      document.querySelector('.mobile-menu') ||
      document.querySelector('#mobile-menu');

    if (!toggleButton || !mobileMenu) {
      return;
    }

    state.navToggleButton = toggleButton;
    state.mobileMenu = mobileMenu;

    // Ensure semantic attributes are in sync with menu state.
    toggleButton.setAttribute('aria-controls', mobileMenu.id || 'mobile-menu');
    toggleButton.setAttribute('aria-expanded', 'false');

    function toggleMenu(event) {
      if (event) event.preventDefault();
      var isOpen = mobileMenu.classList.toggle('is-open');
      toggleButton.classList.toggle('is-active', isOpen);
      toggleButton.setAttribute('aria-expanded', String(isOpen));
    }

    toggleButton.addEventListener('click', toggleMenu);

    // Touch-friendly close behavior for links in the mobile menu.
    var links = mobileMenu.querySelectorAll('a');
    links.forEach(function (link) {
      var closeOnNavigate = function closeOnNavigate() {
        mobileMenu.classList.remove('is-open');
        toggleButton.classList.remove('is-active');
        toggleButton.setAttribute('aria-expanded', 'false');
      };
      link.addEventListener('touchstart', closeOnNavigate, { passive: true });
      link.addEventListener('click', closeOnNavigate);

      state.cleanupTasks.push(function () {
        link.removeEventListener('touchstart', closeOnNavigate);
        link.removeEventListener('click', closeOnNavigate);
      });
    });

    state.cleanupTasks.push(function removeMenuToggleListener() {
      toggleButton.removeEventListener('click', toggleMenu);
    });
  }

  /**
   * Enables mobile collapsible controls for sections marked with:
   * - [data-mobile-collapsible] trigger buttons/headers
   * The target can be provided via data-mobile-target="#id"
   * or defaults to the trigger's next sibling element.
   */
  function setupMobileCollapsibles() {
    var triggers = document.querySelectorAll('[data-mobile-collapsible]');
    if (!triggers.length) return;

    triggers.forEach(function (trigger) {
      var targetSelector = trigger.getAttribute('data-mobile-target');
      var target = targetSelector
        ? document.querySelector(targetSelector)
        : trigger.nextElementSibling;

      if (!target) return;

      trigger.setAttribute('aria-expanded', 'false');
      target.hidden = true;

      function toggleCollapsible(event) {
        if (event) event.preventDefault();
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!expanded));
        target.hidden = expanded;
      }

      trigger.addEventListener('click', toggleCollapsible);
      trigger.addEventListener('touchstart', toggleCollapsible, { passive: true });

      state.cleanupTasks.push(function () {
        trigger.removeEventListener('click', toggleCollapsible);
        trigger.removeEventListener('touchstart', toggleCollapsible);
      });
    });
  }

  /**
   * Initializes all mobile-specific behaviors.
   * Safe to call multiple times; it initializes only once.
   */
  function initMobileUI() {
    if (state.isInitialized || !isMobileScreen()) {
      return;
    }

    applyMobileLayoutAdjustments();
    setupMobileNavigationToggle();
    setupMobileCollapsibles();
    state.isInitialized = true;
  }

  /**
   * Removes mobile behaviors and classes (used when viewport becomes desktop).
   */
  function destroyMobileUI() {
    if (!state.isInitialized) return;

    while (state.cleanupTasks.length) {
      var task = state.cleanupTasks.pop();
      if (typeof task === 'function') task();
    }

    document.body.classList.remove('is-mobile-ui');

    if (state.mobileMenu) {
      state.mobileMenu.classList.remove('is-open');
    }

    if (state.navToggleButton) {
      state.navToggleButton.classList.remove('is-active');
      state.navToggleButton.setAttribute('aria-expanded', 'false');
    }

    state.navToggleButton = null;
    state.mobileMenu = null;
    state.isInitialized = false;
  }

  /**
   * Handles viewport changes so behavior can be enabled/disabled dynamically.
   */
  function handleResponsiveState() {
    if (isMobileScreen()) {
      initMobileUI();
    } else {
      destroyMobileUI();
    }
  }

  // Public API: supports modular use while preserving plain-script compatibility.
  var MobileUI = {
    isMobileScreen: isMobileScreen,
    initMobileUI: initMobileUI,
    destroyMobileUI: destroyMobileUI,
    handleResponsiveState: handleResponsiveState,
  };

  // Auto-initialize on DOM ready; remains no-op for desktop widths.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleResponsiveState);
  } else {
    handleResponsiveState();
  }

  window.addEventListener('resize', handleResponsiveState);

  // Export for module environments and attach to window for classic script use.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileUI;
  }

  global.MobileUI = MobileUI;
})(typeof window !== 'undefined' ? window : this);
