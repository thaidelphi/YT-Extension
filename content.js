(() => {
  let lastVideoId = null;
  let button = null;
  let speedButton = null;
  let speedMenu = null;
  let refreshTimer = null;
  let mountScheduled = false;

  const getVideoId = () => new URL(location.href).searchParams.get('v');

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
    [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].forEach(rate => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'yt-speed-option';
      item.dataset.rate = String(rate);
      item.textContent = `${rate}×`;
      item.setAttribute('role', 'menuitem');
      item.addEventListener('click', () => setPlaybackRate(rate));
      speedMenu.appendChild(item);
    });

    speedButton.addEventListener('click', event => {
      event.stopPropagation();
      const open = wrap.classList.toggle('yt-speed-open');
      speedButton.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', event => {
      if (!wrap.contains(event.target)) {
        wrap.classList.remove('yt-speed-open');
        speedButton.setAttribute('aria-expanded', 'false');
      }
    }, true);

    wrap.append(speedButton, speedMenu);
    return wrap;
  }

  function setPlaybackRate(rate) {
    const video = document.querySelector('video.html5-main-video, video');
    if (!video) return;
    video.playbackRate = rate;
    updateSpeedControl(rate);
    speedMenu?.querySelectorAll('.yt-speed-option').forEach(item => {
      item.classList.toggle('yt-speed-selected', Number(item.dataset.rate) === rate);
    });
    speedButton?.parentElement.classList.remove('yt-speed-open');
    speedButton?.setAttribute('aria-expanded', 'false');
  }

  function updateSpeedControl(rate) {
    if (!speedButton) return;
    const value = Number(rate) || 1;
    const label = Number.isInteger(value) ? String(value) : String(value).replace(/0$/, '');
    speedButton.querySelector('.yt-speed-value').textContent = `${label}×`;
  }

  function syncPlaybackRate() {
    const video = document.querySelector('video.html5-main-video, video');
    if (video) updateSpeedControl(video.playbackRate);
  }

  function updateButton(rating) {
    if (!button) return;
    const active = rating === 'dislike';
    button.classList.toggle('yt-dr-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? 'Remove Dislike' : 'Dislike';
    button.setAttribute('aria-label', active ? 'Remove Dislike' : 'Dislike');
  }

  async function toggleDislike(el) {
    const videoId = getVideoId();
    if (!videoId || el.disabled) return;
    el.disabled = true;
    el.classList.add('yt-dr-loading');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'TOGGLE_DISLIKE', videoId });
      if (!result?.ok) throw new Error(result?.error || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธชเนเธ Dislike เนเธ”เน');
      updateButton(result.rating);
    } catch (error) {
      console.error('[YT Dislike]', error);
      showError(error.message || 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”');
    } finally {
      el.disabled = false;
      el.classList.remove('yt-dr-loading');
    }
  }

  async function refreshRating(videoId) {
    if (!button || !videoId) return;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'GET_RATING', videoId });
      if (result?.ok && videoId === getVideoId()) updateButton(result.rating);
      else if (!result?.ok) showError(result?.error);
    } catch (error) {
      console.debug('[YT Dislike] rating check failed', error);
    }
  }

  function showError(message) {
    if (!message) return;
    button?.setAttribute('data-error', message);
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => button?.removeAttribute('data-error'), 5000);
  }

  function skipAd() {
    const skipButton = document.querySelector(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-modern'
    );
    if (skipButton && !skipButton.disabled) {
      skipButton.click();
      return true;
    }
    return false;
  }

  function closeAdOverlay() {
    const closeButton = document.querySelector(
      '.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-button-modern'
    );
    if (closeButton) {
      closeButton.click();
      return true;
    }
    return false;
  }

  function hideAdVisuals() {
    document.querySelectorAll(
      '.ytp-ad-module, .ytp-ad-overlay-container, .ytp-ad-overlay-slot, .ytp-ad-text-overlay, .ytp-ad-player-overlay, .ytp-ad-image-overlay, .ytp-ad-message-container'
    ).forEach(el => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.setAttribute('data-yt-dr-ad-hidden', 'true');
    });
  }

  function resetAdVisuals() {
    document.querySelectorAll('[data-yt-dr-ad-hidden]').forEach(el => {
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.removeAttribute('data-yt-dr-ad-hidden');
    });
  }

  function handleAd() {
    const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
    if (!adShowing) {
      resetAdVisuals();
      return;
    }
    skipAd();
    closeAdOverlay();
    hideAdVisuals();
  }

  function mount() {
    mountScheduled = false;
    if (!location.pathname.startsWith('/watch')) return;

    handleAd();

    const container = document.querySelector('#top-level-buttons-computed');
    if (container) {
      if (!button || !document.contains(button)) button = createButton();
      if (!container.contains(button)) container.appendChild(button);
    }

    const playerControls = document.querySelector('.ytp-right-controls');
    if (playerControls) {
      if (!speedButton || !document.contains(speedButton)) {
        playerControls.prepend(createSpeedControl());
      }
      syncPlaybackRate();
    }

    const videoId = getVideoId();
    if (videoId && videoId !== lastVideoId) {
      lastVideoId = videoId;
      updateButton('none');
      refreshRating(videoId);
    }
  }

  function scheduleMount() {
    if (mountScheduled) return;
    mountScheduled = true;
    requestAnimationFrame(mount);
  }

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('yt-navigate-finish', () => {
    lastVideoId = null;
    button = null;
    speedButton = null;
    speedMenu = null;
    setTimeout(scheduleMount, 100);
  });
  window.addEventListener('popstate', scheduleMount);
  setInterval(() => { scheduleMount(); handleAd(); }, 1000);
  scheduleMount();
})();

