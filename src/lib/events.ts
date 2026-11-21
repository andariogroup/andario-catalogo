import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { clientAddress } from "@/lib/security";
import { recordEvent } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import {
  ACTION_DEDUPE_MS,
  VIEW_DEDUPE_MS,
  allowEvent,
  cleanLabel,
  isBotUserAgent,
  isClientEvent,
  isPrefetchRequest,
  isProductId,
  isRecentDuplicate,
  resolveSource,
  type EventWindow,
} from "@/lib/event-guards";

const eventWindows = new Map<string, EventWindow>();
const recentEvents = new Map<string, number>();

type RequestHeaders = Awaited<ReturnType<typeof headers>>;

/** Bots, precargas y visitas de quien administra la tienda no son clientes. */
async function isInternalTraffic(requestHeaders: RequestHeaders, allowPrefetch = false) {
  if (isBotUserAgent(requestHeaders.get("user-agent"))) return true;
  if (!allowPrefetch && isPrefetchRequest((name) => requestHeaders.get(name))) return true;
  return (await cookies()).has(SESSION_COOKIE);
}

function store(name: string, path: string, productId: string | undefined, source: string) {
  after(async () => {
    try {
      await recordEvent(name, path, productId, source);
    } catch (error) {
      console.error("No se pudo registrar el evento", error);
    }
  });
}

/**
 * Registra una vista sin retrasar la respuesta. Úsalo desde Server Components.
 * `source` es el utm_source de la URL; si falta se usa el sitio de origen (Google, Instagram…).
 * En eventos "search" `source` es la cantidad de resultados y se guarda tal cual.
 */
export async function trackView(name: string, path: string, productId?: string, source?: string) {
  const requestHeaders = await headers();
  if (await isInternalTraffic(requestHeaders)) return;
  const address = clientAddress(requestHeaders.get("x-forwarded-for"));
  if (isRecentDuplicate(recentEvents, `${address}|${name}|${path}|${productId ?? ""}`, Date.now(), VIEW_DEDUPE_MS)) return;
  const ownHosts = [requestHeaders.get("host"), requestHeaders.get("x-forwarded-host")];
  const finalSource = name === "search" ? cleanLabel(source, 10) : resolveSource(source, requestHeaders.get("referer"), ownHosts);
  store(name, path, productId, finalSource);
}

/** Registra un evento enviado desde el navegador, con lista permitida, límite por visitante y validación. */
export async function trackClientEvent(name: string, path: string, productId = "", source = "") {
  if (!isClientEvent(name)) return;
  if (typeof path !== "string" || !path.startsWith("/")) return;
  const requestHeaders = await headers();
  if (await isInternalTraffic(requestHeaders, true)) return;
  const address = clientAddress(requestHeaders.get("x-forwarded-for"));
  if (!allowEvent(eventWindows, address, Date.now())) return;
  const safeProduct = isProductId(productId) ? productId : undefined;
  if (isRecentDuplicate(recentEvents, `${address}|${name}|${path}|${safeProduct ?? ""}|${source}`, Date.now(), ACTION_DEDUPE_MS)) return;
  store(name, path, safeProduct, cleanLabel(source));
}
