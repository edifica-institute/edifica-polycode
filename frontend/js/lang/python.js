// frontend/js/lang/python.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal, getTerminal } from '../core/terminal.js';

/* ------------------------------------------------------------------ */
/* 1) Ensure error-stack-parser & stackframe are safe for AMD users    */
/*    - If AMD modules exist, patch them in place (add .default.parse) */
/*    - Else, define them. Also set window globals either way.         */
/* ------------------------------------------------------------------ */
function ensureErrorParsers() {
  // helpers
  const makeStackFrame = (obj) => {
    const SF = obj || function StackFrame(props){ if (props) for (const k in props) this[k] = props[k]; };
    SF.default = SF;                // guarantee ESM-like shape
    return SF;
  };
  const makeESP = (obj) => {
    let ESP = obj || {};
    if (typeof ESP.parse !== 'function') {
      ESP.parse = function(){ return []; }; // safe noop
    }
    ESP.default = ESP;             // guarantee ESM-like shape
    return ESP;
  };

  // always put globals in a good state
  window.StackFrame = makeStackFrame(window.StackFrame);
  window.ErrorStackParser = makeESP(window.ErrorStackParser);

  const req = (typeof window.require === 'function') ? window.require : null;
  const def = (typeof window.define === 'function' && window.define.amd) ? window.define : null;

  // If AMD has the module already, patch the actual cached object
  if (req && typeof req === 'function' && req.defined) {
    try {
      if (req.defined('stackframe')) {
        req(['stackframe'], (mod) => {
          try {
            // mutate object in-place so all holders see the change
            const good = makeStackFrame(mod && (mod.default || mod));
            mod.default = good.default; // ensure .default exists
            // some builds export the function itself; that's fine
          } catch {}
        });
      }
      if (req.defined('error-stack-parser')) {
        req(['error-stack-parser'], (mod) => {
          try {
            const target = (mod && (mod.default || mod));
            const good = makeESP(target);
            // mutate existing object
            mod.parse = good.parse;
            mod.default = good;    // now mod.default.parse is a function
          } catch {}
        });
      }
    } catch {} // ignore if this flavour of require doesn't expose .defined
  }

  // If AMD is present and modules are NOT defined, define them
  if (def) {
    try { def('stackframe', [], () => window.StackFrame); } catch {}
    try { def('error-stack-parser', ['stackframe'], () => window.ErrorStackParser); } catch {}
  }
}

/* ------------------------------------------------------------------ */
/* 2) Pyodide loader                                                   */
/* ------------------------------------------------------------------ */
let pyodide = null;
let ready = null;
let lastOut = '';
function appendOut(s){ lastOut += s; }
export function getLastOutput(){ return lastOut; }

function loadScript(src){
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = res;
    s.onerror = () => rej(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

async function ensurePyodide(){
  if (ready) return ready;
  // Stable as of now; pin if you like
  await loadScript('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');
  ready = window.loadPyodide();
  pyodide = await ready;

  // Bridge stdout/stderr to xterm
  const term = getTerminal();
  window.__term_write = (text) => {
    const s = String(text ?? '');
    term?.write(s.replace(/\n/g, '\r\n'));
    appendOut(s);
  };

  await pyodide.runPython(`
import sys, builtins
from js import __term_write as _w
class _W:
  def write(self, s): _w(s)
  def flush(self): pass
sys.stdout = _W()
sys.stderr = _W()
del _W, _w

# input() via prompt()
from js import window as _win
builtins.input = lambda prompt="": (_win.prompt(prompt) if _win else "")
`);
  return pyodide;
}

/* ------------------------------------------------------------------ */
/* 3) Language API                                                     */
/* ------------------------------------------------------------------ */
const SAMPLE = `# Python sample
name = input("Your name: ")
print("Hello,", name)
nums = [1, 2, 3]
print("Sum:", sum(nums))
`;

export function activate(){
  setLanguage('python');
  setValue(SAMPLE);
  setStatus('Ready.');
}

export async function run(){
  try{
    // Make sure parsers are safe BEFORE any error overlay tries to parse
    ensureErrorParsers();

    await ensurePyodide();
    clearTerminal(true);
    lastOut = '';

    const code = getValue();
    setStatus('Running Python…');

    await pyodide.runPythonAsync(code);

    setStatus('Execution Success! (Exit Code - 0)', 'ok');
  }catch(err){
    // Keep errors local; show in terminal; don't rethrow
    const term = getTerminal();
    const msg = (err && err.message) ? err.message : String(err);
    term?.write(('\r\n' + msg + '\r\n').replace(/\n/g, '\r\n'));
    appendOut('\n' + msg + '\n');
    setStatus('Python error', 'err');
  }
}

export function stop(){
  setStatus('Stopped.', 'err');
}
