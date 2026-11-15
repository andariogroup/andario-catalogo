import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { titled } from "@/lib/seo";
import { loadShell, productPhotos, recordEvent, redirectTarget } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const [category] = db ? await db.select().from(categories).where(eq(categories.slug, slug)).limit(1) : [];
  if (!category || category.status !== "active" || category.parentId) notFound();
  const shell = await loadShell().catch(() => null);
  const title = titled(category.seoTitle || category.name, shell?.business.name ?? "");
  const description = category.seoDescription || category.description || undefined;
  return { title, description, alternates: { canonical: `/categoria/${slug}` } };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  if (!db) return null;
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!category || category.status !== "active" || category.parentId) {
    const target = await redirectTarget(`/categoria/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  await recordEvent("category_view", `/categoria/${slug}`);
  const shell = await loadShell().catch(() => null);
  const children = await db.select().from(categories).where(eq(categories.parentId, category.id));
  const scopeIds = [category.id, ...children.map((child) => child.id)];
  const items = (await db.select().from(products).where(inArray(products.categoryId, scopeIds))).filter((item) => item.status === "active");
  const cards = await Promise.all(items.map(async (item) => ({ item, photo: (await productPhotos(item.id))[0]?.url ?? "" })));
  const symbol = shell?.business.currencySymbol ?? "$";

  const activeChildren = children.filter((item) => item.status === "active");

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
            <span aria-current="page">{category.name}</span>
          </li>
        </ol>
      </nav>
      {activeChildren.length ? (
        <nav className="catalog-subs" aria-label="Subcategorías">
          {activeChildren.map((item) => (
            <Link className="catalog-sub" key={item.id} href={`/categoria/${category.slug}/${item.slug}`}>
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {cards.length === 0 ? (
        <div className="catalog-empty">
          <h2>Esta categoría aún no tiene piezas publicadas</h2>
          <p>Vuelve al catálogo para seguir explorando la selección disponible.</p>
          <Link className="btn" href="/catalogo">
            Ir al catálogo
          </Link>
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
