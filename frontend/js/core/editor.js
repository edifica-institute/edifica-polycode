/*let monacoRef = null;
let model = null;
let editor = null;

const sample = `// Simple Java program
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

export function initMonaco() {
  return new Promise((resolve) => {
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
    require(['vs/editor/editor.main'], function () {
      monacoRef = monaco;
      monacoRef.editor.defineTheme("plunkyDark", {
        base: "vs-dark", inherit: true,
        rules: [
          { token: "keyword", foreground: "C586C0", fontStyle:"bold" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "type", foreground: "4EC9B0" },
          { token: "comment", foreground: "6A9955", fontStyle:"italic" }
        ],
        colors: { "editor.background": "#0b1220" }
      });
      model = monacoRef.editor.createModel(sample, "java", monacoRef.Uri.parse("inmemory://model/Main.java"));
      editor = monacoRef.editor.create(document.getElementById('editor'), {
        model, theme: "plunkyDark", automaticLayout: true, fontSize: 14, minimap: { enabled: false }
      });
      // Ctrl/Cmd + Enter
      editor.addCommand(monacoRef.KeyMod.CtrlCmd | monacoRef.KeyCode.Enter, () => {
        const ev = new CustomEvent('polycode:run'); window.dispatchEvent(ev);
      });
      resolve();
    });
  });
}

export function getCode() { return editor.getValue(); }
export function clearMarkers() {
  if (!model) return;
  monacoRef.editor.setModelMarkers(model, "javac", []);
}
export function setMarkers(diags = []) {
  if (!model) return;
  const markers = diags.map(d => ({
    message: d.message,
    startLineNumber: d.line || 1,
    startColumn: d.column || 1,
    endLineNumber: d.line || 1,
    endColumn: (d.column || 1) + 1,
    severity: d.severity === "warning"
      ? monacoRef.MarkerSeverity.Warning
      : monacoRef.MarkerSeverity.Error
  }));
  monacoRef.editor.setModelMarkers(model, "javac", markers);
  if (markers.length) {
    editor.revealLineInCenter(markers[0].startLineNumber);
    editor.setPosition({ lineNumber: markers[0].startLineNumber, column: markers[0].startColumn });
  }
}


export function setLanguage(lang){ monacoRef.editor.setModelLanguage(model, lang); }
export function setValue(val){ editor.setValue(val); }
export function getValue(){ return editor.getValue(); }















// js/core/editor.js
let monacoRef = null;
let model = null;
let editor = null;

const sample = `// Simple Java program
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

export function initMonaco() {
  return new Promise((resolve) => {
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});
    require(['vs/editor/editor.main'], function () {
      monacoRef = monaco;
      monacoRef.editor.defineTheme("plunkyDark", {
        base: "vs-dark", inherit: true,
        rules: [
          { token: "keyword", foreground: "C586C0", fontStyle:"bold" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "type", foreground: "4EC9B0" },
          { token: "comment", foreground: "6A9955", fontStyle:"italic" }
        ],
        colors: { "editor.background": "#0b1220" }
      });

      model = monacoRef.editor.createModel(
        sample, "java", monacoRef.Uri.parse("inmemory://model/Main.java")
      );
      editor = monacoRef.editor.create(document.getElementById('editor'), {
        model, theme: "plunkyDark", automaticLayout: true, fontSize: 14, minimap: { enabled: false }
      });

      // Ctrl/Cmd + Enter -> dispatch global run
      editor.addCommand(monacoRef.KeyMod.CtrlCmd | monacoRef.KeyCode.Enter, () => {
        window.dispatchEvent(new CustomEvent('polycode:run'));
      });

      resolve();
    });
  });
}

export function getCode() { return editor.getValue(); }
export function clearMarkers() {
  if (!model) return;
  monacoRef.editor.setModelMarkers(model, "javac", []);
}
export function setMarkers(diags = []) {
  if (!model) return;
  const markers = diags.map(d => ({
    message: d.message,
    startLineNumber: d.line || 1,
    startColumn: d.column || 1,
    endLineNumber: d.line || 1,
    endColumn: (d.column || 1) + 1,
    severity: d.severity === "warning"
      ? monacoRef.MarkerSeverity.Warning
      : monacoRef.MarkerSeverity.Error
  }));
  monacoRef.editor.setModelMarkers(model, "javac", markers);
  if (markers.length) {
    editor.revealLineInCenter(markers[0].startLineNumber);
    editor.setPosition({ lineNumber: markers[0].startLineNumber, column: markers[0].startColumn });
  }
}

/* --- add these three for HTML mode --- 
export function setLanguage(lang){ monacoRef.editor.setModelLanguage(model, lang); }
export function setValue(val){ editor.setValue(val); }
export function getValue(){ return editor.getValue(); }*/





























// frontend/js/core/editor.js
// Single Monaco editor + one shared model (we just change language/value).
// Prevents "ModelService: Cannot add model because it already exists!"

let editor = null;
let model  = null;

// Stable URIs for the shared single-file editor (pick ONE you prefer)
const URIS = {
  java: monaco.Uri.parse('inmemory://polycode/Main.java'),
  html: monaco.Uri.parse('inmemory://polycode/index.html'),
  sql:  monaco.Uri.parse('inmemory://polycode/query.sql'),
};
// We'll actually keep ONE model and just swap its language/value.
// Use the Java URI as the "home" URI.
const MAIN_URI = URIS.java;

export function initMonaco() {
  return new Promise((resolve) => {
    if (editor) return resolve(editor); // guard: already inited

    // Monaco AMD is already loaded via <script loader.js> in index.html
    require(['vs/editor/editor.main'], function () {
      // Theme (idempotent)
      try {
        monaco.editor.defineTheme('plunkyDark', {
          base: 'vs-dark', inherit: true,
          rules: [
            { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
            { token: 'string',  foreground: 'CE9178' },
            { token: 'number',  foreground: 'B5CEA8' },
            { token: 'type',    foreground: '4EC9B0' },
            { token: 'comment', foreground: '6A9955', fontStyle: 'italic' }
          ],
          colors: { 'editor.background': '#0b1220' }
        });
      } catch {}

      // Reuse existing model for MAIN_URI if it already exists
      model = monaco.editor.getModel(MAIN_URI);
      if (!model) {
        model = monaco.editor.createModel(
          `// Java starter
import java.util.*;
public class Main {
  public static void main(String[] args){
    System.out.println("Hello from PolyCode!");
  }
}
`, 'java', MAIN_URI);
      }

      editor = monaco.editor.create(document.getElementById('editor'), {
        model,
        theme: 'plunkyDark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
      });

      // Ctrl/Cmd + Enter -> dispatch a global run event
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        window.dispatchEvent(new CustomEvent('polycode:run'));
      });

      resolve(editor);
    });
  });
}

// Change language of the single shared model (no new model created)
export function setLanguage(lang) {
  if (!model) return;
  monaco.editor.setModelLanguage(model, lang);
}

// Set content of the single shared model
export function setValue(text) {
  if (!model) return;
  model.setValue(text);
}

// Optionally switch the model's URI if you want different URIs per lang
// (not necessary, but here if you want it)
export function switchModelUriForLang(lang) {
  if (!model) return;
  const targetUri = (lang === 'html') ? URIS.html
                   : (lang === 'sql') ? URIS.sql
                   : URIS.java;
  if (model.uri.toString() !== targetUri.toString()) {
    // Move model to a new URI without creating/disposal churn
    model._associatedResource = targetUri; // internal; works in current Monaco
  }
}

export function getEditor() { return editor; }
export function getModel()  { return model; }


