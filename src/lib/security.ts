import { createHash } from "node:crypto";

export const LOGIN_LIMIT = 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function clientAddress(header: string | null): string {
  const first = header?.split(",")[0]?.trim() ?? "";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(first) || first.includes(":")) return first;
  return "local";
}

export function attemptKey(secret: string, kind: string, address: string, extra = ""): string {
  return createHash("sha256").update(`${secret}|${kind}|${address}|${extra.toLowerCase()}`).digest("hex");
}

export function nextAttempt(stored: { count: number; windowStart: number } | null, now: number, limit: number, windowMs: number) {
  if (!stored || now - stored.windowStart >= windowMs) return { allowed: true, count: 1, windowStart: now };
  if (stored.count >= limit) return { allowed: false, count: stored.count, windowStart: stored.windowStart };
  return { allowed: true, count: stored.count + 1, windowStart: stored.windowStart };
}

export function publicError(detail: string, production: boolean, fallback: string): string {
  if (production) console.error(detail);
  return production ? fallback : detail;
}
