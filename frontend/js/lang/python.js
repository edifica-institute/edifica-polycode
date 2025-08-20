// frontend/js/lang/python.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal, getTerminal } from '../core/terminal.js';

let pyodide = null;
let ready = null;
let lastOut = '';
function appendOut(s){ lastOut += s; }
export function getLastOutput(){ return lastOut; }

function loadScript(src){
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Failed to load '+src));
    document.head.appendChild(s);
  });
}

async function ensurePyodide(){
  if (ready) return ready;
  // Load Pyodide from CDN
  await loadScript('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');

  ready = window.loadPyodide();
  pyodide = await ready;

  // Bridge stdout/stderr to terminal
  // Expose a JS writer for Python to call: from js import __term_write
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

# Basic input() support via browser prompt
from js import window as _win
builtins.input = lambda prompt="": (_win.prompt(prompt) if _win else "")
  `);

  return pyodide;
}

// Starter snippet
const SAMPLE = `# Python sample
name = input("Your name: ")
print("Hello,", name)
nums = [1,2,3]
print("Sum:", sum(nums))
`;

export function activate(){
  setLanguage('python');     // Monaco syntax
  setValue(SAMPLE);
  setStatus('Ready.');
}

export async function run(){
  try{
    await ensurePyodide();
    clearTerminal(true);
    lastOut = '';

    const code = getValue();
    setStatus('Running Python…');
    // runPythonAsync so we don't block UI
    await pyodide.runPythonAsync(code);
    setStatus('Execution Success! (Exit Code - 0)', 'ok');
  }catch(err){
    // Show error in terminal & status
    const term = getTerminal();
    const msg = ((err && err.message) ? err.message : String(err));
    
    term?.write(('\r\n' + msg + '\r\n').replace(/\n/g, '\r\n'));
    appendOut('\n' + msg + '\n');
    setStatus('Python error', 'err');
  }
}

export function stop(){
  // Pyodide doesn't support force-kill in main thread; we "reset" by reloading on next run if needed.
  setStatus('Stopped.', 'err');
}
