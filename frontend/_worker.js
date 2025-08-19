export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const needsProxy = url.pathname.startsWith("/api/") || url.pathname === "/term";
      if (needsProxy) {
        if (!env.BACKEND_URL) return new Response("BACKEND_URL is not set", { status: 500 });
        const b = new URL(env.BACKEND_URL);
        url.hostname = b.hostname; url.protocol = b.protocol; url.port = b.port || "";
        return fetch(new Request(url.toString(), request)); // WS supported
      }
      return env.ASSETS.fetch(request); // serve index.html etc.
    } catch (e) {
      return new Response("Worker error: " + (e?.stack || e), { status: 500 });
    }
  }
}
