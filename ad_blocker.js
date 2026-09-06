(() => {
  'use strict';

  const HIDDEN_ATTR = 'data-yt-dr-aggressive-hidden';
  let lastAction = 0;

  const selectors = [
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-text-overlay',
    '.ytp-ad-player-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-message-container',
    '.ytp-ad-action-interstitial',
    '.ytp-ad-action-panel',
    '.ytp-ad-survey',
    '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-player-overlay-layout',
    '.ytp-ad-overlay-close-button'
  ];

  function isAdShowing() {
    const player = document.querySelector('#movie_player');
    return Boolean(
      document.querySelector('.ad-showing, .ad-interrupting') ||
      player?.classList.contains('ad-showing') ||
      player?.classList.contains('ad-interrupting')
    );
  }

  function clickIfReady(selector) {
    const el = document.querySelector(selector);
    if (!el || el.disabled || !el.getClientRects().length) return false;
    el.click();
    lastAction = Date.now();
    return true;
  }

  function skipAndClose() {
    if (!isAdShowing()) return;
    const now = Date.now();
    if (now - lastAction < 70) return;

    clickIfReady('.ytp-ad-skip-button');
    clickIfReady('.ytp-ad-skip-button-modern');
    clickIfReady('button.ytp-ad-skip-button-modern');
    clickIfReady('.ytp-ad-skip-button-slot');
    clickIfReady('.ytp-ad-overlay-close-button');
    clickIfReady('.ytp-ad-overlay-close-button-modern');
  }

  function hideAds() {
    if (!isAdShowing()) return;
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.setAttribute(HIDDEN_ATTR, '1');
      });
    }
  }

  function restoreAds() {
    document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach(el => {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.removeAttribute(HIDDEN_ATTR);
    });
  }

  function enforce() {
    if (isAdShowing()) {
      skipAndClose();
      hideAds();
    } else {
      restoreAds();
    }
  }

  const observer = new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes?.length || m.removedNodes?.length)) enforce();
  });

  function start() {
    if (!document.documentElement) return;
    observer.observe(document.documentElement, { childList: true, subtree: true });
    enforce();
    setInterval(enforce, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
