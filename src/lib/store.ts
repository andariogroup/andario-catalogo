import "server-only";

import { cache } from "react";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, notInArray, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { SQL_ACCENT_FROM, SQL_ACCENT_TO, likePattern, searchTokens } from "@/lib/search";
import { getDb } from "@/lib/db";
import { STORE_TIMEZONE, fillDays, type DashboardRange, type EventCounts } from "@/lib/dashboard-metrics";
import { rankRelatedProducts } from "@/lib/ficha-related";
import { INTERNAL_SOURCE } from "@/lib/event-guards";
import { purgeExpiredQuotes } from "@/lib/quote-retention";
import type { LibraryItem, LibraryUse } from "@/lib/library";
import {
  analyticsEvents,
  auditEvents,
  announcement,
  attributes,
  attributeOptions,
  banners,
  categoryAttributes,
  branding,
  business,
  categories,
  contentPages,
  heroSettings,
  heroSlides,
  homeSections,
  mediaAssets,
  productAttributeValues,
  productMedia,
  products,
  productTags,
  quotes,
  quoteItems,
  quoteNotes,
  settings,
  slugRedirects,
  socialLinks,
  users,
  variantMedia,
  variants,
  variantValues,
} from "@/lib/db/schema";
import {
  buildFacetGroups,
  catalogKindFilterLabel,
  groupSelectedOptions,
  normalizeCatalogKind,
  pickMatchingVariant,
  priceInRange,
  resolveVariantDisplayPrice,
  variantMatchesSelection,
} from "@/lib/catalog-facets";
import { pesosFromDb } from "@/lib/money";

const PAGE_SIZE = 12;

/** Todas las palabras deben aparecer (sin importar tildes ni mayúsculas) en nombre, SKU o descripciones. */
function productSearchClause(q: string | undefined) {
  const tokens = searchTokens(q);
  if (!tokens.length) return null;
  const fold = (column: SQLWrapper) => sql`translate(${column}, ${SQL_ACCENT_FROM}, ${SQL_ACCENT_TO})`;
  const perToken = tokens.map((token) => {
    const pattern = likePattern(token);
    return or(
      sql`${fold(products.name)} ilike ${pattern}`,
      sql`${fold(products.sku)} ilike ${pattern}`,
      sql`${fold(products.shortDescription)} ilike ${pattern}`,
      sql`${fold(products.description)} ilike ${pattern}`,
    )!;
  });
  return and(...perToken)!;
}

/**
 * Deduplica lecturas del shell dentro del mismo request (layout + metadata + página).
 * No usa caché entre requests: force-dynamic y fechas de Drizzle se conservan intactas.
 * Instalación single-business (docs/ARCHITECTURE.md).
 */
export const loadShell = cache(async () => {
  const db = getDb();
  if (!db) return null;
  const [businessRows, brandRows, configRows, socials] = await Promise.all([
    db.select().from(business).where(eq(business.id, 1)).limit(1),
    db.select().from(branding).where(eq(branding.businessId, 1)).limit(1),
    db.select().from(settings).where(eq(settings.businessId, 1)).limit(1),
    db.select().from(socialLinks),
  ]);
  const row = businessRows[0];
  const brand = brandRows[0];
  const config = configRows[0];
  if (!row || !brand || !config) return null;
  return { business: row, brand, settings: config, socials };
});

async function loadHomeRows() {
  const db = getDb();
  if (!db) return null;
  const [heroRows, slides, barRows, sections, promo] = await Promise.all([
    db.select().from(heroSettings).where(eq(heroSettings.id, 1)).limit(1),
    db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder)),
    db.select().from(announcement).where(eq(announcement.id, 1)).limit(1),
    db.select().from(homeSections).orderBy(asc(homeSections.sortOrder)),
    db.select().from(banners).where(eq(banners.active, true)).orderBy(asc(banners.sortOrder)),
  ]);
  return { hero: heroRows[0], slides: slides.filter((slide) => slide.active), bar: barRows[0], sections, promo };
}

export async function loadHomeEditor() {
  return loadHomeRows();
}

export async function loadHome() {
  const db = getDb();
  if (!db) return null;
  const [shell, rows, cats, featured, news] = await Promise.all([
    loadShell(),
    loadHomeRows(),
    db.select().from(categories).where(eq(categories.status, "active")).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(products).where(and(eq(products.status, "active"), eq(products.featured, true))).orderBy(asc(products.sortOrder), desc(products.createdAt)).limit(8),
    db.select().from(products).where(eq(products.status, "active")).orderBy(desc(products.createdAt)).limit(8),
  ]);
  if (!shell || !rows) return null;
  return { ...shell, ...rows, cats, featured, news };
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  /** Productos con precio anterior mayor al actual. No es una categoría. */
  offer?: boolean;
  availability?: string;
  /** Legacy: una sola opción. Preferir `options`. */
  option?: string;
  /** IDs de opciones de variante (pueden ser de varios atributos). */
  options?: string[];
  kind?: string;
  min?: number;
  max?: number;
  sort?: string;
  page?: number;
};

async function catalogCategoryIds(categoryId: string) {
  const db = getDb();
  if (!db) return [categoryId];
  const [self] = await db
    .select({ id: categories.id, status: categories.status })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  // Categoría inexistente o inactiva: sin alcance público.
  if (!self || self.status !== "active") return [];
  const childRows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.parentId, categoryId), eq(categories.status, "active")));
  return [categoryId, ...childRows.map((row) => row.id)];
}

/** Excluye productos cuya categoría está inactiva (los sin categoría sí pueden listarse). */
async function excludeInactiveCategoryProducts() {
  const db = getDb();
  if (!db) return null;
  const inactive = await db.select({ id: categories.id }).from(categories).where(eq(categories.status, "inactive"));
  if (!inactive.length) return null;
  return or(
    isNull(products.categoryId),
    notInArray(
      products.categoryId,
      inactive.map((row) => row.id),
    ),
  );
}

/** Oferta real: precio anterior mayor que el actual, y no «consultar precio». */
function catalogOfferClause() {
  return and(
    ne(products.priceMode, "ask"),
    isNotNull(products.comparePesos),
    isNotNull(products.pricePesos),
    sql`${products.comparePesos} > ${products.pricePesos}`,
  );
}

function catalogOptionIds(query: CatalogQuery) {
  const multi = (query.options ?? []).map((item) => item.trim()).filter(Boolean);
  if (multi.length) return [...new Set(multi)];
  const single = (query.option ?? "").trim();
  return single ? [single] : [];
}

/**
 * Productos cuya combinación de variantes cumple opciones (AND entre atributos, OR dentro),
 * y opcionalmente disponibilidad/precio a nivel de la variante coincidente.
 */
async function productIdsMatchingVariantFilters(input: {
  productIds: string[];
  optionIds: string[];
  availability?: string;
  min?: number;
  max?: number;
}) {
  const db = getDb();
  if (!db || input.productIds.length === 0) return [] as string[];

  const optionRows =
    input.optionIds.length > 0
      ? await db
          .select({ id: attributeOptions.id, attributeId: attributeOptions.attributeId })
          .from(attributeOptions)
          .where(inArray(attributeOptions.id, input.optionIds))
      : [];
  const selected = groupSelectedOptions(
    input.optionIds,
    optionRows.map((row) => ({ id: row.id, attributeId: row.attributeId, label: "" })),
  );

  // Validar que las opciones pertenezcan a atributos filtrables visibles.
  if (input.optionIds.length) {
    const attrIds = [...new Set(optionRows.map((row) => row.attributeId))];
    if (!attrIds.length) return [];
    const defs = await db
      .select({ id: attributes.id, kind: attributes.kind, visible: attributes.visible, filterable: attributes.filterable })
      .from(attributes)
      .where(inArray(attributes.id, attrIds));
    const allowed = new Set(
      defs
        .filter((definition) => definition.visible && definition.filterable && (definition.kind === "single" || definition.kind === "multi"))
        .map((definition) => definition.id),
    );
    for (const attributeId of selected.keys()) {
      if (!allowed.has(attributeId)) selected.delete(attributeId);
    }
    if (selected.size === 0 && input.optionIds.length > 0) return [];
  }

  const vars = await db.select().from(variants).where(inArray(variants.productId, input.productIds));
  if (!vars.length) {
    // Sin variantes: solo pueden pasar filtros de precio/disponibilidad a nivel producto (manejados fuera).
    return selected.size > 0 ? [] : input.productIds;
  }
  const variantIds = vars.map((item) => item.id);
  const vals = variantIds.length
    ? await db.select().from(variantValues).where(inArray(variantValues.variantId, variantIds))
    : [];
  const valuesByVariant = new Map<string, typeof vals>();
  for (const row of vals) {
    const list = valuesByVariant.get(row.variantId) ?? [];
    list.push(row);
    valuesByVariant.set(row.variantId, list);
  }
  const productPriceById = new Map(
    (
      await db
        .select({ id: products.id, pricePesos: products.pricePesos })
        .from(products)
        .where(inArray(products.id, input.productIds))
    ).map((row) => [row.id, row.pricePesos] as const),
  );

  const hits = new Set<string>();
  for (const variant of vars) {
    const rows = valuesByVariant.get(variant.id) ?? [];
    if (!variantMatchesSelection(rows, selected)) continue;
    if (input.availability && variant.availability !== input.availability) continue;
    const price = resolveVariantDisplayPrice(
      {
        id: variant.id,
        productId: variant.productId,
        pricePesos: variant.pricePesos,
        availability: variant.availability,
        imageUrl: variant.imageUrl,
      },
      productPriceById.get(variant.productId) ?? null,
    );
    if (!priceInRange(price, input.min, input.max)) continue;
    hits.add(variant.productId);
  }
  return [...hits];
}

export async function listCatalog(query: CatalogQuery) {
  const db = getDb();
  if (!db) return { rows: [], total: 0, page: 1, pages: 1 };
  const page = Math.max(1, query.page ?? 1);
  const optionIds = catalogOptionIds(query);
  const filters = [eq(products.status, "active")];
  const categoryVisibility = await excludeInactiveCategoryProducts();
  if (categoryVisibility) filters.push(categoryVisibility);
  const searchClause = productSearchClause(query.q);
  if (searchClause) filters.push(searchClause);
  if (query.category) {
    const scope = await catalogCategoryIds(query.category);
    if (!scope.length) return { rows: [], total: 0, page, pages: 1 };
    filters.push(inArray(products.categoryId, scope));
  }
  if (query.kind) filters.push(eq(products.kind, query.kind));
  if (query.offer) {
    const offer = catalogOfferClause();
    if (offer) filters.push(offer);
  }

  // Base de productos antes de facetas de variante.
  const baseRows = await db.select({ id: products.id }).from(products).where(and(...filters));
  let candidateIds = baseRows.map((row) => row.id);

  const usesVariantConstraints = optionIds.length > 0 || Boolean(query.availability) || query.min != null || query.max != null;
  if (usesVariantConstraints && candidateIds.length) {
    // Productos con variantes: evaluar combinación real.
    const withVariants = await db
      .select({ productId: variants.productId })
      .from(variants)
      .where(inArray(variants.productId, candidateIds));
    const variantProductIds = new Set(withVariants.map((row) => row.productId));
    const idsWithVariants = candidateIds.filter((id) => variantProductIds.has(id));
    const idsWithoutVariants = candidateIds.filter((id) => !variantProductIds.has(id));

    const matchedVariantProducts = idsWithVariants.length
      ? await productIdsMatchingVariantFilters({
          productIds: idsWithVariants,
          optionIds,
          availability: query.availability,
          min: query.min,
          max: query.max,
        })
      : [];

    // Sin variantes: no pueden satisfacer opciones de variante; sí precio/disponibilidad de producto.
    let matchedPlain = idsWithoutVariants;
    if (optionIds.length) matchedPlain = [];
    else if (idsWithoutVariants.length && (query.availability || query.min != null || query.max != null)) {
      const plainFilters = [inArray(products.id, idsWithoutVariants)];
      if (query.availability) plainFilters.push(eq(products.availability, query.availability));
      if (query.min != null) plainFilters.push(gte(products.pricePesos, String(query.min)));
      if (query.max != null) plainFilters.push(lte(products.pricePesos, String(query.max)));
      matchedPlain = (await db.select({ id: products.id }).from(products).where(and(...plainFilters))).map((row) => row.id);
    }

    candidateIds = [...new Set([...matchedVariantProducts, ...matchedPlain])];
    if (candidateIds.length === 0) return { rows: [], total: 0, page, pages: 1 };
    filters.push(inArray(products.id, candidateIds));
  }

  const where = and(...filters);
  const order =
    query.sort === "price-asc"
      ? [asc(products.pricePesos)]
      : query.sort === "price-desc"
        ? [desc(products.pricePesos)]
        : query.sort === "name"
          ? [asc(products.name)]
          : query.sort === "recent"
            ? [desc(products.createdAt)]
            : [asc(products.sortOrder), desc(products.createdAt)];
  const [[counted], rows] = await Promise.all([
    db.select({ total: count() }).from(products).where(where),
    db.select().from(products).where(where).orderBy(...order).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
  ]);
  const total = Number(counted?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { rows, total, page, pages };
}

/** Facetas contextuales derivadas de productos publicados visibles en el contexto actual. */
export async function listCatalogFacets(query: CatalogQuery) {
  const db = getDb();
  if (!db) {
    return {
      kinds: [] as { id: string; label: string; count: number }[],
      attributes: [] as {
        id: string;
        name: string;
        code: string;
        isColor: boolean;
        options: { id: string; label: string; count: number }[];
      }[],
      availability: [] as { id: string; label: string; count: number }[],
      useful: false,
    };
  }

  const optionIds = catalogOptionIds(query);
  const kind = normalizeCatalogKind(query.kind);
  const baseFilters = [eq(products.status, "active")];
  const categoryVisibility = await excludeInactiveCategoryProducts();
  if (categoryVisibility) baseFilters.push(categoryVisibility);
  const searchClause = productSearchClause(query.q);
  if (searchClause) baseFilters.push(searchClause);
  const categoryScope = query.category ? await catalogCategoryIds(query.category) : null;
  if (query.category) {
    if (!categoryScope?.length) return { kinds: [], attributes: [], availability: [], useful: false };
    baseFilters.push(inArray(products.categoryId, categoryScope));
  }
  if (kind) baseFilters.push(eq(products.kind, kind));
  if (query.offer) {
    const offer = catalogOfferClause();
    if (offer) baseFilters.push(offer);
  }

  const baseProducts = await db.select().from(products).where(and(...baseFilters));
  const baseIds = baseProducts.map((row) => row.id);
  if (!baseIds.length) {
    return { kinds: [], attributes: [], availability: [], useful: false };
  }

  const [defs, opts, links, vars, vals] = await Promise.all([
    db
      .select()
      .from(attributes)
      .where(and(eq(attributes.filterable, true), eq(attributes.visible, true), or(eq(attributes.kind, "single"), eq(attributes.kind, "multi"))))
      .orderBy(asc(attributes.sortOrder)),
    db.select().from(attributeOptions).orderBy(asc(attributeOptions.sortOrder)),
    db.select().from(categoryAttributes),
    db.select().from(variants).where(inArray(variants.productId, baseIds)),
    db.select().from(variantValues),
  ]);

  const valuesByVariant = new Map<string, typeof vals>();
  for (const row of vals) {
    if (!vars.some((variant) => variant.id === row.variantId)) continue;
    const list = valuesByVariant.get(row.variantId) ?? [];
    list.push(row);
    valuesByVariant.set(row.variantId, list);
  }

  const optionMeta = opts.map((option) => ({ id: option.id, attributeId: option.attributeId, label: option.label }));
  const selected = groupSelectedOptions(optionIds, optionMeta);

  // Atributos aplicables al contexto de categorías presentes.
  const categoryIds = [...new Set(baseProducts.map((row) => row.categoryId).filter(Boolean))] as string[];
  const applicableDefs = defs.filter((definition) => {
    const scoped = links.filter((link) => link.attributeId === definition.id);
    if (!scoped.length) return true;
    return categoryIds.some((categoryId) => scoped.some((link) => link.categoryId === categoryId));
  });

  const optionHits = new Map<string, number>();
  for (const definition of applicableDefs) {
    // Faceta A: ignorar selección de A; aplicar el resto.
    const selectedOthers = new Map(selected);
    selectedOthers.delete(definition.id);
    const productHits = new Map<string, Set<string>>(); // optionId -> productIds

    for (const variant of vars) {
      const rows = valuesByVariant.get(variant.id) ?? [];
      if (!variantMatchesSelection(rows, selectedOthers)) continue;
      if (query.availability && variant.availability !== query.availability) continue;
      const product = baseProducts.find((row) => row.id === variant.productId);
      const price = resolveVariantDisplayPrice(
        {
          id: variant.id,
          productId: variant.productId,
          pricePesos: variant.pricePesos,
          availability: variant.availability,
          imageUrl: variant.imageUrl,
        },
        product?.pricePesos ?? null,
      );
      if (!priceInRange(price, query.min, query.max)) continue;
      const value = rows.find((row) => row.attributeId === definition.id);
      if (!value) continue;
      const set = productHits.get(value.optionId) ?? new Set<string>();
      set.add(variant.productId);
      productHits.set(value.optionId, set);
    }
    for (const [optionId, productSet] of productHits) {
      optionHits.set(optionId, productSet.size);
    }
  }

  const attributeFacets = buildFacetGroups({
    attributes: applicableDefs.map((definition) => ({
      id: definition.id,
      name: definition.name,
      code: definition.code,
      sortOrder: definition.sortOrder,
    })),
    options: optionMeta,
    optionHits,
    selectedOptionIds: optionIds,
  });

  // Tipos presentes en el contexto (sin filtro de tipo).
  const kindFilters = [eq(products.status, "active")];
  if (categoryVisibility) kindFilters.push(categoryVisibility);
  if (searchClause) kindFilters.push(searchClause);
  if (categoryScope?.length) kindFilters.push(inArray(products.categoryId, categoryScope));
  if (query.offer) {
    const offer = catalogOfferClause();
    if (offer) kindFilters.push(offer);
  }
  const kindRows = await db.select({ kind: products.kind }).from(products).where(and(...kindFilters));
  const kindCounts = new Map<string, number>();
  for (const row of kindRows) {
    const key = normalizeCatalogKind(row.kind) || row.kind;
    kindCounts.set(key, (kindCounts.get(key) ?? 0) + 1);
  }
  const kinds = [...kindCounts.entries()]
    .map(([id, count]) => ({ id, label: catalogKindFilterLabel(id), count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  // Disponibilidad observada en variantes o productos del contexto.
  const availabilityCounts = new Map<string, number>();
  for (const variant of vars) {
    availabilityCounts.set(variant.availability, (availabilityCounts.get(variant.availability) ?? 0) + 1);
  }
  for (const product of baseProducts) {
    if (!vars.some((variant) => variant.productId === product.id)) {
      availabilityCounts.set(product.availability, (availabilityCounts.get(product.availability) ?? 0) + 1);
    }
  }
  const availabilityLabels: Record<string, string> = {
    available: "Disponible",
    sold_out: "Agotado",
    made_to_order: "Bajo pedido",
  };
  const availabilitySelected = Boolean(query.availability);
  const availability = [...availabilityCounts.entries()]
    .filter(([id, count]) => count > 0 && availabilityLabels[id])
    .map(([id, count]) => ({ id, label: availabilityLabels[id], count }));
  const availabilityFacet =
    availability.length >= 2 || (availabilitySelected && availability.length >= 1) ? availability : [];

  return {
    kinds: kinds.length > 1 ? kinds : [],
    attributes: attributeFacets,
    availability: availabilityFacet,
    useful: attributeFacets.length > 0 || kinds.length > 1 || availabilityFacet.length > 0,
  };
}

/** Foto de tarjeta alineada a la variante coincidente cuando exista. */
export async function catalogCardPhoto(productId: string, optionIds: string[] = []) {
  const db = getDb();
  if (!db) return "";
  const photos = await productPhotos(productId);
  const fallback = photos[0]?.url ?? "";
  if (!optionIds.length) return fallback;

  const vars = await db.select().from(variants).where(eq(variants.productId, productId));
  if (!vars.length) return fallback;
  const vals = await db.select().from(variantValues).where(inArray(variantValues.variantId, vars.map((item) => item.id)));
  const optionRows = await db
    .select({ id: attributeOptions.id, attributeId: attributeOptions.attributeId, label: attributeOptions.label })
    .from(attributeOptions)
    .where(inArray(attributeOptions.id, optionIds));
  const selected = groupSelectedOptions(optionIds, optionRows);
  const valuesByVariant = new Map<string, typeof vals>();
  for (const row of vals) {
    const list = valuesByVariant.get(row.variantId) ?? [];
    list.push(row);
    valuesByVariant.set(row.variantId, list);
  }
  const picked = pickMatchingVariant({
    variants: vars.map((item) => ({
      id: item.id,
      productId: item.productId,
      pricePesos: item.pricePesos,
      availability: item.availability,
      imageUrl: item.imageUrl,
    })),
    valuesByVariant,
    selectedByAttribute: selected,
  });
  if (!picked) return fallback;
  if (picked.imageUrl) return picked.imageUrl;
  const [media] = await db
    .select({ url: mediaAssets.url })
    .from(variantMedia)
    .innerJoin(mediaAssets, eq(variantMedia.mediaId, mediaAssets.id))
    .where(eq(variantMedia.variantId, picked.id))
    .orderBy(asc(variantMedia.sortOrder))
    .limit(1);
  return media?.url || fallback;
}

export async function productPhotos(productId: string) {
  const db = getDb();
  if (!db) return [];
  return db
    .select({ id: productMedia.id, url: mediaAssets.url, alt: mediaAssets.alt, sortOrder: productMedia.sortOrder })
    .from(productMedia)
    .innerJoin(mediaAssets, eq(productMedia.mediaId, mediaAssets.id))
    .where(eq(productMedia.productId, productId))
    .orderBy(asc(productMedia.sortOrder));
}

/** Primera foto de cada producto en una sola consulta (evita una consulta por tarjeta). */
export async function productFirstPhotos(productIds: string[]) {
  const db = getDb();
  const result = new Map<string, { url: string; alt: string }>();
  if (!db || !productIds.length) return result;
  const rows = await db
    .select({ productId: productMedia.productId, url: mediaAssets.url, alt: mediaAssets.alt, sortOrder: productMedia.sortOrder })
    .from(productMedia)
    .innerJoin(mediaAssets, eq(productMedia.mediaId, mediaAssets.id))
    .where(inArray(productMedia.productId, productIds))
    .orderBy(asc(productMedia.sortOrder));
  for (const row of rows) {
    if (!result.has(row.productId)) result.set(row.productId, { url: row.url, alt: row.alt ?? "" });
  }
  return result;
}

export const getActiveProduct = cache(async (slug: string) => {
  const db = getDb();
  if (!db) return null;
  const [product] = await db.select().from(products).where(and(eq(products.slug, slug), eq(products.status, "active"))).limit(1);
  if (!product) return null;
  const [photos, tags, values, defs, options, vars] = await Promise.all([
    productPhotos(product.id),
    db.select().from(productTags).where(eq(productTags.productId, product.id)),
    db.select().from(productAttributeValues).where(eq(productAttributeValues.productId, product.id)),
    db.select().from(attributes).orderBy(asc(attributes.sortOrder)),
    db.select().from(attributeOptions).orderBy(asc(attributeOptions.sortOrder)),
    db.select().from(variants).where(eq(variants.productId, product.id)),
  ]);
  const variantIds = vars.map((item) => item.id);
  const categoryFields = { id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId, description: categories.description, seoDescription: categories.seoDescription };
  const [varVals, variantPhotos, categoryRows] = await Promise.all([
    variantIds.length ? db.select().from(variantValues).where(inArray(variantValues.variantId, variantIds)) : Promise.resolve([]),
    variantIds.length
      ? db
          .select({ variantId: variantMedia.variantId, url: mediaAssets.url, alt: mediaAssets.alt, sortOrder: variantMedia.sortOrder })
          .from(variantMedia)
          .innerJoin(mediaAssets, eq(variantMedia.mediaId, mediaAssets.id))
          .where(inArray(variantMedia.variantId, variantIds))
          .orderBy(asc(variantMedia.sortOrder))
      : Promise.resolve([]),
    product.categoryId ? db.select(categoryFields).from(categories).where(eq(categories.id, product.categoryId)).limit(1) : Promise.resolve([]),
  ]);
  const categoryRow = categoryRows[0] ?? null;
  const [parentRow] = categoryRow?.parentId ? await db.select(categoryFields).from(categories).where(eq(categories.id, categoryRow.parentId)).limit(1) : [];
  return { product, photos, tags: tags.map((tag) => tag.tag), values, defs, options, vars, varVals, variantPhotos, categoryRow, parentRow: parentRow ?? null };
});

/** Recomendaciones de la ficha. No bloquea el producto: la página la pide aparte. */
export async function loadRelatedProducts(product: { id: string; categoryId: string | null }) {
  const db = getDb();
  if (!db) return [];
  let parentId: string | null = null;
  let siblingCategoryIds: string[] = [];
  if (product.categoryId) {
    const [category] = await db.select({ parentId: categories.parentId }).from(categories).where(eq(categories.id, product.categoryId)).limit(1);
    parentId = category?.parentId ?? null;
    if (parentId) {
      const siblings = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, parentId));
      siblingCategoryIds = siblings.map((item) => item.id).filter((id) => id !== product.categoryId);
    }
  }
  const family = [product.categoryId, parentId, ...siblingCategoryIds].filter((id): id is string => Boolean(id));
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
      categoryId: products.categoryId,
      featured: products.featured,
      sortOrder: products.sortOrder,
      priceMode: products.priceMode,
      pricePesos: products.pricePesos,
      comparePesos: products.comparePesos,
      availability: products.availability,
    })
    .from(products)
    .where(and(
      eq(products.status, "active"),
      ne(products.id, product.id),
      family.length
        ? or(inArray(products.categoryId, family), eq(products.featured, true))
        : eq(products.featured, true),
    ))
    .orderBy(asc(products.sortOrder), asc(products.name), asc(products.id))
    .limit(24);
  const ranked = rankRelatedProducts({
    currentId: product.id,
    categoryId: product.categoryId,
    parentId,
    siblingCategoryIds,
    candidates: rows,
    limit: 4,
  });
  const photos = await productFirstPhotos(ranked.map((item) => item.id));
  return ranked.map((item) => ({ ...item, photo: photos.get(item.id) ?? null }));
}
export async function redirectTarget(path: string) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db.select().from(slugRedirects).where(eq(slugRedirects.fromPath, path)).limit(1);
  return row?.toPath ?? null;
}

export async function publishedPage(slug: string) {
  const db = getDb();
  if (!db) return null;
  const [page] = await db.select().from(contentPages).where(and(eq(contentPages.slug, slug), eq(contentPages.published, true))).limit(1);
  return page ?? null;
}

export async function listFilters() {
  const db = getDb();
  if (!db) return [];
  const defs = await db.select().from(attributes).where(and(eq(attributes.filterable, true), eq(attributes.visible, true), or(eq(attributes.kind, "single"), eq(attributes.kind, "multi")))).orderBy(asc(attributes.sortOrder));
  const options = await db.select().from(attributeOptions).orderBy(asc(attributeOptions.sortOrder));
  return defs.map((definition) => ({ ...definition, options: options.filter((option) => option.attributeId === definition.id) }));
}

export async function publishedPolicySlugs() {
  const db = getDb();
  if (!db) return [] as string[];
  const rows = await db.select({ slug: contentPages.slug }).from(contentPages).where(eq(contentPages.published, true));
  return rows.map((row) => row.slug);
}

export async function listLibrary(): Promise<LibraryItem[]> {
  const db = getDb();
  if (!db) return [];
  const [assets, productLinks, variantLinks, productRows, categoryRows, bannerRows, brandRows, businessRows, heroRows, slides] = await Promise.all([
    db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)),
    db.select({ mediaId: productMedia.mediaId, productId: productMedia.productId }).from(productMedia),
    db.select({ mediaId: variantMedia.mediaId, productId: variants.productId }).from(variantMedia).innerJoin(variants, eq(variantMedia.variantId, variants.id)),
    db.select({ id: products.id, name: products.name, videoUrl: products.videoUrl, socialImageUrl: products.socialImageUrl }).from(products),
    db.select({ id: categories.id, name: categories.name, imageUrl: categories.imageUrl }).from(categories),
    db.select({ id: banners.id, title: banners.title, imageUrl: banners.imageUrl }).from(banners),
    db.select().from(branding).limit(1),
    db.select({ storyImageUrl: business.storyImageUrl }).from(business).limit(1),
    db.select().from(heroSettings).limit(1),
    db.select({ title: heroSlides.title, desktopUrl: heroSlides.desktopUrl, mobileUrl: heroSlides.mobileUrl }).from(heroSlides),
  ]);
  const productName = new Map(productRows.map((product) => [product.id, product.name]));
  const brand = brandRows[0];
  const story = businessRows[0];
  const hero = heroRows[0];
  return assets.map((asset) => {
    const uses: LibraryUse[] = [];
    const seen = new Set<string>();
    const add = (label: string, href: string) => {
      const key = `${label}|${href}`;
      if (seen.has(key)) return;
      seen.add(key);
      uses.push({ label, href });
    };
    for (const link of productLinks) {
      if (link.mediaId === asset.id) add(productName.get(link.productId) ?? "Producto", `/admin/productos/${link.productId}`);
    }
    for (const link of variantLinks) {
      if (link.mediaId === asset.id) add(`Variante de ${productName.get(link.productId) ?? "un producto"}`, `/admin/productos/${link.productId}`);
    }
    for (const product of productRows) {
      if (product.videoUrl === asset.url) add(`Video de ${product.name}`, `/admin/productos/${product.id}`);
      if (product.socialImageUrl === asset.url) add(`Imagen social de ${product.name}`, `/admin/productos/${product.id}`);
    }
    for (const category of categoryRows) {
      if (category.imageUrl === asset.url) add(category.name, `/admin/categorias/${category.id}`);
    }
    for (const banner of bannerRows) {
      if (banner.imageUrl === asset.url) add(banner.title || "Aviso", "/admin/inicio");
    }
    if (brand?.logoUrl === asset.url) add("Logo", "/admin/apariencia");
    if (brand?.logoAltUrl === asset.url) add("Logo alterno", "/admin/apariencia");
    if (brand?.faviconUrl === asset.url) add("Icono", "/admin/apariencia");
    if (brand?.socialImageUrl === asset.url) add("Imagen social", "/admin/apariencia");
    if (story?.storyImageUrl === asset.url) add("Historia del negocio", "/admin/negocio");
    if (hero && (hero.desktopUrl === asset.url || hero.mobileUrl === asset.url || hero.posterUrl === asset.url)) add("Portada", "/admin/inicio");
    if (hero?.videoUrl === asset.url) add("Video de portada", "/admin/inicio");
    for (const slide of slides) {
      if (slide.desktopUrl === asset.url || slide.mobileUrl === asset.url) add(slide.title || "Diapositiva", "/admin/inicio");
    }
    return { id: asset.id, kind: asset.kind, url: asset.url, alt: asset.alt, bytes: asset.bytes, uses };
  });
}

const SESSION_EVENTS = "'product_view','whatsapp_click','cart_send','interest_list_send','quote_request_created'";
const ENTRY_EVENTS = "'catalog_view','product_view','category_view'";

/**
 * Eventos del rango sin ráfagas: se descarta el mismo evento repetido en menos de 2 segundos
 * (recargas, pruebas y registros dobles de versiones anteriores). No borra nada de la base.
 */
function cleanEvents(from: Date, to: Date) {
  return sql`
    clean as (
      select name, path, product_id, source, created_at from (
        select name, path, product_id, source, created_at,
          lag(created_at) over (partition by name, path, coalesce(product_id, '') order by created_at) as previous
        from analytics_events
        where created_at >= ${from.toISOString()}::timestamptz and created_at <= ${to.toISOString()}::timestamptz
      ) raw
      where previous is null or created_at - previous > interval '2 seconds'
    )`;
}

async function rows<T>(query: SQL): Promise<T[]> {
  const db = getDb();
  if (!db) return [];
  const result = await db.execute(query);
  return result.rows as T[];
}

async function eventTotals(from: Date, to: Date): Promise<EventCounts> {
  const found = await rows<{ name: string; total: number }>(sql`with ${cleanEvents(from, to)} select name, count(*)::int as total from clean group by name`);
  return Object.fromEntries(found.map((row) => [row.name, Number(row.total)]));
}

export async function dashboardReport(range: DashboardRange) {
  const db = getDb();
  const zone = STORE_TIMEZONE;
  const { from, to } = range;
  const [totals, previous, dayRows, hourRows, productRows, entryRows, categoryEvents, searchRows, placementRows] = await Promise.all([
    eventTotals(from, to),
    eventTotals(range.previousFrom, range.previousTo),
    rows<{ day: string; name: string; total: number }>(sql`
      with ${cleanEvents(from, to)}
      select to_char(created_at at time zone ${zone}, 'YYYY-MM-DD') as day, name, count(*)::int as total
      from clean where name in (${sql.raw(SESSION_EVENTS)}) group by 1, 2`),
    rows<{ hour: number; dow: number; total: number }>(sql`
      with ${cleanEvents(from, to)}
      select extract(hour from created_at at time zone ${zone})::int as hour, extract(dow from created_at at time zone ${zone})::int as dow, count(*)::int as total
      from clean where name in (${sql.raw(SESSION_EVENTS)}) group by 1, 2`),
    rows<{ product_id: string; name: string; total: number }>(sql`
      with ${cleanEvents(from, to)}
      select product_id, name, count(*)::int as total
      from clean where product_id is not null and name in ('product_view','whatsapp_click','cart_add','interest_list_add') group by 1, 2`),
    rows<{ source: string; total: number }>(sql`
      with ${cleanEvents(from, to)}
      select source, count(*)::int as total
      from clean where name in (${sql.raw(ENTRY_EVENTS)}) group by 1 order by 2 desc limit 20`),
    rows<{ path: string; total: number }>(sql`
      with ${cleanEvents(from, to)}
      select path, count(*)::int as total from clean where name = 'category_view' group by 1 order by 2 desc limit 12`),
    rows<{ term: string; total: number; empty: number }>(sql`
      with ${cleanEvents(from, to)}
      select path as term, count(*)::int as total, sum(case when source = '0' then 1 else 0 end)::int as empty
      from clean where name = 'search' group by 1 order by 2 desc limit 40`),
    rows<{ placement: string; total: number }>(sql`
      with ${cleanEvents(from, to)}
      select case name when 'whatsapp_click' then source when 'cart_send' then 'cart' when 'interest_list_send' then 'list' else 'quote' end as placement, count(*)::int as total
      from clean where name in ('whatsapp_click','cart_send','interest_list_send','quote_request_created') group by 1 order by 2 desc`),
  ]);

  const productList = db ? await db.select({ id: products.id, name: products.name, slug: products.slug, status: products.status, featured: products.featured }).from(products) : [];
  const categoryList = db ? await db.select({ name: categories.name, slug: categories.slug, status: categories.status }).from(categories) : [];
  const quoteStats = db ? await db.select({ status: quotes.status, createdAt: quotes.createdAt }).from(quotes) : [];

  const perProduct = new Map<string, { views: number; contacts: number; saved: number }>();
  for (const row of productRows) {
    const current = perProduct.get(row.product_id) ?? { views: 0, contacts: 0, saved: 0 };
    if (row.name === "product_view") current.views += Number(row.total);
    else if (row.name === "whatsapp_click") current.contacts += Number(row.total);
    else current.saved += Number(row.total);
    perProduct.set(row.product_id, current);
  }
  const active = productList.filter((item) => item.status === "active");
  const productsReport = active
    .map((item) => {
      const stats = perProduct.get(item.id) ?? { views: 0, contacts: 0, saved: 0 };
      return { id: item.id, name: item.name, slug: item.slug, featured: item.featured, ...stats };
    })
    .sort((a, b) => b.views - a.views || b.contacts - a.contacts || a.name.localeCompare(b.name, "es"));

  const categoryNames = new Map(categoryList.map((item) => [item.slug, item.name]));
  const categoriesReport = categoryEvents
    .map((row) => ({ name: categoryNames.get(row.path.split("/").filter(Boolean).pop() ?? "") ?? row.path, total: Number(row.total) }))
    .slice(0, 6);

  const searches = searchRows.map((row) => ({ term: row.term, total: Number(row.total), empty: Number(row.empty) }));
  const inRange = quoteStats.filter((item) => item.createdAt >= from && item.createdAt <= to);
  const isOpen = (status: string) => status === "nueva" || status === "en-gestion";

  const hourTotals = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 }));
  const weekdayTotals = Array.from({ length: 7 }, (_, dow) => ({ dow, total: 0 }));
  for (const row of hourRows) {
    hourTotals[Number(row.hour)].total += Number(row.total);
    weekdayTotals[Number(row.dow)].total += Number(row.total);
  }

  return {
    totals,
    previous,
    days: fillDays(range.fromDay, range.toDay, dayRows.map((row) => ({ day: row.day, name: row.name, total: Number(row.total) }))),
    hours: hourTotals,
    weekdays: weekdayTotals,
    products: productsReport,
    categories: categoriesReport,
    searches,
    sources: entryRows
      .filter((row) => row.source !== INTERNAL_SOURCE)
      .slice(0, 12)
      .map((row) => ({ source: row.source, total: Number(row.total) })),
    internalNav: entryRows.filter((row) => row.source === INTERNAL_SOURCE).reduce((sum, row) => sum + Number(row.total), 0),
    placements: placementRows.map((row) => ({ placement: row.placement, total: Number(row.total) })),
    quotes: {
      inRange: inRange.length,
      done: inRange.filter((item) => item.status === "atendida" || item.status === "cerrada").length,
      openNow: quoteStats.filter((item) => isOpen(item.status)).length,
    },
    catalog: {
      products: productList.length,
      active: active.length,
      inactive: productList.length - active.length,
      featured: productList.filter((item) => item.featured).length,
      categories: categoryList.filter((item) => item.status === "active").length,
    },
  };
}

export type DashboardReport = Awaited<ReturnType<typeof dashboardReport>>;

export { pesosFromDb, PAGE_SIZE };

const userListColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  active: users.active,
  lastLoginAt: users.lastLoginAt,
};

export async function listAdminUsers() {
  const db = getDb();
  if (!db) return null;
  return db.select(userListColumns).from(users).orderBy(asc(users.name));
}

export async function adminLists() {
  const db = getDb();
  if (!db) return null;
  return {
    categories: await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    products: await db.select().from(products).orderBy(desc(products.updatedAt)),
    attributes: await db.select().from(attributes).orderBy(asc(attributes.sortOrder)),
    options: await db.select().from(attributeOptions).orderBy(asc(attributeOptions.sortOrder)),
    categoryAttributes: await db.select().from(categoryAttributes),
    users: await db.select(userListColumns).from(users).orderBy(asc(users.name)),
    quotes: await db.select().from(quotes).orderBy(desc(quotes.createdAt)),
    pages: await db.select().from(contentPages),
    sections: await db.select().from(homeSections).orderBy(asc(homeSections.sortOrder)),
    banners: await db.select().from(banners).orderBy(asc(banners.sortOrder)),
  };
}

export async function quoteDetail(id: string) {
  const db = getDb();
  if (!db) return null;
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) return null;
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
  const notes = await db.select().from(quoteNotes).where(eq(quoteNotes.quoteId, id)).orderBy(desc(quoteNotes.createdAt));
  const steps = await db.select().from(auditEvents).where(eq(auditEvents.entity, id)).orderBy(asc(auditEvents.createdAt));
  return { quote, items, notes, steps };
}

export async function openQuoteCount() {
  const db = getDb();
  if (!db) return 0;
  await purgeExpiredQuotes();
  const rows = await db.select({ status: quotes.status }).from(quotes);
  return rows.filter((item) => item.status === "nueva" || item.status === "en-gestion").length;
}

export async function quoteGuards() {
  const db = getDb();
  if (!db) return [];
  const active = await db.select({ id: products.id, availability: products.availability }).from(products).where(eq(products.status, "active"));
  const rows = await db.select({ id: variants.id, productId: variants.productId, availability: variants.availability }).from(variants);
  return active.map((product) => ({
    productId: product.id,
    availability: product.availability,
    variants: rows.filter((row) => row.productId === product.id).map((row) => ({ id: row.id, availability: row.availability })),
  }));
}

export async function recordEvent(name: string, path: string, productId?: string, source?: string) {
  const db = getDb();
  if (!db) return;
  const allowed = new Set(["catalog_view", "search", "product_view", "category_view", "whatsapp_click", "interest_list_add", "interest_list_send", "cart_add", "cart_send", "quote_request_created", "product_share", "product_link_copy", "product_qr_download"]);
  if (!allowed.has(name)) return;
  await db.insert(analyticsEvents).values({
    id: crypto.randomUUID(),
    name,
    path: path.slice(0, 180),
    productId: productId || null,
    source: (source ?? "").slice(0, 80),
  });
}

export async function rememberSlug(fromPath: string, toPath: string) {
  const db = getDb();
  if (!db || fromPath === toPath) return;
  if (!fromPath.startsWith("/") || fromPath.startsWith("//") || fromPath.includes("?") || fromPath.includes("\\")) return;
  if (!toPath.startsWith("/") || toPath.startsWith("//") || toPath.includes("?") || toPath.includes("\\")) return;
  await db.insert(slugRedirects).values({ id: crypto.randomUUID(), fromPath, toPath }).onConflictDoUpdate({ target: slugRedirects.fromPath, set: { toPath } });
}

/** Quita redirecciones que bloquean una ruta viva (p. ej. producto recreado con el mismo slug). */
export async function forgetSlug(fromPath: string) {
  const db = getDb();
  if (!db || !fromPath.startsWith("/")) return;
  await db.delete(slugRedirects).where(eq(slugRedirects.fromPath, fromPath));
}

/** Elimina redirects cuyo from_path ya es una ruta pública activa. */
export async function purgeStaleSlugRedirects() {
  const db = getDb();
  if (!db) return 0;
  const [activeProducts, activeCategories] = await Promise.all([
    db.select({ slug: products.slug }).from(products).where(eq(products.status, "active")),
    db.select({ id: categories.id, slug: categories.slug, parentId: categories.parentId, status: categories.status }).from(categories).where(eq(categories.status, "active")),
  ]);
  const parentById = new Map(activeCategories.map((row) => [row.id, row]));
  const live = new Set<string>(activeProducts.map((row) => `/producto/${row.slug}`));
  for (const category of activeCategories) {
    const parent = category.parentId ? parentById.get(category.parentId) : null;
    if (category.parentId && !parent) continue;
    live.add(parent ? `/categoria/${parent.slug}/${category.slug}` : `/categoria/${category.slug}`);
  }
  const redirects = await db.select({ fromPath: slugRedirects.fromPath }).from(slugRedirects);
  const stale = redirects.map((row) => row.fromPath).filter((fromPath) => live.has(fromPath));
  if (!stale.length) return 0;
  await db.delete(slugRedirects).where(inArray(slugRedirects.fromPath, stale));
  return stale.length;
}

export async function countActiveProductsInCategories(categoryIds: string[]) {
  const db = getDb();
  if (!db || !categoryIds.length) return 0;
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.status, "active"), inArray(products.categoryId, categoryIds)));
  return rows.length;
}

export async function countActiveChildCategories(categoryId: string) {
  const db = getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.parentId, categoryId), eq(categories.status, "active")));
  return rows.length;
}

/** Uso público de un atributo: variantes ligadas a productos active (+ valores fijos en active). */
export async function countAttributePublicUsage(attributeId: string, optionIds?: string[]) {
  const db = getDb();
  if (!db) return { activeProductCount: 0, variantCount: 0 };
  const options =
    optionIds ??
    (await db.select({ id: attributeOptions.id }).from(attributeOptions).where(eq(attributeOptions.attributeId, attributeId))).map((row) => row.id);

  const productIds = new Set<string>();
  let variantCount = 0;

  if (options.length) {
    const valueRows = await db
      .select({ variantId: variantValues.variantId })
      .from(variantValues)
      .where(inArray(variantValues.optionId, options));
    const variantIds = [...new Set(valueRows.map((row) => row.variantId))];
    if (variantIds.length) {
      const variantRows = await db
        .select({ id: variants.id, productId: variants.productId })
        .from(variants)
        .where(inArray(variants.id, variantIds));
      const productStatus = variantRows.length
        ? await db
            .select({ id: products.id, status: products.status })
            .from(products)
            .where(inArray(products.id, [...new Set(variantRows.map((row) => row.productId))]))
        : [];
      const active = new Set(productStatus.filter((row) => row.status === "active").map((row) => row.id));
      for (const variant of variantRows) {
        if (!active.has(variant.productId)) continue;
        variantCount += 1;
        productIds.add(variant.productId);
      }
    }
  }

  const fixed = await db
    .select({ productId: productAttributeValues.productId })
    .from(productAttributeValues)
    .where(eq(productAttributeValues.attributeId, attributeId));
  if (fixed.length) {
    const fixedProducts = await db
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(inArray(products.id, [...new Set(fixed.map((row) => row.productId))]));
    for (const product of fixedProducts) {
      if (product.status === "active") productIds.add(product.id);
    }
  }

  return { activeProductCount: productIds.size, variantCount };
}

export { sql };
