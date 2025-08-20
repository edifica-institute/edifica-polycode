// /js/runner-bridge.js
(function () {
  const byId = (id) => document.getElementById(id);
  const runBtn = byId('runBtn');
  const stopBtn = byId('stopBtn');
  const langSel = byId('language-select');

  const surfaces = {
    preview: byId('preview'),
    term: byId('term'),
    sql: byId('sqlout')
  };

  // Show only one surface at a time
  function showSurface(which) {
    surfaces.preview.style.display = (which === 'preview') ? 'block' : 'none';
    surfaces.term.style.display    = (which === 'term')    ? 'block' : 'none';
    surfaces.sql.style.display     = (which === 'sql')     ? 'block' : 'none';
  }

  // Pull values from editors (Monaco expected; safe fallback)
  const val = (ed) => ed?.getValue?.() ?? '';

  function buildHtmlDoc() {
    const html = val(window.htmlEditor);
    const css  = val(window.cssEditor);
    const js   = val(window.jsEditor).replace(/<\/script>/gi, '<\\/script>');
    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
  }

  function onLangChange(value) {
    const v = (value || '').toLowerCase();

    const leftCode = byId('left-code');
    const htmlEd   = byId('htmlEd');
    const cssEd    = byId('cssEd');
    const jsEd     = byId('jsEd');

    const isWeb = v === 'web' || v === 'html';
    if (isWeb) {
      // show web editors
      leftCode.style.display = 'none';
      htmlEd.style.display = 'block';
      cssEd.style.display  = (v === 'web') ? 'block' : 'none';
      jsEd.style.display   = (v === 'web') ? 'block' : 'none';

      // fresh preview
      const iframe = byId('preview');
      iframe.srcdoc = buildHtmlDoc();
      showSurface('preview');
    } else {
      // show single editor
      leftCode.style.display = 'grid';
      htmlEd.style.display = 'none';
      cssEd.style.display  = 'none';
      jsEd.style.display   = 'none';

      if (v === 'java') showSurface('term');
      else if (v === 'sql') showSurface('sql');
      else showSurface('term');
    }
  }

  // Initial render
  onLangChange(langSel.value);

  // Bind language switch
  langSel.addEventListener('change', (e) => onLangChange(e.target.value));

  // Bind Run: for web modes, render to iframe immediately.
  runBtn.addEventListener('click', async () => {
    const v = langSel.value.toLowerCase();
    if (v === 'web' || v === 'html') {
      const iframe = byId('preview');
      iframe.srcdoc = buildHtmlDoc();
      showSurface('preview');
      return;
    }
    // For compiled langs, just ensure correct surface; main.js handles execution.
    if (v === 'java') showSurface('term');
    else if (v === 'sql') showSurface('sql');
    else showSurface('term');
  });

  // Bind Stop: delegate to existing stoppers if present
  stopBtn.addEventListener('click', () => {
    try { window.stopJava?.(); } catch {}
    try { window.stopSql?.(); } catch {}
  });

  // Safety: if any runtime error happens, keep UI usable
  window.addEventListener('error', (e) => {
    const status = document.getElementById('statusText');
    if (status) status.textContent = 'Error: ' + (e.message || 'Unknown');
    console.error('[PolyCode] JS error:', e.message, 'at', e.filename, e.lineno + ':' + e.colno);
  });
})();
