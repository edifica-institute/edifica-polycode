// frontend/js/main.js

import { initMonaco, setLanguage, setValue, clearMarkers /*, setMarkers*/ } from './core/editor.js';
import { initTerminal, clearTerminal } from './core/terminal.js';
import {
  setStatus, initSplitter, fitLayoutHeight,
  uploadSubmission, copyTextToClipboard, openWhatsApp,
  clearPreview, clearSqlOutput, renderSubmissionPNG
} from './core/ui.js';

import * as javaLang from './lang/java.js';
import * as sqlLang  from './lang/sql.js';
import * as webLang  from './lang/web.js';

// ---------------------------------------------------------------------------
// VISIBILITY HELPERS
// ---------------------------------------------------------------------------
function showRightPane(id) {                 // id: 'term' | 'preview' | 'sqlout'
  ['term','preview','sqlout'].forEach(x => {
    const el = document.getElementById(x);
    if (!el) return;
    el.style.display = (x === id) ? 'block' : 'none';
  });
}

// Flip the left-side stacks (single editor vs 3-pane web editors)
// and set a sensible right-side pane for the language.
function setLanguageUI(lang) {
  const isWeb = (lang === 'web');
  const isHtml = (lang === 'html');
  const isSql = (lang === 'sql');

  const leftCode = document.getElementById('left-code'); // single editor
  const leftHtml = document.getElementById('left-html'); // 3-pane (html/css/js)

  if (leftCode && leftHtml) {
    // HTML+CSS+JS uses left-html; everything else uses left-code
    leftHtml.style.display = (isWeb ? 'block' : 'none');
    leftCode.style.display = (isWeb ? 'none'  : 'block');
  }

  if (isWeb || isHtml) {
    showRightPane('preview');
  } else if (isSql) {
    showRightPane('sqlout');
  } else {
    showRightPane('term'); // Java & others
  }
}

// ---------------------------------------------------------------------------
// SILENT CLEAR HELPERS
// ---------------------------------------------------------------------------
function clearByLanguage(full = false) {
  if (current === 'java') {
    clearTerminal(full);               // xterm (silent)
  } else if (current === 'html' || current === 'web') {
    clearPreview();                    // iframe (silent)
  } else if (current === 'sql') {
    clearSqlOutput();                  // table area (silent)
  }
}

// one-shot auto-clear after the first edit post run/switch (debounced)
let autoClearTimer = null;
let clearedAfterEdit = false;

function scheduleAutoClear() {
  if (clearedAfterEdit) return;
  clearTimeout(autoClearTimer);
  autoClearTimer = setTimeout(() => {
    clearByLanguage(false);            // no status text
    clearedAfterEdit = true;           // arm once until reset
  }, 300);
}
function resetEditClearArming() { clearedAfterEdit = false; }

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let current = 'java';
let htmlMod = null;

// ---------------------------------------------------------------------------
// HTML module lazy loader
// ---------------------------------------------------------------------------
async function loadHtmlModule() {
  const url = new URL('./lang/html.js', import.meta.url);
  return import(url.href);
}

// ---------------------------------------------------------------------------
// PNG RENDERER (no html2canvas)
// ---------------------------------------------------------------------------
function wrapLines(ctx, text, maxWidth) {
  const words = String(text).replace(/\r\n/g, '\n').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (ctx.measureText(w).width > maxWidth) {
        let tmp = '';
        for (const ch of w) {
          const t2 = tmp + ch;
          if (ctx.measureText(t2).width <= maxWidth) tmp = t2;
          else { lines.push(tmp); tmp = ch; }
        }
        line = tmp;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}
function drawParagraph(ctx, text, x, y, maxWidth, lineHeight, color) {
  ctx.fillStyle = color;
  const lines = String(text).split('\n');
  for (const raw of lines) {
    const parts = wrapLines(ctx, raw, maxWidth);
    for (const p of parts) { ctx.fillText(p, x, y); y += lineHeight; }
  }
  return y;
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}


// ---------------------------------------------------------------------------
// BOOT
// ---------------------------------------------------------------------------
window.addEventListener('resize', fitLayoutHeight);

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  initSplitter();
  fitLayoutHeight();
  setStatus('Ready.');

  // Hide terminal until Java actually runs
  document.getElementById('term')?.classList.add('hidden');

  // Buttons
  document.getElementById('runBtn') ?.addEventListener('click', run);
  document.getElementById('stopBtn')?.addEventListener('click', stop);
  document.getElementById('sendBtn')?.addEventListener('click', sendToWhatsApp);

  // Keyboard shortcut from editor
  window.addEventListener('polycode:run', run);

  // Language switcher (NOTE: uses #language-select per updated HTML)
  const sel = document.getElementById('language-select');
  if (sel) {
    // initialize UI to current selected
    setLanguageUI(sel.value);
    sel.addEventListener('change', () => switchLang(sel.value));
  }

  // Auto-clear on first edit after init (and after we re-arm on run/switch)
  if (window.monaco?.editor?.onDidCreateEditor) {
    monaco.editor.onDidCreateEditor((ed) => {
      ed.onDidChangeModelContent(() => scheduleAutoClear());
    });
  }
});

// ---------------------------------------------------------------------------
// LANGUAGE SWITCHING
// ---------------------------------------------------------------------------
async function switchLang(lang){
  current = lang;

  // Clear outputs on language switch and re-arm one-shot edit clear
  clearByLanguage(true);
  resetEditClearArming();

  // Flip left panes + right output pane
  setLanguageUI(lang);

  const hint = document.getElementById('hint');

  if (lang === 'web') {
    // HTML+CSS+JS 3-pane
    webLang.activate();
    if (hint) hint.textContent = 'Edit HTML, CSS & JS. Click Run to render on the right.';
    // Clear any stale preview DOM when entering web
    clearPreview();
    setStatus('Ready.');
    return;
  }

  if (lang === 'html'){
    try{
      if (!htmlMod) htmlMod = await loadHtmlModule();
      htmlMod.activate();
      if (hint) hint.textContent = 'HTML preview is shown on the right.';
    }catch(e){
      console.error('Failed to load html module:', e);
      // fallback: switch editor mode + simple preview message
      setLanguage('html');
      setValue('<!doctype html><html><body><h2>Hello, HTML!</h2></body></html>');
      const iframe = document.getElementById('preview');
      if (iframe){
        iframe.srcdoc = '<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">HTML module failed to load. A fallback preview is shown.</body></html>';
      }
      if (hint) hint.textContent = 'HTML preview is shown on the right.';
    }
    // Clear any stale preview DOM when entering html
    clearPreview();
    setStatus('Ready.');
    return;
  }

  if (lang === 'sql'){
    sqlLang.activate();
    if (hint) hint.textContent = 'Write SQL on the left. Results appear as a table.';
    // Clear any stale sql output when entering sql
    clearSqlOutput();
    setStatus('Ready.');
    return;
  }

  // Default: Java (keep terminal hidden until Run)
  javaLang.activate();
  if (hint) hint.textContent = 'Type into the console when your program asks for input (e.g., Scanner).';
  setStatus('Ready.');
}

// ---------------------------------------------------------------------------
// RUN / STOP
// ---------------------------------------------------------------------------
async function run() {
  // fresh output for this run and re-arm one-shot edit clear
  clearByLanguage(false);
  resetEditClearArming();

  if (current === 'web')  return webLang.run();
  if (current === 'html') { if (!htmlMod) htmlMod = await loadHtmlModule(); return htmlMod.run(); }
  if (current === 'sql')  return sqlLang.run();

  // Java
  document.getElementById('term')?.classList.remove('hidden');
  showRightPane('term');                    // ensure the terminal is visible
  return javaLang.runJava();
}

function stop() {
  // Always clear the visible terminal area silently
  clearTerminal();

  if (current === 'web')  return webLang.stop();
  if (current === 'html') { try { htmlMod?.stop?.(); } catch {} return; }
  if (current === 'sql')  return sqlLang.stop();

  // Java
  document.getElementById('term')?.classList.add('hidden');
  return javaLang.stopJava();
}

// ---------------------------------------------------------------------------
// SEND (PNG render → upload → WhatsApp)
// ---------------------------------------------------------------------------
async function sendToWhatsApp() {
  try {
    setStatus('Preparing submission…');

    const sel  = document.getElementById('language-select');
    const lang = (sel?.value || current || 'java').toUpperCase();

    // Code text from editor (main model; adapt if you later use multiple models)
    const codeText = monaco.editor.getModels()[0].getValue();

    // Output text per language
    let outputText = '';
    if (lang === 'JAVA') {
      outputText = (javaLang.getLastOutput?.() || '').trim();
    } else if (lang === 'SQL') {
      outputText = (sqlLang.getLastOutput?.() || '').trim();
    } else if (lang === 'HTML') {
      outputText = '(HTML preview omitted)';
    } else if (lang === 'WEB') {
      outputText = '(HTML+CSS+JS preview omitted)';
    }

    // Student identity (remembered once)
    const key = 'polycode_student';
    let student = localStorage.getItem(key) || '';
    if (!student) {
      student = prompt('Enter your name / roll:', '') || '';
      if (student) localStorage.setItem(key, student);
    }

    // 1) Render PNG locally
    const screenshotBlob = await renderSubmissionPNG({ codeText, outputText, lang, student });

    // 2) Upload to backend (returns public URLs)
    const { imageUrl, codeUrl } = await uploadSubmission({ screenshotBlob, codeText, student, lang });

    // 3) Copy code for convenience
    try { await copyTextToClipboard(codeText); } catch {}

    // 4) Open WhatsApp with links
    const msg = `PolyCode submission
Student: ${student || '(not provided)'}
Language: ${lang}
Code: ${codeUrl}
Image: ${imageUrl}
(Your code is also on the clipboard.)`;
    openWhatsApp('919836313636', msg);

    setStatus('Ready.', 'ok');
  } catch (e) {
    console.error(e);
    setStatus('Could not prepare submission.', 'err');
    alert('Upload failed. Please try again, or paste the links manually.');
  }
}
























/*

//new 2

// frontend/js/main.js
import { initMonaco, setLanguage, setValue, clearMarkers, setMarkers } from './core/editor.js';
import { initTerminal, clearTerminal  } from './core/terminal.js';
import {
  setStatus, initSplitter, fitLayoutHeight,
  uploadSubmission, copyTextToClipboard, openWhatsApp, clearPreview, clearSqlOutput
} from './core/ui.js';
import * as javaLang from './lang/java.js';
import * as sqlLang  from './lang/sql.js';
import * as webLang from './lang/web.js';



// --- VISIBILITY + CLEAR HELPERS ---------------------------------------------
function showRightPane(id) {             // id: 'term' | 'preview' | 'sqlout'
  ['term','preview','sqlout'].forEach(x => {
    const el = document.getElementById(x);
    if (!el) return;
    el.style.display = (x === id) ? 'block' : 'none';
  });
}

function clearAllOutputs(full = false) {
  // uses your existing clearTerminal() from terminal.js
  clearTerminal(full);                    // full=true => reset+clear for Java/xterm

  // OPTIONAL: if you also want to blank HTML/SQL views when clearing, uncomment:
  // const preview = document.getElementById('preview');
  // if (preview) preview.srcdoc = '<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">Output cleared.</body></html>';
  // const sqlout  = document.getElementById('sqlout');
  // if (sqlout)  { sqlout.textContent = 'Output cleared.'; }
}





let current = 'java';
let htmlMod = null;



function clearByLanguage(full = false) {
  if (current === 'java') {
    clearTerminal(full);                  // xterm
  } else if (current === 'html' || current === 'web') {
    clearPreview('Output cleared.');      // right iframe
  } else if (current === 'sql') {
    clearSqlOutput('Output cleared.');    // table area
  }
}

let autoClearTimer = null;
let clearedAfterEdit = false;

function scheduleAutoClear() {
  if (clearedAfterEdit) return;                 // only once until re-armed
  clearTimeout(autoClearTimer);
  autoClearTimer = setTimeout(() => {
    clearByLanguage(false);                     // soft clear
    clearedAfterEdit = true;
    setStatus('Output cleared (code changed).');
  }, 700);
}
function resetEditClearArming() { clearedAfterEdit = false; }



window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  // ... your existing init code ...

  if (window.monaco?.editor?.onDidCreateEditor) {
    monaco.editor.onDidCreateEditor((ed) => {
      ed.onDidChangeModelContent(() => scheduleAutoClear());
    });
  }
});



// ---------- Lightweight PNG renderer (no html2canvas) -----------------------
function wrapLines(ctx, text, maxWidth) {
  const words = String(text).replace(/\r\n/g, '\n').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      if (ctx.measureText(w).width > maxWidth) {
        let tmp = '';
        for (const ch of w) {
          const t2 = tmp + ch;
          if (ctx.measureText(t2).width <= maxWidth) tmp = t2;
          else { lines.push(tmp); tmp = ch; }
        }
        line = tmp;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}
function drawParagraph(ctx, text, x, y, maxWidth, lineHeight, color) {
  ctx.fillStyle = color;
  const lines = String(text).split('\n');
  for (const raw of lines) {
    const parts = wrapLines(ctx, raw, maxWidth);
    for (const p of parts) { ctx.fillText(p, x, y); y += lineHeight; }
  }
  return y;
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}
async function renderSubmissionPNG({ codeText, outputText, lang='JAVA', student='' }) {
  const W = 1400, H = 900;
  const pad = 28, gutter = 18;
  const leftW = Math.floor((W - pad*2 - gutter) * 0.58);
  const rightW = (W - pad*2 - gutter) - leftW;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // bg + header
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#e5e7eb'; ctx.font = '600 22px ui-sans-serif,system-ui,Segoe UI,Roboto,Arial';
  ctx.fillText('Edifica PolyCode', pad, pad + 22);
  ctx.font = '12px ui-sans-serif,system-ui,Segoe UI,Roboto,Arial';
  const ts = new Date().toLocaleString();
  ctx.fillStyle = '#93c5fd'; ctx.fillText(`Language: ${lang}`, pad, pad + 22 + 18);
  ctx.fillStyle = '#9ca3af'; ctx.fillText(`Student: ${student || '—'}    •    ${ts}`, pad + 160, pad + 22 + 18);

  // panels
  const top = pad + 22 + 18 + 18;
  const panelH = H - top - pad;

  // code panel
  ctx.save();
  roundRect(ctx, pad, top, leftW, panelH, 12); ctx.clip();
  ctx.fillStyle = '#0f172a'; ctx.fillRect(pad, top, leftW, panelH);
  ctx.fillStyle = '#334155'; ctx.fillRect(pad, top, leftW, 34);
  ctx.fillStyle = '#e5e7eb'; ctx.font = '600 13px ui-sans-serif,system-ui,Segoe UI,Roboto,Arial';
  ctx.fillText('Code', pad + 10, top + 22);
  ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
  let y = top + 50;
  y = drawParagraph(ctx, codeText, pad + 12, y, leftW - 24, 18, '#e5e7eb');
  ctx.restore();

  // output panel
  ctx.save();
  const rx = pad + leftW + gutter;
  roundRect(ctx, rx, top, rightW, panelH, 12); ctx.clip();
  ctx.fillStyle = '#0f172a'; ctx.fillRect(rx, top, rightW, panelH);
  ctx.fillStyle = '#334155'; ctx.fillRect(rx, top, rightW, 34);
  ctx.fillStyle = '#e5e7eb'; ctx.font = '600 13px ui-sans-serif,system-ui,Segoe UI,Roboto,Arial';
  ctx.fillText('Output', rx + 10, top + 22);
  ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
  let y2 = top + 50;
  y2 = drawParagraph(ctx, outputText || '(no output)', rx + 12, y2, rightW - 24, 18, '#e5e7eb');
  ctx.restore();

  // footer
  ctx.fillStyle = '#1f2937'; ctx.fillRect(0, H-4, W, 4);

  const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
  return blob;
}

// ---------- Boot -------------------------------------------------------------
window.addEventListener('resize', fitLayoutHeight);

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  initSplitter();
  fitLayoutHeight();
  setStatus('Ready.');

  // Hide terminal until Java actually runs
  document.getElementById('term')?.classList.add('hidden');

  // Buttons
  document.getElementById('runBtn')?.addEventListener('click', run);
  document.getElementById('stopBtn')?.addEventListener('click', stop);
  document.getElementById('sendBtn')?.addEventListener('click', sendToWhatsApp);

  // Keyboard shortcut from editor
  window.addEventListener('polycode:run', run);

  // Language switcher
  const sel = document.getElementById('langSel');
  if (sel) sel.addEventListener('change', () => switchLang(sel.value));
});

// ---------- Language switching ----------------------------------------------
async function loadHtmlModule() {
  const url = new URL('./lang/html.js', import.meta.url);
  return import(url.href);
}

/*
async function switchLang(lang) {
  current = lang;
clearByLanguage(true);
  resetEditClearArming(); 
  // Grab UI bits
  const termEl  = document.getElementById('term');
  const preview = document.getElementById('preview');
  const sqlout  = document.getElementById('sqlout');
  const hint    = document.getElementById('hint');
  const single  = document.getElementById('editor');
  const webWrap = document.getElementById('webEditors');

  // ---- Default visibility (reset) ------------------------------------------
  // Hide terminal by default (we show it only when Java actually runs)
  termEl?.classList.add('hidden');

  // Hide right-panel outputs by default
  if (preview) preview.style.display = 'none';
  if (sqlout)  sqlout.style.display  = 'none';

  // Show single-editor by default; hide 3-pane web editors
  if (single)  single.style.display  = 'block';
  if (webWrap) webWrap.style.display = 'none';

  // ---- Web (HTML + CSS + JS) -----------------------------------------------
  if (lang === 'web') {
    // 3 Monaco panes on the left, preview on the right
    webLang.activate();
    if (preview) preview.style.display = 'block';
    if (hint) hint.textContent = 'Edit HTML, CSS & JS. Click Run to render on the right.';
    setStatus('Ready.');
    return;
  }

  // ---- HTML (single file) ---------------------------------------------------
  if (lang === 'html') {
    if (preview) preview.style.display = 'block';
    try {
      if (!htmlMod) htmlMod = await loadHtmlModule();
      htmlMod.activate();
      if (hint) hint.textContent = 'HTML preview is shown on the right.';
    } catch (e) {
      console.error('Failed to load html module:', e);
      try {
        setLanguage('html');
        setValue(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body><h2>Hello, HTML!</h2></body></html>`);
      } catch {}
      if (preview) {
        preview.srcdoc =
          `<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">
             HTML module failed to load. A fallback preview is shown.
           </body></html>`;
      }
      if (hint) hint.textContent = 'HTML preview is shown on the right.';
    }
    setStatus('Ready.');
    return;
  }

  // ---- SQL (SQLite in-browser) ---------------------------------------------
  if (lang === 'sql') {
    if (sqlout) sqlout.style.display = 'block';
    sqlLang.activate();
    if (hint) hint.textContent = 'Write SQL on the left. Results appear as a table.';
    setStatus('Ready.');
    return;
  }

  // ---- Default: Java --------------------------------------------------------
  // Keep terminal hidden until "Run" (it will unhide in runJava)
  javaLang.activate();
  if (hint) hint.textContent = 'Type into the console when your program asks for input (e.g., Scanner).';
  setStatus('Ready.');
}






async function switchLang(lang){
  current = lang;

  const hint = document.getElementById('hint');

  if (lang === 'html'){
    clearAllOutputs(true);
    showRightPane('preview');
    try{
      if (!htmlMod) htmlMod = await loadHtmlModule();
      htmlMod.activate();
      if (hint) hint.textContent = 'HTML preview is shown on the right.';
    }catch(e){
      console.error('Failed to load html module:', e);
      // fallback: switch editor mode + show a basic preview (your code already does this)
      setLanguage('html');
      setValue('<!doctype html><html><body><h2>Hello, HTML!</h2></body></html>');
      const preview = document.getElementById('preview');
      if (preview){
        preview.srcdoc = '<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">HTML module failed to load. A fallback preview is shown.</body></html>';
      }
    }
    setStatus('Ready.');
    return;
  }

  if (lang === 'sql'){
    clearAllOutputs(true);
    showRightPane('sqlout');
    sqlLang.activate();                // your SQL init
    setStatus('Ready.');
    return;
  }

  // default: Java
  clearAllOutputs(true);
  showRightPane('term');
  javaLang.activate();
  if (hint) hint.textContent = 'Type into the console when your program asks for input (e.g., Scanner).';
  setStatus('Ready.');
}












// ---------- Run / Stop -------------------------------------------------------
async function run() {
   clearByLanguage(false);    // start from a blank output for this run
  resetEditClearArming();    // edits after this run will clear once
  
  if (current === 'html') {
    if (!htmlMod) htmlMod = await loadHtmlModule();
    return htmlMod.run();
  }
  if (current === 'sql') {
    return sqlLang.run();
  }
   if (current === 'web')  {return webLang.run();
                           }
  // Java
  document.getElementById('term')?.classList.remove('hidden');
  return javaLang.runJava();
}

function stop() {
  clearTerminal();    
   if (current === 'web') { return webLang.stop();}
  if (current === 'html') { try { htmlMod?.stop?.(); } catch {} return; }
  if (current === 'sql')  { return sqlLang.stop(); }
  document.getElementById('term')?.classList.add('hidden');
  return javaLang.stopJava();
}

// ---------- Send (PNG render → upload → WhatsApp) ---------------------------
async function sendToWhatsApp() {
  try {
    setStatus('Preparing submission…');

    const sel = document.getElementById('langSel');
    const lang = (sel?.value || 'java').toUpperCase();

    // Code text
    const codeText = monaco.editor.getModels()[0].getValue();

    // Output text per language
    let outputText = '';
    if (lang === 'JAVA') {
      outputText = (javaLang.getLastOutput?.() || '').trim();
    } else if (lang === 'HTML') {
      outputText = '(HTML preview omitted)';
    } else if (lang === 'SQL') {
      outputText = (sqlLang.getLastOutput?.() || '').trim();
    }
else if (lang === 'WEB')  {outputText = '(HTML+CSS+JS preview omitted)';  // new
                          }

      
    // Student identity (remembered once)
    const key = 'polycode_student';
    let student = localStorage.getItem(key) || '';
    if (!student) {
      student = prompt('Enter your name / roll:', '') || '';
      if (student) localStorage.setItem(key, student);
    }

    // 1) Render PNG locally (no html2canvas)
    const screenshotBlob = await renderSubmissionPNG({ codeText, outputText, lang, student });

    // 2) Upload to your backend (returns public URLs)
    const { imageUrl, codeUrl } = await uploadSubmission({ screenshotBlob, codeText, student, lang });

    // 3) Copy code (optional convenience)
    try { await copyTextToClipboard(codeText); } catch {}

    // 4) Open WhatsApp with links to the teacher’s number
    const msg = `PolyCode submission
Student: ${student || '(not provided)'}
Language: ${lang}
Code: ${codeUrl}
Image: ${imageUrl}
(Your code is also on the clipboard.)`;
    openWhatsApp('919836313636', msg);

    setStatus('Ready.', 'ok');
  } catch (e) {
    console.error(e);
    setStatus('Could not prepare submission.', 'err');
    alert('Upload failed. Please try again, or paste the links manually.');
  }
}
*/

