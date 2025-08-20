// server/python-ws.js
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuid } = require('uuid');

module.exports = function attachPythonWS(server) {
  const wss = new WebSocketServer({ server, path: '/python' });

  wss.on('connection', (ws) => {
    let proc = null, tmpDir = null, killTimer = null;

    const cleanup = () => {
      if (killTimer) { clearTimeout(killTimer); killTimer = null; }
      try { proc?.kill(); } catch {}
      proc = null;
      if (tmpDir) fs.remove(tmpDir).catch(()=>{});
      tmpDir = null;
    };

    ws.on('message', async (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'run') {
        cleanup();
        try {
          // Write code to a temp file
          tmpDir = path.join(os.tmpdir(), 'py-' + uuid());
          await fs.ensureDir(tmpDir);
          const file = path.join(tmpDir, 'main.py');
          await fs.writeFile(file, String(msg.code ?? ''), 'utf8');

          // -u = unbuffered so prints show immediately (interactive)
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

          // safety timeout (adjust as you like)
          killTimer = setTimeout(() => { try { proc.kill(); } catch {} }, 15000);
        } catch (e) {
          ws.send(JSON.stringify({ type: 'stderr', data: 'Spawn error: ' + (e?.message || e) }));
          ws.send(JSON.stringify({ type: 'exit', code: 1 }));
          cleanup();
        }
        return;
      }

      if (msg.type === 'stdin' && proc) {
        try { proc.write(String(msg.data ?? '')); } catch {}
        return;
      }

      if (msg.type === 'stop') {
        cleanup();
        ws.send(JSON.stringify({ type: 'exit', code: 130 }));
      }
    });

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });
};
