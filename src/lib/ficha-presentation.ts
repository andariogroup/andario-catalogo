import { formatPesos } from "@/lib/money";

/** Capas B: reglas de presentación a partir de datos reales, sin nombres de categoría. */

export function fichaAvailabilityLabel(availability: string) {
  if (availability === "sold_out") return "Agotado";
  if (availability === "made_to_order") return "Bajo pedido";
  if (availability === "available") return "Disponible";
  return availability.trim() ? availability : "Disponible";
}

export function fichaPrimaryTag(tags: string[]) {
  const ranked = ["nuevo", "oferta", "destacado", "new", "sale", "featured"];
  const lower = tags.map((tag) => tag.trim().toLowerCase());
  for (const key of ranked) {
    const index = lower.indexOf(key);
    if (index >= 0) return tags[index];
  }
  return tags[0]?.trim() || "";
}

export function fichaPriceLabel(input: {
  priceMode: string;
  unit: number | null;
  symbol: string;
}) {
  if (input.priceMode === "ask") return "Consultar precio";
  if (input.priceMode === "from") {
    // Modalidad soportada por el modelo (`price_mode = from`), no una etiqueta inventada.
    return `Desde ${formatPesos(input.unit, input.symbol)}`;
  }
  return formatPesos(input.unit, input.symbol);
}

export function fichaCompareLabel(input: {
  comparePesos: number | null;
  unit: number | null;
  symbol: string;
}) {
  if (input.comparePesos == null || input.unit == null) return "";
  if (!(input.comparePesos > input.unit)) return "";
  return formatPesos(input.comparePesos, input.symbol);
}

/**
 * Cantidad según capacidades disponibles (no por nombre de categoría).
 * - Servicio + precio a consultar: la cantidad rara vez aporta; se oculta.
 * - Resto: se conserva (incluye servicio con precio fijo/from y digitales).
 * Si el modelo no distingue más casos, se documenta la limitación y se mantiene lo seguro.
 */
export function fichaShowQuantity(input?: { kind?: string; priceMode?: string }) {
  const kind = (input?.kind ?? "").trim().toLowerCase();
  const priceMode = (input?.priceMode ?? "").trim().toLowerCase();
  if ((kind === "service" || kind === "servicio") && priceMode === "ask") return false;
  return true;
}

export function fichaShowGalleryControls(photoCount: number) {
  return photoCount > 1;
}

export function fichaShowBlock(value: string | null | undefined | unknown[]) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(typeof value === "string" ? value.trim() : value);
}

export function fichaPrimaryAction(input: { hasWhatsApp: boolean; soldOut: boolean }) {
  if (input.hasWhatsApp && !input.soldOut) return "whatsapp" as const;
  return "quote" as const;
}

/**
 * CTA primario comercial según capacidades del negocio (sin config admin nueva).
 * - Agotado → cotización (canal estructurado; no promete entrega).
 * - WhatsApp configurado → pedido asistido por WhatsApp (canal comercial principal cuando existe).
 * - Precio a consultar sin WhatsApp → cotización.
 * - Sin WhatsApp y carrito elegible → carrito.
 * - Resto → cotización.
 */
export function fichaConversionPrimary(input: {
  cartEligible: boolean;
  hasWhatsApp: boolean;
  soldOut: boolean;
  priceMode?: string;
  kind?: string;
}) {
  if (input.soldOut) {
    return fichaPrimaryAction({ hasWhatsApp: input.hasWhatsApp, soldOut: true });
  }
  if (input.hasWhatsApp) return "whatsapp" as const;
  const priceMode = (input.priceMode ?? "").trim().toLowerCase();
  if (priceMode === "ask") return "quote" as const;
  if (input.cartEligible) return "cart" as const;
  return "quote" as const;
}

/** Etiqueta del CTA de WhatsApp según modalidad de precio. */
export function fichaWhatsAppCtaLabel(priceMode?: string) {
  const mode = (priceMode ?? "").trim().toLowerCase();
  if (mode === "ask") return "Consultar precio por WhatsApp";
  return "Pedir por WhatsApp";
}

/** Nota breve bajo los CTA: aclara que no hay compra/pago cerrado. */
export function fichaCommerceSupportNote(input: {
  primary: "cart" | "whatsapp" | "quote";
  store: string;
}) {
  if (input.primary === "whatsapp") {
    return "Te confirmamos disponibilidad, envío y valor final antes de finalizar tu pedido.";
  }
  return `No es un pago en línea: envías una solicitud y ${input.store} te confirma.`;
}

/**
 * Acciones secundarias / terciarias sin competir con el CTA filled.
 * - Carrito: visible como CTA outline cuando WhatsApp (u otro canal) es primario.
 * - Cotización: flujo distinto (formulario → solicitud en panel); no duplica el chat.
 * - WhatsApp secundario: solo si el primario no es WhatsApp pero el canal existe.
 */
export function fichaSecondaryActions(input: {
  primary: "cart" | "whatsapp" | "quote";
  cartEligible: boolean;
  hasWhatsApp: boolean;
  soldOut: boolean;
  priceMode?: string;
}) {
  const showQuote = input.primary !== "quote" && !input.soldOut;
  const showWhatsApp = input.primary !== "whatsapp" && input.hasWhatsApp && !input.soldOut;
  const showCart = input.primary !== "cart" && input.cartEligible && !input.soldOut;
  return { showQuote, showWhatsApp, showCart };
}

export function fichaVariantSignature(
  picked: Record<string, string>,
  values: { variantId: string; attributeId: string; optionId: string }[],
  variants: { id: string }[],
) {
  const signature = Object.values(picked).sort().join(".");
  if (!signature) return { signature: "", variantId: "" };
  const match = variants.find((variant) => {
    const key = values
      .filter((row) => row.variantId === variant.id)
      .map((row) => row.optionId)
      .sort()
      .join(".");
    return key === signature;
  });
  return { signature, variantId: match?.id ?? "" };
}

/**
 * Una opción es comercialmente alcanzable si existe al menos una variante
 * que la incluye junto con las demás selecciones actuales (si las hay).
 */
export function fichaOptionReachable(input: {
  attributeId: string;
  optionId: string;
  picked: Record<string, string>;
  values: { variantId: string; attributeId: string; optionId: string }[];
  variants: { id: string; availability: string }[];
}) {
  const trial = { ...input.picked, [input.attributeId]: input.optionId };
  const selected = Object.entries(trial);
  const candidates = input.variants.filter((variant) => {
    const rows = input.values.filter((row) => row.variantId === variant.id);
    return selected.every(([attributeId, optionId]) =>
      rows.some((row) => row.attributeId === attributeId && row.optionId === optionId),
    );
  });
  if (!candidates.length) return { reachable: false, allSoldOut: true };
  return {
    reachable: true,
    allSoldOut: candidates.every((variant) => variant.availability === "sold_out"),
  };
}
