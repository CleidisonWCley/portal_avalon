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
  const REVEAL_SELECTOR = '.reveal';
  const MOTION_READY_CLASS = 'avalon-motion-ready';
  const REVEAL_VISIBLE_CLASS = 'is-visible';
  const LOADER_HIDDEN_EVENT = 'avalon:loader-hidden';
  const PINCH_ZOOM_CLASS = 'avalon-pinch-zoomed';
  const PINCH_ZOOM_EVENT = 'avalon:pinch-zoom-change';
  const PINCH_ZOOM_ENTER_SCALE = 1.05;
  const PINCH_ZOOM_EXIT_SCALE = 1.02;
  const FLASH_ACTIVE_CLASS = 'avalon-flash-active';
  const FLASH_WAIT_MS = 5000;
  const FLASH_DURATION_MS = 1400;
  const FLASH_STAGGER_MS = 250;

  const MIN_VISIBLE_MS = 220;
  const LOAD_SETTLE_MS = 90;
  const CRITICAL_IMAGE_TIMEOUT_MS = 8000;
  const RESOURCE_TIMEOUT_MS = 6500;
  const RESOURCE_RETRIES = 1;
  const RESOURCE_CACHE_PREFIX = 'portal_avalon_resource:';

  const loaderState = {
    visibleSince: 0,
    domReady: document.readyState !== 'loading',
    criticalImagesReady: false,
    navigationPending: false,
    hideTimer: 0,
    settleTimer: 0,
    slowTimer: 0,
    manualHolds: new Set(),
    tasks: new Map(),
    taskSequence: 0,
    scrollLocked: false
  };

  let feedbackTimer = 0;
  let revealObserver = null;
  let revealSafetyTimer = 0;
  let initialMotionReleased = false;
  let loaderHiddenEventDispatched = false;
  let ambientFlashesInitialized = false;
  let pinchZoomFrame = 0;

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function initPinchZoomGuard() {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let zoomed = root.classList.contains(PINCH_ZOOM_CLASS);

    const syncZoomState = () => {
      pinchZoomFrame = 0;
      const scale = Number(viewport.scale) || 1;
      const nextZoomed = zoomed
        ? scale > PINCH_ZOOM_EXIT_SCALE
        : scale > PINCH_ZOOM_ENTER_SCALE;

      if (nextZoomed === zoomed) return;

      zoomed = nextZoomed;
      root.classList.toggle(PINCH_ZOOM_CLASS, zoomed);
      document.dispatchEvent(new CustomEvent(PINCH_ZOOM_EVENT, {
        detail: { zoomed, scale }
      }));
    };

    const scheduleZoomSync = () => {
      if (pinchZoomFrame) return;
      pinchZoomFrame = window.requestAnimationFrame(syncZoomState);
    };

    viewport.addEventListener('resize', scheduleZoomSync, { passive: true });
    viewport.addEventListener('scroll', scheduleZoomSync, { passive: true });
    window.addEventListener('pageshow', scheduleZoomSync, { passive: true });
    scheduleZoomSync();
  }

  function elementIntersectsViewport(element) {
    if (!element?.isConnected) return false;
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth;
  }


  function createFlashSequence({ rootElement, getTargets, stagger = false }) {
    if (!rootElement || typeof getTargets !== 'function') return null;

    const root = document.documentElement;
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const timers = new Set();
    let visible = elementIntersectsViewport(rootElement);
    let viewportFrame = 0;

    const targets = () => getTargets()
      .filter((element) => element?.isConnected);

    const later = (callback, delay) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
      return timer;
    };

    const clearActiveFlashes = () => {
      targets().forEach((element) => element.classList.remove(FLASH_ACTIVE_CLASS));
    };

    const stop = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      clearActiveFlashes();
    };

    const canRun = () => visible
      && !document.hidden
      && !root.classList.contains(PINCH_ZOOM_CLASS)
      && motionQuery?.matches !== true
      && targets().length > 0;

    const runCycle = () => {
      if (!canRun()) {
        stop();
        return;
      }

      const cycleTargets = targets();
      const offsets = cycleTargets.map((_, index) => stagger ? index * FLASH_STAGGER_MS : 0);
      const lastOffset = offsets.length ? Math.max(...offsets) : 0;

      cycleTargets.forEach((element, index) => {
        later(() => {
          if (!canRun()) return;
          if (element.classList.contains(FLASH_ACTIVE_CLASS)) {
            element.classList.remove(FLASH_ACTIVE_CLASS);
            void element.offsetWidth;
          }
          element.classList.add(FLASH_ACTIVE_CLASS);
          later(() => element.classList.remove(FLASH_ACTIVE_CLASS), FLASH_DURATION_MS);
        }, offsets[index]);
      });

      later(runCycle, lastOffset + FLASH_DURATION_MS + FLASH_WAIT_MS);
    };

    const restartAfterWait = () => {
      stop();
      if (canRun()) later(runCycle, FLASH_WAIT_MS);
    };

    const updateFallbackVisibility = () => {
      viewportFrame = 0;
      const nextVisible = elementIntersectsViewport(rootElement);
      if (nextVisible === visible) return;
      visible = nextVisible;
      restartAfterWait();
    };

    const scheduleFallbackVisibility = () => {
      if (viewportFrame) return;
      viewportFrame = window.requestAnimationFrame(updateFallbackVisibility);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        const nextVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0);
        if (nextVisible === visible) return;
        visible = nextVisible;
        restartAfterWait();
      }, { threshold: 0.01 });
      observer.observe(rootElement);
    } else {
      window.addEventListener('scroll', scheduleFallbackVisibility, { passive: true });
      window.addEventListener('resize', scheduleFallbackVisibility, { passive: true });
      scheduleFallbackVisibility();
    }

    document.addEventListener('visibilitychange', restartAfterWait);
    document.addEventListener(PINCH_ZOOM_EVENT, restartAfterWait);

    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener('change', restartAfterWait);
    } else if (motionQuery?.addListener) {
      motionQuery.addListener(restartAfterWait);
    }

    /* Arma o primeiro ciclo mesmo em viewports desktop totalmente estáticas. */
    restartAfterWait();

    return Object.freeze({ stop, restart: restartAfterWait });
  }

  function initAmbientFlashes() {
    if (ambientFlashesInitialized) return;
    ambientFlashesInitialized = true;

    const guildLogo = document.querySelector('.guild-logo-flash');
    if (guildLogo) {
      createFlashSequence({
        rootElement: guildLogo,
        getTargets: () => [guildLogo]
      });
    }

    const podium = document.getElementById('podium');
    if (podium) {
      createFlashSequence({
        rootElement: podium,
        stagger: true,
        getTargets: () => [
          podium.querySelector('.podium-card.gold .podium-image-wrap'),
          podium.querySelector('.podium-card.silver .podium-image-wrap'),
          podium.querySelector('.podium-card.bronze .podium-image-wrap')
        ]
      });
    }
  }


  function prepareMotionSystem() {
    if (prefersReducedMotion()) return;
    document.documentElement.classList.add(MOTION_READY_CLASS);
  }

  function revealImmediately(elements) {
    elements.forEach((element) => {
      element.classList.add(REVEAL_VISIBLE_CLASS);
      element.dataset.revealObserved = 'true';
    });
  }

  function initRevealAnimations(root = document) {
    const candidates = [];

    if (root instanceof Element && root.matches(REVEAL_SELECTOR)) {
      candidates.push(root);
    }

    root.querySelectorAll?.(REVEAL_SELECTOR).forEach((element) => {
      if (element.dataset.revealObserved !== 'true') candidates.push(element);
    });

    if (!candidates.length) return;

    /*
     * Enquanto o loader inicial estiver cobrindo a página, os elementos ficam
     * preparados, mas não recebem is-visible. Isso evita que a animação de
     * entrada termine atrás do loader em máquinas rápidas.
     */
    if (!initialMotionReleased && !prefersReducedMotion()) return;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      revealImmediately(candidates);
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(REVEAL_VISIBLE_CLASS);
          entry.target.dataset.revealObserved = 'true';
          revealObserver.unobserve(entry.target);
        });
      }, {
        threshold: 0.01,
        rootMargin: '0px 0px 12% 0px'
      });
    }

    candidates.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const alreadyNearViewport = rect.top < window.innerHeight * 0.96 && rect.bottom > 0;

      if (alreadyNearViewport) {
        element.classList.add(REVEAL_VISIBLE_CLASS);
        element.dataset.revealObserved = 'true';
        return;
      }

      revealObserver.observe(element);
    });

    window.clearTimeout(revealSafetyTimer);
    revealSafetyTimer = window.setTimeout(() => {
      document.querySelectorAll(`${REVEAL_SELECTOR}:not(.${REVEAL_VISIBLE_CLASS})`).forEach((element) => {
        element.classList.add(REVEAL_VISIBLE_CLASS);
        element.dataset.revealObserved = 'true';
        revealObserver?.unobserve(element);
      });
    }, 1800);
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
    window.clearTimeout(loaderState.slowTimer);
    loaderState.hideTimer = 0;
    loaderState.settleTimer = 0;
    loaderState.slowTimer = 0;
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

  function dispatchLoaderHidden() {
    if (loaderHiddenEventDispatched) return;
    loaderHiddenEventDispatched = true;
    document.dispatchEvent(new CustomEvent(LOADER_HIDDEN_EVENT));
  }

  function completeHide() {
    const loader = ensureLoader();
    loader.classList.remove(LOADER_VISIBLE_CLASS, LOADER_HIDING_CLASS);
    loader.hidden = true;
    loader.setAttribute('aria-busy', 'false');
    document.documentElement.removeAttribute('aria-busy');
    unlockPageScroll();
    loaderState.navigationPending = false;
    dispatchLoaderHidden();
  }

  function showLoader(message = 'Carregando...', options = {}) {
    const loader = ensureLoader();
    window.clearTimeout(loaderState.hideTimer);
    window.clearTimeout(loaderState.settleTimer);

    const wasHidden = loader.hidden || !loader.classList.contains(LOADER_VISIBLE_CLASS);
    loader.hidden = false;
    loader.classList.remove(LOADER_HIDING_CLASS);
    loader.classList.add(LOADER_VISIBLE_CLASS);
    loader.setAttribute('aria-busy', 'true');
    document.documentElement.setAttribute('aria-busy', 'true');
    lockPageScroll();
    if (wasHidden) loaderState.visibleSince = performance.now();
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
    window.clearTimeout(loaderState.slowTimer);

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
    loaderState.tasks.clear();
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

    maybeFinishInitialLoad();
  }

  function waitForLoader(promise, options = {}) {
    return registerLoaderTask(
      options.id || `promise-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      promise,
      { ...options, rethrow: true }
    );
  }

  function failLoader(message = 'Falha ao carregar.', error) {
    if (error) console.error('[Portal Avalon] Loader:', error);
    setLoaderText(message);
    window.setTimeout(forceHideLoader, 900);
  }

  function resourceCacheKey(url) {
    return `${RESOURCE_CACHE_PREFIX}${encodeURIComponent(url)}`;
  }

  function readResourceCache(url) {
    try {
      const raw = localStorage.getItem(resourceCacheKey(url));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Object.prototype.hasOwnProperty.call(parsed, 'data')) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeResourceCache(url, data) {
    try {
      localStorage.setItem(resourceCacheKey(url), JSON.stringify({
        savedAt: Date.now(),
        data
      }));
    } catch (error) {
      console.warn('[Portal Avalon] Cache local indisponível:', error);
    }
  }

  async function fetchWithTimeout(input, options = {}) {
    const {
      timeoutMs = RESOURCE_TIMEOUT_MS,
      retries = RESOURCE_RETRIES,
      fetchOptions = {}
    } = options;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(input, {
          cache: 'default',
          ...fetchOptions,
          signal: controller.signal
        });
        window.clearTimeout(timeout);
        return response;
      } catch (error) {
        window.clearTimeout(timeout);
        lastError = error;
        if (attempt < retries) await new Promise(resolve => window.setTimeout(resolve, 240));
      }
    }

    throw lastError || new Error('Falha de rede.');
  }

  async function fetchJson(path, options = {}) {
    const url = new URL(path, document.baseURI || window.location.href).href;
    const cached = readResourceCache(url);
    const hasFallback = Object.prototype.hasOwnProperty.call(options, 'fallback');

    try {
      const response = await fetchWithTimeout(url, {
        timeoutMs: options.timeoutMs,
        retries: options.retries,
        fetchOptions: options.fetchOptions
      });
      if (!response.ok) throw new Error(`Falha ao carregar ${url} (${response.status})`);
      const data = await response.json();
      if (options.persist !== false) writeResourceCache(url, data);
      return { data, source: 'network', stale: false, error: null };
    } catch (error) {
      if (cached) {
        return { data: cached.data, source: 'cache', stale: true, error };
      }
      if (hasFallback) {
        return { data: options.fallback, source: 'fallback', stale: true, error };
      }
      throw error;
    }
  }

  async function getJson(path, options = {}) {
    const result = await fetchJson(path, options);
    return result.data;
  }

  function waitForImage(image) {
    if (!image) return Promise.resolve();
    if (image.complete) {
      return typeof image.decode === 'function'
        ? image.decode().catch(() => undefined)
        : Promise.resolve();
    }

    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        if (typeof image.decode === 'function') {
          image.decode().catch(() => undefined).finally(resolve);
        } else {
          resolve();
        }
      };
      const timeout = window.setTimeout(finish, CRITICAL_IMAGE_TIMEOUT_MS);
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
  }

  async function waitForCriticalImages() {
    const images = [...document.querySelectorAll('img[data-avalon-critical-image]')];
    await Promise.all(images.map(waitForImage));
    loaderState.criticalImagesReady = true;
    maybeFinishInitialLoad();
  }

  function registerLoaderTask(taskId, promise, options = {}) {
    const id = String(taskId || `task-${++loaderState.taskSequence}`);
    loaderState.tasks.set(id, true);
    if (options.message) setLoaderText(options.message);
    showLoader(options.message || 'Carregando...');

    return Promise.resolve(promise)
      .catch((error) => {
        if (options.logError !== false) {
          console.error(`[Portal Avalon] Tarefa ${id} não concluída:`, error);
        }
        if (options.rethrow) throw error;
        return options.fallback;
      })
      .finally(() => {
        loaderState.tasks.delete(id);
        maybeFinishInitialLoad();
      });
  }

  function maybeFinishInitialLoad() {
    if (!loaderState.domReady) return;
    if (!loaderState.criticalImagesReady) return;
    if (loaderState.tasks.size > 0) return;
    if (loaderState.manualHolds.size > 0) return;

    window.clearTimeout(loaderState.settleTimer);
    loaderState.settleTimer = window.setTimeout(() => {
      if (loaderState.tasks.size > 0 || loaderState.manualHolds.size > 0) return;
      hideLoader();
    }, LOAD_SETTLE_MS);
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

  function releaseInitialMotion() {
    if (initialMotionReleased) return;
    initialMotionReleased = true;

    const startReveal = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => initRevealAnimations(document));
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startReveal, { once: true });
    } else {
      startReveal();
    }
  }

  function initBackToTop() {
    const root = document.documentElement;
    const SHORT_DISTANCE_LIMIT = 1200;
    const MIN_SHORT_DURATION = 280;
    const MAX_SHORT_DURATION = 420;
    const CANCEL_KEYS = new Set([
      'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'
    ]);

    document.querySelectorAll('.site-back-top').forEach((button) => {
      if (button.dataset.initialized === 'true') return;
      button.dataset.initialized = 'true';

      const threshold = Number(button.dataset.threshold || 520);
      let animationFrame = 0;
      let visibilityFrame = 0;
      let returning = false;
      let removeCancelListeners = () => {};

      const update = () => {
        visibilityFrame = 0;
        const shouldHide = returning || window.scrollY < threshold;
        button.classList.toggle('hidden', shouldHide);
      };

      const scheduleUpdate = () => {
        if (visibilityFrame) return;
        visibilityFrame = window.requestAnimationFrame(update);
      };

      const finishReturning = () => {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        removeCancelListeners();
        removeCancelListeners = () => {};

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            returning = false;
            root.classList.remove('avalon-returning-top');
            scheduleUpdate();
          });
        });
      };

      const cancelShortReturn = () => {
        if (!returning || !animationFrame) return;
        finishReturning();
      };

      const bindCancelListeners = () => {
        const onKeyDown = (event) => {
          if (CANCEL_KEYS.has(event.key)) cancelShortReturn();
        };

        window.addEventListener('wheel', cancelShortReturn, { passive: true });
        window.addEventListener('touchstart', cancelShortReturn, { passive: true });
        window.addEventListener('pointerdown', cancelShortReturn, { passive: true });
        document.addEventListener('keydown', onKeyDown);

        removeCancelListeners = () => {
          window.removeEventListener('wheel', cancelShortReturn);
          window.removeEventListener('touchstart', cancelShortReturn);
          window.removeEventListener('pointerdown', cancelShortReturn);
          document.removeEventListener('keydown', onKeyDown);
        };
      };

      const jumpToTop = () => {
        returning = true;
        root.classList.add('avalon-returning-top');
        update();
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        finishReturning();
      };

      const animateShortReturn = (startY) => {
        returning = true;
        root.classList.add('avalon-returning-top');
        update();
        bindCancelListeners();

        const duration = Math.min(
          MAX_SHORT_DURATION,
          Math.max(MIN_SHORT_DURATION, 260 + startY * 0.12)
        );
        const startedAt = performance.now();

        const step = (now) => {
          if (!returning) return;

          const progress = Math.min(1, (now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const nextY = Math.max(0, Math.round(startY * (1 - eased)));
          window.scrollTo(0, nextY);

          if (progress < 1 && nextY > 0) {
            animationFrame = window.requestAnimationFrame(step);
            return;
          }

          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          finishReturning();
        };

        animationFrame = window.requestAnimationFrame(step);
      };

      button.addEventListener('click', () => {
        if (returning) return;

        const startY = Math.max(0, window.scrollY || window.pageYOffset || 0);
        if (startY <= 1) {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          return;
        }

        if (prefersReducedMotion() || startY > SHORT_DISTANCE_LIMIT) {
          jumpToTop();
          return;
        }

        animateShortReturn(startY);
      });

      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      update();
    });
  }

  function initLoader() {
    const loader = ensureLoader();
    bindNavigationLoader();

    loader.hidden = false;
    loader.classList.add(LOADER_VISIBLE_CLASS);
    loader.classList.remove(LOADER_HIDING_CLASS);
    loader.setAttribute('aria-busy', 'true');
    loaderState.visibleSince = performance.now();
    document.documentElement.setAttribute('aria-busy', 'true');
    lockPageScroll();
    setLoaderText('Carregando...');

    loaderState.slowTimer = window.setTimeout(() => {
      if (isLoaderActive() && (loaderState.tasks.size > 0 || !loaderState.criticalImagesReady)) {
        setLoaderText('Conexão instável. Finalizando o carregamento...');
      }
    }, 8000);

    const onDomReady = () => {
      loaderState.domReady = true;
      window.setTimeout(() => {
        waitForCriticalImages().catch((error) => {
          console.warn('[Portal Avalon] Falha ao preparar imagens críticas:', error);
          loaderState.criticalImagesReady = true;
          maybeFinishInitialLoad();
        });
        maybeFinishInitialLoad();
      }, 0);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
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

  prepareMotionSystem();
  initPinchZoomGuard();
  document.addEventListener(LOADER_HIDDEN_EVENT, releaseInitialMotion, { once: true });
  document.addEventListener(LOADER_HIDDEN_EVENT, initAmbientFlashes, { once: true });

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
    register: registerLoaderTask,
    fail: failLoader,
    hide: hideLoader,
    forceHide: forceHideLoader,
    isActive: isLoaderActive
  });

  window.AvalonResources = Object.freeze({
    fetchWithTimeout,
    fetchJson,
    getJson,
    readCache: readResourceCache
  });

  window.AvalonUI = Object.freeze({
    initBackToTop,
    initRevealAnimations,
    initAmbientFlashes,
    showActionFeedback,
    closeActionFeedback,
    loader: window.AvalonLoader
  });
})();
