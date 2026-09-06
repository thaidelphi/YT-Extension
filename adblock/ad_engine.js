(() => {
  'use strict';

  const HIDDEN_ATTR = 'data-yt-dr-engine-hidden';
  const state = { enabled: true, detected: false, score: 0, signals: new Set(), lastAction: 0, runs: 0, lastRun: 0 };
  const SCORE = {
    'ad-showing': 5, 'ad-interrupting': 5, 'player-ad-showing': 5,
    'player-ad-interrupting': 5, 'ad-module': 3, 'ad-overlay': 3,
    'skip-button': 4, 'close-button': 2
  };
  const DETECT_THRESHOLD = 3;
  const ACTION_COOLDOWN = 80;
  const selectors = [
    '.ytp-ad-module', '.ytp-ad-overlay-container', '.ytp-ad-overlay-slot',
    '.ytp-ad-text-overlay', '.ytp-ad-player-overlay', '.ytp-ad-image-overlay',
    '.ytp-ad-message-container', '.ytp-ad-action-interstitial', '.ytp-ad-action-panel',
    '.ytp-ad-survey', '.ytp-ad-player-overlay-instream-info', '.ytp-ad-player-overlay-layout'
  ];
  const skipSelectors = [
    '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern',
    'button.ytp-ad-skip-button-modern', '.ytp-ad-skip-button-slot'
  ];
  const closeSelectors = [
    '.ytp-ad-overlay-close-button', '.ytp-ad-overlay-close-button-modern'
  ];
  let scheduled = false;
  let timer = null;

  function getPlayer() { return document.querySelector('#movie_player'); }
  function visible(selector) {
    return [...document.querySelectorAll(selector)].some(el => {
      const style = getComputedStyle(el);
      return el.getClientRects().length && style.visibility !== 'hidden' && style.display !== 'none';
    });
  }
  function detect() {
    const signals = new Set();
    const player = getPlayer();
    if (document.querySelector('.ad-showing')) signals.add('ad-showing');
    if (document.querySelector('.ad-interrupting')) signals.add('ad-interrupting');
    if (player?.classList.contains('ad-showing')) signals.add('player-ad-showing');
    if (player?.classList.contains('ad-interrupting')) signals.add('player-ad-interrupting');
    if (visible('.ytp-ad-module')) signals.add('ad-module');
    if (visible('.ytp-ad-player-overlay, .ytp-ad-action-interstitial')) signals.add('ad-overlay');
    if (visible(skipSelectors.join(', '))) signals.add('skip-button');
    if (visible(closeSelectors.join(', '))) signals.add('close-button');
    state.signals = signals;
    state.score = [...signals].reduce((sum, signal) => sum + (SCORE[signal] || 0), 0);
    state.detected = state.score >= DETECT_THRESHOLD;
    return state.detected;
  }
  function clickReady(list) {
    for (const selector of list) {
      const el = document.querySelector(selector);
      if (el && !el.disabled && el.getClientRects().length) {
        el.click();
        state.lastAction = Date.now();
        return true;
      }
    }
    return false;
  }
  function clean() {
    if (!state.detected) return;
    if (Date.now() - state.lastAction >= ACTION_COOLDOWN) {
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
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      el.removeAttribute(HIDDEN_ATTR);
    });
  }
  function run() {
    scheduled = false;
    state.runs += 1;
    state.lastRun = Date.now();
    if (!state.enabled) {
      state.detected = false; state.score = 0; state.signals = new Set(); restore(); return;
    }
    if (detect()) clean(); else restore();
  }
  function schedule(delay = 0) {
    if (scheduled) return;
    scheduled = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(run), delay);
  }
  function getState() {
    return {
      enabled: state.enabled, detected: state.detected, score: state.score,
      threshold: DETECT_THRESHOLD, signals: [...state.signals],
      runs: state.runs, lastAction: state.lastAction, lastRun: state.lastRun
    };
  }

  chrome.storage.local.get(['adBlockEnabled']).then(data => {
    state.enabled = data.adBlockEnabled !== false;
    schedule();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.adBlockEnabled) {
      state.enabled = changes.adBlockEnabled.newValue !== false;
      schedule();
    }
  });

  window.YTAdEngine = Object.freeze({ getState, enforce: () => schedule() });
  const observer = new MutationObserver(() => schedule(25));
  function start() {
    observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style']
    });
    schedule();
    setInterval(() => schedule(), 500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
})();
