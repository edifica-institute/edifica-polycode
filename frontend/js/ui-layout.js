// /js/ui-layout.js
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  // --- 3-pane gutters (between htmlPane|cssPane|jsPane) ---
  (function initGutters() {
    const container = $('#panes');
    if (!container) return;

    let dragging = null;
    container.querySelectorAll('.gutter').forEach((gut, idx) => {
      gut.addEventListener('mousedown', (e) => {
        e.preventDefault();
        dragging = {
          idx,
          startX: e.clientX,
          leftPane: container.children[idx * 2],       // pane
          rightPane: container.children[idx * 2 + 2],  // pane
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', stopDrag, { once: true });
      });
    });

    function onMove(e) {
      if (!dragging) return;
      const { leftPane, rightPane, startX } = dragging;
      const dx = e.clientX - startX;
      const total = leftPane.offsetWidth + rightPane.offsetWidth;
      const newLeft = Math.max(140, Math.min(leftPane.offsetWidth + dx, total - 140));
      leftPane.style.width = newLeft + 'px';
      rightPane.style.width = (total - newLeft) + 'px';
      refreshEditors();
    }
    function stopDrag() {
      document.removeEventListener('mousemove', onMove);
      dragging = null;
      refreshEditors();
    }
  })();

  // --- Output column resizer (between panes and output) ---
  (function initOutputResize() {
    const handle = $('#outputResizer');
    const ws = $('#workspace');
    if (!handle || !ws) return;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const rect = ws.getBoundingClientRect();
      function onMove(ev) {
        const x = Math.max(rect.left + rect.width * 0.35, Math.min(ev.clientX, rect.left + rect.width * 0.80));
        const leftPct = ((x - rect.left) / rect.width) * 100;
        ws.style.gridTemplateColumns = `calc(${leftPct}% - 6px) calc(${100 - leftPct}% - 6px)`;
        refreshEditors();
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        refreshEditors();
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp, { once: true });
    });
  })();

  // --- Relayout editors after resizes (CodeMirror/Monaco) ---
  function refreshEditors() {
    // CodeMirror 5/6
    window.htmlEditor?.refresh?.();
    window.cssEditor?.refresh?.();
    window.jsEditor?.refresh?.();
    // Monaco
    window.htmlEditor?.layout?.();
    window.cssEditor?.layout?.();
    window.jsEditor?.layout?.();
    window.monoEditor?.layout?.(); // single-file editor if you use one
  }
})();
