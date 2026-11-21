import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd, catalogOrigin, categorySeoTitle, clip, collectionJsonLd, pageOpenGraph, titled } from "@/lib/seo";
import { loadShell, productFirstPhotos, redirectTarget } from "@/lib/store";
import { trackView } from "@/lib/events";
import { queryValue } from "@/lib/event-guards";

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
  const rawTitle = categorySeoTitle(category.name, category.seoTitle);
  const title = titled(rawTitle, brand);
  const description = clip(category.seoDescription || category.description || "", 160) || undefined;
  const path = `/categoria/${slug}/${child}`;
  const ogTitle = typeof title === "object" ? title.absolute : brand ? `${rawTitle} · ${brand}` : rawTitle;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ title: ogTitle, description, path, brand, image: category.imageUrl || shell?.brand.socialImageUrl || shell?.brand.logoUrl }),
  };
}

export default async function ChildCategoryPage({ params, searchParams }: { params: Promise<{ slug: string; child: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
  await trackView("category_view", path, undefined, queryValue((await searchParams).utm_source));
  const shell = await loadShell().catch(() => null);
  const items = (await db.select().from(products).where(eq(products.categoryId, category.id))).filter((item) => item.status === "active");
  const firstPhotos = await productFirstPhotos(items.map((item) => item.id));
  const cards = items.map((item) => ({ item, photo: firstPhotos.get(item.id)?.url ?? "" }));
  const symbol = shell?.business.currencySymbol ?? "$";
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  const pageUrl = `${origin}${path}`;

  return (
    <main className="wrap section catalog-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: shell?.business.name || "Inicio", url: origin },
          { name: "Catálogo", url: `${origin}/catalogo` },
          { name: parent.name, url: `${origin}/categoria/${parent.slug}` },
          { name: category.name, url: pageUrl },
        ])}
      />
      <JsonLd
        data={collectionJsonLd({
          name: category.name,
          description: clip(category.seoDescription || category.description || "", 160) || undefined,
          url: pageUrl,
          items: cards.map(({ item }) => ({ name: item.name, url: `${origin}/producto/${item.slug}` })),
        })}
      />
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
