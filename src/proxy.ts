import { neon } from "@neondatabase/serverless";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectTarget } from "@/lib/catalog-lifecycle";

/** Caché breve en memoria del proceso (útil bajo ráfagas; no es caché global multi-instancia). */
const GATE_TTL_MS = 15_000;
const GATE_MAX = 400;
const gateCache = new Map<string, { at: number; kind: "ok" | "missing" | "redirect"; target?: string }>();

function gateGet(key: string) {
  const hit = gateCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > GATE_TTL_MS) {
    gateCache.delete(key);
    return null;
  }
  return hit;
}

function gateSet(key: string, kind: "ok" | "missing" | "redirect", target?: string) {
  if (gateCache.size >= GATE_MAX) {
    const first = gateCache.keys().next().value;
    if (first) gateCache.delete(first);
  }
  gateCache.set(key, { at: Date.now(), kind, target });
}

function withSecurity(request: NextRequest, response: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // GTM/GA4 solo se cargan tras consentimiento en la tienda pública (ver GtmLoader).
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com";
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; img-src 'self' https: blob: data:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; font-src 'self' https:; ${scriptSrc}; connect-src 'self' https:; frame-src https://www.google.com https://maps.google.com https://www.googletagmanager.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  );
  if (isProd) response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

function missing(request: NextRequest) {
  return withSecurity(request, NextResponse.rewrite(new URL("/__missing", request.url), { status: 404 }));
}

async function catalogGate(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/producto/") && !path.startsWith("/categoria/")) return null;
  const cached = gateGet(path);
  if (cached?.kind === "ok") return null;
  if (cached?.kind === "missing") return missing(request);
  if (cached?.kind === "redirect" && cached.target) return redirectUncached(request, cached.target);

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);

  if (path.startsWith("/producto/")) {
    const slug = path.slice("/producto/".length);
    if (!slug || slug.includes("/")) return missing(request);
    // Producto activo gana sobre redirecciones viejas (p. ej. tras borrar y recrear el mismo slug).
    const rows = await sql`select 1 as ok from products where slug = ${slug} and status = 'active' limit 1`;
    if (rows.length) {
      gateSet(path, "ok");
      return null;
    }
    const redirects = await sql`select to_path from slug_redirects where from_path = ${path} limit 1`;
    const target = safeRedirectTarget(redirects[0]?.to_path);
    if (target) {
      gateSet(path, "redirect", target);
      return redirectUncached(request, target);
    }
    gateSet(path, "missing");
    return missing(request);
  }

  const parts = path.slice("/categoria/".length).split("/").filter(Boolean);
  if (parts.length === 1) {
    const rows = await sql`
      select 1 as ok from categories
      where slug = ${parts[0]} and status = 'active' and parent_id is null
      limit 1
    `;
    if (rows.length) {
      gateSet(path, "ok");
      return null;
    }
    const redirects = await sql`select to_path from slug_redirects where from_path = ${path} limit 1`;
    const target = safeRedirectTarget(redirects[0]?.to_path);
    if (target) {
      gateSet(path, "redirect", target);
      return redirectUncached(request, target);
    }
    gateSet(path, "missing");
    return missing(request);
  }
  if (parts.length === 2) {
    const rows = await sql`
      select 1 as ok
      from categories child
      join categories parent on parent.id = child.parent_id
      where parent.slug = ${parts[0]}
        and parent.status = 'active'
        and child.slug = ${parts[1]}
        and child.status = 'active'
      limit 1
    `;
    if (rows.length) {
      gateSet(path, "ok");
      return null;
    }
    const redirects = await sql`select to_path from slug_redirects where from_path = ${path} limit 1`;
    const target = safeRedirectTarget(redirects[0]?.to_path);
    if (target) {
      gateSet(path, "redirect", target);
      return redirectUncached(request, target);
    }
    gateSet(path, "missing");
    return missing(request);
  }
  return missing(request);
}

function redirectUncached(request: NextRequest, target: string) {
  const response = NextResponse.redirect(new URL(target, request.url), 307);
  // Evita que el router cliente de Next cachee tumbas SEO y deje clics muertos.
  response.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  return withSecurity(request, response);
}

async function brandFaviconRedirect(request: NextRequest) {
  if (request.nextUrl.pathname !== "/favicon.ico") return null;
  const cached = gateGet("favicon");
  if (cached?.kind === "redirect" && cached.target) {
    return NextResponse.redirect(cached.target, 307);
  }
  if (cached?.kind === "missing") {
    return new NextResponse(null, { status: 204 });
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return new NextResponse(null, { status: 204 });
  const sql = neon(databaseUrl);
  const rows = await sql`select favicon_url from business_branding where business_id = 1 limit 1`;
  const favicon = typeof rows[0]?.favicon_url === "string" ? rows[0].favicon_url.trim() : "";
  if (!favicon || !/^https:\/\//i.test(favicon)) {
    gateSet("favicon", "missing");
    return new NextResponse(null, { status: 204 });
  }
  gateSet("favicon", "redirect", favicon);
  return NextResponse.redirect(favicon, 307);
}

export async function proxy(request: NextRequest) {
  try {
    const favicon = await brandFaviconRedirect(request);
    if (favicon) return favicon;
  } catch {
    // Sin favicon parametrizado, el navegador sigue con los <link rel="icon"> del HTML.
  }
  try {
    const gated = await catalogGate(request);
    if (gated) return gated;
  } catch {
    // Si la base no responde, la página sigue con su propia validación.
  }
  return withSecurity(request, NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
