export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Proxy API & WebSocket paths to backend
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/term")) {
      const backend = new URL(env.BACKEND_URL);
      url.hostname = backend.hostname;
      url.protocol = backend.protocol;
      url.port     = backend.port || "";
      url.username = "";
      url.password = "";
      // Forward request (Workers supports WS upgrade automatically)
      return fetch(new Request(url.toString(), request));
    }

    // Serve static assets (index.html, etc.)
    return env.ASSETS.fetch(request);
  }
}
