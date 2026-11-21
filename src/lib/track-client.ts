/**
 * Envía un evento de analítica propio desde el navegador sin depender de que la página siga abierta.
 * `sendBeacon` lo entrega aunque el clic navegue a WhatsApp en la misma pestaña.
 */
export function sendEvent(name: string, path: string, productId = "", source = "") {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, path, productId, source });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon("/api/evento", new Blob([body], { type: "text/plain;charset=UTF-8" }));
      if (queued) return;
    }
    void fetch("/api/evento", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(() => undefined);
  } catch {
    // La analítica nunca debe romper un clic.
  }
}
