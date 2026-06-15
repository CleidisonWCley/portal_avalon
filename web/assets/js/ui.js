(() => {
  'use strict';

  if (window.__AVALON_UI_INITIALIZED__) return;
  window.__AVALON_UI_INITIALIZED__ = true;

  const FEEDBACK_SELECTOR = '.action-feedback-overlay';
  const LOADER_ID = 'avalon-page-loader';
  const LOADER_VISIBLE_CLASS = 'is-visible';
  const LOADER_HIDING_CLASS = 'is-hiding';
  const LOADER_BODY_CLASS = 'avalon-loader-lock';
  const LOADER_TEXT_SELECTOR = '.avalon-page-loader__text';

  const MIN_VISIBLE_MS = 220;
  const LOAD_SETTLE_MS = 120;
  const SAFETY_TIMEOUT_MS = 5000;

  const loaderState = {
    visibleSince: 0,
    documentLoaded: document.readyState === 'complete',
    pendingJsonFetches: 0,
    bootTracking: true,
    navigationPending: false,
    hideTimer: 0,
    settleTimer: 0,
    safetyTimer: 0,
    manualHolds: new Set(),
    fetchSequence: 0,
    scrollLocked: false
  };

  let feedbackTimer = 0;

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function loaderMarkup() {
    return `
      <span class="avalon-page-loader__spinner" aria-hidden="true"></span>
      <span class="avalon-page-loader__text">Carregando...</span>
    `;
  }

  function ensureLoader() {
    let loader = document.getElementById(LOADER_ID);
    if (loader) return loader;

    loader = document.createElement('div');
    loader.id = LOADER_ID;
    loader.className = 'avalon-page-loader';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.setAttribute('aria-label', 'Carregando');
    loader.innerHTML = loaderMarkup();

    if (document.body) document.body.prepend(loader);
    else document.documentElement.appendChild(loader);

    return loader;
  }

  function setLoaderText(message = 'Carregando...') {
    const text = ensureLoader().querySelector(LOADER_TEXT_SELECTOR);
    if (text) text.textContent = String(message || 'Carregando...');
  }

  function clearLoaderTimers() {
    window.clearTimeout(loaderState.hideTimer);
    window.clearTimeout(loaderState.settleTimer);
    window.clearTimeout(loaderState.safetyTimer);
    loaderState.hideTimer = 0;
    loaderState.settleTimer = 0;
    loaderState.safetyTimer = 0;
  }

  function supportsStableScrollbarGutter() {
    return window.CSS?.supports?.('scrollbar-gutter: stable') === true;
  }

  function lockPageScroll() {
    if (loaderState.scrollLocked || !document.body) return;

    if (!supportsStableScrollbarGutter()) {
      const scrollbarWidth = Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth
      );

      if (scrollbarWidth > 0) {
        document.body.style.setProperty(
          '--avalon-loader-scrollbar-compensation',
          `${scrollbarWidth}px`
        );
      }
    }

    document.body.classList.add(LOADER_BODY_CLASS);
    loaderState.scrollLocked = true;
  }

  function unlockPageScroll() {
    if (!document.body) return;

    document.body.classList.remove(LOADER_BODY_CLASS);
    document.body.style.removeProperty('--avalon-loader-scrollbar-compensation');
    loaderState.scrollLocked = false;
  }

  function completeHide() {
    const loader = ensureLoader();
    loader.classList.remove(LOADER_VISIBLE_CLASS, LOADER_HIDING_CLASS);
    loader.hidden = true;
    loader.setAttribute('aria-busy', 'false');
    document.documentElement.removeAttribute('aria-busy');
    unlockPageScroll();
    loaderState.navigationPending = false;
  }

  function showLoader(message = 'Carregando...', options = {}) {
    const loader = ensureLoader();
    window.clearTimeout(loaderState.hideTimer);
    window.clearTimeout(loaderState.settleTimer);

    loader.hidden = false;
    loader.classList.remove(LOADER_HIDING_CLASS);
    loader.classList.add(LOADER_VISIBLE_CLASS);
    loader.setAttribute('aria-busy', 'true');
    document.documentElement.setAttribute('aria-busy', 'true');
    lockPageScroll();
    loaderState.visibleSince = performance.now();
    loaderState.navigationPending = Boolean(options.navigation);
    setLoaderText(message);

    return loader;
  }

  function hideLoader({ force = false } = {}) {
    const loader = ensureLoader();
    if (loader.hidden) return;
    if (!force && loaderState.manualHolds.size > 0) return;

    window.clearTimeout(loaderState.hideTimer);
    window.clearTimeout(loaderState.settleTimer);
    window.clearTimeout(loaderState.safetyTimer);

    const elapsed = performance.now() - loaderState.visibleSince;
    const wait = force ? 0 : Math.max(0, MIN_VISIBLE_MS - elapsed);

    loaderState.hideTimer = window.setTimeout(() => {
      if (!force && loaderState.manualHolds.size > 0) return;

      if (prefersReducedMotion()) {
        completeHide();
        return;
      }

      loader.classList.add(LOADER_HIDING_CLASS);
      window.setTimeout(completeHide, 160);
    }, wait);
  }

  function forceHideLoader() {
    loaderState.manualHolds.clear();
    loaderState.bootTracking = false;
    clearLoaderTimers();
    hideLoader({ force: true });
  }

  function isLoaderActive() {
    const loader = document.getElementById(LOADER_ID);
    return Boolean(loader && !loader.hidden && loader.classList.contains(LOADER_VISIBLE_CLASS));
  }

  function holdLoader(taskId, message = 'Carregando...') {
    const id = String(taskId || `loader-${Date.now()}`);
    loaderState.manualHolds.add(id);
    showLoader(message);
    return id;
  }

  function releaseLoader(taskId) {
    if (taskId !== undefined && taskId !== null) {
      loaderState.manualHolds.delete(String(taskId));
    }

    if (loaderState.manualHolds.size === 0) hideLoader();
  }

  async function waitForLoader(promise, options = {}) {
    const id = holdLoader(
      options.id || `promise-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      options.message || 'Carregando...'
    );

    try {
      return await promise;
    } catch (error) {
      console.error('[Portal Avalon] Falha durante o carregamento:', error);
      throw error;
    } finally {
      releaseLoader(id);
    }
  }

  function failLoader(message = 'Falha ao carregar.', error) {
    if (error) console.error('[Portal Avalon] Loader:', error);
    setLoaderText(message);
    window.setTimeout(forceHideLoader, 900);
  }

  function isInitialJsonRequest(input, init = {}) {
    if (!loaderState.bootTracking) return false;
    const method = String(init?.method || 'GET').toUpperCase();
    if (method !== 'GET') return false;

    try {
      const raw = typeof input === 'string' || input instanceof URL
        ? input
        : input?.url;
      const url = new URL(raw, window.location.href);
      return url.origin === window.location.origin
        && url.pathname.toLowerCase().endsWith('.json');
    } catch (error) {
      return false;
    }
  }

  function maybeFinishInitialLoad() {
    if (!loaderState.documentLoaded) return;
    if (loaderState.pendingJsonFetches > 0) return;
    if (loaderState.manualHolds.size > 0) return;

    window.clearTimeout(loaderState.settleTimer);
    loaderState.settleTimer = window.setTimeout(() => {
      if (loaderState.pendingJsonFetches > 0 || loaderState.manualHolds.size > 0) return;
      loaderState.bootTracking = false;
      hideLoader();
    }, LOAD_SETTLE_MS);
  }

  function patchInitialJsonFetchTracking() {
    if (!window.fetch || window.fetch.__avalonLoaderPatched) return;

    const nativeFetch = window.fetch.bind(window);
    const trackedFetch = (...args) => {
      const shouldTrack = isInitialJsonRequest(args[0], args[1]);
      if (!shouldTrack) return nativeFetch(...args);

      window.clearTimeout(loaderState.settleTimer);
      loaderState.pendingJsonFetches += 1;
      const requestId = ++loaderState.fetchSequence;

      return nativeFetch(...args).finally(() => {
        loaderState.pendingJsonFetches = Math.max(0, loaderState.pendingJsonFetches - 1);
        maybeFinishInitialLoad();
      });
    };

    trackedFetch.__avalonLoaderPatched = true;
    trackedFetch.__nativeFetch = nativeFetch;
    window.fetch = trackedFetch;
  }

  function isModifiedNavigation(event) {
    return event.button !== 0
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
      || event.altKey;
  }

  function resolveInternalNavigation(anchor) {
    if (!anchor || anchor.hasAttribute('download')) return null;
    if (anchor.target && anchor.target.toLowerCase() !== '_self') return null;

    const rawHref = anchor.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return null;

    try {
      const destination = new URL(anchor.href, window.location.href);
      if (!['http:', 'https:'].includes(destination.protocol)) return null;
      if (destination.origin !== window.location.origin) return null;

      const current = new URL(window.location.href);
      const sameDocument = destination.pathname === current.pathname
        && destination.search === current.search;

      return sameDocument ? null : destination;
    } catch (error) {
      return null;
    }
  }

  function bindNavigationLoader() {
    document.addEventListener('click', (event) => {
      const firebaseKeep = event.target.closest?.('[data-firebase-nav-keep]');
      const firebaseEnd = event.target.closest?.('[data-firebase-nav-end]');

      if (firebaseKeep || firebaseEnd) {
        showLoader('Carregando...', { navigation: true });
        return;
      }

      if (event.defaultPrevented || isModifiedNavigation(event)) return;
      const destination = resolveInternalNavigation(event.target.closest?.('a[href]'));
      if (!destination) return;

      showLoader('Carregando...', { navigation: true });
    });
  }

  function closeActionFeedback(overlay = document.querySelector(FEEDBACK_SELECTOR)) {
    if (!overlay) return;
    window.clearTimeout(feedbackTimer);

    if (prefersReducedMotion()) {
      overlay.remove();
      return;
    }

    overlay.classList.add('leaving');
    window.setTimeout(() => overlay.remove(), 240);
  }

  function feedbackIcon(type) {
    return {
      loading: 'sync',
      success: 'check_circle',
      warning: 'warning',
      warn: 'warning',
      error: 'error',
      empty: 'search_off',
      confirmation: 'help',
      info: 'info'
    }[type] || 'info';
  }

  function showActionFeedback({
    title = 'Portal Avalon',
    message = '',
    type = 'info',
    persistent = false,
    duration = 2250,
    actions = '',
    dismissOnBackdrop = false,
    role = 'status'
  } = {}) {
    document.querySelector(FEEDBACK_SELECTOR)?.remove();
    window.clearTimeout(feedbackTimer);

    const normalizedType = type === 'warn' ? 'warning' : type;

    if (normalizedType === 'error' && loaderState.navigationPending) {
      forceHideLoader();
    }

    const overlay = document.createElement('div');
    overlay.className = `action-feedback-overlay ${normalizedType}`;
    overlay.dataset.dismissOnBackdrop = dismissOnBackdrop ? 'true' : 'false';
    overlay.setAttribute('role', role);
    overlay.setAttribute('aria-live', role === 'alertdialog' ? 'assertive' : 'polite');
    overlay.innerHTML = `
      <div class="action-feedback-card medieval-card gold-frame ${normalizedType}" tabindex="-1">
        <span class="material-symbols-outlined action-feedback-icon" aria-hidden="true">${feedbackIcon(normalizedType)}</span>
        <div class="action-feedback-content">
          <h3></h3>
          <p></p>
        </div>
        ${actions ? `<div class="action-feedback-actions">${actions}</div>` : ''}
      </div>
    `;

    overlay.querySelector('h3').textContent = String(title);
    overlay.querySelector('p').textContent = String(message);
    document.body.appendChild(overlay);
    overlay.querySelector('.action-feedback-card')?.focus({ preventScroll: true });

    if (dismissOnBackdrop) {
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeActionFeedback(overlay);
      });
    }

    if (!persistent) {
      feedbackTimer = window.setTimeout(() => closeActionFeedback(overlay), duration);
    }

    return overlay;
  }

  function initBackToTop() {
    document.querySelectorAll('.site-back-top').forEach((button) => {
      if (button.dataset.initialized === 'true') return;
      button.dataset.initialized = 'true';

      const threshold = Number(button.dataset.threshold || 520);
      const update = () => button.classList.toggle('hidden', window.scrollY < threshold);

      button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });

      window.addEventListener('scroll', update, { passive: true });
      update();
    });
  }

  function initLoader() {
    const loader = ensureLoader();
    patchInitialJsonFetchTracking();
    bindNavigationLoader();

    loader.hidden = false;
    loader.classList.add(LOADER_VISIBLE_CLASS);
    loader.classList.remove(LOADER_HIDING_CLASS);
    loader.setAttribute('aria-busy', 'true');
    loaderState.visibleSince = performance.now();
    document.documentElement.setAttribute('aria-busy', 'true');
    lockPageScroll();
    setLoaderText('Carregando...');

    loaderState.safetyTimer = window.setTimeout(() => {
      loaderState.bootTracking = false;
      forceHideLoader();
    }, SAFETY_TIMEOUT_MS);

    if (document.readyState === 'complete') {
      loaderState.documentLoaded = true;
      maybeFinishInitialLoad();
    } else {
      window.addEventListener('load', () => {
        loaderState.documentLoaded = true;
        maybeFinishInitialLoad();
      }, { once: true });
    }

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) forceHideLoader();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const overlay = document.querySelector(FEEDBACK_SELECTOR);
    if (overlay) closeActionFeedback(overlay);
  });

  if (document.body) initLoader();
  else document.addEventListener('DOMContentLoaded', initLoader, { once: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackToTop, { once: true });
  } else {
    initBackToTop();
  }

  window.AvalonLoader = Object.freeze({
    show: showLoader,
    update: setLoaderText,
    hold: holdLoader,
    release: releaseLoader,
    waitFor: waitForLoader,
    fail: failLoader,
    hide: hideLoader,
    forceHide: forceHideLoader,
    isActive: isLoaderActive
  });

  window.AvalonUI = Object.freeze({
    initBackToTop,
    showActionFeedback,
    closeActionFeedback,
    loader: window.AvalonLoader
  });
})();
