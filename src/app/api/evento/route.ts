import { trackClientEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const MAX_BODY = 1000;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Recibe eventos con `navigator.sendBeacon`, que sobrevive a la navegación (por ejemplo al abrir WhatsApp
 * en la misma pestaña). Una server action se cancelaría en ese momento y el clic no quedaría registrado.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== "object") return new Response(null, { status: 400 });
  const { name, path, productId, source } = body as Record<string, unknown>;
  if (typeof name !== "string" || typeof path !== "string") return new Response(null, { status: 400 });
  await trackClientEvent(name.slice(0, 40), path.slice(0, 180), typeof productId === "string" ? productId.slice(0, 64) : "", typeof source === "string" ? source.slice(0, 60) : "");
  return new Response(null, { status: 204 });
}
