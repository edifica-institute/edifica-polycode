// frontend/js/lang/python.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal } from '../core/terminal.js';
import { getTerminal } from '../core/terminal.js'; // alias to your export

/* ------------------------------------------------------------------ */
/* 1) SHIM: make sure both 'stackframe' and 'error-stack-parser'
      exist (globals + AMD), and that BOTH .parse and .default.parse
      are callable. Doing it here guarantees it’s ready before any
      error handling runs during Python execution.                     */
/* ------------------------------------------------------------------ */
function ensureErrorParsersShim() {
  if (window.__esp_shim_done__) return;
  window.__esp_shim_done__ = true;

  // Global objects (or stubs)
  var SF = window.StackFrame || function StackFrame(props){ if (props) for (var k in props) this[k]=props[k]; };
  SF.default = SF;
  window.StackFrame = SF;

  var ESP = window.ErrorStackParser || {};
  if (typeof ESP.parse !== 'function') {
    ESP.parse = function(){ return []; };
  }
  ESP.default = ESP;
  window.ErrorStackParser = ESP;

  // AMD modules for the loader (if present)
  if (typeof define === 'function' && define.amd) {
    try { define('stackframe', [], function(){ return window.StackFrame; }); } catch {}
    try { define('error-stack-parser', ['stackframe'], function(){ return window.ErrorStackParser; }); } catch {}
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
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = res; s.onerror = () => rej(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

async function ensurePyodide(){
  if (ready) return ready;
  // Current stable; adjust if you prefer to pin another
  await loadScript('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');
  ready = window.loadPyodide();
  pyodide = await ready;

  // Bridge stdout/stderr → xterm
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
    // Make sure the shim is in place BEFORE any error can bubble
    ensureErrorParsersShim();

    await ensurePyodide();
    clearTerminal(true);
    lastOut = '';

    const code = getValue();
    setStatus('Running Python…');

    // Use Async to avoid blocking UI
    await pyodide.runPythonAsync(code);

    setStatus('Execution Success! (Exit Code - 0)', 'ok');
  }catch(err){
    // Never rethrow — keep errors local so no global overlay runs
    const term = getTerminal();
    const msg = (err && err.message) ? err.message : String(err);
    term?.write(('\r\n' + msg + '\r\n').replace(/\n/g, '\r\n'));
    appendOut('\n' + msg + '\n');
    setStatus('Python error', 'err');
  }
}

export function stop(){
  // No hard kill in main thread; next run starts clean after reset
  setStatus('Stopped.', 'err');
}
