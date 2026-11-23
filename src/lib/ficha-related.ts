/** Candidato público para «También te podría interesar». Un negocio por instalación. */
export type RelatedCandidate = {
  id: string;
  name: string;
  categoryId: string | null;
  featured: boolean;
  sortOrder: number;
  status: string;
};

/**
 * Orden estable: misma categoría, luego la familia (padre o hermanas), luego destacados.
 * No inventa complementos. Sin candidatos, la lista queda vacía.
 */
export function rankRelatedProducts<T extends RelatedCandidate>(input: {
  currentId: string;
  categoryId: string | null;
  parentId: string | null;
  siblingCategoryIds: string[];
  candidates: T[];
  limit?: number;
}): T[] {
  const siblings = new Set(input.siblingCategoryIds.filter((id) => id && id !== input.categoryId));
  const seen = new Set<string>();
  const ranked: { item: T; priority: number }[] = [];
  for (const item of input.candidates) {
    if (!item.id || item.id === input.currentId || seen.has(item.id)) continue;
    if (item.status !== "active" || !item.name.trim()) continue;
    let priority = -1;
    if (input.categoryId && item.categoryId === input.categoryId) priority = 0;
    else if (item.categoryId && (item.categoryId === input.parentId || siblings.has(item.categoryId))) priority = 1;
    else if (item.featured) priority = 2;
    if (priority < 0) continue;
    seen.add(item.id);
    ranked.push({ item, priority });
  }
  ranked.sort((a, b) =>
    a.priority - b.priority
    || a.item.sortOrder - b.item.sortOrder
    || a.item.name.localeCompare(b.item.name, "es")
    || a.item.id.localeCompare(b.item.id),
  );
  return ranked.slice(0, input.limit ?? 4).map((row) => row.item);
}
