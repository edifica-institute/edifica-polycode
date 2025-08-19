/*import { API_BASE, WS_BASE } from '../config.js';
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
*/





// js/lang/java.js
import { API_BASE, WS_BASE } from '../config.js';
import { setStatus, showSpinner } from '../core/ui.js';
import { getTerm, clearTerm } from '../core/terminal.js';
import { getCode, clearMarkers, setMarkers, setLanguage, setValue } from '../core/editor.js';




let ws = null;

const SAMPLE = `// Simple Java program
import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    Scanner sc = new Scanner(System.in);
    System.out.print("Enter a number: ");
    int n = sc.nextInt();

    // File I/O inside sandbox
    try (PrintWriter pw = new PrintWriter(new FileWriter("hello.txt"))) {
      pw.println("Square = " + (n*n));
    }

    System.out.println("Wrote hello.txt");
    System.out.println("Square = " + (n*n));
  }
}
`;

export function activate(){
  // Show terminal, hide preview
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
    clearTerm();

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
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "stdout") term.write(msg.data);
      if (msg.type === "exit") {
        term.write(`\r\n\nProcess exited with code ${msg.code}\r\n`);
        setStatus("Execution Success! (Exit Code - " + msg.code + ")", msg.code === 0 ? "ok" : "err");
         showSpinner(false); 
        ws = null;
      }
    };
    ws.onclose = () => { ws = null; };
    term.onData(d => { if (ws) ws.send(JSON.stringify({ type:"stdin", data:d })) });

  } catch (err) {
    setStatus("Network error – cannot reach compiler backend.", "err");
     showSpinner(false); 
    console.error(err);
  }
}

export function stopJava() {
  if (ws) { try { ws.close(); } catch(e){} ws = null; }
  setStatus("Stopped.","err");
   showSpinner(false); 
}

