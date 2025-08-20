// frontend/js/shims/esp-amd-shim.js
// Robust shim: waits for RequireJS, never defines 'stackframe' or 'error-stack-parser' directly.
(function () {
  function install() {
    // 1) Point to raw UMDs under unique ids (NOT 'stackframe' / 'error-stack-parser')
    if (typeof require === 'function' && require.config) {
      require.config({
        paths: {
          'esp-raw':        'https://cdn.jsdelivr.net/npm/error-stack-parser@2.1.4/dist/error-stack-parser.min',
          'stackframe-raw': 'https://cdn.jsdelivr.net/npm/stackframe@1.3.4/dist/stackframe.min'
        }
      });
    }

    // Helper
    function isDefined(id) {
      try { return typeof require.defined === 'function' && require.defined(id); } catch { return false; }
    }

    // 2) alias for StackFrame
    if (!isDefined('stackframe-alias')) {
      define('stackframe-alias', ['require'], function (req) {
        return new Promise(function (resolve) {
          if (isDefined('stackframe')) {
            req(['stackframe'], function (sf) {
              var S = sf && sf.default ? sf.default : sf;
              if (S && !S.default) S.default = S;
              resolve(S || {});
            });
            return;
          }
          req(['stackframe-raw'], function (raw) {
            var S = raw && raw.default ? raw.default : raw;
            if (S && !S.default) S.default = S;
            resolve(S || {});
          });
        });
      });
    }

    // 3) alias for ErrorStackParser
    if (!isDefined('esp-alias')) {
      define('esp-alias', ['require', 'stackframe-alias'], function (req) {
        return new Promise(function (resolve) {
          if (isDefined('error-stack-parser')) {
            req(['error-stack-parser'], function (esp) {
              var mod = esp && typeof esp.parse === 'function' ? esp
                      : esp && esp.default && typeof esp.default.parse === 'function' ? esp.default
                      : null;
              resolve(mod || { parse: function(){ return []; } });
            });
            return;
          }
          req(['esp-raw'], function (raw) {
            var mod = raw && typeof raw.parse === 'function' ? raw
                    : raw && raw.default && typeof raw.default.parse === 'function' ? raw.default
                    : (self.ErrorStackParser && typeof self.ErrorStackParser.parse === 'function' ? self.ErrorStackParser : null);
            resolve(mod || { parse: function(){ return []; } });
          });
        });
      });
    }

    // 4) Map canonical ids → our aliases
    if (typeof require === 'function' && require.config) {
      require.config({
        map: {
          '*': {
            'stackframe':         'stackframe-alias',
            'error-stack-parser': 'esp-alias'
          }
        }
      });
    }
  }

  // Wait for loader.js to define window.require
  let tries = 0;
  const timer = setInterval(() => {
    if (typeof window.require === 'function') {
      clearInterval(timer);
      try { install(); } catch {}
    } else if (++tries > 200) {
      clearInterval(timer);
      console.warn('[PolyCode] RequireJS not found; ESP shim not installed.');
    }
  }, 25);
})();
