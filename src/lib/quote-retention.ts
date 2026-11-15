import "server-only";

import { eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { quotes, settings } from "@/lib/db/schema";
import { retentionCutoff } from "@/lib/quotes";

export async function purgeExpiredQuotes(): Promise<{ removed: number; days: number | null }> {
  const db = getDb();
  if (!db) return { removed: 0, days: null };
  const [row] = await db.select({ days: settings.quoteRetentionDays }).from(settings).where(eq(settings.businessId, 1)).limit(1);
  const days = row?.days ?? null;
  const cutoff = days == null ? null : retentionCutoff(days);
  if (!cutoff) return { removed: 0, days };
  const removed = await db.delete(quotes).where(lt(quotes.createdAt, cutoff)).returning({ id: quotes.id });
  return { removed: removed.length, days };
}
