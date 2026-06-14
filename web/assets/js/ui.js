(() => {
  'use strict';

  const FEEDBACK_SELECTOR = '.action-feedback-overlay';
  let feedbackTimer = 0;

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
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

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const overlay = document.querySelector(FEEDBACK_SELECTOR);
    if (overlay) closeActionFeedback(overlay);
  });

  document.addEventListener('DOMContentLoaded', initBackToTop);

  window.AvalonUI = Object.freeze({
    initBackToTop,
    showActionFeedback,
    closeActionFeedback
  });
})();
