const API_BASE = 'https://www.googleapis.com/youtube/v3';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = 'https://www.googleapis.com/auth/youtube.force-ssl';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(error => {
    sendResponse({ ok: false, error: normalizeError(error) });
  });
  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case 'GET_RATING': return { ok: true, rating: await getRating(message.videoId) };
    case 'TOGGLE_DISLIKE': return { ok: true, rating: await toggleDislike(message.videoId) };
    case 'LOGIN': await login(); return { ok: true };
    case 'LOGOUT': await logout(); return { ok: true };
    case 'STATUS': return { ok: true, loggedIn: !!(await getAccessToken(false)) };
    default: throw new Error('ไม่รู้จักคำสั่งจาก Extension');
  }
}

async function getClientId() {
  const data = await chrome.storage.local.get(['clientId']);
  const clientId = data.clientId?.trim();
  if (!clientId) throw new Error('ยังไม่ได้ตั้ง Google OAuth Client ID');
  if (!clientId.endsWith('.apps.googleusercontent.com')) throw new Error('Google OAuth Client ID ไม่ถูกต้อง');
  return clientId;
}

async function getAccessToken(interactive = true) {
  const data = await chrome.storage.local.get(['accessToken', 'expiresAt']);
  if (data.accessToken && data.expiresAt && Date.now() < data.expiresAt - 60000) return data.accessToken;
  if (!interactive) return null;
  return login();
}

async function login() {
  const clientId = await getClientId();
  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomString(32);
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri,
    scope: SCOPES, access_type: 'offline', prompt: 'consent', code_challenge: challenge,
    code_challenge_method: 'S256', state });
  let resultUrl;
  try {
    resultUrl = await chrome.identity.launchWebAuthFlow({ url: `${AUTH_ENDPOINT}?${params}`, interactive: true });
  } catch (error) {
    throw new Error(`เปิด Google Login ไม่สำเร็จ: ${normalizeError(error)}`);
  }
  if (!resultUrl) throw new Error('Google OAuth ไม่ได้ส่งผลลัพธ์กลับมา');
  const callback = new URL(resultUrl);
  if (callback.searchParams.get('state') !== state) throw new Error('OAuth state ไม่ตรงกัน');
  const error = callback.searchParams.get('error');
  if (error) throw new Error(`Google OAuth: ${error}${callback.searchParams.get('error_description') ? ` - ${callback.searchParams.get('error_description')}` : ''}`);
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('ไม่พบ authorization code จาก Google');
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, code, code_verifier: verifier,
      grant_type: 'authorization_code', redirect_uri: redirectUri })
  });
  const tokens = await safeJson(tokenResponse);
  if (!tokenResponse.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || `Google token error (${tokenResponse.status})`);
  await chrome.storage.local.set({ accessToken: tokens.access_token, expiresAt: Date.now() + ((tokens.expires_in || 3600) * 1000) });
  return tokens.access_token;
}

async function logout() {
  const data = await chrome.storage.local.get(['accessToken']);
  if (data.accessToken) {
    try { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.accessToken)}`, { method: 'POST' }); } catch (_) {}
  }
  await chrome.storage.local.remove(['accessToken', 'expiresAt']);
}

async function apiFetch(path, options = {}) {
  let token = await getAccessToken(true);
  let response = await authorizedFetch(path, options, token);
  if (response.status === 401) {
    await chrome.storage.local.remove(['accessToken', 'expiresAt']);
    token = await getAccessToken(true);
    response = await authorizedFetch(path, options, token);
  }
  if (!response.ok) {
    const body = await safeJson(response);
    const reason = body.error?.errors?.[0]?.reason || body.error?.message;
    throw new Error(`YouTube API ${response.status}: ${reason || 'คำขอไม่สำเร็จ'}`);
  }
  return response;
}

async function authorizedFetch(path, options, token) {
  return fetch(`${API_BASE}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
}

async function getRating(videoId) {
  if (!videoId) throw new Error('ไม่พบ Video ID');
  const response = await apiFetch(`/videos/getRating?${new URLSearchParams({ id: videoId })}`);
  const data = await safeJson(response);
  return data.items?.[0]?.rating || 'none';
}

async function toggleDislike(videoId) {
  if (!videoId) throw new Error('ไม่พบ Video ID');
  const current = await getRating(videoId);
  const rating = current === 'dislike' ? 'none' : 'dislike';
  await apiFetch(`/videos/rate?${new URLSearchParams({ id: videoId, rating })}`, { method: 'POST' });
  return rating;
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch (_) { return { error: { message: text.slice(0, 500) } }; }
}

function normalizeError(error) {
  if (!error) return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  if (error.message) return error.message;
  return String(error);
}

function randomString(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => (b % 36).toString(36)).join('');
}

async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}