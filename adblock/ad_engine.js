(() => {
  'use strict';

  const HIDDEN_ATTR = 'data-yt-dr-engine-hidden';
  const state = { detected: false, signals: new Set(), lastAction: 0 };
  const selectors = [
    '.ytp-ad-module', '.ytp-ad-overlay-container', '.ytp-ad-overlay-slot',
    '.ytp-ad-text-overlay', '.ytp-ad-player-overlay', '.ytp-ad-image-overlay',
    '.ytp-ad-message-container', '.ytp-ad-action-interstitial', '.ytp-ad-action-panel',
    '.ytp-ad-survey', '.ytp-ad-player-overlay-instream-info',
    '.ytp-ad-player-overlay-layout'
  ];
  const skipSelectors = [
    '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern',
    'button.ytp-ad-skip-button-modern', '.ytp-ad-skip-button-slot'
  ];
  const closeSelectors = ['.ytp-ad-overlay-close-button', '.ytp-ad-overlay-close-button-modern'];

  function getPlayer() { return document.querySelector('#movie_player'); }
  function hasVisible(selector) {
    return [...document.querySelectorAll(selector)].some(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  }
  function detect() {
    const signals = new Set();
    const player = getPlayer();
    if (document.querySelector('.ad-showing')) signals.add('ad-showing');
    if (document.querySelector('.ad-interrupting')) signals.add('ad-interrupting');
    if (player?.classList.contains('ad-showing')) signals.add('player-ad-showing');
    if (player?.classList.contains('ad-interrupting')) signals.add('player-ad-interrupting');
    if (hasVisible('.ytp-ad-module')) signals.add('ad-module');
    if (hasVisible('.ytp-ad-player-overlay, .ytp-ad-action-interstitial')) signals.add('ad-overlay');
    if (hasVisible(skipSelectors.join(', '))) signals.add('skip-button');
    if (hasVisible(closeSelectors.join(', '))) signals.add('close-button');
    state.signals = signals;
    state.detected = signals.size > 0;
    return state.detected;
  }
  function clickReady(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && !el.disabled && el.getClientRects().length) { el.click(); state.lastAction = Date.now(); return true; }
    }
    return false;
  }
  function clean() {
    if (!state.detected) return;
    if (Date.now() - state.lastAction >= 60) {
      clickReady(skipSelectors);
      clickReady(closeSelectors);
    }
    selectors.forEach(selector => document.querySelectorAll(selector).forEach(el => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute(HIDDEN_ATTR, '1');
    }));
  }
  function restore() {
    document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach(el => {
      el.style.removeProperty('display'); el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events'); el.removeAttribute(HIDDEN_ATTR);
    });
  }
  function enforce() { if (detect()) clean(); else restore(); }
  window.YTAdEngine = Object.freeze({ getState: () => ({ detected: state.detected, signals: [...state.signals] }), enforce });

  const observer = new MutationObserver(enforce);
  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    enforce();
    setInterval(enforce, 150);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
