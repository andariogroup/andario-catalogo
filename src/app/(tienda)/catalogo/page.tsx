import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { normalizeCatalogKind, parseCatalogOptionIds } from "@/lib/catalog-facets";
import { catalogCanonical } from "@/lib/seo";
import { catalogCardPhoto, listCatalog, listCatalogFacets, loadShell, recordEvent } from "@/lib/store";

function asParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(",");
  return value;
}

function normalizeQuery(raw: Record<string, string | string[] | undefined>) {
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    const text = asParam(value)?.trim();
    query[key] = text || undefined;
  }
  // Unificar checkboxes repetidos `opciones` en un solo param canónico.
  if (Array.isArray(raw.opciones)) {
    query.opciones = raw.opciones.map((item) => item.trim()).filter(Boolean).join(",") || undefined;
  }
  return query;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = normalizeQuery(await searchParams);
  const shell = await loadShell().catch(() => null);
  const filtered = Boolean(
    query.q || query.disponibilidad || query.minimo || query.maximo || query.opcion || query.opciones || query.tipo,
  );
  const description =
    shell?.business.shortDescription ||
    shell?.business.slogan ||
    `Catálogo de ${shell?.business.name || "productos"}`;
  return {
    title: "Catálogo",
    description,
    alternates: { canonical: catalogCanonical(filtered ? { categoria: query.categoria } : query) },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = normalizeQuery(await searchParams);
  const shell = await loadShell();
  const page = Number(query.pagina) || 1;
  const optionIds = parseCatalogOptionIds(query);
  const kind = normalizeCatalogKind(query.tipo) || undefined;
  const db = getDb();
  const catalogQuery = {
    q: query.q,
    category: query.categoria,
    availability: query.disponibilidad,
    option: query.opcion,
    options: optionIds,
    kind,
    min: query.minimo ? Number(query.minimo) : undefined,
    max: query.maximo ? Number(query.maximo) : undefined,
    sort: query.orden,
    page,
  };
  const [facets, result, categoryRows] = await Promise.all([
    listCatalogFacets(catalogQuery),
    listCatalog(catalogQuery),
    db
      ? db
          .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            parentId: categories.parentId,
            status: categories.status,
          })
          .from(categories)
          .where(eq(categories.status, "active"))
      : Promise.resolve([]),
  ]);
  await recordEvent("catalog_view", "/catalogo", undefined, query.utm_source);
  const cards = await Promise.all(
    result.rows.map(async (product) => ({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        kind: product.kind,
        pricePesos: product.pricePesos,
        comparePesos: product.comparePesos,
        priceMode: product.priceMode,
        availability: product.availability,
        featured: product.featured,
      },
      photo: await catalogCardPhoto(product.id, optionIds),
    })),
  );

  // Facetas como catálogo plano para chips (compat catalogActiveFilters).
  const filterCatalog = facets.attributes.map((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    options: attribute.options.map((option) => ({ id: option.id, label: option.label })),
  }));

  return (
    <CatalogView
      business={{
        name: shell?.business.name ?? "",
        slogan: shell?.business.slogan ?? "",
        shortDescription: shell?.business.shortDescription ?? "",
        currencySymbol: shell?.business.currencySymbol ?? "$",
      }}
      query={query}
      filters={filterCatalog}
      facets={facets}
      categories={categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
      }))}
      cards={cards}
      optionIds={optionIds}
      total={result.total}
      page={result.page}
      pages={result.pages}
    />
  );
}
