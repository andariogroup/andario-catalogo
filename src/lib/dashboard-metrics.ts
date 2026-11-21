/**
 * Lógica pura del dashboard del dueño: rangos por día, comparación con el periodo anterior,
 * embudo y lectura por producto. Sin base de datos para poder probarla.
 */
import { foldText } from "@/lib/search";

/** Zona horaria del negocio. Colombia no usa horario de verano, así que el desfase es fijo. */
export const STORE_TIMEZONE = "America/Bogota";
const STORE_OFFSET = "-05:00";
const STORE_OFFSET_MS = -5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_RANGE_DAYS = 366;
export const PRESETS = [7, 30, 90] as const;
export type Preset = (typeof PRESETS)[number];

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: string | undefined | null): value is string {
  if (!value || !YMD.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Día calendario (AAAA-MM-DD) de un instante, en la hora del negocio. */
export function storeDay(date: Date): string {
  return new Date(date.getTime() + STORE_OFFSET_MS).toISOString().slice(0, 10);
}

export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000${STORE_OFFSET}`);
}

export function dayEnd(day: string): Date {
  return new Date(`${day}T23:59:59.999${STORE_OFFSET}`);
}

export function addDays(day: string, amount: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * DAY_MS).toISOString().slice(0, 10);
}

function spanDays(fromDay: string, toDay: string): number {
  return Math.round((new Date(`${toDay}T00:00:00Z`).getTime() - new Date(`${fromDay}T00:00:00Z`).getTime()) / DAY_MS) + 1;
}

/** Todos los días entre dos fechas, ambas incluidas. */
export function listDays(fromDay: string, toDay: string): string[] {
  const total = Math.max(0, Math.min(spanDays(fromDay, toDay), MAX_RANGE_DAYS + 1));
  return Array.from({ length: total }, (_, index) => addDays(fromDay, index));
}

export type DashboardRange = {
  fromDay: string;
  toDay: string;
  from: Date;
  to: Date;
  days: number;
  preset: Preset | null;
  previousFrom: Date;
  previousTo: Date;
  notice: string;
};

/**
 * Convierte los parámetros de la URL en un rango alineado a días completos del negocio.
 * Nunca falla: ante datos inválidos vuelve a 7 días y explica el ajuste.
 */
export function resolveRange(query: { rango?: string; desde?: string; hasta?: string }, now: Date = new Date()): DashboardRange {
  const today = storeDay(now);
  let notice = "";
  let preset: Preset | null = null;
  let fromDay = "";
  let toDay = today;

  const custom = Boolean(query.desde || query.hasta);
  if (custom) {
    const validFrom = isYmd(query.desde);
    const validTo = isYmd(query.hasta);
    if ((query.desde && !validFrom) || (query.hasta && !validTo)) notice = "Alguna fecha no era válida; se ajustó el rango.";
    toDay = validTo ? (query.hasta as string) : today;
    fromDay = validFrom ? (query.desde as string) : addDays(toDay, -6);
    if (toDay > today) {
      toDay = today;
      notice = "La fecha final no puede estar en el futuro; se ajustó a hoy.";
    }
    if (fromDay > toDay) {
      [fromDay, toDay] = [toDay, fromDay];
      notice = "Las fechas estaban al revés; se ordenaron.";
    }
    if (spanDays(fromDay, toDay) > MAX_RANGE_DAYS) {
      fromDay = addDays(toDay, -(MAX_RANGE_DAYS - 1));
      notice = `El máximo es ${MAX_RANGE_DAYS} días; se acortó el inicio.`;
    }
  } else {
    const requested = Number(query.rango);
    preset = (PRESETS as readonly number[]).includes(requested) ? (requested as Preset) : 7;
    fromDay = addDays(today, -(preset - 1));
  }

  const days = spanDays(fromDay, toDay);
  const previousToDay = addDays(fromDay, -1);
  const previousFromDay = addDays(previousToDay, -(days - 1));
  return {
    fromDay,
    toDay,
    from: dayStart(fromDay),
    to: dayEnd(toDay),
    days,
    preset,
    previousFrom: dayStart(previousFromDay),
    previousTo: dayEnd(previousToDay),
    notice,
  };
}

export type EventCounts = Record<string, number>;

/** Acciones que significan "quiere hablar con el negocio". */
export const CONTACT_EVENTS = ["whatsapp_click", "cart_send", "interest_list_send", "quote_request_created"] as const;
/** Acciones que significan "guardó algo para después". */
export const INTENT_EVENTS = ["cart_add", "interest_list_add"] as const;

function sum(counts: EventCounts, names: readonly string[]): number {
  return names.reduce((total, name) => total + (counts[name] ?? 0), 0);
}

export const contactCount = (counts: EventCounts) => sum(counts, CONTACT_EVENTS);
export const intentCount = (counts: EventCounts) => sum(counts, INTENT_EVENTS);
export const storePageCount = (counts: EventCounts) => sum(counts, ["catalog_view", "category_view"]);

export type FunnelStep = { key: string; label: string; count: number; rate: number | null };

/**
 * Embudo agregado. No sigue a una persona: compara totales de cada etapa.
 * Guardados y consultas se comparan con las fichas vistas (no entre sí, porque se puede consultar sin guardar).
 * El porcentaje solo se muestra cuando tiene sentido (la etapa no supera a su referencia).
 */
export function funnelSteps(counts: EventCounts): FunnelStep[] {
  const raw = [
    { key: "pages", label: "Páginas de la tienda vistas", count: storePageCount(counts) },
    { key: "products", label: "Fichas de producto vistas", count: counts.product_view ?? 0 },
    { key: "intent", label: "Guardaron en carrito o lista", count: intentCount(counts) },
    { key: "contact", label: "Pidieron hablar contigo", count: contactCount(counts) },
  ];
  return raw.map((step, index) => {
    const previous = index === 0 ? 0 : raw[index === 3 ? 1 : index - 1].count;
    const rate = index === 0 || previous <= 0 || step.count > previous ? null : Math.round((step.count / previous) * 100);
    return { ...step, rate };
  });
}

export type Change = { kind: "none" | "new" | "flat" | "up" | "down"; pct: number };

export function change(current: number, previous: number): Change {
  if (current === 0 && previous === 0) return { kind: "none", pct: 0 };
  if (previous === 0) return { kind: "new", pct: 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { kind: "flat", pct: 0 };
  return { kind: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

/** Texto corto de la variación, listo para mostrar. */
export function changeText(value: Change, previousLabel = "periodo anterior"): string {
  switch (value.kind) {
    case "none":
      return `Sin datos en el ${previousLabel}.`;
    case "new":
      return `No había datos en el ${previousLabel}.`;
    case "flat":
      return `Igual que el ${previousLabel}.`;
    case "up":
      return `${value.pct}% más que el ${previousLabel}.`;
    default:
      return `${value.pct}% menos que el ${previousLabel}.`;
  }
}

export function ratePercent(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

export const MIN_VIEWS_FOR_ADVICE = 5;

export type ProductSignal = "no-views" | "views-no-contact" | "converting" | "saved-only" | "low-data";

/**
 * Lectura simple de un producto.
 * «Consultas» y «guardados» se miran por separado: guardar en carrito no es pedir hablar.
 */
export function productSignal(views: number, contacts: number, saved = 0): ProductSignal {
  if (views <= 0 && contacts <= 0 && saved <= 0) return "no-views";
  if (contacts > 0) return "converting";
  if (views >= MIN_VIEWS_FOR_ADVICE && saved > 0) return "saved-only";
  if (views >= MIN_VIEWS_FOR_ADVICE && contacts === 0 && saved === 0) return "views-no-contact";
  return "low-data";
}

export type DayPoint = { day: string; views: number; contacts: number };

/** Serie diaria completa: los días sin actividad aparecen con cero. */
export function fillDays(fromDay: string, toDay: string, rows: { day: string; name: string; total: number }[]): DayPoint[] {
  const byDay = new Map<string, EventCounts>();
  for (const row of rows) {
    const current = byDay.get(row.day) ?? {};
    current[row.name] = (current[row.name] ?? 0) + row.total;
    byDay.set(row.day, current);
  }
  return listDays(fromDay, toDay).map((day) => {
    const counts = byDay.get(day) ?? {};
    return { day, views: counts.product_view ?? 0, contacts: contactCount(counts) };
  });
}

export function peakOf<T extends { total: number }>(rows: T[]): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (row.total > 0 && (!best || row.total > best.total)) best = row;
  }
  return best;
}

export function hourLabel(hour: number): string {
  const next = (hour + 1) % 24;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hour)}:00 a ${pad(next)}:00`;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export function weekdayName(index: number): string {
  return WEEKDAYS[((index % 7) + 7) % 7];
}

/** Búsqueda lista para guardar: sin tildes ni mayúsculas, espacios colapsados y acotada. */
export function searchTerm(value: string | undefined | null): string {
  return foldText(value ?? "")
    .replace(/[^\p{L}\p{N} .\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Nombre legible para un origen guardado. */
export function sourceLabel(source: string): string {
  if (!source) return "Directo o sin dato";
  const names: Record<string, string> = {
    google: "Google",
    bing: "Bing",
    duckduckgo: "DuckDuckGo",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    x: "X (Twitter)",
    pinterest: "Pinterest",
    youtube: "YouTube",
    qr: "Código QR",
  };
  return names[source] ?? source;
}

/** Desglose corto de cómo pidieron hablar (WhatsApp, carrito, lista, cotización). */
export function contactBreakdown(counts: EventCounts): string {
  const parts: string[] = [];
  const whatsapp = counts.whatsapp_click ?? 0;
  const cart = counts.cart_send ?? 0;
  const list = counts.interest_list_send ?? 0;
  const quote = counts.quote_request_created ?? 0;
  if (whatsapp) parts.push(`${whatsapp} por WhatsApp`);
  if (cart) parts.push(`${cart} desde el carrito`);
  if (list) parts.push(`${list} desde la lista`);
  if (quote) parts.push(`${quote} por cotización`);
  return parts.join(" · ");
}

/** Nombre legible para el lugar donde se hizo clic en WhatsApp. */
export function placementLabel(placement: string): string {
  const names: Record<string, string> = {
    product: "Ficha de producto",
    product_secondary: "Ficha de producto (botón secundario)",
    footer: "Pie de página",
    home: "Portada",
    about: "Página «Nosotros»",
    cart: "Carrito",
    list: "Lista de interés",
  };
  return names[placement] ?? (placement || "Sin dato");
}

export type InsightInput = {
  totals: EventCounts;
  products: { name: string; views: number; contacts: number; saved: number }[];
  searches: { term: string; total: number; empty: number }[];
  hours: { hour: number; total: number }[];
  weekdays: { dow: number; total: number }[];
};

const listNames = (names: string[]) => {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
};

/** Frases claras para el dueño, solo con lo que los datos permiten afirmar. */
export function buildInsights(input: InsightInput): string[] {
  const out: string[] = [];
  const views = input.totals.product_view ?? 0;
  if (views + contactCount(input.totals) === 0) return out;

  const day = peakOf(input.weekdays);
  const hour = peakOf(input.hours);
  if (day && hour && views >= MIN_VIEWS_FOR_ADVICE) {
    out.push(`Tu movimiento se concentra los ${weekdayName(day.dow)} y alrededor de las ${hourLabel(hour.hour)} (hora de Colombia). Buen momento para publicar o responder rápido.`);
  }

  const idle = input.products.filter((item) => productSignal(item.views, item.contacts, item.saved) === "views-no-contact").slice(0, 3);
  if (idle.length) {
    out.push(`${listNames(idle.map((item) => item.name))}: ${idle.length === 1 ? "tiene vistas, pero nadie ha preguntado ni lo ha guardado" : "tienen vistas, pero nadie ha preguntado ni los ha guardado"}. Revisa foto, precio y descripción.`);
  }

  const whatsapp = input.totals.whatsapp_click ?? 0;
  const cartSends = input.totals.cart_send ?? 0;
  if (views >= MIN_VIEWS_FOR_ADVICE && whatsapp === 0 && cartSends > 0) {
    out.push(`Nadie pulsó WhatsApp en la ficha, pero ${cartSends === 1 ? "sí hubo 1 envío" : `sí hubo ${cartSends} envíos`} desde el carrito. El interés está llegando: responde esos mensajes con prioridad.`);
  }

  const missed = input.searches.filter((item) => item.empty > 0).slice(0, 3);
  if (missed.length) {
    out.push(`Buscaron y no encontraron: ${listNames(missed.map((item) => `«${item.term}»`))}. Puede ser un producto que te piden y aún no tienes, o que lo nombras distinto.`);
  }

  const star = input.products
    .filter((item) => item.contacts > 0 && item.views >= MIN_VIEWS_FOR_ADVICE)
    .sort((a, b) => b.contacts / b.views - a.contacts / a.views)[0];
  if (star) {
    out.push(`${star.name} es el que mejor convierte vistas en consultas (${star.contacts} ${star.contacts === 1 ? "consulta" : "consultas"} por ${star.views} vistas). Destácalo.`);
  }
  return out;
}

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  views: number;
  contacts: number;
  saved: number;
};

export type ProductFunnel = ProductRow & {
  saveRate: number | null;
  contactRate: number | null;
  signal: ProductSignal;
};

/**
 * Embudo de un producto: vistas → guardados → consultas.
 * Los porcentajes se calculan sobre las vistas de esa ficha (no sobre el total de la tienda).
 */
export function productFunnel(product: ProductRow): ProductFunnel {
  return {
    ...product,
    saveRate: ratePercent(product.saved, product.views),
    contactRate: ratePercent(product.contacts, product.views),
    signal: productSignal(product.views, product.contacts, product.saved),
  };
}

/** Productos con actividad, listos para pintar el embudo (máximo `limit`). */
export function productFunnels(products: ProductRow[], limit = 8): ProductFunnel[] {
  return products
    .filter((item) => item.views > 0 || item.contacts > 0 || item.saved > 0)
    .slice(0, limit)
    .map(productFunnel);
}

export type DashboardAlert = {
  id: string;
  tone: "warn" | "good" | "idle";
  title: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
};

/**
 * Alertas accionables: solo lo que el dueño puede corregir hoy.
 * Se priorizan las que más afectan las ventas (vistas sin consulta, sin tráfico, búsquedas vacías).
 */
export function buildAlerts(input: {
  products: ProductRow[];
  searches: { term: string; total: number; empty: number }[];
  totals: EventCounts;
  openQuotes: number;
  canQuotes: boolean;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const views = input.totals.product_view ?? 0;
  const contacts = contactCount(input.totals);

  const unseen = input.products.filter((item) => item.views === 0);
  if (unseen.length) {
    const names = listNames(unseen.slice(0, 3).map((item) => item.name));
    alerts.push({
      id: "unseen",
      tone: "warn",
      title: unseen.length === 1 ? "1 producto activo sin vistas" : `${unseen.length} productos activos sin vistas`,
      detail:
        unseen.length === 1
          ? `${names} no apareció en ninguna ficha en este rango. Compártelo o destácalo en la portada.`
          : `Entre ellos: ${names}. Compártelos o destácalos en la portada.`,
      href: "/admin/productos",
      hrefLabel: "Ver productos",
    });
  }

  const idle = input.products.filter((item) => productSignal(item.views, item.contacts, item.saved) === "views-no-contact").slice(0, 3);
  if (idle.length) {
    const first = idle[0];
    alerts.push({
      id: "views-no-contact",
      tone: "warn",
      title: idle.length === 1 ? "Se ve, pero nadie pregunta" : `${idle.length} productos se ven y nadie pregunta`,
      detail: `${listNames(idle.map((item) => item.name))}: revisa foto, precio y el mensaje de WhatsApp.`,
      href: `/admin/productos/${first.id}`,
      hrefLabel: "Abrir el primero",
    });
  }

  const savedOnly = input.products.filter((item) => productSignal(item.views, item.contacts, item.saved) === "saved-only").slice(0, 3);
  if (savedOnly.length) {
    const first = savedOnly[0];
    alerts.push({
      id: "saved-only",
      tone: "warn",
      title: savedOnly.length === 1 ? "Lo guardan, pero no te escriben" : "Los guardan, pero no te escriben",
      detail: `${listNames(savedOnly.map((item) => item.name))}: hay interés; empuja el contacto desde la ficha o el carrito.`,
      href: `/admin/productos/${first.id}`,
      hrefLabel: "Revisar ficha",
    });
  }

  const star = input.products
    .filter((item) => item.contacts > 0 && item.views >= MIN_VIEWS_FOR_ADVICE)
    .sort((a, b) => b.contacts / Math.max(1, b.views) - a.contacts / Math.max(1, a.views))[0];
  if (star && !star.featured) {
    alerts.push({
      id: "star-not-featured",
      tone: "good",
      title: "Tu mejor producto no está destacado",
      detail: `${star.name} convierte vistas en consultas y no figura como destacado en la portada.`,
      href: `/admin/productos/${star.id}`,
      hrefLabel: "Destacarlo",
    });
  }

  const missed = input.searches.filter((item) => item.empty > 0).sort((a, b) => b.empty - a.empty).slice(0, 3);
  if (missed.length) {
    alerts.push({
      id: "missed-search",
      tone: "warn",
      title: missed.length === 1 ? "Buscaron algo que no tienes" : "Buscaron cosas que no encontraste",
      detail: `Sin resultados: ${listNames(missed.map((item) => `«${item.term}»`))}. Puede ser un producto nuevo o un nombre distinto al tuyo.`,
      href: "/admin/productos/nueva",
      hrefLabel: "Agregar producto",
    });
  }

  if (input.canQuotes && input.openQuotes > 0) {
    alerts.push({
      id: "open-quotes",
      tone: "warn",
      title: input.openQuotes === 1 ? "1 cotización por atender" : `${input.openQuotes} cotizaciones por atender`,
      detail: "Siguen abiertas, de cualquier fecha. Responder rápido cierra más ventas.",
      href: "/admin/cotizaciones",
      hrefLabel: "Abrir la cola",
    });
  }

  if (views >= MIN_VIEWS_FOR_ADVICE && contacts === 0) {
    alerts.push({
      id: "no-contacts",
      tone: "warn",
      title: "Hay vistas y cero consultas",
      detail: `${views} fichas vistas en el rango y nadie pidió hablar. Revisa precio, fotos y el botón de WhatsApp.`,
      href: "/admin/seo",
      hrefLabel: "Revisar mensaje de WhatsApp",
    });
  }

  return alerts.slice(0, 6);
}