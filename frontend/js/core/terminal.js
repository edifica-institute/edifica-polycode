let term = null;

export function initTerminal() {
 // core/terminal.js (add/adjust options inside new Terminal({...}))
term = new Terminal({
  convertEol: true,
  cursorBlink: true,
  fontSize: 14,
  allowTransparency: true,
  theme: {
    background: '#0b1220',    // matches your app background
    foreground: '#e5e7eb',
    cursor: text,
    selection: '#334155aa',
  },
});

  term.open(document.getElementById('term'));
  return term;
}

export function getTerm() { return term; }
export function clearTerm() { term?.clear(); }
