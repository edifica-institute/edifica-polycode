let term = null;

export function initTerminal() {
  term = new Terminal({ convertEol: true, fontSize: 14 });
  term.open(document.getElementById('term'));
  return term;
}

export function getTerm() { return term; }
export function clearTerm() { term?.clear(); }
