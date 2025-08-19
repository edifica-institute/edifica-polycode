/*export function setStatus(text, kind="") {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = "status " + (kind || "");
}


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
*/




// js/core/ui.js

// ---- Status + spinner -------------------------------------------------------
export function setStatus(text, kind = "") {
  const el = document.getElementById("status");
  const txt = document.getElementById("statusText") || el;
  if (txt) txt.textContent = text;
  if (el) el.className = "status " + (kind || "");
}

export function showSpinner(on) {
  const s = document.getElementById("spinner");
  if (s) s.style.display = on ? "inline-block" : "none";
}

// ---- Draggable splitter (width) ---------------------------------------------
export function initSplitter(){
  const wrap = document.querySelector('.wrap');
  const handle = document.getElementById('splitter');
  if (!wrap || !handle) return;

  let dragging = false, startX = 0, startW = 0;

  const start = (clientX) => {
    dragging = true;
    startX = clientX;
    const css = getComputedStyle(wrap);
    const w = css.getPropertyValue('--outw').trim();   // e.g. "520px"
    startW = parseFloat(w) || 520;
    document.body.style.userSelect = 'none';
  };
  const move = (clientX) => {
    if (!dragging) return;
    const dx = clientX - startX;
    const newW = Math.max(360, startW + dx);
    wrap.style.setProperty('--outw', `${newW}px`);
  };
  const stop = () => {
    dragging = false;
    document.body.style.userSelect = '';
  };

  // Pointer events (mouse + touch in one)
  handle.addEventListener('pointerdown', (e)=>{ e.preventDefault(); handle.setPointerCapture(e.pointerId); start(e.clientX); });
  window.addEventListener('pointermove',  (e)=> move(e.clientX));
  window.addEventListener('pointerup',    ()=> stop());
}








// ui.js
// ui.js
let _libsPromise = null;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + url));
    document.head.appendChild(s);
  });
}
function localUrl(relFromUi) {
  // ui.js is at /js/core/ui.js ; ../../vendor/... → /vendor/...
  try { return new URL(relFromUi, import.meta.url).href; }
  catch { return relFromUi; }
}

export async function ensureScreenshotLibs(){
  if (window.html2canvas) return;          // only require html2canvas
  if (_libsPromise) return _libsPromise;

  _libsPromise = (async () => {
    const candidates = [
      localUrl('../../vendor/html2canvas.min.js'),
      '/vendor/html2canvas.min.js',
      './vendor/html2canvas.min.js',
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    ];
    let ok = false;
    for (const u of candidates) {
      try {
        console.debug('[polycode] loading', u);
        await loadScript(u);
        ok = !!window.html2canvas;
        if (ok) break;
      } catch(e) {
        console.debug('[polycode] failed', u);
      }
    }
    if (!ok) throw new Error('Could not load html2canvas (required)');
  })();

  return _libsPromise;
}







// ---- Screenshot helpers (works with HTML or Terminal visible) --------------
export async function captureAreaAsBlob() {
  await ensureScreenshotLibs();   
  const area =
    document.querySelector(".wrap") ||
    document.getElementById("captureArea") ||
    document.body;
  const preview = document.getElementById("preview");

  // iframes can't be rasterized: hide preview temporarily
  let placeholder = null,
    hid = false;
  if (preview && preview.style.display !== "none") {
    hid = true;
    placeholder = document.createElement("div");
    placeholder.textContent = "HTML preview omitted in screenshot";
    placeholder.style.cssText =
      "margin:8px;padding:12px;border:1px dashed #334155;border-radius:8px;color:#9ca3af;font-size:12px;background:#0b1220";
    preview.parentNode.insertBefore(placeholder, preview);
    preview.style.display = "none";
  }

  try {
    // Prefer html-to-image; fallback to html2canvas
    let dataUrl;
    if (window.htmlToImage && htmlToImage.toPng) {
      dataUrl = await htmlToImage.toPng(area, {
        cacheBust: true,
        pixelRatio: 1.25,
        filter: (node) => node.id !== "preview",
      });
    } else if (window.html2canvas) {
      const canvas = await html2canvas(area, {
        backgroundColor: "#0f172a",
        useCORS: true,
        scale: 1.25,
      });
      dataUrl = canvas.toDataURL("image/png", 0.95);
    } else {
      throw new Error(
        "Missing html-to-image/html2canvas scripts in index.html <head>"
      );
    }
    const res = await fetch(dataUrl);
    return await res.blob(); // PNG blob
  } finally {
    if (hid) {
      preview.style.display = "block";
      if (placeholder) placeholder.remove();
    }
  }
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* best-effort */
  }
}

export function openWhatsApp(numberE164, message) {
  const url =
    "https://wa.me/" +
    numberE164.replace(/[^\d]/g, "") +
    "?text=" +
    encodeURIComponent(message);
  window.open(url, "_blank");
}

// ---- Upload to Cloudflare Pages Function -> R2 ------------------------------
export async function uploadSubmission({ screenshotBlob, codeText, student, lang }) {
  const fd = new FormData();
  fd.append(
    "screenshot",
    new File([screenshotBlob], "screenshot.png", { type: "image/png" })
  );
  fd.append(
    "code",
    new File(
      [codeText],
      `code.${(lang || "txt").toLowerCase()}.txt`,
      { type: "text/plain;charset=utf-8" }
    )
  );
  if (student) fd.append("student", student);
  if (lang) fd.append("lang", lang);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Upload failed");
  return data; // { ok:true, imageUrl, codeUrl, ... }
}




export function fitLayoutHeight() {
  const header = document.querySelector('header');
  const h = Math.max(360, window.innerHeight - (header?.offsetHeight || 0) - 24); // 24 = .wrap padding
  document.documentElement.style.setProperty('--panelH', h + 'px');
}





// Capture one screenshot of user's chosen screen/window/tab
export async function captureSystemScreenshot() {
  // Must be HTTPS and called from a user gesture (e.g., a button click)
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "monitor" }, audio: false
  });
  const track = stream.getVideoTracks()[0];

  // Draw one frame to a canvas
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();
  // tiny delay to ensure the first frame is available
  await new Promise(r => setTimeout(r, 120));

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // cleanup camera stream
  stream.getTracks().forEach(t => t.stop());

  const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
  return blob; // PNG blob
}

// Try native OS share (mobile) → else upload & open WhatsApp Web
export async function shareScreenshotToWhatsApp({ blob, codeText, student, lang }) {
  const msg = `PolyCode submission
Student: ${student || '(not provided)'}
Language: ${(lang||'').toUpperCase()}`;

  // Mobile path: Web Share API with file → WhatsApp native picker
  const file = new File([blob], 'polycode-screenshot.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files:[file], text: msg, title: 'PolyCode submission' });
      return;
    } catch { /* fall through */ }
  }

  // Desktop / fallback: upload then open wa.me with links
  const fd = new FormData();
  fd.append('screenshot', file);
  fd.append('code', new File([codeText||''], `code.${(lang||'txt').toLowerCase()}.txt`, { type:'text/plain;charset=utf-8' }));
  if (student) fd.append('student', student);
  if (lang)    fd.append('lang', lang);

  const res = await fetch('/api/upload', { method:'POST', body: fd });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Upload failed');

  const text = `${msg}
Image: ${data.imageUrl}
Code: ${data.codeUrl}`;
  window.open('https://wa.me/919836313636?text=' + encodeURIComponent(text), '_blank');
}


export async function notifyTeacher({ imageUrl, codeUrl, student, lang }) {
  const res = await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, codeUrl, student, lang })
  });
  if (!res.ok) throw new Error(`Notify failed (${res.status})`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Notify failed');
  return data;
}
