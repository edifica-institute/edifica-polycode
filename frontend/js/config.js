// Same-origin proxy via Cloudflare Pages Function/Worker:
// Leave these as empty strings in production.
// For local dev or direct backend, set full origins e.g. "https://your-backend.onrender.com"
export const API_BASE = "";
export const WS_BASE  = ""; // If "", WebSocket will use relative "/term?token=..."
