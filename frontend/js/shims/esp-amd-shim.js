// frontend/js/shims/esp-amd-shim.js
// Loads the official UMD builds from CDN and exposes normalized modules
// so code can call `.parse` regardless of ESM/CJS/UMD shape.

(function () {
  // 1) Point AMD to the *raw* UMD bundles on a CDN.
  //    We use unique ids (esp-raw, stackframe-raw) to avoid id collisions.
  require.config({
    paths: {
      'esp-raw':        'https://cdn.jsdelivr.net/npm/error-stack-parser@2.1.4/dist/error-stack-parser.min',
      'stackframe-raw': 'https://cdn.jsdelivr.net/npm/stackframe@1.3.4/dist/stackframe.min'
    }
  });

  // 2) Define small **named** wrapper modules (no anonymous define spam)
  //    that normalize the export shape.
  define('esp-wrapper', ['esp-raw'], function (raw) {
    // Normalization: ESM default, CJS/UMD object, or global
    var mod = raw && typeof raw.parse === 'function' ? raw
            : raw && raw.default && typeof raw.default.parse === 'function' ? raw.default
            : (self.ErrorStackParser && typeof self.ErrorStackParser.parse === 'function' ? self.ErrorStackParser : null);

    if (mod) return mod;

    // Fallback: minimal parser that pulls a URL-ish token from stack
    return {
      parse: function (err) {
        var s = (err && err.stack) || '';
        var lines = s.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var m = lines[i].match(/(?:\()?(?:file|https?):\/\/[^\s)]+/);
          if (m) return [{ fileName: m[0].replace(/[()]/g, '') }];
        }
        return [];
      }
    };
  });

  define('stackframe-wrapper', ['stackframe-raw'], function (raw) {
    // Ensure .default exists and points to itself (some code expects it)
    var S = raw && raw.default ? raw.default : raw;
    if (S && !S.default) S.default = S;
    return S || {};
  });

  // 3) Map everyone who asks for 'error-stack-parser' or 'stackframe' to our wrappers
  require.config({
    map: {
      '*': {
        'error-stack-parser': 'esp-wrapper',
        'stackframe': 'stackframe-wrapper'
      }
    }
  });
})();
