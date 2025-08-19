// js/lang/html.js
import { setStatus } from '../core/ui.js';
import { setLanguage, setValue, getValue } from '../core/editor.js';

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Preview</title>
    <style>
      body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:20px;background:#0b1220;color:#e5e7eb}
      .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px}
      button{padding:8px 10px;border-radius:8px;border:1px solid #334155;background:#0b1220;color:#e5e7eb}
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Hello, HTML!</h2>
      <p>This is rendered in a sandboxed iframe.</p>
      <button onclick="alert('JS works!')">Click me</button>
    </div>
  </body>
</html>`;

export function activate(){
  setLanguage('html');
  setValue(SAMPLE_HTML);
  setStatus("Ready.");

  const term = document.getElementById('term');
  const preview = document.getElementById('preview');
  if (term) term.style.display = 'none';
  if (preview) preview.style.display = 'block';
}

export async function run(){
  const preview = document.getElementById('preview');
  if (!preview) return;
  setStatus("Rendering HTML…","ok");

  const code = getValue();
  const html = /<html[\s\S]*<\/html>/i.test(code)
    ? code
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title></head><body>${code}</body></html>`;
  preview.srcdoc = html;
}

export function stop(){ setStatus("Stopped.","err"); }
