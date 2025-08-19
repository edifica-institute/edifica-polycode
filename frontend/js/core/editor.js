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
*/














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

/* --- add these three for HTML mode --- */
export function setLanguage(lang){ monacoRef.editor.setModelLanguage(model, lang); }
export function setValue(val){ editor.setValue(val); }
export function getValue(){ return editor.getValue(); }
