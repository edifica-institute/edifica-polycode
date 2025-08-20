// server/python-ws.js
const express = require('express');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const { v4: uuid } = require('uuid');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const app = express();
const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Python runner WS listening on', server.address().port);
});

const wss = new WebSocketServer({ server, path: '/python' });

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

wss.on('connection', (ws) => {
  let proc = null;
  let tmpDir = null;
  let killTimer = null;

  const safeClose = () => {
    try { ws.close(); } catch {}
  };

  const cleanup = () => {
    if (killTimer) { clearTimeout(killTimer); killTimer = null; }
    if (proc) {
      try { proc.kill(); } catch {}
      proc = null;
    }
    if (tmpDir) {
      fs.remove(tmpDir).catch(()=>{});
      tmpDir = null;
    }
  };

  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === 'run') {
      // ensure single process per socket
      cleanup();

      try {
        tmpDir = path.join(os.tmpdir(), 'py-' + uuid());
        await fs.ensureDir(tmpDir);
        const file = path.join(tmpDir, 'main.py');
        await fs.writeFile(file, String(msg.code ?? ''), 'utf8');

        // Spawn PTY: unbuffered (-u) so prints come immediately
        proc = pty.spawn('python3', ['-u', file], {
          name: 'xterm-color',
          cols: 120, rows: 30,
          cwd: tmpDir,
          env: process.env,
        });

        ws.send(JSON.stringify({ type: 'status', message: 'started' }));

        proc.onData((chunk) => {
          ws.send(JSON.stringify({ type: 'stdout', data: chunk }));
        });

        proc.onExit(({ exitCode }) => {
          ws.send(JSON.stringify({ type: 'exit', code: exitCode ?? 0 }));
          cleanup();
        });

        // Safety timeout (e.g., 15s). Adjust to your needs.
        killTimer = setTimeout(() => {
          try { proc.kill(); } catch {}
        }, 15000);

      } catch (e) {
        ws.send(JSON.stringify({ type: 'stderr', data: 'Spawn error: ' + (e?.message || e) }));
        ws.send(JSON.stringify({ type: 'exit', code: 1 }));
        cleanup();
      }
      return;
    }

    if (msg.type === 'stdin' && proc) {
      // forward keystrokes to process; PTY handles line discipline
      try { proc.write(String(msg.data ?? '')); } catch {}
      return;
    }

    if (msg.type === 'stop') {
      cleanup();
      ws.send(JSON.stringify({ type: 'exit', code: 130 }));
      return;
    }
  });

  ws.on('close', cleanup);
  ws.on('error', () => { cleanup(); safeClose(); });
});
