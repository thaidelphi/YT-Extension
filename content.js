(() => {
  'use strict';
  let lastVideoId = null;
  let button = null;
  let speedControl = null;
  let speedButton = null;
  let speedMenu = null;
  let mountScheduled = false;
  let errorTimer = null;

  const getVideoId = () => new URL(location.href).searchParams.get('v');
  const video = () => document.querySelector('video.html5-main-video, video');

  function createButton() {
    const el = document.createElement('button');
    el.id = 'yt-dislike-restorer';
    el.type = 'button';
    el.className = 'yt-dr-button';
    el.title = 'Dislike';
    el.setAttribute('aria-label', 'Dislike');
    el.setAttribute('aria-pressed', 'false');
    el.innerHTML = '<svg class="yt-dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 10V21H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm2 0h6.7c1.2 0 2.1 1.1 1.8 2.3l-1.2 5.1A3 3 0 0 1 15.4 20H11V10Zm0-1.5V4.2A2.2 2.2 0 0 1 13.2 2c.9 0 1.6.7 1.6 1.6v1.1c0 .9-.2 1.7-.6 2.5L13 8.5H11Z"/></svg><span>Dislike</span>';
    el.addEventListener('click', () => toggleDislike(el));
    return el;
  }

  function createSpeedControl() {
    const wrap = document.createElement('div');
    wrap.id = 'yt-speed-control';
    wrap.className = 'yt-speed-control';
    speedButton = document.createElement('button');
    speedButton.type = 'button';
    speedButton.className = 'yt-speed-button';
    speedButton.title = 'Playback speed';
    speedButton.setAttribute('aria-label', 'Playback speed');
    speedButton.setAttribute('aria-expanded', 'false');
    speedButton.innerHTML = '<span class="yt-speed-value">1×</span>';
    speedMenu = document.createElement('div');
    speedMenu.className = 'yt-speed-menu';
    speedMenu.setAttribute('role', 'menu');
    [0.5,0.75,1,1.25,1.5,1.75,2,2.5,3].forEach(rate => {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'yt-speed-option';
      item.dataset.rate = String(rate); item.textContent = `${rate}×`;
      item.setAttribute('role', 'menuitem');
      item.addEventListener('click', () => setPlaybackRate(rate));
      speedMenu.appendChild(item);
    });
    speedButton.addEventListener('click', e => {
      e.stopPropagation();
      const open = wrap.classList.toggle('yt-speed-open');
      speedButton.setAttribute('aria-expanded', String(open));
    });
    wrap.append(speedButton, speedMenu);
    return wrap;
  }

  function setPlaybackRate(rate) {
    const v = video();
    if (!v) return;
    v.playbackRate = rate;
    updateSpeed(rate);
    speedMenu?.querySelectorAll('.yt-speed-option').forEach(item => {
      item.classList.toggle('yt-speed-selected', Number(item.dataset.rate) === rate);
    });
    speedControl?.classList.remove('yt-speed-open');
    speedButton?.setAttribute('aria-expanded', 'false');
  }
  function updateSpeed(rate) {
    if (!speedButton) return;
    const value = Number(rate) || 1;
    speedButton.querySelector('.yt-speed-value').textContent = `${value}×`;
  }
  async function applyDefaultSpeed() {
    const data = await chrome.storage.local.get(['defaultSpeed']);
    const rate = Number(data.defaultSpeed || 1);
    const v = video();
    if (v && Number.isFinite(rate)) { v.playbackRate = rate; updateSpeed(rate); }
  }
  function updateButton(rating) {
    if (!button) return;
    const active = rating === 'dislike';
    button.classList.toggle('yt-dr-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Remove Dislike' : 'Dislike';
    button.setAttribute('aria-label', button.title);
  }
  function showError(message) {
    if (!message || !button) return;
    button.setAttribute('data-error', message);
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => button?.removeAttribute('data-error'), 5000);
  }
  async function toggleDislike(el) {
    const videoId = getVideoId();
    if (!videoId || el.disabled) return;
    el.disabled = true; el.classList.add('yt-dr-loading');
    try {
      const result = await chrome.runtime.sendMessage({type:'TOGGLE_DISLIKE', videoId});
      if (!result?.ok) throw new Error(result?.error || 'ไม่สามารถส่ง Dislike ได้');
      updateButton(result.rating);
    } catch (error) {
      console.error('[YT Dislike]', error);
      showError(error.message || 'เกิดข้อผิดพลาดในการส่ง Dislike');
    } finally { el.disabled = false; el.classList.remove('yt-dr-loading'); }
  }
  async function refreshRating(videoId) {
    if (!button || !videoId) return;
    try {
      const result = await chrome.runtime.sendMessage({type:'GET_RATING', videoId});
      if (result?.ok && videoId === getVideoId()) updateButton(result.rating);
      else if (!result?.ok) showError(result?.error);
    } catch (error) { console.debug('[YT Dislike] rating check failed', error); }
  }

  function mount() {
    mountScheduled = false;
    if (!location.pathname.startsWith('/watch')) return;
    const container = document.querySelector('#top-level-buttons-computed');
    if (container) {
      if (!button || !document.contains(button)) button = createButton();
      if (!container.contains(button)) container.appendChild(button);
    }
    const controls = document.querySelector('.ytp-right-controls');
    if (controls) {
      if (!speedButton || !document.contains(speedButton)) {
        speedControl = createSpeedControl();
        controls.prepend(speedControl);
      }
      const v = video(); if (v) updateSpeed(v.playbackRate);
    }
    const id = getVideoId();
    if (id && id !== lastVideoId) {
      lastVideoId = id; updateButton('none');
      applyDefaultSpeed(); refreshRating(id);
    }
  }
  function scheduleMount() {
    if (mountScheduled) return;
    mountScheduled = true;
    requestAnimationFrame(mount);
  }
  document.addEventListener('click', e => {
    if (speedControl && !speedControl.contains(e.target)) {
      speedControl.classList.remove('yt-speed-open');
      speedButton?.setAttribute('aria-expanded', 'false');
    }
  }, true);
  new MutationObserver(scheduleMount).observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener('yt-navigate-finish', () => {
    lastVideoId = null; button = null; speedControl = null; speedButton = null; speedMenu = null;
    setTimeout(scheduleMount, 100);
  });
  window.addEventListener('popstate', scheduleMount);
  setInterval(scheduleMount, 1000);
  scheduleMount();
})();
