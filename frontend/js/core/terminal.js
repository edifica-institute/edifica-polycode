let term = null;

export function initTerminal() {
 // core/terminal.js (add/adjust options inside new Terminal({...}))
term = new Terminal({
  convertEol: true,
  cursorBlink: true,
  cursorStyle: 'bar',
  cursorWidth: 1,
  fontSize: 14,
  allowTransparency: true,
  theme: {
    background: '#0b1220',
    foreground: '#e5e7eb',
    cursor: '#22c55e',
    selection: '#334155aa',
  },
});


  term.open(document.getElementById('term'));
  return term;
}

export function getTerm() { return term; }
export function clearTerm() { term?.clear(); }
