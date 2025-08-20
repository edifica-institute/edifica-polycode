// frontend/js/lang/python-remote.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal, getTerminal } from '../core/terminal.js';

const SAMPLE = `# Python (remote)
# Type inputs in the input box below the console (one line per input()).
print('Hello World')
x = int(input('enter'))   # line 1
y = int(input('enter'))   # line 2
z = int(input('enter'))   # line 3
print(x, y, z)
`;

let lastOut = '';
export function getLastOutput(){ return lastOut; }

/* ------------------------------- stdin dock ------------------------------- */
const LS_KEY = 'polycode_python_stdin';
let dock; // root element

function setSurfacesBottom(px) {
  ['term','preview','sqlout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.bottom = px + 'px';
  });
}

function ensureDock() {
  if (dock && document.body.contains(dock)) return dock;

  const ow = document.getElementById('outputWrapper');
  if (!ow) return null;

  dock = document.createElement('div');
  dock.id = 'stdinDock';
  dock.style.cssText = `
    position: absolute; left:0; right:0; bottom:0;
    background:#0b1220; border-top:1px solid rgba(255,255,255,.08);
    z-index: 5; color:#e5e7eb; font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  `;
  dock.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; padding:6px 10px;">
      <strong style="font-size:12px; letter-spacing:.2px; opacity:.85">input</strong>
      <span style="font-size:12px; opacity:.6">Each line =&gt; one <code>input()</code></span>
      <span style="margin-left:auto; display:flex; gap:8px;">
        <label style="font-size:12px; display:inline-flex; align-items:center; gap:6px; opacity:.85;">
          <input id="stdinRemember" type="checkbox"> remember
        </label>
        <button id="stdinClear" style="font-size:12px; padding:4px 8px; border-radius:6px; background:#1f2937; color:#e5e7eb; border:1px solid rgba(255,255,255,.08);">Clear</button>
      </span>
    </div>
    <div style="padding:0 10px 8px 10px;">
      <textarea id="stdinBox" spellcheck="false"
        placeholder="Type inputs here, one per line…"
        style="width:100%; height:110px; resize:vertical; min-height:60px; max-height:40vh;
               background:#0f172a; color:#e5e7eb; border:1px solid rgba(255,255,255,.08);
               border-radius:8px; padding:8px; outline:none;"></textarea>
    </div>
  `;
  ow.appendChild(dock);

  const box = dock.querySelector('#stdinBox');
  const rem = dock.querySelector('#stdinRemember');
  const clr = dock.querySelector('#stdinClear');

  // preload remembered value
  const saved = localStorage.getItem(LS_KEY) || '';
  box.value = saved;
  rem.checked = !!saved;

  rem.addEventListener('change', () => {
    if (rem.checked) localStorage.setItem(LS_KEY, box.value);
    else localStorage.removeItem(LS_KEY);
  });
  box.addEventListener('input', () => {
    if (rem.checked) localStorage.setItem(LS_KEY, box.value);
  });
  clr.addEventListener('click', () => {
    box.value = '';
    if (rem.checked) localStorage.setItem(LS_KEY, '');
  });

  // push terminal/preview up to make room
  setSurfacesBottom(dock.offsetHeight);

  // also adjust on manual resize of the textarea
  let ro;
  try {
    ro = new ResizeObserver(() => setSurfacesBottom(dock.offsetHeight));
    ro.observe(box);
  } catch { /* ResizeObserver not supported */ }

  return dock;
}

function showDock(show) {
  const d = ensureDock();
  if (!d) return;
  d.style.display = show ? 'block' : 'none';
  setSurfacesBottom(show ? d.offsetHeight : 0);
}

function readStdin() {
  const d = ensureDock();
  const box = d?.querySelector('#stdinBox');
  if (!box) return '';
  // normalize CRLF -> LF
  return (box.value || '').replace(/\r\n/g, '\n');
}

/* ------------------------------- language API ------------------------------ */
export function activate(){
  setLanguage('python');
  setValue(SAMPLE);
  setStatus('Ready.');
  showDock(true);
}

export function deactivate(){
  showDock(false);
}

export async function run(){
  const term = getTerminal();
  clearTerminal(true);
  lastOut = '';

  try {
    const stdin = readStdin();
    setStatus('Running on remote sandbox…');

    const code = getValue();

    // Piston execute API
    const resp = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        version: '3.10.0',
        files: [{ name: 'main.py', content: code }],
        stdin,
        args: [],
        compile_timeout: 10000,
        run_timeout: 10000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error('Remote run failed: ' + resp.status + ' ' + t);
    }

    const data = await resp.json(); // { run: { stdout, stderr, code } ... }
    const out = (data.run?.stdout || '') + (data.run?.stderr || '');
    const exit = data.run?.code ?? 0;

    const s = (out || '\n').replace(/\n/g, '\r\n');
    term?.write(s);
    lastOut += out;

    setStatus(`Execution finished (exit ${exit})`, exit === 0 ? 'ok' : 'err');
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    term?.write(('\r\n' + msg + '\r\n').replace(/\n/g, '\r\n'));
    lastOut += '\n' + msg + '\n';
    setStatus('Remote error', 'err');
  }
}

export function stop(){
  // Remote runs are atomic; nothing to kill client-side
  setStatus('Stopped.', 'err');
}
