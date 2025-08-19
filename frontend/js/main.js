/*import { initMonaco } from './core/editor.js';
import { initTerminal } from './core/terminal.js';
import { setStatus } from './core/ui.js';
import { runJava, stopJava } from './lang/java.js';

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();     // editor + theme + Ctrl/Cmd+Enter
  initTerminal();         // xterm in #term
  setStatus("Ready.");

  document.getElementById('runBtn').onclick  = runJava;
  document.getElementById('stopBtn').onclick = stopJava;

  // Keyboard shortcut bubbles from editor via CustomEvent
  window.addEventListener('polycode:run', runJava);
});*/


/*
// js/main.js
import { initMonaco, setLanguage, setValue } from './core/editor.js';
import { initTerminal } from './core/terminal.js';
import { setStatus } from './core/ui.js';
import { runJava, stopJava } from './lang/java.js';

let current = 'java';
let htmlMod = null;

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  setStatus("Ready.");

  document.getElementById('runBtn').onclick  = run;
  document.getElementById('stopBtn').onclick = stop;

  window.addEventListener('polycode:run', run);

  const sel = document.getElementById('langSel');
  if (sel) sel.onchange = () => switchLang(sel.value);
});

async function switchLang(lang){
  current = lang;

  const term    = document.getElementById('term');
  const preview = document.getElementById('preview');
  const hint    = document.getElementById('hint') || document.querySelector('.note:last-of-type');

  // default visibilities
  if (term)    term.style.display    = (lang === 'java') ? 'block' : 'none';
  if (preview) preview.style.display = (lang === 'html') ? 'block' : 'none';

  if (lang === 'html') {
    try {
      // lazy-load the module so a load error won't block Monaco
      if (!htmlMod) htmlMod = await import('./lang/html.js');
      htmlMod.activate();
      if (hint) hint.textContent = "HTML preview is shown on the right.";
    } catch (e) {
      console.error('Failed to load html module:', e);
      // Fallback: still switch the editor & show preview
      setLanguage('html');
      setValue(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body><h2>Hello, HTML!</h2></body></html>`);
      if (preview) preview.srcdoc = `<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">HTML module failed to load. A fallback preview is shown.</body></html>`;
      if (hint) hint.textContent = "HTML preview is shown on the right.";
      setStatus("Ready.");
    }
  } else {
    // back to Java
    if (hint) hint.textContent = "Type into the console when your program asks for input (e.g., Scanner).";
    setStatus("Ready.");
  }
}

async function run(){
  if (current === 'html') {
    try {
      if (!htmlMod) htmlMod = await import('./lang/html.js');
      return htmlMod.run();
    } catch (e) {
      // last-resort: render whatever is in the editor
      const preview = document.getElementById('preview');
      if (preview) {
        setStatus("Rendering HTML (fallback)…","ok");
        const code = monaco.editor.getModels()[0].getValue();
        preview.srcdoc = /<html[\s\S]*<\/html>/i.test(code)
          ? code
          : `<!doctype html><html><body>${code}</body></html>`;
      }
      return;
    }
  }
  return runJava();
}

function stop(){
  if (current === 'html') {
    try { htmlMod?.stop?.(); } catch {}
    return;
  }
  return stopJava();
}












// js/main.js
import { initMonaco, setLanguage, setValue } from './core/editor.js';
import { initTerminal } from './core/terminal.js';
import {
  setStatus, initSplitter, captureAreaAsBlob, copyTextToClipboard, openWhatsApp, uploadSubmission
} from './core/ui.js';
import * as javaLang from './lang/java.js';   // ← namespace import
let current = 'java';
let htmlMod = null;




// ...rest of your imports

// Inside DOMContentLoaded

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  setStatus("Ready.");

  document.getElementById('runBtn').onclick  = run;
  document.getElementById('stopBtn').onclick = stop;
  window.addEventListener('polycode:run', run);

  const sel = document.getElementById('langSel');
  if (sel) sel.onchange = () => switchLang(sel.value);
});

async function loadHtmlModule() {
  const url = new URL('./lang/html.js', import.meta.url);
  return import(url.href);
}

async function switchLang(lang){
  current = lang;

  const term    = document.getElementById('term');
  const preview = document.getElementById('preview');

  if (lang === 'html') {
    if (term) term.style.display = 'none';
    if (preview) preview.style.display = 'block';
    try {
      if (!htmlMod) htmlMod = await loadHtmlModule();
      htmlMod.activate();
    } catch (e) {
      console.error('Failed to load html module:', e);
      // Fallback: still switch editor & show preview
      try {
        setLanguage('html');
        setValue(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body><h2>Hello, HTML!</h2></body></html>`);
      } catch {}
      if (preview) preview.srcdoc = `<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">HTML module failed to load. A fallback preview is shown.</body></html>`;
      const hint = document.getElementById('hint'); if (hint) hint.textContent = "HTML preview is shown on the right.";
      setStatus("Ready.");
    }
    return;
  }

  // Back to Java: show terminal, reset Java code & hint
  javaLang.activate();
}
async function run(){
  if (current === 'html') {
    if (!htmlMod) htmlMod = await loadHtmlModule();
    return htmlMod.run();
  }
  return javaLang.runJava();
}
function stop(){
  if (current === 'html') { htmlMod?.stop?.(); return; }
  return javaLang.stopJava();
}



document.getElementById('sendBtn')?.addEventListener('click', sendToWhatsApp);

async function sendToWhatsApp(){
  try {
    setStatus("Preparing submission…");
    // 1) Capture screenshot of the whole workspace
    const screenshotBlob = await captureAreaAsBlob();

    // 2) Grab code text from Monaco
    const codeText = monaco.editor.getModels()[0].getValue();
    const lang = (document.getElementById('langSel')?.value || 'java').toUpperCase();

    // 3) Optional: ask for student name once, remember in localStorage
    const key = 'polycode_student';
    let student = localStorage.getItem(key) || '';
    if (!student) {
      student = prompt("Enter your name / roll:", "") || '';
      if (student) localStorage.setItem(key, student);
    }

    // 4) Upload to R2 via your Pages Function
    const { imageUrl, codeUrl } = await uploadSubmission({ screenshotBlob, codeText, student, lang });

    // 5) Copy code to clipboard (handy for pasting)
    try { await copyTextToClipboard(codeText); } catch {}

    // 6) Open WhatsApp with links
    const msg = `PolyCode submission
Student: ${student || '(not provided)'}
Language: ${lang}
Code: ${codeUrl}
Screenshot: ${imageUrl}
(Your code is also on the clipboard.)`;

    openWhatsApp("919836313636", msg); // <-- teacher number
    setStatus("Ready.", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Could not prepare submission.", "err");
    alert("Upload failed. Please try again, or attach the downloaded screenshot and paste code manually.");
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  initSplitter();          // ← make sure this line exists
  setStatus("Ready.");
  // ...
}); */
























//new

// js/main.js
import { initMonaco, setLanguage, setValue } from './core/editor.js';
import { initTerminal } from './core/terminal.js';
import {
  setStatus, initSplitter, fitLayoutHeight, captureAreaAsBlob,
  copyTextToClipboard, openWhatsApp, uploadSubmission
} from './core/ui.js';
import * as javaLang from './lang/java.js';

let current = 'java';
let htmlMod = null;

window.addEventListener('DOMContentLoaded', async () => {
  // Init once
  await initMonaco();
  initTerminal();
  initSplitter();
  fitLayoutHeight();
  setStatus("Ready.");

  // Wire buttons
  document.getElementById('runBtn')?.addEventListener('click', run);
  document.getElementById('stopBtn')?.addEventListener('click', stop);
  document.getElementById('sendBtn')?.addEventListener('click', sendToWhatsApp);

  // Keyboard shortcut from editor
  window.addEventListener('polycode:run', run);

  // Language switcher
  const sel = document.getElementById('langSel');
  if (sel) sel.addEventListener('change', () => switchLang(sel.value));
});

async function loadHtmlModule() {
  const url = new URL('./lang/html.js', import.meta.url);
  return import(url.href);
}

async function switchLang(lang){
  current = lang;
  const term    = document.getElementById('term');
  const preview = document.getElementById('preview');
  const hint    = document.getElementById('hint');

  if (lang === 'html') {
    if (term) term.style.display = 'none';
    if (preview) preview.style.display = 'block';
    try {
      if (!htmlMod) htmlMod = await loadHtmlModule();
      htmlMod.activate();
      if (hint) hint.textContent = "HTML preview is shown on the right.";
    } catch (e) {
      console.error('Failed to load html module:', e);
      try {
        setLanguage('html');
        setValue(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title></head><body><h2>Hello, HTML!</h2></body></html>`);
      } catch {}
      if (preview) preview.srcdoc =
        `<!doctype html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:20px">
          HTML module failed to load. A fallback preview is shown.
         </body></html>`;
      if (hint) hint.textContent = "HTML preview is shown on the right.";
      setStatus("Ready.");
    }
    return;
  }

  // Back to Java
  javaLang.activate();
}

async function run(){
  if (current === 'html') {
    if (!htmlMod) htmlMod = await loadHtmlModule();
    return htmlMod.run();
  }
  return javaLang.runJava();
}

function stop(){
  if (current === 'html') { try { htmlMod?.stop?.(); } catch {} return; }
  return javaLang.stopJava();
}

async function sendToWhatsApp(){
  try {
    setStatus("Preparing submission…");
    const screenshotBlob = await captureAreaAsBlob();
    const codeText = monaco.editor.getModels()[0].getValue();
    const lang = (document.getElementById('langSel')?.value || 'java').toUpperCase();

    // Ask student name once
    const key = 'polycode_student';
    let student = localStorage.getItem(key) || '';
    if (!student) {
      student = prompt("Enter your name / roll:", "") || '';
      if (student) localStorage.setItem(key, student);
    }

    const { imageUrl, codeUrl } = await uploadSubmission({ screenshotBlob, codeText, student, lang });
    try { await copyTextToClipboard(codeText); } catch {}

    const msg = `PolyCode submission
Student: ${student || '(not provided)'}
Language: ${lang}
Code: ${codeUrl}
Screenshot: ${imageUrl}
(Your code is also on the clipboard.)`;

    openWhatsApp("919836313636", msg);
    setStatus("Ready.", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Could not prepare submission.", "err");
    alert("Upload failed. Please try again, or attach the downloaded screenshot and paste code manually.");
    alert(e.message);
  }
}


