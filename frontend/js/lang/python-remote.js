// frontend/js/lang/python_remote.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal, getTerminal } from '../core/terminal.js';

const SAMPLE = `# Python (remote)
name = input("Your name: ")
print("Hello,", name)
print("Sum:", sum([1,2,3]))
`;

export function activate() {
  setLanguage('python');
  setValue(SAMPLE);
  setStatus('Ready.');
}

export async function run() {
  const term = getTerminal();
  clearTerminal(true);
  setStatus('Running on remote sandbox…');
  try {
    const code = getValue();

    // For simplicity, collect stdin once (remote APIs aren't interactive)
    let stdin = '';
    try { stdin = window.prompt('Optional stdin (will be fed once):', '') || ''; } catch {}

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

    const data = await resp.json(); // { run: { stdout, stderr, code }, compile: { ... } }
    const out = (data.run?.stdout || '') + (data.run?.stderr || '');
    const exit = data.run?.code ?? 0;

    term?.write((out || '\n').replace(/\n/g, '\r\n'));
    setStatus(`Execution finished (exit ${exit})`, exit === 0 ? 'ok' : 'err');
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    term?.write(('\r\n' + msg + '\r\n').replace(/\n/g, '\r\n'));
    setStatus('Remote error', 'err');
  }
}

export function stop() {
  // Remote runs are atomic; nothing to kill client-side
  setStatus('Stopped.', 'err');
}
