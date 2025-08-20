// ./js/esp-hotpatch.js
(function waitForRequire() {
  function runPatch() {
    try {
      // Normalize AMD module shape (so ".default.parse" always works)
      window.require(['error-stack-parser'], function (ESP) {
        try {
          if (ESP && !ESP.default) ESP.default = ESP;
          if (ESP && typeof ESP.parse === 'function' && ESP.default && !ESP.default.parse) {
            ESP.default.parse = ESP.parse;
          }
        } catch {}
      }, function(){});
    } catch {}
    // Normalize any global already present
    try {
      var G = window.ErrorStackParser;
      if (G && typeof G.parse === 'function') {
        if (!G.default || !G.default.parse) G.default = G;
      }
    } catch {}
  }

  if (typeof window.require === 'function') {
    runPatch();
    return;
  }

  // Poll a bit until Monaco's AMD loader defines window.require
  let tries = 0;
  const t = setInterval(() => {
    if (typeof window.require === 'function') {
      clearInterval(t);
      runPatch();
    } else if (++tries > 200) {
      clearInterval(t);
      console.warn('[Polycode] RequireJS not found for ESP hotpatch.');
    }
  }, 25);
})();
