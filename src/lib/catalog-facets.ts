/** Lógica pura de facetas/variantes del catálogo público (sin I/O). */

export type FacetOptionMeta = {
  id: string;
  attributeId: string;
  label: string;
};

export type FacetAttributeMeta = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
};

export type VariantValueRow = {
  variantId: string;
  attributeId: string;
  optionId: string;
};

export type VariantRow = {
  id: string;
  productId: string;
  pricePesos: string | null;
  availability: string;
  imageUrl: string;
};

/** Agrupa opciones seleccionadas por atributo. */
export function groupSelectedOptions(
  optionIds: string[],
  optionMeta: FacetOptionMeta[],
): Map<string, Set<string>> {
  const byId = new Map(optionMeta.map((option) => [option.id, option]));
  const selected = new Map<string, Set<string>>();
  for (const id of optionIds) {
    const meta = byId.get(id);
    if (!meta) continue;
    const bucket = selected.get(meta.attributeId) ?? new Set<string>();
    bucket.add(id);
    selected.set(meta.attributeId, bucket);
  }
  return selected;
}

/**
 * Una variante coincide si para cada atributo filtrado
 * su valor está en el conjunto (OR dentro del atributo, AND entre atributos).
 */
export function variantMatchesSelection(
  variantValues: VariantValueRow[],
  selectedByAttribute: Map<string, Set<string>>,
): boolean {
  if (selectedByAttribute.size === 0) return true;
  for (const [attributeId, optionIds] of selectedByAttribute) {
    const hit = variantValues.find((row) => row.attributeId === attributeId);
    if (!hit || !optionIds.has(hit.optionId)) return false;
  }
  return true;
}

export function parseCatalogOptionIds(query: {
  opcion?: string;
  opciones?: string;
}): string[] {
  const fromMulti = (query.opciones ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromMulti.length) return [...new Set(fromMulti)];
  const single = (query.opcion ?? "").trim();
  return single ? [single] : [];
}

/** Ocultar faceta con menos de 2 valores (no aporta refinamiento). */
export function shouldShowFacet(optionCount: number, hasActiveSelection: boolean) {
  if (hasActiveSelection) return optionCount >= 1;
  return optionCount >= 2;
}

export function isColorAttribute(name: string, code: string) {
  const haystack = `${name} ${code}`.toLowerCase();
  return /color|colour|tono|matiz/.test(haystack);
}

/** Presentación visual opcional; no inventa datos de producto. */
export function colorSwatchFromLabel(label: string): string | null {
  const key = label.trim().toLowerCase();
  const map: Record<string, string> = {
    negro: "#1a1a1a",
    black: "#1a1a1a",
    blanco: "#f5f5f5",
    white: "#f5f5f5",
    caramelo: "#c48a4a",
    beige: "#d8c3a5",
    "vino tinto": "#6b1e2a",
    rojo: "#b42318",
    red: "#b42318",
    azul: "#1d4ed8",
    blue: "#1d4ed8",
    verde: "#15803d",
    green: "#15803d",
    gris: "#6b7280",
    gray: "#6b7280",
    grey: "#6b7280",
    rosa: "#db2777",
    pink: "#db2777",
    amarillo: "#ca8a04",
    yellow: "#ca8a04",
    marron: "#7c4a1e",
    marrón: "#7c4a1e",
    brown: "#7c4a1e",
  };
  return map[key] ?? null;
}

export function pickMatchingVariant(input: {
  variants: VariantRow[];
  valuesByVariant: Map<string, VariantValueRow[]>;
  selectedByAttribute: Map<string, Set<string>>;
  preferAvailable?: boolean;
}): VariantRow | null {
  const { variants, valuesByVariant, selectedByAttribute, preferAvailable = true } = input;
  const matches = variants.filter((variant) =>
    variantMatchesSelection(valuesByVariant.get(variant.id) ?? [], selectedByAttribute),
  );
  if (!matches.length) return null;
  const ranked = [...matches].sort((a, b) => {
    if (preferAvailable) {
      const aOk = a.availability === "available" ? 0 : 1;
      const bOk = b.availability === "available" ? 0 : 1;
      if (aOk !== bOk) return aOk - bOk;
    }
    const aImg = a.imageUrl ? 0 : 1;
    const bImg = b.imageUrl ? 0 : 1;
    if (aImg !== bImg) return aImg - bImg;
    return a.id.localeCompare(b.id);
  });
  return ranked[0] ?? null;
}

export function resolveVariantDisplayPrice(
  variant: VariantRow | null,
  productPrice: string | null,
): string | null {
  if (variant?.pricePesos != null && variant.pricePesos !== "") return variant.pricePesos;
  return productPrice;
}

export function priceInRange(price: string | null, min?: number, max?: number) {
  if (min == null && max == null) return true;
  if (price == null || price === "") return false;
  const value = Number(price);
  if (!Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function catalogKindFilterLabel(kind: string) {
  const value = kind.trim().toLowerCase();
  if (value === "physical" || value === "fisico" || value === "físico") return "Físico";
  if (value === "digital") return "Digital";
  if (value === "service" || value === "servicio") return "Servicio";
  if (value === "intangible" || value === "plan") return "Intangible";
  return kind;
}

export function normalizeCatalogKind(kind: string | undefined) {
  const value = (kind ?? "").trim().toLowerCase();
  if (!value) return "";
  if (value === "fisico" || value === "físico" || value === "physical") return "physical";
  if (value === "digital") return "digital";
  if (value === "servicio" || value === "service") return "service";
  if (value === "intangible" || value === "plan") return "intangible";
  return value;
}

export function buildFacetGroups(input: {
  attributes: FacetAttributeMeta[];
  options: FacetOptionMeta[];
  /** optionId -> count of matching products (or presence) */
  optionHits: Map<string, number>;
  selectedOptionIds: string[];
}) {
  const selected = new Set(input.selectedOptionIds);
  const groups = input.attributes
    .map((attribute) => {
      const options = input.options
        .filter((option) => option.attributeId === attribute.id)
        .map((option) => ({
          id: option.id,
          label: option.label,
          count: input.optionHits.get(option.id) ?? 0,
          selected: selected.has(option.id),
        }))
        .filter((option) => option.count > 0 || option.selected);
      const hasActive = options.some((option) => option.selected);
      if (!shouldShowFacet(options.length, hasActive)) return null;
      return {
        id: attribute.id,
        name: attribute.name,
        code: attribute.code,
        sortOrder: attribute.sortOrder,
        isColor: isColorAttribute(attribute.name, attribute.code),
        options: options.sort((a, b) => a.label.localeCompare(b.label, "es")),
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    code: string;
    sortOrder: number;
    isColor: boolean;
    options: { id: string; label: string; count: number; selected: boolean }[];
  }[];
  return groups.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));
}
