/**
 * common.js — utilidades compartidas (nav + toasts + helpers)
 */
(function (global) {
  // ---------- Helpers ----------
  function toID(text) {
    return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  // ---------- Toasts (sustituye alert molestos) ----------
  let toastRoot = null;

  function ensureToastRoot() {
    if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
    toastRoot = document.createElement('div');
    toastRoot.id = 'toast-root';
    toastRoot.className = 'toast-root';
    toastRoot.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRoot);
    return toastRoot;
  }

  /**
   * showToast(message, type?, durationMs?)
   * type: 'success' | 'info' | 'error' | 'warn'
   */
  function showToast(message, type, durationMs) {
    type = type || 'info';
    durationMs = durationMs == null ? 2800 : durationMs;
    const root = ensureToastRoot();

    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'status');

    const icons = {
      success: 'fa-circle-check',
      info: 'fa-circle-info',
      error: 'fa-circle-xmark',
      warn: 'fa-triangle-exclamation'
    };
    const icon = icons[type] || icons.info;

    el.innerHTML =
      '<i class="fa-solid ' + icon + ' toast-icon"></i>' +
      '<span class="toast-msg"></span>' +
      '<button type="button" class="toast-close" aria-label="Cerrar">&times;</button>';
    el.querySelector('.toast-msg').textContent = message;

    const remove = () => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);

    root.appendChild(el);
    // force reflow for enter animation
    void el.offsetWidth;
    el.classList.add('toast-in');

    if (durationMs > 0) setTimeout(remove, durationMs);
    return el;
  }

  global.ChampUtils = { toID, debounce, showToast };
  global.showToast = showToast;

  document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) link.classList.add('active');
      else link.classList.remove('active');
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
