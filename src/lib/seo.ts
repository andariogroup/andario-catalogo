import { foldText } from "@/lib/search";

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(configured)) return configured;
  const vercel = process.env.VERCEL_URL?.trim() ?? "";
  if (/^[a-z0-9.-]+$/i.test(vercel)) return `https://${vercel}`;
  return "http://localhost:3020";
}

export function publicUrlProblem(value: string): string {
  const url = value.trim().replace(/\/$/, "");
  if (!url) return "";
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(url)) return "Usa https y solo el dominio, sin ruta.";
  return "";
}

export function catalogOrigin(publicUrl: string): string {
  const url = publicUrl.trim().replace(/\/$/, "");
  if (url && !publicUrlProblem(url)) return url;
  return siteUrl();
}

export function titled(value: string, brand: string): string | { absolute: string } {
  const clean = value.trim();
  const name = brand.trim();
  if (name && clean.toLowerCase().includes(name.toLowerCase())) return { absolute: clean };
  return clean;
}

export function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function canonicalPath(path: string): string {
  if (!path.startsWith("/")) return "/";
  const [pathname] = path.split("?");
  return pathname || "/";
}

const CATALOG_QUERY = ["q", "categoria", "disponibilidad", "opcion", "opciones", "tipo", "minimo", "maximo", "orden"] as const;

export function catalogCanonical(query: Record<string, string | undefined>, page?: number): string {
  const params = new URLSearchParams();
  for (const key of CATALOG_QUERY) {
    const value = query[key]?.trim();
    if (value) params.set(key, value);
  }
  const current = page ?? Number(query.pagina);
  if (Number.isInteger(current) && current > 1) params.set("pagina", String(current));
  const text = params.toString();
  const path = canonicalPath("/catalogo");
  return text ? `${path}?${text}` : path;
}

const COUNTRY_CODES: Record<string, string> = {
  colombia: "CO",
  mexico: "MX",
  peru: "PE",
  ecuador: "EC",
  venezuela: "VE",
  panama: "PA",
  chile: "CL",
  argentina: "AR",
  brasil: "BR",
  brazil: "BR",
  "estados unidos": "US",
  espana: "ES",
};

/** schema.org pide el código ISO de 2 letras; acepta el nombre habitual en español. */
export function countryCode(value: string | null | undefined): string | undefined {
  const clean = (value ?? "").trim();
  if (!clean) return undefined;
  if (/^[A-Za-z]{2}$/.test(clean)) return clean.toUpperCase();
  return COUNTRY_CODES[foldText(clean)];
}

const DAY_CODES: [string, string][] = [
  ["lunes", "Mo"],
  ["martes", "Tu"],
  ["miercoles", "We"],
  ["jueves", "Th"],
  ["viernes", "Fr"],
  ["sabado", "Sa"],
  ["domingo", "Su"],
];

function dayCode(word: string): string | undefined {
  const folded = foldText(word);
  return DAY_CODES.find(([name]) => name === folded)?.[1];
}

function clock(hours: string, minutes: string | undefined, meridiem: string | undefined): string | null {
  let h = Number(hours);
  const m = minutes ? Number(minutes) : 0;
  if (!Number.isInteger(h) || m > 59) return null;
  const marker = (meridiem ?? "").replace(/[^a-z]/gi, "").toLowerCase();
  if (marker === "pm" && h < 12) h += 12;
  if (marker === "am" && h === 12) h = 0;
  if (h > 24 || (h === 24 && m > 0)) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Convierte horarios escritos a mano ("Lunes a Domingo, 9:00 a 18:00") al formato de schema.org
 * ("Mo-Su 09:00-18:00"). Si no se puede entender con certeza devuelve undefined: mejor omitirlo que publicarlo mal.
 */
export function openingHoursSpec(text: string | null | undefined): string | undefined {
  const raw = (text ?? "").trim();
  if (!raw) return undefined;
  const days = raw.match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)s?\b(?:\s*(?:a|al|-|–|hasta)\s*\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)s?\b)?/i);
  if (!days) return undefined;
  const first = dayCode(days[1]);
  const last = days[2] ? dayCode(days[2]) : undefined;
  if (!first || (days[2] && !last)) return undefined;
  const rest = raw.slice((days.index ?? 0) + days[0].length);
  const time = /(\d{1,2})(?::(\d{2}))?\s*((?:a\.?\s?m\.?|p\.?\s?m\.?))?\s*(?:a|al|-|–|hasta|y)\s*(\d{1,2})(?::(\d{2}))?\s*((?:a\.?\s?m\.?|p\.?\s?m\.?))?/i.exec(rest);
  if (!time) return undefined;
  const open = clock(time[1], time[2], time[3] ?? time[6]);
  const close = clock(time[4], time[5], time[6]);
  if (!open || !close || open >= close) return undefined;
  return `${last && last !== first ? `${first}-${last}` : first} ${open}-${close}`;
}

export function organizationJsonLd(input: {
  name: string;
  url: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  image: string;
  address?: string;
  hours?: string;
  sameAs?: string[];
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.city ? "LocalBusiness" : "Organization",
    name: input.name,
    url: input.url,
  };
  if (input.image) data.image = input.image;
  if (input.phone) data.telephone = input.phone;
  const street = input.address?.trim() ?? "";
  if (input.city || street) {
    const country = countryCode(input.country) ?? (input.country.trim() ? undefined : "CO");
    data.address = {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      ...(input.city ? { addressLocality: input.city, addressRegion: input.region, ...(country ? { addressCountry: country } : {}) } : {}),
    };
  }
  const hours = openingHoursSpec(input.hours);
  if (hours) data.openingHours = hours;
  const links = [...new Set((input.sameAs ?? []).map((item) => item.trim()).filter((item) => /^https:\/\//i.test(item)))];
  if (links.length) data.sameAs = links;
  return data;
}

export function productJsonLd(input: {
  name: string;
  description: string;
  sku: string;
  image: string[];
  url: string;
  price: number | null;
  priceMode: string;
  availability: string;
  kind: string;
  store: string;
  /** Precios de variantes con precio propio; si difieren se publica un rango. */
  variantPrices?: number[];
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.kind === "service" ? "Service" : "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    url: input.url,
  };
  if (input.image.length) data.image = input.image;
  if (input.kind !== "service" && input.price != null && input.priceMode !== "ask") {
    const availability = input.availability === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
    const seller = input.store ? { seller: { "@type": "Organization", name: input.store } } : {};
    const prices = [input.price, ...(input.variantPrices ?? []).filter((value) => Number.isFinite(value) && value > 0)];
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    data.offers =
      low !== high
        ? { "@type": "AggregateOffer", priceCurrency: "COP", lowPrice: String(low), highPrice: String(high), offerCount: prices.length, url: input.url, availability, ...seller }
        : { "@type": "Offer", priceCurrency: "COP", price: String(input.price), url: input.url, availability, ...seller };
  }
  return data;
}

/** Palabras con significado de un texto, sin tildes, para comparar títulos con nombres. */
function meaningfulWords(value: string): string[] {
  return foldText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2);
}

/**
 * Usa el título SEO del producto solo si realmente habla del producto.
 * Un título copiado de otra página (p. ej. el de la categoría) hace que Google lo reescriba o confunda resultados.
 */
export function productSeoTitle(name: string, seoTitle: string | null | undefined): string {
  const custom = (seoTitle ?? "").trim();
  if (!custom || endsMidSentence(custom)) return name;
  const words = [...new Set(meaningfulWords(name))];
  if (!words.length) return custom;
  const titleWords = new Set(meaningfulWords(custom));
  const shared = words.filter((word) => titleWords.has(word)).length;
  return shared / words.length >= 0.5 ? custom : name;
}

const DANGLING_WORDS = new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los", "o", "para", "por", "sin", "su", "sus", "u", "un", "una", "y"]);

/** Un título que termina en conector ("…aceites para") es una frase cortada por el límite de caracteres. */
export function endsMidSentence(value: string): boolean {
  const last = foldText(value.trim()).split(/[^\p{L}\p{N}]+/u).filter(Boolean).pop();
  return Boolean(last && DANGLING_WORDS.has(last));
}

/** Un título SEO de categoría largo o cortado a mitad de frase se reemplaza por el nombre de la categoría. */
export function categorySeoTitle(name: string, seoTitle: string | null | undefined, max = 70): string {
  const custom = (seoTitle ?? "").trim();
  return custom && custom.length <= max && !endsMidSentence(custom) ? custom : name;
}

function sameText(a: string, b: string): boolean {
  const left = foldText(a).replace(/\s+/g, " ").trim();
  const right = foldText(b).replace(/\s+/g, " ").trim();
  if (!left || !right) return false;
  if (left === right) return true;
  const short = left.length <= right.length ? left : right;
  const long = short === left ? right : left;
  return short.length >= 40 && long.startsWith(short);
}

/** Descripción de resultados: la propia del producto; nunca la de su categoría reutilizada. */
export function productSeoDescription(input: {
  seoDescription?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  categoryTexts?: (string | null | undefined)[];
  max?: number;
}): string {
  const max = input.max ?? 160;
  const categoryTexts = (input.categoryTexts ?? []).map((item) => item ?? "").filter(Boolean);
  const custom = (input.seoDescription ?? "").trim();
  const useCustom = custom && !categoryTexts.some((text) => sameText(custom, text));
  return clip((useCustom ? custom : "") || input.shortDescription || input.description || "", max);
}

/** Open Graph completo para páginas internas: un openGraph parcial reemplaza al del layout raíz. */
export function pageOpenGraph(input: { title: string; description?: string; path: string; brand?: string; image?: string }) {
  return {
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.path,
    type: "website" as const,
    locale: "es_CO",
    ...(input.brand ? { siteName: input.brand } : {}),
    ...(input.image ? { images: [input.image] } : {}),
  };
}

/** Listado de una categoría como CollectionPage con sus productos visibles. */
export function collectionJsonLd(input: { name: string; description?: string; url: string; items: { name: string; url: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
