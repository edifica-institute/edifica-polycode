import { API_BASE, WS_BASE } from '../config.js';
import { setStatus } from '../core/ui.js';
import { getTerm, clearTerm } from '../core/terminal.js';
import { getCode, clearMarkers, setMarkers } from '../core/editor.js';

let ws = null;

export async function runJava() {
  try {
    setStatus("Compiling…");
    clearMarkers();
    clearTerm();

    const files = [{ path: "Main.java", content: getCode() }];

    const res = await fetch(API_BASE + "/api/java/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainClass: "Main", files })
    });

    if (!res.ok) {
      let msg = "";
      try { msg = await res.text(); } catch {}
      setStatus(`Compile request failed (${res.status}) ${msg ? "– " + msg : ""}`, "err");
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      setMarkers(data.diagnostics || []);
      setStatus("Compilation failed – see red underlines.", "err");
      // If you want the raw compile log in the terminal:
      // if (data.compileLog) getTerm().write(data.compileLog);
      return;
    }

    setStatus("Running (interactive)…", "ok");

    // WS same-origin: if WS_BASE is "", use relative URL "/term?token=..."
    const wsUrl = (WS_BASE ? WS_BASE : "") + "/term?token=" + encodeURIComponent(data.token);
    ws = new WebSocket(wsUrl);

    const term = getTerm();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "stdout") term.write(msg.data);
      if (msg.type === "exit") {
        term.write(`\r\n\nProcess exited with code ${msg.code}\r\n`);
        setStatus("Finished (exit " + msg.code + ")", msg.code === 0 ? "ok" : "err");
        ws = null;
      }
    };
    ws.onclose = () => { ws = null; };
    term.onData(d => { if (ws) ws.send(JSON.stringify({ type:"stdin", data:d })) });

  } catch (err) {
    setStatus("Network error – cannot reach compiler backend.", "err");
    console.error(err);
  }
}

export function stopJava() {
  if (ws) { try { ws.close(); } catch(e){} ws = null; }
  setStatus("Stopped.", "err");
}
