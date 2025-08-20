// js/lang/java.js
import { API_BASE, WS_BASE } from '../config.js';
import { setStatus, showSpinner } from '../core/ui.js';
import { attachInput, detachInput, clearTerminal, getTerminal as getTerm } from '../core/terminal.js';
import { getCode, clearMarkers, setMarkers, setLanguage, setValue } from '../core/editor.js';

let ws = null;

const SAMPLE = `// Simple Java program
import java.io.*;
import java.util.*;

public class Main 
{
  public static void main(String[] args)
  {
    Scanner sc = new Scanner(System.in);
    System.out.print("Enter a number: ");
    int n = sc.nextInt();
    System.out.println("Number = " + n);
    System.out.println("Square = " + (n*n));
  }
}
`;

export function activate(){
  // Show terminal, hide preview (main.js also ensures this; harmless redundancy)
  const termEl = document.getElementById('term');
  const preview = document.getElementById('preview');
  if (termEl) termEl.style.display = 'block';
  if (preview) preview.style.display = 'none';

  // Reset language + starter code
  setLanguage('java');
  setValue(SAMPLE);

  // Reset hint/status
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = "Type into the console when your program asks for input (e.g., Scanner).";
  setStatus("Ready.");
}

export async function runJava() {
  try {
    setStatus("Compiling…");
    showSpinner(true);
    clearMarkers();
    clearTerminal(true); // full reset, silent

    const files = [{ path: "Main.java", content: getCode() }];

    const res = await fetch(API_BASE + "/api/java/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainClass: "Main", files })
    });

    if (!res.ok) {
      let msg = ""; try { msg = await res.text(); } catch {}
      setStatus(`Compile request failed (${res.status}) ${msg ? "– " + msg : ""}`, "err");
      showSpinner(false);
      return;
    }

    const data = await res.json();

    if (!data.ok) {
      setMarkers(data.diagnostics || []);
      setStatus("Compilation failed – see red underlines.", "err");
      showSpinner(false);
      return;
    }

    setStatus("Running (interactive)…", "ok");

    const wsUrl = (WS_BASE ? WS_BASE : "") + "/term?token=" + encodeURIComponent(data.token);
    ws = new WebSocket(wsUrl);

    const term = getTerm();

    // Attach EXACTLY ONE input handler for this run
    attachInput((d) => { if (ws) ws.send(JSON.stringify({ type: "stdin", data: d })); });

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "stdout") {
        // Filter noisy JAVA_TOOL_OPTIONS line if present
        const filtered = msg.data.replace(/^Picked up JAVA_TOOL_OPTIONS:.*\r?\n?/mg, "");
        term.write(filtered);
      }
      if (msg.type === "exit") {
        term.write(`\r\n\nProcess exited with code ${msg.code}\r\n`);
        setStatus("Execution Success! (Exit Code - " + msg.code + ")", msg.code === 0 ? "ok" : "err");
        showSpinner(false);
        try { ws.close(); } catch {}
        ws = null;
        detachInput(); // IMPORTANT: prevent stacking handlers
      }
    };

    ws.onclose = () => {
      ws = null;
      detachInput(); // in case close happens before exit
    };

  } catch (err) {
    setStatus("Network error – cannot reach compiler backend.", "err");
    showSpinner(false);
    console.error(err);
    detachInput();
  }
}

export function stopJava() {
  if (ws) { try { ws.close(); } catch(e){} ws = null; }
  detachInput(); // ensure next run doesn't stack
  setStatus("Stopped.","err");
  showSpinner(false);
}
