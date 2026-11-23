export type CatalogProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  kind: string;
  pricePesos: string | null;
  comparePesos: string | null;
  priceMode: string;
  availability: string;
  featured: boolean;
};

export type CatalogCategoryChip = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export type CatalogFilterOption = {
  id: string;
  name: string;
  options: { id: string; label: string }[];
};

/** empty = sin resultados; grid = cuadrícula unificada (columnas solo por viewport). */
export type CatalogLayoutMode = "grid" | "empty";

const PROVISIONAL = [
  /este texto se puede/i,
  /se puede reemplazar/i,
  /el administrador puede/i,
];

export function catalogCopy(value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (PROVISIONAL.some((rule) => rule.test(text))) return "";
  return text;
}

export function catalogAvailabilityLabel(availability: string) {
  if (availability === "sold_out") return "Agotado";
  if (availability === "made_to_order") return "Bajo pedido";
  return "";
}

export function catalogKindLabel(kind: string) {
  const value = kind.trim().toLowerCase();
  if (value === "digital") return "Digital";
  if (value === "service" || value === "servicio") return "Servicio";
  if (value === "intangible" || value === "plan") return "Plan";
  if (value === "physical" || value === "fisico" || value === "físico") return "";
  return "";
}

/** CTA del listado destacado: neutro para servicios/intangibles. */
export function catalogDetailCtaLabel(kind: string) {
  const value = kind.trim().toLowerCase();
  if (value === "service" || value === "servicio" || value === "intangible" || value === "plan") {
    return "Ver detalles";
  }
  return "Ver producto";
}

export function catalogResultsLabel(total: number, kinds: string[] = []) {
  const unique = [...new Set(kinds.map((kind) => kind.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 1) {
    if (unique[0] === "service" || unique[0] === "servicio") {
      return total <= 0 ? "0 servicios" : total === 1 ? "1 servicio" : `${total} servicios`;
    }
    if (unique[0] === "digital") {
      return total <= 0 ? "0 productos digitales" : total === 1 ? "1 producto digital" : `${total} productos digitales`;
    }
    if (unique[0] === "intangible" || unique[0] === "plan") {
      return total <= 0 ? "0 planes" : total === 1 ? "1 plan" : `${total} planes`;
    }
  }
  // Contador neutro: el vacío editorial usa su propio título («Sin resultados»).
  if (total <= 0) return "0 productos";
  if (total === 1) return "1 producto";
  return `${total} productos`;
}

/** Solo descripción configurada; sin copy inventado. */
export function catalogIntro(business: { slogan: string; shortDescription: string }) {
  return catalogCopy(business.shortDescription) || catalogCopy(business.slogan);
}

export function catalogIsExploring(query: Record<string, string | undefined>) {
  return Boolean(
    catalogCopy(query.q) ||
      query.categoria ||
      query.oferta === "1" ||
      query.disponibilidad ||
      query.minimo ||
      query.maximo ||
      query.opcion ||
      query.opciones ||
      query.tipo,
  );
}

/**
 * La densidad de columnas la define el CSS por viewport, no el número de productos.
 */
export function catalogLayoutMode(total: number): CatalogLayoutMode {
  if (total <= 0) return "empty";
  return "grid";
}

/** El ordenamiento solo aporta con 2+ resultados. */
export function catalogShowSort(total: number) {
  return total >= 2;
}

/**
 * H1 contextual: categoría/subcategoría actual, o «Catálogo» en la vista general.
 * El breadcrumb complementa; no se usa un subtítulo que repita el mismo nombre.
 */
export function catalogPageHeading(selected: { name: string } | undefined, offers = false) {
  if (selected?.name) return selected.name;
  if (offers) return "Ofertas";
  return "Catálogo";
}

/** ¿Mostrar breadcrumb? Solo con categoría o subcategoría (nunca solo «Catálogo»). */
export function catalogShowBreadcrumb(selected: { parentId: string | null } | undefined) {
  return Boolean(selected);
}

/** Chips solo de restricciones reales. El ordenamiento no es un filtro. */
export function catalogActiveFilters(query: Record<string, string | undefined>, filters: CatalogFilterOption[]) {
  const chips: { key: string; label: string; clear: Record<string, string | undefined> }[] = [];
  const q = catalogCopy(query.q);
  if (q) chips.push({ key: "q", label: `Buscar: ${q}`, clear: { ...query, q: undefined, pagina: undefined } });
  if (query.tipo) {
    const kindLabel =
      query.tipo === "physical"
        ? "Físico"
        : query.tipo === "digital"
          ? "Digital"
          : query.tipo === "service"
            ? "Servicio"
            : query.tipo === "intangible"
              ? "Intangible"
              : query.tipo;
    chips.push({ key: "tipo", label: `Tipo: ${kindLabel}`, clear: { ...query, tipo: undefined, pagina: undefined } });
  }
  if (query.disponibilidad === "available") {
    chips.push({ key: "disponibilidad", label: "Disponible", clear: { ...query, disponibilidad: undefined, pagina: undefined } });
  } else if (query.disponibilidad === "sold_out") {
    chips.push({ key: "disponibilidad", label: "Agotado", clear: { ...query, disponibilidad: undefined, pagina: undefined } });
  } else if (query.disponibilidad === "made_to_order") {
    chips.push({ key: "disponibilidad", label: "Bajo pedido", clear: { ...query, disponibilidad: undefined, pagina: undefined } });
  }
  if (query.minimo) chips.push({ key: "minimo", label: `Desde ${query.minimo}`, clear: { ...query, minimo: undefined, pagina: undefined } });
  if (query.maximo) chips.push({ key: "maximo", label: `Hasta ${query.maximo}`, clear: { ...query, maximo: undefined, pagina: undefined } });

  const optionIds = [
    ...new Set(
      `${query.opciones ?? ""},${query.opcion ?? ""}`
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  const catalog = filters.flatMap((filter) => filter.options.map((item) => ({ ...item, filterName: filter.name })));
  for (const optionId of optionIds) {
    const option = catalog.find((item) => item.id === optionId);
    const remaining = optionIds.filter((id) => id !== optionId);
    chips.push({
      key: `opcion:${optionId}`,
      label: option ? `${option.filterName}: ${option.label}` : "Variante",
      clear: {
        ...query,
        opcion: undefined,
        opciones: remaining.length ? remaining.join(",") : undefined,
        pagina: undefined,
      },
    });
  }
  return chips;
}

export function catalogHasAdvancedFilters(query: Record<string, string | undefined>) {
  return Boolean(query.disponibilidad || query.minimo || query.maximo || query.opcion || query.opciones || query.tipo);
}

export function catalogActiveFilterCount(query: Record<string, string | undefined>) {
  const optionCount = `${query.opciones ?? ""},${query.opcion ?? ""}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean).length;
  return (
    (query.disponibilidad ? 1 : 0) +
    (query.minimo ? 1 : 0) +
    (query.maximo ? 1 : 0) +
    (query.tipo ? 1 : 0) +
    optionCount
  );
}

/**
 * Alcance de filtro por categoría: la categoría elegida más sus hijas directas.
 * Así «Todas» / categoría padre incluye productos publicados solo en subcategorías.
 */
export function catalogCategoryScopeIds(
  selectedId: string,
  all: { id: string; parentId: string | null }[],
) {
  if (!selectedId) return [];
  return [selectedId, ...all.filter((category) => category.parentId === selectedId).map((category) => category.id)];
}

export function catalogSortLabel(orden: string | undefined) {
  if (orden === "recent") return "Más recientes";
  if (orden === "price-asc") return "Menor precio";
  if (orden === "price-desc") return "Mayor precio";
  if (orden === "name") return "Nombre A–Z";
  return "Destacados";
}

export function catalogCollectionNoun(kinds: string[]) {
  const unique = [...new Set(kinds.map((kind) => kind.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 1) {
    if (unique[0] === "service" || unique[0] === "servicio") return { one: "servicio", many: "servicios" };
    if (unique[0] === "digital") return { one: "producto digital", many: "productos digitales" };
    if (unique[0] === "intangible" || unique[0] === "plan") return { one: "plan", many: "planes" };
  }
  return { one: "producto", many: "productos" };
}

/** Motivo del vacío del catálogo: copy y acciones sin inventar resultados. */
export type CatalogEmptyKind = "search" | "filters" | "category" | "offers" | "search_filters" | "catalog";

export function catalogEmptyKind(input: {
  q?: string;
  categoria?: string;
  oferta?: string;
  /** Chips/filtros avanzados activos (disponibilidad, opciones, tipo, rango…). */
  filterCount: number;
}): CatalogEmptyKind {
  const hasQuery = Boolean(catalogCopy(input.q));
  const hasFilters = input.filterCount > 0;
  const hasCategory = Boolean(input.categoria?.trim());
  const hasOffers = input.oferta === "1";
  if (hasQuery && (hasFilters || hasOffers)) return "search_filters";
  if (hasQuery) return "search";
  if (hasFilters) return "filters";
  if (hasOffers) return "offers";
  if (hasCategory) return "category";
  return "catalog";
}

export function catalogEmptyCopy(kind: CatalogEmptyKind, q = "") {
  const term = catalogCopy(q);
  if (kind === "search") {
    return {
      title: "Sin resultados",
      body: term ? `No encontramos resultados para «${term}».` : "No encontramos resultados para tu búsqueda.",
      primary: "clear_search" as const,
      secondary: "catalog" as const,
    };
  }
  if (kind === "filters") {
    return {
      title: "Sin resultados",
      body: "No encontramos productos con los filtros seleccionados.",
      primary: "clear_filters" as const,
      secondary: "catalog" as const,
    };
  }
  if (kind === "search_filters") {
    return {
      title: "Sin resultados",
      body: term
        ? `Ningún producto coincide con «${term}» y los filtros seleccionados.`
        : "Ningún producto coincide con la búsqueda y los filtros seleccionados.",
      primary: "clear_filters" as const,
      secondary: "clear_search" as const,
    };
  }
  if (kind === "category") {
    return {
      title: "Sin resultados",
      body: "Todavía no hay elementos publicados en esta categoría.",
      primary: "catalog" as const,
      secondary: null,
    };
  }
  if (kind === "offers") {
    return {
      title: "Sin ofertas",
      body: "Ningún producto publicado tiene un precio anterior mayor al actual.",
      primary: "catalog" as const,
      secondary: null,
    };
  }
  return {
    title: "Catálogo vacío",
    body: "Aún no hay productos publicados en el catálogo.",
    primary: null,
    secondary: null,
  };
}
