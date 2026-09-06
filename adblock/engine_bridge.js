(() => {
  'use strict';
  const Engine = window.YTAdEngine;
  if (!Engine) return;
  const mount = () => { try { Engine.enforce(); } catch (e) { console.debug('[YT Ad Engine]', e); } };
  window.addEventListener('yt-navigate-finish', mount);
  window.addEventListener('popstate', mount);
})();
