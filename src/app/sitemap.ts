import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories, contentPages, products } from "@/lib/db/schema";
import { catalogOrigin } from "@/lib/seo";
import { loadShell } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shell = await loadShell().catch(() => null);
  if (shell?.settings.indexable === false) return [];
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  const entries: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/catalogo`, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/sobre-nosotros`, changeFrequency: "monthly", priority: 0.4 },
  ];
  const db = getDb();
  if (!db) return entries;
  const cats = await db.select().from(categories).where(eq(categories.status, "active"));
  const items = await db.select().from(products).where(eq(products.status, "active"));
  const pages = await db.select().from(contentPages).where(eq(contentPages.published, true));
  for (const category of cats) {
    if (category.parentId) {
      const parent = cats.find((item) => item.id === category.parentId);
      if (!parent) continue;
      entries.push({ url: `${origin}/categoria/${parent.slug}/${category.slug}`, changeFrequency: "weekly", priority: 0.6 });
      continue;
    }
    entries.push({ url: `${origin}/categoria/${category.slug}`, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const product of items) entries.push({ url: `${origin}/producto/${product.slug}`, changeFrequency: "weekly", priority: 0.7 });
  for (const page of pages) entries.push({ url: `${origin}/politicas/${page.slug}`, changeFrequency: "yearly", priority: 0.2 });
  return entries;
}
