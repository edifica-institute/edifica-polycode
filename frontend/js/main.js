// frontend/js/main.js

import { initMonaco, setLanguage, setValue /*, clearMarkers */ } from './core/editor.js';
import { initTerminal, clearTerminal } from './core/terminal.js';
import {
  setStatus, initSplitter, fitLayoutHeight,
  uploadSubmission, copyTextToClipboard, openWhatsApp,
  clearPreview, clearSqlOutput, renderSubmissionPNG
} from './core/ui.js';

import * as javaLang from './lang/java.js';
import * as sqlLang  from './lang/sql.js';
import * as webLang  from './lang/web.js';
// NOTE: we will load Python runners dynamically to avoid 404/MIME issues.
// import * as pythonLang from './lang/python.js';
// import * as pythonRemote from './lang/python_remote.js';

/* ============================================================================
   SELECT YOUR PYTHON BACKEND HERE
   false -> use in-browser Pyodide  (./lang/python.js)  [default, stable]
   true  -> use remote sandbox      (./lang/python_remote.js)
============================================================================ */
const USE_REMOTE_PYTHON = true;

// Cache for the chosen Python module once loaded
let pyMod = null;

async function loadPythonModule() {
  if (pyMod) return pyMod;
  if (USE_REMOTE_PYTHON) {
    // Try remote; surface a nice status if missing
    try {
      pyMod = await import('./lang/python_remote.js');
    } catch (e) {
      setStatus('Python remote runner not found. Using Pyodide instead.', 'err');
      pyMod = await import('./lang/python.js');
    }
  } else {
    pyMod = await import('./lang/python.js');
  }
  return pyMod;
}

/* ============================================================================
   Safety hot-patch for ErrorStackParser "default.parse" shape
   Prevents crashes like: G.default.parse is not a function
   (Guarded: runs only if RequireJS is available; also normalizes global)
============================================================================ */
(function normalizeESP() {
  try {
    if (typeof window.require === 'function') {
      window.require(['error-stack-parser'], function (ESP) {
        try {
          if (ESP && !ESP.default) ESP.default = ESP;
          if (ESP && typeof ESP.parse === 'function' && ESP.default && !ESP.default.parse) {
            ESP.default.parse = ESP.parse;
          }
        } catch {}
      }, function(){});
    }
    const G = window.ErrorStackParser;
    if (G && typeof G.parse === 'function') {
      if (!G.default || !G.default.parse) G.default = G;
    }
  } catch {}
})();

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
  const isWeb  = (lang === 'web');
  const isHtml = (lang === 'html');
  const isSql  = (lang === 'sql');
  const isPy   = (lang === 'python');

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
  } else if (isPy)  {
    showRightPane('term');
  } else {
    showRightPane('term'); // Java & others
  }
}

// ---------------------------------------------------------------------------
// SILENT CLEAR HELPERS
// ---------------------------------------------------------------------------
function clearByLanguage(full = false) {
  if (current === 'java' || current === 'python') {
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

  if (lang === 'python') {
    const py = await loadPythonModule();
    py.activate();
    if (hint) hint.textContent = USE_REMOTE_PYTHON
      ? 'Running on remote sandbox. Optional one-shot stdin will be prompted.'
      : 'Use print() / input(). Output appears in the console.';
    setStatus('Ready.');
    return;
  }

  if (lang === 'web') {
    // HTML+CSS+JS 3-pane
    webLang.activate();
    setTimeout(() => webLang.layoutEditors?.(), 0);
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

  if (current === 'python') {
    document.getElementById('term')?.classList.remove('hidden');
    showRightPane('term');
    const py = await loadPythonModule();
    return py.run();
  }

  if (current === 'web')  return webLang.run();
  if (current === 'html') { if (!htmlMod) htmlMod = await loadHtmlModule(); return htmlMod.run(); }
  if (current === 'sql')  return sqlLang.run();

  // Java
  document.getElementById('term')?.classList.remove('hidden');
  showRightPane('term');                    // ensure the terminal is visible
  return javaLang.runJava();
}

async function stop() {
  // Always clear the visible terminal area silently
  clearTerminal();

  if (current === 'web')  return webLang.stop();
  if (current === 'html') { try { htmlMod?.stop?.(); } catch {} return; }
  if (current === 'sql')  return sqlLang.stop();

  if (current === 'python') {
    const py = await loadPythonModule();
    return py.stop();
  }
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
    } else if (lang === 'PYTHON') {
      const py = await loadPythonModule();
      outputText = (py.getLastOutput?.() || '').trim();
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
