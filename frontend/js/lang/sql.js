// frontend/js/lang/sql.js
import { setLanguage, setValue } from '../core/editor.js';
import { setStatus } from '../core/ui.js';

/**
 * We use sql.js (SQLite compiled to WASM).
 * This module lazy-loads it (local vendor first, then CDN).
 * Place files locally for reliability:
 *   frontend/vendor/sql-wasm.js
 *   frontend/vendor/sql-wasm.wasm
 * If you prefer CDN, see ensureSql() candidates below.
 */


let SQL = null;

function loadScript(url){
  return new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = url; s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed ' + url));
    document.head.appendChild(s);
  });
}
function relFromHere(rel){
  try { return new URL(rel, import.meta.url).href; }
  catch { return rel; }
}

async function ensureSql(){
  if (SQL) return SQL;

  const candidates = [
    relFromHere('../../vendor/sql-wasm.js'), // served by your site if files exist
    'https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.js',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js',
  ];

  let base = null;
  for (const u of candidates){
    try {
      await loadScript(u);
      if (typeof initSqlJs === 'function') { base = u.replace(/[^/]+$/, ''); break; }
    } catch {}
  }
  if (!base) throw new Error('Could not load sql.js');

  SQL = await initSqlJs({ locateFile: (filename) => base + filename });
  return SQL;
}
















// Build a <table> for the last SELECT; also construct a text dump
function renderTable(container, result){
  container.innerHTML = '';
  if (!result || !result.columns) {
    const pre = document.createElement('pre');
    pre.textContent = lastOutput || '(no output)';
    container.appendChild(pre);
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  result.columns.forEach(c=>{
    const th = document.createElement('th'); th.textContent = c; trh.appendChild(th);
  });
  thead.appendChild(trh); table.appendChild(thead);
  const tb = document.createElement('tbody');
  result.values.forEach(row=>{
    const tr = document.createElement('tr');
    row.forEach(v=>{
      const td=document.createElement('td');
      td.textContent = (v===null) ? 'NULL' : String(v);
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  container.appendChild(table);
}

// ---- Public API -------------------------------------------------------------
export function activate(){
  // Switch Monaco to SQL + load a friendly sample
  setLanguage('sql');
  setValue(
`-- Example:
CREATE TABLE students(id INTEGER PRIMARY KEY, name TEXT, marks INT);
INSERT INTO students(name, marks) VALUES
  ('Asha', 92), ('Ravi', 76), ('Meera', 84);

-- Try your own queries:
SELECT * FROM students;
SELECT AVG(marks) AS avg_marks FROM students;`
  );

  // Show SQL output panel; hide others
  const term = document.getElementById('term');
  const preview = document.getElementById('preview');
  const sqlout = document.getElementById('sqlout');

  if (term) term.style.display = 'none';
  if (preview) preview.style.display = 'none';
  if (sqlout) sqlout.style.display = 'block';

  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Write SQL on the left. Results appear as a table.';
  setStatus('Ready.');
}

export async function run(){
  try{
    await ensureSql();
    setStatus('Running SQL…');

    const sqlout = document.getElementById('sqlout');
    if (!sqlout) throw new Error('#sqlout not found');

    const code = monaco.editor.getModels()[0].getValue();
    const db = new SQL.Database();

    // Execute the whole script (multiple statements are fine)
    // db.exec returns an array of result sets: [{columns:[], values:[[]]}, ...]
    const results = db.exec(code);

    // Prepare a text dump for "Send"
    lastOutput = '';
    if (!results.length) {
      lastOutput = '(no result sets)';
    } else {
      results.forEach((res, i) => {
        lastOutput += `Result ${i+1}:\n`;
        lastOutput += (res.columns.join('\t') || '(no columns)') + '\n';
        res.values.forEach(row => { lastOutput += row.map(v=>v==null?'NULL':v).join('\t') + '\n'; });
        lastOutput += '\n';
      });
    }

    // Render only the last SELECT as a table; show text if no table
    const last = results[results.length - 1];
    renderTable(sqlout, last);

    setStatus('Finished (SQL)', 'ok');
  }catch(e){
    const sqlout = document.getElementById('sqlout');
    if (sqlout) {
      sqlout.style.display = 'block';
      sqlout.textContent = 'SQL error: ' + (e?.message || String(e));
    }
    setStatus('SQL error', 'err');
  }
}

export function stop(){
  // Nothing to stop for in-memory SQL; just clear status if you want
  setStatus('Stopped.', 'err');
}
