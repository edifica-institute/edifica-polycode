<script defer>
  // AMD/RequireJS path map for third-party libs used by our error handler.
  window.require = window.require || {};
  require.config({
    paths: {
      'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
      'stackframe': 'https://cdn.jsdelivr.net/npm/stackframe@1.3.4/dist/stackframe.min',
      'error-stack-parser': 'https://cdn.jsdelivr.net/npm/error-stack-parser@2.1.4/dist/error-stack-parser.min'
    },
    shim: {
      'stackframe': { exports: 'StackFrame' },
      'error-stack-parser': { deps: ['stackframe'], exports: 'ErrorStackParser' }
    }
  });
</script>
