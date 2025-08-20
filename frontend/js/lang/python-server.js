// frontend/js/lang/python-server.js
import { setLanguage, setValue, getValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';
import { clearTerminal, getTerminal } from '../core/terminal.js';
import { WS_BASE } from '../config.js';

const SAMPLE = `# Python (server, interactive)
print("Hello World")
x = int(input("enter"))
y = int(input("enter"))
z = int(input("enter"))
print(x, y, z)
`;

let ws = null;
let onKeyDispose = null;
let lastOut = '';

export function getLastOutput(){ return lastOut; }

export function activate() {
  setLanguage('python');
  setValue(SAMPLE);
  setStatus('Ready.');
}

function cleanup(term) {
  try { onKeyDispose?.dispose?.(); } catch {}
  onKeyDispose = null;
  try { ws?.close?.(); } catch {}
  ws = null;
  term?.write?.('\r\n'); // neat line break after exit
}

export async function run() {
  const term = getTerminal();
  clearTerminal(true);
  lastOut = '';

  setStatus('Connecting…');

  // IMPORTANT: Adjust the path below if your Java runner uses a specific WS path
  // For example, if Java connects to `${WS_BASE}/java`, you likely want `${WS_BASE}/python`
  const url = `${WS_BASE.replace(/^http/, 'ws')}/python`;

  try {
    ws = new WebSocket(url);
  } catch (e) {
    setStatus('WebSocket failed to open.', 'err');
    term.write(('WebSocket error: ' + (e?.message || e)).replace(/\n/g, '\r\n'));
    return;
  }

  ws.onopen = () => {
    setStatus('Running… (type into the console)');
    const code = getValue();
    ws.send(JSON.stringify({ type: 'run', lang: 'python', code }));
    // Pipe user keystrokes to the process stdin on the server
    onKeyDispose = term.onData((data) => {
      // Send exactly what user typed; server PTY handles line buffering
      try { ws.send(JSON.stringify({ type: 'stdin', data })); } catch {}
    });
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    switch (msg.type) {
      case 'stdout': {
        const text = String(msg.data ?? '').replace(/\n/g, '\r\n');
        term.write(text);
        lastOut += String(msg.data ?? '');
        break;
      }
      case 'stderr': {
        const text = String(msg.data ?? '').replace(/\n/g, '\r\n');
        term.write(text);
        lastOut += String(msg.data ?? '');
        break;
      }
      case 'status':
        setStatus(String(msg.message || 'Status…'));
        break;

      case 'exit': {
        const code = msg.code ?? 0;
        setStatus(`Execution finished (exit ${code})`, code === 0 ? 'ok' : 'err');
        cleanup(term);
        break;
      }

      // Optional: server can notify it's waiting for input (purely informational)
      case 'awaiting-input':
        setStatus('Program waiting for input…');
        break;
    }
  };

  ws.onerror = () => {
    setStatus('WebSocket error', 'err');
    cleanup(term);
  };

  ws.onclose = () => {
    // If it closes without an 'exit' message, still clean up
    cleanup(term);
  };
}

export function stop() {
  const term = getTerminal();
  try { ws?.send?.(JSON.stringify({ type: 'stop' })); } catch {}
  setStatus('Stopped.', 'err');
  cleanup(term);
}
