import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, eq, sql } from "drizzle-orm";
import ws from "ws";
import { databaseUrl } from "@/lib/env";
import { nextAttempt } from "@/lib/security";
import * as schema from "./schema";
import { auditEvents, rateLimits } from "./schema";

neonConfig.webSocketConstructor = ws;

const globalPool = globalThis as unknown as { andarioPool?: Pool };

export function getDb() {
  const connectionString = databaseUrl();
  if (!connectionString) return null;
  if (!globalPool.andarioPool) globalPool.andarioPool = new Pool({ connectionString, max: 10 });
  return drizzle(globalPool.andarioPool, { schema });
}

export async function takeAttempt(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const now = Date.now();
  const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  const stored = rows[0] ? { count: rows[0].count, windowStart: rows[0].windowStart.getTime() } : null;
  const next = nextAttempt(stored, now, limit, windowMs);
  if (!next.allowed) return false;
  await db
    .insert(rateLimits)
    .values({ key, count: next.count, windowStart: new Date(next.windowStart) })
    .onConflictDoUpdate({ target: rateLimits.key, set: { count: next.count, windowStart: new Date(next.windowStart) } });
  return true;
}

export async function recordAudit(actor: string, action: string, entity: string) {
  const db = getDb();
  if (!db) return;
  await db.insert(auditEvents).values({ id: crypto.randomUUID(), actor, action, entity });
}

export function isMissingSchema(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "42P01";
}

export async function tableReady(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await db.execute(sql`select 1 from business limit 1`);
    return true;
  } catch (error) {
    if (isMissingSchema(error)) return false;
    throw error;
  }
}

export { and, eq };
