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
  if (term)    term.style.display    = (lang === 'java') ? 'block' : 'none';
  if (preview) preview.style.display = (lang === 'html') ? 'block' : 'none';

  if (lang === 'html') {
    if (!htmlMod) htmlMod = await import('./lang/html.js');
    htmlMod.activate();
  } else {
    setStatus("Ready.");
  }
}

async function run(){
  if (current === 'html') {
    if (!htmlMod) htmlMod = await import('./lang/html.js');
    return htmlMod.run();
  }
  return runJava();
}

function stop(){
  if (current === 'html') { htmlMod?.stop?.(); return; }
  return stopJava();
}
