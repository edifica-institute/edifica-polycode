export default {
  async fetch(request, env) {
    try {
      const reqUrl = new URL(request.url);

      // Proxy these paths to your backend
      const isProxyPath =
        reqUrl.pathname.startsWith("/api/") || reqUrl.pathname === "/term";

      if (isProxyPath) {
        const backend = env.BACKEND_URL;
        if (!backend) {
          return new Response("BACKEND_URL is not set", { status: 500 });
        }
        const target = new URL(backend);
        reqUrl.hostname = target.hostname;
        reqUrl.protocol = target.protocol;
        reqUrl.port = target.port || "";

        // Proxy request (keeps method/headers/body, supports WebSocket)
        return fetch(new Request(reqUrl.toString(), request));
      }

      // Serve static assets (index.html, etc.)
      return env.ASSETS.fetch(request);
    } catch (err) {
      return new Response("Worker error: " + (err && err.stack || err), { status: 500 });
    }
  }
}
