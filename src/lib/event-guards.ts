/**
 * Rastreadores y previsualizadores de enlaces.
 * No incluye el navegador dentro de WhatsApp/Telegram: ahí compran y hay que contar la visita.
 * Las previsualizaciones de WhatsApp suelen ir como facebookexternalhit.
 */
const BOT_PATTERN =
  /bot\b|crawl|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|preview|lighthouse|headless|python-requests|curl\/|wget|node-fetch|go-http-client|axios|monitor|uptime|powershell|postman|okhttp|scrapy|httpclient|libwww|java\//i;

/** Rastreadores y previsualizaciones de enlaces no son visitas reales. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  if (BOT_PATTERN.test(userAgent)) return true;
  // Previsualizador de WhatsApp: el UA empieza por WhatsApp/. El navegador dentro de la app trae Mozilla.
  if (/^WhatsApp\//i.test(userAgent.trim())) return true;
  return false;
}

const PRODUCT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Los ids son texto (uuid o importados); solo se acepta una forma segura y acotada. */
export function isProductId(value: string | undefined | null): value is string {
  return Boolean(value && PRODUCT_ID.test(value));
}

export const EVENT_LIMIT = 90;
export const EVENT_WINDOW_MS = 60_000;
const MAX_TRACKED_ADDRESSES = 2000;

export type EventWindow = { count: number; windowStart: number };

/** Limitador por ventana fija; recibe el almacén para poder probarlo sin estado global. */
export function allowEvent(store: Map<string, EventWindow>, key: string, now: number, limit = EVENT_LIMIT, windowMs = EVENT_WINDOW_MS): boolean {
  const current = store.get(key);
  if (!current || now - current.windowStart >= windowMs) {
    if (store.size >= MAX_TRACKED_ADDRESSES) {
      for (const [address, entry] of store) {
        if (now - entry.windowStart >= windowMs) store.delete(address);
      }
      if (store.size >= MAX_TRACKED_ADDRESSES) store.clear();
    }
    store.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/** Eventos que el navegador puede enviar. Las vistas y búsquedas las registra solo el servidor. */
export const CLIENT_EVENTS = ["whatsapp_click", "interest_list_add", "interest_list_send", "cart_add", "cart_send", "product_share", "product_link_copy"] as const;

export function isClientEvent(name: string): boolean {
  return (CLIENT_EVENTS as readonly string[]).includes(name);
}

/** Next precarga enlaces visibles: esas peticiones no son visitas. */
export function isPrefetchRequest(read: (name: string) => string | null): boolean {
  if (read("next-router-prefetch")) return true;
  return /prefetch/i.test(read("purpose") ?? "") || /prefetch/i.test(read("sec-purpose") ?? "");
}

export const VIEW_DEDUPE_MS = 30_000;
export const ACTION_DEDUPE_MS = 4_000;

/** Devuelve true si la misma clave ya se registró dentro de la ventana; si no, la anota. */
export function isRecentDuplicate(store: Map<string, number>, key: string, now: number, windowMs: number): boolean {
  const last = store.get(key);
  if (last !== undefined && now - last < windowMs) return true;
  if (store.size >= MAX_TRACKED_ADDRESSES) {
    for (const [entry, at] of store) {
      if (now - at >= VIEW_DEDUPE_MS) store.delete(entry);
    }
    if (store.size >= MAX_TRACKED_ADDRESSES) store.clear();
  }
  store.set(key, now);
  return false;
}

const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook|fb)\.com$|(^|\.)fb\.me$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(twitter|x)\.com$|(^|\.)t\.co$/, "x"],
  [/(^|\.)pinterest\./, "pinterest"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
];

/** Texto corto y seguro para guardar como origen o lugar de un clic. */
export function cleanLabel(value: string | null | undefined, max = 60): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._:\- ]/g, "")
    .trim()
    .slice(0, max);
}

/** Se guarda cuando la visita viene de otra página de la propia tienda (no es una llegada nueva). */
export const INTERNAL_SOURCE = "interno";

/** Origen según el sitio que envió al visitante; "interno" si vino de la propia tienda; vacío si no hay referente. */
export function referrerSource(referer: string | null | undefined, ownHosts: (string | null | undefined)[]): string {
  if (!referer) return "";
  let host = "";
  try {
    host = new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
  if (!host) return "";
  const own = ownHosts.filter(Boolean).map((item) => String(item).toLowerCase().replace(/:\d+$/, "").replace(/^www\./, ""));
  if (own.includes(host)) return INTERNAL_SOURCE;
  const known = KNOWN_SOURCES.find(([pattern]) => pattern.test(host));
  return known ? known[1] : cleanLabel(host);
}

/** utm_source manda; si no hay, se usa el sitio de origen. */
export function resolveSource(utm: string | null | undefined, referer: string | null | undefined, ownHosts: (string | null | undefined)[]): string {
  return cleanLabel(utm) || referrerSource(referer, ownHosts);
}
/** Primer valor de un parámetro de URL (puede venir repetido). */
export function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}