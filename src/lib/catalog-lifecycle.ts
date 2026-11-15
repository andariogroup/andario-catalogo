/**
 * Reglas puras del ciclo de vida del catálogo (borrados, inactivación, redirects).
 * Sin I/O: las acciones de admin/store aplican estas decisiones.
 */

export function productPublicPath(slug: string) {
  return `/producto/${slug.trim()}`;
}

/** El producto deja de ser público → conviene tumba SEO hacia el catálogo. */
export function shouldTombstoneProductPath(previousStatus: string | undefined, nextStatus: string) {
  const wasPublic = previousStatus === "active";
  const staysPublic = nextStatus === "active";
  return wasPublic && !staysPublic;
}

/** El producto vuelve a ser público → hay que quitar redirecciones zombie. */
export function shouldClearProductRedirect(nextStatus: string) {
  return nextStatus === "active";
}

export function categoryInactivationError(input: {
  activeProductCount: number;
  activeChildCount: number;
}) {
  if (input.activeChildCount > 0) {
    return `No se puede inactivar: tiene ${input.activeChildCount} subcategoría${input.activeChildCount === 1 ? "" : "s"} activa${input.activeChildCount === 1 ? "" : "s"}. Inactívalas o muévelas antes.`;
  }
  if (input.activeProductCount > 0) {
    return `No se puede inactivar: hay ${input.activeProductCount} producto${input.activeProductCount === 1 ? "" : "s"} publicado${input.activeProductCount === 1 ? "" : "s"} en esta categoría. Muévelos o despublícalos antes.`;
  }
  return "";
}

export function attributeDeleteError(input: {
  activeProductCount: number;
  variantCount: number;
}) {
  if (input.activeProductCount > 0) {
    return `No se puede eliminar: ${input.activeProductCount} producto${input.activeProductCount === 1 ? "" : "s"} publicado${input.activeProductCount === 1 ? "" : "s"} usan este atributo (${input.variantCount} variante${input.variantCount === 1 ? "" : "s"}). Despublícalos o quita el atributo de sus variantes primero.`;
  }
  return "";
}

export function optionRemovalError(input: {
  removedLabelCount: number;
  activeProductCount: number;
  variantCount: number;
}) {
  if (input.removedLabelCount <= 0) return "";
  if (input.activeProductCount > 0) {
    return `No se pueden quitar esas opciones: afectan ${input.activeProductCount} producto${input.activeProductCount === 1 ? "" : "s"} publicado${input.activeProductCount === 1 ? "" : "s"} (${input.variantCount} variante${input.variantCount === 1 ? "" : "s"}). Despublícalos antes o elimina solo opciones sin uso público.`;
  }
  return "";
}

export function variantRemovalError(input: {
  productStatus: string;
  remainingVariantCount: number;
  requiredGap: string;
}) {
  if (input.productStatus !== "active") return "";
  if (input.requiredGap) {
    return `${input.requiredGap} Quita el atributo obligatorio o despublica el producto antes de eliminar esta variante.`;
  }
  return "";
}

/** Una redirección es zombie si su origen ya es una ruta pública viva. */
export function isStaleRedirect(fromPath: string, livePaths: Iterable<string>) {
  const live = livePaths instanceof Set ? livePaths : new Set(livePaths);
  return live.has(fromPath);
}

export function safeRedirectTarget(value: unknown) {
  if (typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  if (value.includes("\\") || value.includes("?")) return "";
  return value;
}

/**
 * Destino al inactivar una categoría sin productos/hijos activos.
 * Padre activo → ruta del padre; si no, catálogo.
 */
export function categoryTombstoneTarget(input: {
  parentSlug: string | null;
  parentActive: boolean;
}) {
  if (input.parentSlug && input.parentActive) return `/categoria/${input.parentSlug}`;
  return "/catalogo";
}
