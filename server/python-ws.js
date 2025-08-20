// server/python-ws.js  (ESM)
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export default function attachPythonWS(server) {
  // WebSocket path will be wss://<host>/python
  const wss = new WebSocketServer({ server, path: '/python' });

  wss.on('connection', (ws) => {
    let proc = null;
    let workDir = null;
    let killTimer = null;

    const cleanup = async () => {
      if (killTimer) { clearTimeout(killTimer); killTimer = null; }
      try { proc?.kill(); } catch {}
      proc = null;
      if (workDir) {
        // remove temp folder (ignore errors)
        rm(workDir, { recursive: true, force: true }).catch(() => {});
        workDir = null;
      }
    };

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'run') {
        await cleanup();

        try {
          // Create a fresh temp dir and write main.py
          workDir = await mkdtemp(join(tmpdir(), `py-${randomUUID()}-`));
          const file = join(workDir, 'main.py');
          await writeFile(file, String(msg.code ?? ''), 'utf8');

          // -u (unbuffered) so prints show immediately
          proc = pty.spawn('python3', ['-u', file], {
            name: 'xterm-color',
            cols: 120, rows: 30,
            cwd: workDir,
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

          // safety timeout (tune)
          killTimer = setTimeout(() => { try { proc.kill(); } catch {} }, 15000);

        } catch (e) {
          ws.send(JSON.stringify({ type: 'stderr', data: 'Spawn error: ' + (e?.message || e) }));
          ws.send(JSON.stringify({ type: 'exit', code: 1 }));
          await cleanup();
        }
        return;
      }

      if (msg.type === 'stdin' && proc) {
        try { proc.write(String(msg.data ?? '')); } catch {}
        return;
      }

      if (msg.type === 'stop') {
        await cleanup();
        ws.send(JSON.stringify({ type: 'exit', code: 130 }));
      }
    });

    ws.on('close', () => { cleanup(); });
    ws.on('error', () => { cleanup(); });
  });
}
