/*let term = null;

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
 const forceBar = () => { term.setOption('cursorStyle','bar'); term.setOption('cursorBlink', true); };
term.element?.addEventListener('focusin', forceBar);
term.element?.addEventListener('mousedown', forceBar);
 
  return term;
}

export function getTerm() { return term; }
export function clearTerm() { term?.clear(); }*/



// frontend/js/core/terminal.js
let term = null;

export function initTerminal() {
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

  // keep thin blinking bar even after clicks/focus
  const forceBar = () => {
    term.setOption('cursorStyle', 'bar');
    term.setOption('cursorBlink', true);
  };
  term.element?.addEventListener('focusin', forceBar);
  term.element?.addEventListener('mousedown', forceBar);

  return term;
}

export function getTerm() { return term; }

/**
 * Clear helper:
 *  - clearTerminal()         → clears screen (keeps scrollback & state)
 *  - clearTerminal(true)     → full reset (also clears scrollback & attributes)
 */
export function clearTerminal(full = false) {
  if (!term) return;
  if (full) term.reset();
  else term.clear();
}

// keep your old name working if other code imports it
export const clearTerm = clearTerminal;

