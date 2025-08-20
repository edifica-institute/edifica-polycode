// frontend/js/core/terminal.js

// If you load xterm via <script> in index.html, Terminal is global.
// If you import it via ESM, uncomment the next line:
// import { Terminal } from 'xterm';

let term = null;
let inputDisposable = null;

/**
 * Initialize (idempotent). Reuses the same xterm instance if already created.
 */
export function initTerminal() {
  if (term) return term;

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
    scrollback: 2000,
  });

  const mount = document.getElementById('term');
  if (!mount) {
    console.warn('[terminal] #term not found; init skipped until DOM is ready.');
    return term;
  }

  term.open(mount);

  // keep thin blinking bar on focus/clicks
  const forceBar = () => {
    // Keep style as bar (commented in your original); blink on:
    // term.setOption('cursorStyle', 'bar');
    //term.setOption('cursorBlink', true);
  };
  term.element?.addEventListener('focusin', forceBar);
  term.element?.addEventListener('mousedown', forceBar);

  return term;
}

/** Accessor */
export function getTerminal() { return term; }

/**
 * Attach exactly ONE input handler. If one exists, it is disposed first.
 * Use this in your language runner (e.g., Java) before each run.
 */
export function attachInput(handler) {
  if (!term) initTerminal();
  if (!term) return null;

  if (inputDisposable && typeof inputDisposable.dispose === 'function') {
    inputDisposable.dispose();
  }
  inputDisposable = term.onData(handler);
  return inputDisposable;
}

/** Detach any active input handler (e.g., on stop). */
export function detachInput() {
  if (inputDisposable && typeof inputDisposable.dispose === 'function') {
    inputDisposable.dispose();
  }
  inputDisposable = null;
}

/**
 * Clear helper (SILENT):
 *  - clearTerminal()     → clear screen (preserves state/scrollback)
 *  - clearTerminal(true) → reset terminal (clears scrollback + attributes)
 */
export function clearTerminal(full = false) {
  if (!term) return;
  if (full && typeof term.reset === 'function') {
    term.reset(); // full reset
  } else {
    // Clear display without printing any “Output Cleared” text
    // Using CSI sequences avoids adding a blank line to scrollback.
    term.write('\x1b[2J\x1b[3J\x1b[H');
  }
}

/** Optional convenience helpers */
export function writeToTerminal(text = '') {
  if (!term) initTerminal();
  term?.write?.(text);
}
export function focusTerminal() {
  term?.focus?.();
}

// Back-compat (you referenced clearTerm earlier)
export const clearTerm = clearTerminal;
