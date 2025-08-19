export function setStatus(text, kind="") {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = "status " + (kind || "");
}
