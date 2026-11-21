import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { ProductCard } from "@/components/catalog/product-card";
import { getDb } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd, catalogOrigin, categorySeoTitle, clip, collectionJsonLd, pageOpenGraph, titled } from "@/lib/seo";
import { loadShell, productFirstPhotos, redirectTarget } from "@/lib/store";
import { trackView } from "@/lib/events";
import { queryValue } from "@/lib/event-guards";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const [category] = db ? await db.select().from(categories).where(eq(categories.slug, slug)).limit(1) : [];
  if (!category || category.status !== "active" || category.parentId) notFound();
  const shell = await loadShell().catch(() => null);
  const brand = shell?.business.name?.trim() ?? "";
  const rawTitle = categorySeoTitle(category.name, category.seoTitle);
  const title = titled(rawTitle, brand);
  const description = clip(category.seoDescription || category.description || "", 160) || undefined;
  const path = `/categoria/${slug}`;
  const ogTitle = typeof title === "object" ? title.absolute : brand ? `${rawTitle} · ${brand}` : rawTitle;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ title: ogTitle, description, path, brand, image: category.imageUrl || shell?.brand.socialImageUrl || shell?.brand.logoUrl }),
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const db = getDb();
  if (!db) return null;
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!category || category.status !== "active" || category.parentId) {
    const target = await redirectTarget(`/categoria/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  await trackView("category_view", `/categoria/${slug}`, undefined, queryValue((await searchParams).utm_source));
  const shell = await loadShell().catch(() => null);
  const children = await db.select().from(categories).where(eq(categories.parentId, category.id));
  const scopeIds = [category.id, ...children.map((child) => child.id)];
  const items = (await db.select().from(products).where(inArray(products.categoryId, scopeIds))).filter((item) => item.status === "active");
  const firstPhotos = await productFirstPhotos(items.map((item) => item.id));
  const cards = items.map((item) => ({ item, photo: firstPhotos.get(item.id)?.url ?? "" }));
  const symbol = shell?.business.currencySymbol ?? "$";

  const activeChildren = children.filter((item) => item.status === "active");
  const origin = catalogOrigin(shell?.settings.publicUrl ?? "");
  const pageUrl = `${origin}/categoria/${category.slug}`;

  return (
    <main className="wrap section catalog-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: shell?.business.name || "Inicio", url: origin },
          { name: "Catálogo", url: `${origin}/catalogo` },
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
