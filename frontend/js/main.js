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


// js/main.js
import { initMonaco } from './core/editor.js';
import { initTerminal } from './core/terminal.js';
import { setStatus } from './core/ui.js';
import { runJava, stopJava } from './lang/java.js';
import * as htmlLang from './lang/html.js';   // <-- add this line

let current = 'java';                         // <-- track current language

window.addEventListener('DOMContentLoaded', async () => {
  await initMonaco();
  initTerminal();
  setStatus("Ready.");

  document.getElementById('runBtn').onclick  = run;
  document.getElementById('stopBtn').onclick = stop;

  // Keyboard shortcut bubbled from editor
  window.addEventListener('polycode:run', run);

  // Language dropdown wiring
  const sel = document.getElementById('langSel');
  if (sel) {
    sel.onchange = () => switchLang(sel.value);
  }
});

async function switchLang(lang){
  current = lang;

  // Toggle term/preview visibility (HTML shows preview)
  const term    = document.getElementById('term');
  const preview = document.getElementById('preview');
  if (term)    term.style.display    = (lang === 'java') ? 'block' : 'none';
  if (preview) preview.style.display = (lang === 'html') ? 'block' : 'none';

  if (lang === 'html') {
    htmlLang.activate();
  } else {
    // Back to Java (no extra activate needed; your Java page already defaults to Java)
    setStatus("Ready.");
  }
}

async function run(){
  if (current === 'html') return htmlLang.run();
  return runJava();
}

function stop(){
  if (current === 'html') return htmlLang.stop();
  return stopJava();
}
