import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { FichaVista } from "@/components/catalog/ficha";
import { JsonLd } from "@/components/shared/json-ld";
import { getDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { cartStoreId } from "@/lib/cart";
import { clip, breadcrumbJsonLd, catalogOrigin, productJsonLd, titled } from "@/lib/seo";
import { getActiveProduct, loadShell, publishedPolicySlugs, recordEvent, redirectTarget } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getActiveProduct(slug);
  if (!found) notFound();
  const shell = await loadShell().catch(() => null);
  const brand = shell?.business.name?.trim() ?? "";
  const rawTitle = found.product.seoTitle || found.product.name;
  const title = titled(rawTitle, brand);
  const description = clip(found.product.seoDescription || found.product.shortDescription || found.product.description, 160);
  const path = `/producto/${found.product.slug}`;
  // Misma marca que el <title>: si ya viene en seoTitle no se duplica; si no, se añade al OG.
  const ogTitle = typeof title === "object" ? title.absolute : brand ? `${rawTitle} · ${brand}` : rawTitle;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description,
      url: path,
      type: "website",
      ...(brand ? { siteName: brand } : {}),
      images: found.photos[0] ? [found.photos[0].url] : [],
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const opcionesRaw = raw.opciones;
  const initialOptionIds = (Array.isArray(opcionesRaw) ? opcionesRaw.join(",") : (opcionesRaw ?? ""))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const shell = await loadShell();
  const found = await getActiveProduct(slug);
  if (!found) {
    const target = await redirectTarget(`/producto/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  if (!shell) return null;
  await recordEvent("product_view", `/producto/${found.product.slug}`, found.product.id);
  const origin = catalogOrigin(shell.settings.publicUrl);
  const url = `${origin}/producto/${found.product.slug}`;
  const price = found.product.pricePesos == null ? null : Number(found.product.pricePesos);
  const comparePesos = found.product.comparePesos == null ? null : Number(found.product.comparePesos);
  const facts = found.values.flatMap((row) => {
    const definition = found.defs.find((item) => item.id === row.attributeId);
    if (!definition?.visible || definition.kind === "single" || definition.kind === "multi" || !row.value.trim()) {
      return [];
    }
    return [{ id: definition.id, name: definition.name, value: row.value }];
  });
  const visibleValues = found.varVals.filter((item) =>
    found.defs.some((definition) => definition.id === item.attributeId && definition.visible),
  );
  const attributeIds = [...new Set(visibleValues.map((item) => item.attributeId))];
  const attributes = found.defs
    .filter((item) => attributeIds.includes(item.id))
    .map((item) => ({ id: item.id, name: item.name }));
  const db = getDb();
  const categoryRow =
    found.product.categoryId && db
      ? (
          await db
            .select({ id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId })
            .from(categories)
            .where(eq(categories.id, found.product.categoryId))
            .limit(1)
        )[0]
      : undefined;
  let category: { name: string; href: string } | null = null;
  if (categoryRow) {
    if (categoryRow.parentId && db) {
      const [parent] = await db
        .select({ slug: categories.slug, name: categories.name })
        .from(categories)
        .where(eq(categories.id, categoryRow.parentId))
        .limit(1);
      category = parent
        ? { name: categoryRow.name, href: `/categoria/${parent.slug}/${categoryRow.slug}` }
        : { name: categoryRow.name, href: `/catalogo?categoria=${categoryRow.id}` };
    } else {
      category = { name: categoryRow.name, href: `/categoria/${categoryRow.slug}` };
    }
  }
  const policies = await publishedPolicySlugs();
  const related = found.related.filter((item) => item.id !== found.product.id).slice(0, 4);

  return (
    <main className="wrap section ficha-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: shell.business.name, url: origin },
          { name: "Catálogo", url: `${origin}/catalogo` },
          ...(category ? [{ name: category.name, url: `${origin}${category.href}` }] : []),
          { name: found.product.name, url },
        ])}
      />
      <JsonLd
        data={productJsonLd({
          name: found.product.name,
          description: clip(found.product.seoDescription || found.product.shortDescription || found.product.description, 160),
          sku: found.product.sku || found.product.slug,
          image: found.photos.map((photo) => photo.url),
          url,
          price,
          priceMode: found.product.priceMode,
          availability: found.product.availability,
          kind: found.product.kind,
          store: shell.business.name,
        })}
      />
      <FichaVista
        name={found.product.name}
        photos={found.photos.map((photo) => ({ url: photo.url, alt: photo.alt }))}
        albums={Object.fromEntries(
          found.vars.flatMap((item) => {
            const album = found.variantPhotos
              .filter((photo) => photo.variantId === item.id)
              .map((photo) => ({ url: photo.url, alt: photo.alt }));
            const key = visibleValues
              .filter((value) => value.variantId === item.id)
              .map((value) => value.optionId)
              .sort()
              .join(".");
            return album.length && key ? [[key, album]] : [];
          }),
        )}
        store={shell.business.name}
        storeId={cartStoreId(shell.business.id, shell.settings.publicUrl)}
        phone={shell.business.whatsapp}
        symbol={shell.business.currencySymbol}
        product={{
          id: found.product.id,
          name: found.product.name,
          sku: found.product.sku,
          price,
          priceMode: found.product.priceMode,
          availability: found.product.availability,
          kind: found.product.kind,
        }}
        variants={found.vars.map((item) => ({
          id: item.id,
          signature: item.signature,
          pricePesos: item.pricePesos,
          availability: item.availability,
          sku: item.sku,
        }))}
        options={found.options.map((item) => ({ id: item.id, attributeId: item.attributeId, label: item.label }))}
        values={visibleValues.map((item) => ({
          variantId: item.variantId,
          attributeId: item.attributeId,
          optionId: item.optionId,
        }))}
        attributes={attributes}
        comparePesos={comparePesos}
        shortDescription={found.product.shortDescription || ""}
        description={found.product.description || ""}
        facts={facts}
        tags={found.tags}
        policies={policies}
        category={category}
        url={url}
        intro={shell.settings.whatsappProduct}
        initialOptionIds={initialOptionIds}
      />
      {related.length ? (
        <section className="ficha-related" aria-labelledby="ficha-related-title">
          <h2 id="ficha-related-title">También en esta categoría</h2>
          <ul>
            {related.map((item) => (
              <li key={item.id}>
                <a href={`/producto/${item.slug}`}>{item.name}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}


