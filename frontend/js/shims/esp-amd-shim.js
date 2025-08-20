// frontend/js/shims/esp-amd-shim.js
// Normalizes error-stack-parser & stackframe across ESM/CJS/UMD/AMD.
// Also provides a safe fallback parser so code never crashes.

(function () {
  function normalizeESP(mod) {
    // CJS/UMD export: { parse(){} }
    if (mod && typeof mod.parse === 'function') return mod;
    // ESM default export: { default: { parse(){} } }
    if (mod && mod.default && typeof mod.default.parse === 'function') return mod.default;
    // Global (if present)
    const g = (self || window).ErrorStackParser;
    if (g && typeof g.parse === 'function') return g;
    // Last-resort fallback: extract first URL-ish token from stack
    return {
      parse(err) {
        const s = (err && err.stack) || '';
        const lines = s.split('\n');
        for (const ln of lines) {
          const m = ln.match(/(?:\()?(?:file|https?):\/\/[^\s)]+/);
          if (m) return [{ fileName: m[0].replace(/[()]/g, '') }];
        }
        return [];
      },
    };
  }

  function normalizeStackFrame(mod) {
    // StackFrame is usually a constructor. Ensure .default points to itself.
    const S = (mod && mod.default) ? mod.default : mod;
    if (S && !S.default) S.default = S;
    return S;
  }

  // Define normalized wrapper modules
  define('error-stack-parser-normalized', ['error-stack-parser'], function (esp) {
    return normalizeESP(esp);
  });

  define('stackframe-normalized', ['stackframe'], function (sf) {
    return normalizeStackFrame(sf);
  });

  // RequireJS config: load official UMD builds, but map everyone to our normalized IDs
  require.config({
    paths: {
      'error-stack-parser': 'https://cdn.jsdelivr.net/npm/error-stack-parser@2.1.4/dist/error-stack-parser.min',
      'stackframe':        'https://cdn.jsdelivr.net/npm/stackframe@1.3.4/dist/stackframe.min',
    },
    map: {
      '*': {
        'error-stack-parser': 'error-stack-parser-normalized',
        'stackframe':         'stackframe-normalized',
      },
    },
  });
})();
