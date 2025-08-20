// frontend/js/shims/esp-amd-shim.js
// Robust, no-dup shim. Never defines 'stackframe' or 'error-stack-parser' directly.

(function () {
  // 1) Point to raw UMDs under unique ids (NOT 'stackframe' / 'error-stack-parser')
  require.config({
    paths: {
      'esp-raw':        'https://cdn.jsdelivr.net/npm/error-stack-parser@2.1.4/dist/error-stack-parser.min',
      'stackframe-raw': 'https://cdn.jsdelivr.net/npm/stackframe@1.3.4/dist/stackframe.min'
    }
  });

  // Helper to safely check if a module id is already defined in Monaco AMD
  function isDefined(id) {
    try { return typeof require.defined === 'function' && require.defined(id); } catch { return false; }
  }

  // 2) If 'stackframe' already exists, expose a thin alias wrapper that forwards to it.
  //    If not, load raw and normalize — BUT under a NEW id.
  if (!isDefined('stackframe-alias')) {
    define('stackframe-alias', ['require'], function (req) {
      return new Promise(function (resolve) {
        // Case A: some other script already defined 'stackframe' -> forward to it
        if (isDefined('stackframe')) {
          req(['stackframe'], function (sf) {
            // ensure .default points to itself (some callers expect it)
            var S = sf && sf.default ? sf.default : sf;
            if (S && !S.default) S.default = S;
            resolve(S || {});
          });
          return;
        }
        // Case B: load raw UMD and normalize
        req(['stackframe-raw'], function (raw) {
          var S = raw && raw.default ? raw.default : raw;
          if (S && !S.default) S.default = S;
          resolve(S || {});
        });
      });
    });
  }

  // 3) Same approach for error-stack-parser
  if (!isDefined('esp-alias')) {
    define('esp-alias', ['require', 'stackframe-alias'], function (req, _sfPromise) {
      return new Promise(function (resolve) {
        // If already defined, forward to it
        if (isDefined('error-stack-parser')) {
          req(['error-stack-parser'], function (esp) {
            var mod = esp && typeof esp.parse === 'function' ? esp
                    : esp && esp.default && typeof esp.default.parse === 'function' ? esp.default
                    : null;
            if (mod) return resolve(mod);
            // fallback noop
            resolve({ parse: function(){ return []; } });
          });
          return;
        }
        // Else load raw and normalize
        req(['esp-raw'], function (raw) {
          var mod = raw && typeof raw.parse === 'function' ? raw
                  : raw && raw.default && typeof raw.default.parse === 'function' ? raw.default
                  : (self.ErrorStackParser && typeof self.ErrorStackParser.parse === 'function' ? self.ErrorStackParser : null);
          if (mod) return resolve(mod);
          resolve({ parse: function(){ return []; } });
        });
      });
    });
  }

  // 4) Map canonical ids to our alias wrappers (promises)
  //    Consumers may expect sync; Monaco AMD handles promise modules (thenable).
  require.config({
    map: {
      '*': {
        'stackframe':         'stackframe-alias',
        'error-stack-parser': 'esp-alias'
      }
    }
  });
})();
