import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { titled } from "@/lib/seo";
import { loadShell, productPhotos, recordEvent, redirectTarget } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; child: string }> }): Promise<Metadata> {
  const { slug, child } = await params;
  const db = getDb();
  if (!db) return { title: "No está", robots: { index: false, follow: false } };
  const [parent] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  const [category] = parent
    ? await db.select().from(categories).where(and(eq(categories.slug, child), eq(categories.parentId, parent.id))).limit(1)
    : [];
  if (!parent || parent.status !== "active" || !category || category.status !== "active") {
    notFound();
  }
  const shell = await loadShell().catch(() => null);
  const brand = shell?.business.name?.trim() ?? "";
  const rawTitle = category.seoTitle || category.name;
  const title = titled(rawTitle, brand);
  const description = category.seoDescription || category.description || undefined;
  const path = `/categoria/${slug}/${child}`;
  const ogTitle = typeof title === "object" ? title.absolute : brand ? `${rawTitle} · ${brand}` : rawTitle;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      ...(description ? { description } : {}),
      url: path,
      type: "website",
      ...(brand ? { siteName: brand } : {}),
    },
  };
}

export default async function ChildCategoryPage({ params }: { params: Promise<{ slug: string; child: string }> }) {
  const { slug, child } = await params;
  const path = `/categoria/${slug}/${child}`;
  const db = getDb();
  if (!db) return null;
  const [parent] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  const [category] = parent
    ? await db.select().from(categories).where(and(eq(categories.slug, child), eq(categories.parentId, parent.id))).limit(1)
    : [];
  if (!parent || parent.status !== "active" || !category || category.status !== "active") {
    const target = await redirectTarget(path);
    if (target) permanentRedirect(target);
    notFound();
  }
  await recordEvent("category_view", path);
  const shell = await loadShell().catch(() => null);
  const items = (await db.select().from(products).where(eq(products.categoryId, category.id))).filter((item) => item.status === "active");
  const cards = await Promise.all(items.map(async (item) => ({ item, photo: (await productPhotos(item.id))[0]?.url ?? "" })));
  const symbol = shell?.business.currencySymbol ?? "$";

  return (
    <main className="wrap section catalog-page">
      <header className="catalog-head">
        <div className="catalog-head-copy">
          <h1>{category.name}</h1>
          {category.description ? <p className="catalog-lead">{category.description}</p> : null}
        </div>
        <p className="catalog-count" aria-live="polite">
          {cards.length === 1 ? "1 producto" : `${cards.length} productos`}
        </p>
      </header>
      <nav className="catalog-crumbs" aria-label="Ubicación en el catálogo">
        <ol>
          <li>
            <Link href="/catalogo">Catálogo</Link>
          </li>
          <li>
            <Link href={`/categoria/${parent.slug}`}>{parent.name}</Link>
          </li>
          <li>
            <span aria-current="page">{category.name}</span>
          </li>
        </ol>
      </nav>
      {cards.length === 0 ? (
        <div className="catalog-empty">
          <h2>Sin productos en esta subcategoría</h2>
          <p>Explora la categoría padre o vuelve al catálogo completo.</p>
          <div className="catalog-empty-actions">
            <Link className="btn" href={`/categoria/${parent.slug}`}>
              Ver {parent.name}
            </Link>
            <Link className="quiet" href="/catalogo">
              Ir al catálogo
            </Link>
          </div>
        </div>
      ) : (
        <div className="catalog-grid">
          {cards.map(({ item, photo }) => (
            <ProductCard
              key={item.id}
              product={{
                id: item.id,
                name: item.name,
                slug: item.slug,
                shortDescription: item.shortDescription,
                kind: item.kind,
                pricePesos: item.pricePesos,
                comparePesos: item.comparePesos,
                priceMode: item.priceMode,
                availability: item.availability,
                featured: item.featured,
              }}
              photo={photo}
              symbol={symbol}
            />
          ))}
        </div>
      )}
    </main>
  );
}
