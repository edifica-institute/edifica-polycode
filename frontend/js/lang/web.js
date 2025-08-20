// frontend/js/lang/web.js
import { setStatus } from '../core/ui.js';

let htmlEd, cssEd, jsEd;     // Monaco editors created on demand
let inited = false;
let lastOutput = '';         // for "Send" (we omit real DOM screenshot)
export function getLastOutput(){ return lastOutput; }

// Create editors inside the EXISTING nodes (#htmlEd/#cssEd/#jsEd)
// Do NOT create a new wrapper; index.html already contains #left-html.
function ensureEditors(){
  if (inited) return;

  htmlEd = monaco.editor.create(document.getElementById('htmlEd'), {
    value: `<!-- HTML -->\n<h2>Hello, Web!</h2>\n<p>Start editing HTML, CSS, and JS.</p>`,
    language: 'html',
    theme: 'plunkyDark',
    automaticLayout: true,
    minimap: { enabled:false },
    fontSize: 14
  });

  cssEd  = monaco.editor.create(document.getElementById('cssEd'), {
    value: `/* CSS */\nbody{\n  font-family:system-ui;\n  margin:24px;\n  background:#0b1220;\n  color:#e5e7eb;\n}\nh2{color:#93c5fd}`,
    language: 'css',
    theme: 'plunkyDark',
    automaticLayout: true,
    minimap: { enabled:false },
    fontSize: 14
  });

  jsEd   = monaco.editor.create(document.getElementById('jsEd'), {
    value: `// JS\nconsole.log("JS running…");\ndocument.body.insertAdjacentHTML('beforeend','<p>JS ✅</p>');`,
    language: 'javascript',
    theme: 'plunkyDark',
    automaticLayout: true,
    minimap: { enabled:false },
    fontSize: 14
  });

  // Ctrl/Cmd+Enter runs
  const runKey = monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter;
  [htmlEd, cssEd, jsEd].forEach(ed => ed.addCommand(runKey, run));

  inited = true;
}

export function activate(){
  // Ensure three editors exist (left-pane visibility is controlled by main.js)
  ensureEditors();

  // Right panel visibility (main.js also switches panes; this is harmless)
  const term = document.getElementById('term');
  const preview = document.getElementById('preview');
  const sqlout = document.getElementById('sqlout');
  term?.classList.add('hidden');
  if (sqlout) sqlout.style.display = 'none';
  if (preview) preview.style.display = 'block';

  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Edit HTML, CSS & JS. Click Run to render on the right.';
  setStatus('Ready.');
}

export function run(){
  const preview = document.getElementById('preview');
  if (!preview){ setStatus('Preview iframe missing','err'); return; }

  const html = htmlEd.getValue();
  const css  = cssEd.getValue();
  const js   = jsEd.getValue();

  setStatus('Rendering…');

  // Build sandboxed document (fresh every run)
  preview.srcdoc =
    `<!DOCTYPE html><html><head><meta charset="utf-8">
       <meta name="viewport" content="width=device-width,initial-scale=1">
       <style>${css}</style>
     </head><body>${html}
       <script>${(js || '').replace(/<\/script>/gi, '<\\/script>')}<\/script>
     </body></html>`;

  lastOutput = 'Rendered HTML + CSS + JS (preview on the right).';
  setStatus('Rendered','ok');
}

export function stop(){
  const preview = document.getElementById('preview');
  if (preview){
    preview.srcdoc =
      `<!DOCTYPE html><html><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:24px">
         Stopped.
       </body></html>`;
  }
  setStatus('Stopped.','err');
}
