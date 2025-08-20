// frontend/js/lang/python-remote.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal, getTerminal } from '../core/terminal.js';

const SAMPLE = `# Python (remote)
# Enter multiple inputs in the popup as separate lines.
# Example program expecting three lines of input:
a = input()
b = input()
c = input()
print("You typed:", a, b, c)
`;

let lastOut = '';
export function getLastOutput(){ return lastOut; }

/* -------------------------- stdin modal (one-time) ------------------------- */
let stdinModalEl = null;
function ensureStdinModal() {
  if (stdinModalEl) return stdinModalEl;

  const wrap = document.createElement('div');
  wrap.id = 'stdinModal';
  wrap.style.cssText = `
    position: fixed; inset: 0; display: none; z-index: 10000;
    align-items: center; justify-content: center;
    background: rgba(0,0,0,0.45);
    font-family: system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: min(680px, 92vw); max-height: 85vh; overflow: hidden;
    background: #0b1220; color: #e5e7eb; border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.08);
  `;

  panel.innerHTML = `
    <div style="padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; gap:10px;">
      <div style="font-weight:600;">Program stdin</div>
      <div style="margin-left:auto; opacity:.75; font-size:12px;">Each line =&gt; one <code>input()</code></div>
    </div>
    <div style="padding:12px;">
      <textarea id="stdinArea" spellcheck="false"
        style="width:100%; height: 220px; resize: vertical; background:#0f172a; color:#e5e7eb; border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:10px; outline:none;"></textarea>
      <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
        <label style="font-size:13px; display:flex; align-items:center; gap:6px;">
          <input id="stdinRemember" type="checkbox" />
          Remember for next run
        </label>
        <div style="margin-left:auto; display:flex; gap:8px;">
          <button id="stdinCancel" style="padding:8px 12px; border-radius:8px; background:#1f2937; color:#e5e7eb; border:1px solid rgba(255,255,255,.08);">Cancel</button>
          <button id="stdinRun" style="padding:8px 12px; border-radius:8px; background:#2563eb; color:white; border:0;">Run</button>
        </div>
      </div>
    </div>
  `;

  wrap.appendChild(panel);
  document.body.appendChild(wrap);

  stdinModalEl = wrap;
  return wrap;
}

function collectStdin() {
  return new Promise((resolve, reject) => {
    const el = ensureStdinModal();
    const area = el.querySelector('#stdinArea');
    const remember = el.querySelector('#stdinRemember');
    const btnRun = el.querySelector('#stdinRun');
    const btnCancel = el.querySelector('#stdinCancel');

    // preload remembered stdin
    const key = 'polycode_python_stdin';
    const saved = localStorage.getItem(key) || '';
    area.value = saved;
    remember.checked = !!saved;

    const close = () => { el.style.display = 'none'; };
    const run = () => {
      const val = area.value || '';
      if (remember.checked) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
      close();
      resolve(val);
    };

    btnRun.onclick = run;
    btnCancel.onclick = () => { close(); reject(new Error('cancelled')); };
    el.onclick = (e) => { if (e.target === el) { close(); reject(new Error('cancelled')); } };

    el.style.display = 'flex';
    area.focus();
  });
}

/* ------------------------------- language API ------------------------------ */
export function activate(){
  setLanguage('python');
  setValue(SAMPLE);
  setStatus('Ready.');
}

export async function run(){
  const term = getTerminal();
  clearTerminal(true);
  lastOut = '';

  try {
    // Ask for multi-line stdin up-front (one blob for the whole run)
    const stdin = await collectStdin();

    setStatus('Running on remote sandbox…');

    const code = getValue();

    // Piston execute API (no auth required)
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
    if (String(err?.message || err) === 'cancelled') {
      setStatus('Run cancelled.', 'err');
      return;
    }
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
