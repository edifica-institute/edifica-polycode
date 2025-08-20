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
  await loadScript('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
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
import sys,
