/*export function setStatus(text, kind="") {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = "status " + (kind || "");
}*/


// js/core/ui.js
export function setStatus(text, kind=""){
  const el = document.getElementById('status');
  const txt = document.getElementById('statusText') || el;
  txt.textContent = text;
  el.className = "status " + (kind || "");
}

export function showSpinner(on){
  const s = document.getElementById('spinner');
  if (s) s.style.display = on ? 'inline-block' : 'none';
}

export function initSplitter(){
  const wrap = document.querySelector('.wrap');
  const handle = document.getElementById('splitter');
  if (!wrap || !handle) return;

  let dragging = false, startX = 0, startW = 0;
  handle.addEventListener('mousedown', (e)=>{
    dragging = true; startX = e.clientX;
    startW = parseFloat(getComputedStyle(wrap).getPropertyValue('--outw')) || 520;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', (e)=>{
    if (!dragging) return;
    const dx = e.clientX - startX;
    const newW = Math.max(360, startW + dx);
    wrap.style.setProperty('--outw', newW + 'px');
  });
  window.addEventListener('mouseup', ()=>{
    dragging = false;
    document.body.style.userSelect = '';
  });
}



export async function uploadSubmission({ screenshotBlob, codeText, student, lang }) {
  const fd = new FormData();
  fd.append('screenshot', new File([screenshotBlob], 'screenshot.png', { type:'image/png' }));
  fd.append('code', new File([codeText], `code.${(lang||'txt').toLowerCase()}.txt`, { type:'text/plain;charset=utf-8' }));
  if (student) fd.append('student', student);
  if (lang)    fd.append('lang', lang);

  const res = await fetch('/api/upload', { method:'POST', body: fd });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Upload failed');
  return data; // { ok:true, imageUrl, codeUrl, ... }
}
