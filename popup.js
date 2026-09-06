const clientIdInput = document.getElementById('clientId');
const status = document.getElementById('status');
const buttons = [...document.querySelectorAll('button')];

async function send(type) {
  try {
    const result = await chrome.runtime.sendMessage({ type });
    if (!result?.ok) throw new Error(result?.error || 'เกิดข้อผิดพลาด');
    return result;
  } catch (error) {
    throw new Error(error.message || 'ติดต่อ Extension ไม่สำเร็จ');
  }
}

function setStatus(text, kind = '') {
  status.textContent = text;
  status.className = kind;
}

function setBusy(busy) {
  buttons.forEach(button => button.disabled = busy);
}

async function refresh() {
  const data = await chrome.storage.local.get(['clientId']);
  clientIdInput.value = data.clientId || '';
  try {
    const result = await send('STATUS');
    setStatus(result.loggedIn ? 'สถานะ: เข้าสู่ระบบแล้ว ✓' : 'สถานะ: ยังไม่ได้เข้าสู่ระบบ', result.loggedIn ? 'ok' : '');
  } catch (error) {
    setStatus(`สถานะ: ${error.message}`, 'error');
  }
}

document.getElementById('save').addEventListener('click', async () => {
  const clientId = clientIdInput.value.trim();
  if (!clientId) return setStatus('กรุณาระบุ Client ID', 'error');
  if (!clientId.endsWith('.apps.googleusercontent.com')) return setStatus('Client ID ไม่ถูกต้อง', 'error');
  await chrome.storage.local.set({ clientId });
  setStatus('บันทึก Client ID แล้ว ✓', 'ok');
});

document.getElementById('login').addEventListener('click', async () => {
  setBusy(true);
  setStatus('กำลังเปิด Google Login…');
  try { await send('LOGIN'); setStatus('เข้าสู่ระบบสำเร็จ ✓', 'ok'); }
  catch (error) { setStatus(`Login ไม่สำเร็จ: ${error.message}`, 'error'); }
  finally { setBusy(false); }
});

document.getElementById('logout').addEventListener('click', async () => {
  setBusy(true);
  try { await send('LOGOUT'); setStatus('ออกจากระบบแล้ว ✓', 'ok'); }
  catch (error) { setStatus(`Logout ไม่สำเร็จ: ${error.message}`, 'error'); }
  finally { setBusy(false); }
});

refresh();