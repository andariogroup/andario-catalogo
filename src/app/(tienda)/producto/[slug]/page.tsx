import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { FichaVista } from "@/components/catalog/ficha";
import { ProductSuggestions } from "@/components/catalog/product-suggestions";
import { JsonLd } from "@/components/shared/json-ld";
import { cartStoreId } from "@/lib/cart";
import { breadcrumbJsonLd, catalogOrigin, pageOpenGraph, productJsonLd, productSeoDescription, productSeoTitle, titled } from "@/lib/seo";
import { getActiveProduct, loadShell, publishedPolicySlugs, redirectTarget } from "@/lib/store";
import { trackView } from "@/lib/events";
import { queryValue } from "@/lib/event-guards";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getActiveProduct(slug);
  if (!found) notFound();
  const shell = await loadShell().catch(() => null);
  const brand = shell?.business.name?.trim() ?? "";
  const rawTitle = productSeoTitle(found.product.name, found.product.seoTitle);
  const title = titled(rawTitle, brand);
  const description = productSeoDescription({
    seoDescription: found.product.seoDescription,
    shortDescription: found.product.shortDescription,
    description: found.product.description,
    categoryTexts: [found.categoryRow?.description, found.categoryRow?.seoDescription, found.parentRow?.description, found.parentRow?.seoDescription],
  });
  const path = `/producto/${found.product.slug}`;
  // Misma marca que el <title>: si ya viene en seoTitle no se duplica; si no, se añade al OG.
  const ogTitle = typeof title === "object" ? title.absolute : brand ? `${rawTitle} · ${brand}` : rawTitle;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ title: ogTitle, description, path, brand, image: found.photos[0]?.url }),
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
  await trackView("product_view", `/producto/${found.product.slug}`, found.product.id, queryValue(raw.utm_source));
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
  const categoryRow = found.categoryRow;
  const parent = found.parentRow;
  let category: { name: string; href: string } | null = null;
  if (categoryRow) {
    if (categoryRow.parentId) {
      category = parent
        ? { name: categoryRow.name, href: `/categoria/${parent.slug}/${categoryRow.slug}` }
        : { name: categoryRow.name, href: `/catalogo?categoria=${categoryRow.id}` };
    } else {
      category = { name: categoryRow.name, href: `/categoria/${categoryRow.slug}` };
    }
  }
  const policies = await publishedPolicySlugs();

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
          description: productSeoDescription({
            seoDescription: found.product.seoDescription,
            shortDescription: found.product.shortDescription,
            description: found.product.description,
            categoryTexts: [categoryRow?.description, categoryRow?.seoDescription, parent?.description, parent?.seoDescription],
          }),
          sku: found.product.sku || found.product.slug,
          image: found.photos.map((photo) => photo.url),
          url,
          price,
          priceMode: found.product.priceMode,
          availability: found.product.availability,
          kind: found.product.kind,
          store: shell.business.name,
          variantPrices: found.vars.flatMap((item) => (item.pricePesos == null ? [] : [Number(item.pricePesos)])),
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
          slug: found.product.slug,
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
      <Suspense fallback={null}>
        <ProductSuggestions
          productId={found.product.id}
          categoryId={found.product.categoryId}
          symbol={shell.business.currencySymbol}
        />
      </Suspense>
    </main>
  );
}


