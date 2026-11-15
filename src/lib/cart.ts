import { formatPesos } from "@/lib/money";

export const CART_STORAGE_KEY = "andario-cart";
export const CART_VERSION = 1;
export const CART_MAX_LINES = 30;
export const CART_MAX_QTY = 20;

/** Snapshot de presentación; los precios no son autoritativos. */
export type CartItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  variantLabel?: string;
  photoUrl?: string;
  productUrl?: string;
  sku?: string;
  priceMode: string;
  unitPesos: number | null;
  currencySymbol: string;
  availability: string;
  updatedAt: number;
};

export type CartState = {
  version: number;
  storeId: string;
  items: CartItem[];
};

export function cartStoreId(businessId: number | string, publicUrl = ""): string {
  const id = String(businessId).trim() || "0";
  const origin = publicUrl.trim().replace(/\/+$/, "").toLowerCase();
  return origin ? `${id}:${origin}` : id;
}

export function emptyCart(storeId: string): CartState {
  return { version: CART_VERSION, storeId, items: [] };
}

export function cartLineKey(productId: string, variantId?: string) {
  return `${productId}::${variantId ?? ""}`;
}

/** Elegibilidad por capacidades comerciales, no por categoría. */
export function cartEligible(input: { needsChoice: boolean; availability: string }) {
  if (input.needsChoice) return false;
  if (input.availability === "sold_out") return false;
  return true;
}

export function clampCartQuantity(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(CART_MAX_QTY, n);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, max = 240): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function readUnitPesos(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

function normalizeItem(raw: unknown): CartItem | null {
  if (!isRecord(raw)) return null;
  const productId = readString(raw.productId, 80);
  const name = readString(raw.name, 160);
  if (!productId || !name) return null;
  const variantId = readString(raw.variantId, 80) || undefined;
  const priceMode = readString(raw.priceMode, 24) || "fixed";
  const unitPesos = priceMode === "ask" ? null : readUnitPesos(raw.unitPesos);
  return {
    productId,
    variantId,
    quantity: clampCartQuantity(raw.quantity),
    name,
    variantLabel: readString(raw.variantLabel, 160) || undefined,
    photoUrl: readString(raw.photoUrl, 500) || undefined,
    productUrl: readString(raw.productUrl, 500) || undefined,
    sku: readString(raw.sku, 80) || undefined,
    priceMode,
    unitPesos,
    currencySymbol: readString(raw.currencySymbol, 8) || "$",
    availability: readString(raw.availability, 40) || "available",
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now(),
  };
}

/** Restaura el carrito; descarta versiones/tiendas inválidas sin mezclar tenants. */
export function parseCart(raw: string | null | undefined, storeId: string): CartState {
  const blank = emptyCart(storeId);
  if (!raw) return blank;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return blank;
    const version = Number(parsed.version);
    if (version !== CART_VERSION) return blank;
    const savedStore = readString(parsed.storeId, 200);
    if (!savedStore || savedStore !== storeId) return blank;
    const list = Array.isArray(parsed.items) ? parsed.items : [];
    const items: CartItem[] = [];
    const seen = new Set<string>();
    for (const entry of list) {
      const item = normalizeItem(entry);
      if (!item) continue;
      const key = cartLineKey(item.productId, item.variantId);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= CART_MAX_LINES) break;
    }
    return { version: CART_VERSION, storeId, items };
  } catch {
    return blank;
  }
}

export function serializeCart(state: CartState): string {
  return JSON.stringify({
    version: CART_VERSION,
    storeId: state.storeId,
    items: state.items.slice(0, CART_MAX_LINES),
  });
}

export function addCartItem(state: CartState, incoming: Omit<CartItem, "updatedAt" | "quantity"> & { quantity?: number }): CartState {
  if (!cartEligible({ needsChoice: false, availability: incoming.availability })) return state;
  const quantity = clampCartQuantity(incoming.quantity ?? 1);
  const key = cartLineKey(incoming.productId, incoming.variantId);
  const existing = state.items.find((item) => cartLineKey(item.productId, item.variantId) === key);
  const nextItem: CartItem = {
    ...incoming,
    quantity: existing ? clampCartQuantity(existing.quantity + quantity) : quantity,
    unitPesos: incoming.priceMode === "ask" ? null : incoming.unitPesos,
    updatedAt: Date.now(),
  };
  const rest = state.items.filter((item) => cartLineKey(item.productId, item.variantId) !== key);
  return {
    ...state,
    items: [...rest, nextItem].slice(0, CART_MAX_LINES),
  };
}

export function removeCartItem(state: CartState, productId: string, variantId?: string): CartState {
  const key = cartLineKey(productId, variantId);
  return {
    ...state,
    items: state.items.filter((item) => cartLineKey(item.productId, item.variantId) !== key),
  };
}

export function setCartQuantity(state: CartState, productId: string, variantId: string | undefined, quantity: number): CartState {
  const key = cartLineKey(productId, variantId);
  const nextQty = clampCartQuantity(quantity);
  return {
    ...state,
    items: state.items.map((item) =>
      cartLineKey(item.productId, item.variantId) === key ? { ...item, quantity: nextQty, updatedAt: Date.now() } : item,
    ),
  };
}

export function cartUnitCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartLineSubtotal(item: CartItem): number | null {
  if (item.priceMode === "ask" || item.unitPesos == null) return null;
  return item.unitPesos * item.quantity;
}

export function cartPriceLabel(item: CartItem): string {
  if (item.priceMode === "ask" || item.unitPesos == null) return "Consultar precio";
  if (item.priceMode === "from") return `Desde ${formatPesos(item.unitPesos, item.currencySymbol)}`;
  return formatPesos(item.unitPesos, item.currencySymbol);
}

export type CartTotals = {
  unitCount: number;
  lineCount: number;
  pricedCount: number;
  quoteCount: number;
  /** Subtotal solo de líneas con precio; null si ninguna es calculable. */
  pricedSubtotal: number | null;
  currencySymbol: string;
  mixedCurrency: boolean;
};

export function cartTotals(items: CartItem[]): CartTotals {
  const symbols = new Set(items.map((item) => item.currencySymbol || "$"));
  const mixedCurrency = symbols.size > 1;
  let pricedCount = 0;
  let quoteCount = 0;
  let pricedSubtotal = 0;
  let hasPriced = false;
  const symbol = items[0]?.currencySymbol || "$";
  for (const item of items) {
    const line = cartLineSubtotal(item);
    if (line == null) {
      quoteCount += 1;
      continue;
    }
    pricedCount += 1;
    hasPriced = true;
    pricedSubtotal += line;
  }
  return {
    unitCount: cartUnitCount(items),
    lineCount: items.length,
    pricedCount,
    quoteCount,
    pricedSubtotal: hasPriced && !mixedCurrency ? pricedSubtotal : null,
    currencySymbol: symbol,
    mixedCurrency,
  };
}

export function formatCartSubtotal(totals: CartTotals): string | null {
  if (totals.pricedSubtotal == null) return null;
  return formatPesos(totals.pricedSubtotal, totals.currencySymbol);
}

/** Etiqueta accesible del acceso al carrito en el header. */
export function cartNavLabel(unitCount: number): string {
  if (unitCount <= 0) return "Carrito";
  if (unitCount === 1) return "Carrito, 1 unidad seleccionada";
  return `Carrito, ${unitCount} unidades seleccionadas`;
}

export function cartCountLabel(lineCount: number, unitCount: number): string {
  const products = lineCount === 1 ? "1 producto" : `${lineCount} productos`;
  const units = unitCount === 1 ? "1 unidad" : `${unitCount} unidades`;
  return `${products} · ${units}`;
}

/** Cotización solo cuando hay líneas sin precio público calculable. */
export function cartNeedsQuote(items: Pick<CartItem, "priceMode" | "unitPesos">[]): boolean {
  return items.some((item) => item.priceMode === "ask" || item.unitPesos == null);
}

export function cartUnitPriceLabel(item: CartItem): string {
  if (item.priceMode === "ask" || item.unitPesos == null) return "Consultar precio";
  if (item.priceMode === "from") return `Desde ${formatPesos(item.unitPesos, item.currencySymbol)}`;
  return formatPesos(item.unitPesos, item.currencySymbol);
}

/** Payload hacia backend/formulario: sin precios del navegador. */
export function cartRequestLines(
  items: Pick<CartItem, "productId" | "variantId" | "quantity">[],
): { productId: string; variantId: string; quantity: number }[] {
  return items.slice(0, CART_MAX_LINES).map((item) => ({
    productId: item.productId,
    variantId: item.variantId ?? "",
    quantity: clampCartQuantity(item.quantity),
  }));
}
