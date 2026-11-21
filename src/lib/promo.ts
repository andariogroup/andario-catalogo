import { fichaCompareLabel, fichaPriceLabel } from "@/lib/ficha-presentation";

export const PROMO_CHANNELS = ["instagram", "facebook", "whatsapp"] as const;
export const PROMO_FORMATS = ["square", "portrait", "story"] as const;
export const PROMO_TEMPLATES = ["editorial", "direct", "experience", "benefit"] as const;

/** Márgenes de la historia en px de una pieza de 1080 de ancho. Dejan libre la interfaz de la historia y de TikTok. */
export const STORY_SAFE = { top: 180, bottom: 300, left: 64, right: 140 };
export const PROMO_STATUSES = ["created", "shared"] as const;

export type PromoChannel = (typeof PROMO_CHANNELS)[number];
export type PromoFormat = (typeof PROMO_FORMATS)[number];
export type PromoTemplate = (typeof PROMO_TEMPLATES)[number];
export type PromoStatus = (typeof PROMO_STATUSES)[number];

export const PROMO_SIZE: Record<PromoFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

const CHANNEL_LABEL: Record<PromoChannel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

const FORMAT_LABEL: Record<PromoFormat, string> = {
  square: "Cuadrada",
  portrait: "Vertical",
  story: "Historia",
};

const TEMPLATE_LABEL: Record<PromoTemplate, string> = {
  editorial: "Editorial",
  direct: "Venta directa",
  experience: "Experiencia",
  benefit: "Beneficio",
};

export function isPromoChannel(value: string): value is PromoChannel {
  return (PROMO_CHANNELS as readonly string[]).includes(value);
}

export function isPromoFormat(value: string): value is PromoFormat {
  return (PROMO_FORMATS as readonly string[]).includes(value);
}

/** Acepta los estilos actuales y las plantillas guardadas antes de este cambio. */
export function canonicalTemplate(value: string): PromoTemplate | null {
  if (value === "editorial" || value === "featured") return "editorial";
  if (value === "experience" || value === "new") return "experience";
  if (value === "direct" || value === "price" || value === "offer") return "direct";
  if (value === "benefit") return "benefit";
  return null;
}

export function isPromoTemplate(value: string): value is PromoTemplate {
  return canonicalTemplate(value) !== null && (PROMO_TEMPLATES as readonly string[]).includes(value);
}

export function promoChannelLabel(value: string) {
  return isPromoChannel(value) ? CHANNEL_LABEL[value] : value;
}

export function promoFormatLabel(value: string) {
  return isPromoFormat(value) ? FORMAT_LABEL[value] : value;
}

export function promoTemplateLabel(value: string) {
  const style = canonicalTemplate(value);
  return style ? TEMPLATE_LABEL[style] : value;
}

export function promoStatusLabel(value: string) {
  if (value === "shared") return "Compartida";
  return "Creada";
}

export function offerAllowed(input: { priceMode: string; price: number | null; compare: number | null }) {
  if (input.priceMode === "ask") return false;
  if (input.price == null || input.compare == null) return false;
  return input.compare > input.price;
}

export function promoPrices(input: {
  priceMode: string;
  price: number | null;
  compare: number | null;
  symbol: string;
}) {
  const priceLabel = fichaPriceLabel({ priceMode: input.priceMode, unit: input.price, symbol: input.symbol });
  const compareLabel = input.priceMode === "ask"
    ? ""
    : fichaCompareLabel({ comparePesos: input.compare, unit: input.price, symbol: input.symbol });
  return {
    priceLabel,
    compareLabel,
    offer: offerAllowed(input),
  };
}

export function defaultCta(input: { hasWhatsapp: boolean; priceMode: string; availability: string }) {
  if (input.availability === "sold_out") return "Solicitar cotización";
  if (input.hasWhatsapp && input.priceMode === "ask") return "Consultar precio por WhatsApp";
  if (input.hasWhatsapp) return "Pedir por WhatsApp";
  if (input.priceMode === "ask") return "Solicitar cotización";
  return "Ver en el catálogo";
}

function clipWords(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max + 1);
  const space = slice.lastIndexOf(" ");
  return (space > 12 ? slice.slice(0, space) : clean.slice(0, max)).trim();
}

function firstSentence(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? clean).trim();
}

function restAfter(value: string, sentence: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!sentence || clean.toLowerCase().indexOf(sentence.toLowerCase()) !== 0) return "";
  return clean.slice(sentence.length).replace(/^[\s.!?]+/, "").trim();
}

const WEAK_WORD = new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los", "o", "para", "por", "que", "su", "sus", "un", "una", "y"]);

/** Prefijo real de la frase, en un corte de palabra y sin terminar en una preposición. */
function hookFrom(sentence: string, max: number) {
  const words = sentence.replace(/[.!?]+$/, "").trim().split(/\s+/).filter(Boolean);
  const full = words.join(" ");
  if (full.length <= max) return full;
  let current = "";
  let best = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) break;
    current = next;
    if (!WEAK_WORD.has(word.toLowerCase().replace(/[.,;:]+$/, ""))) best = current;
  }
  return best.length >= 8 ? best : clipWords(full, max);
}

function remainder(sentence: string, hook: string) {
  const clean = sentence.replace(/[.!?]+$/, "").trim();
  if (!hook || !clean.toLowerCase().startsWith(hook.toLowerCase())) return "";
  return clean.slice(hook.length).replace(/^[\s,;:]+/, "").trim();
}

function sentencesOf(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((piece) => piece.replace(/[.!?]+$/, "").trim())
    .filter((piece) => piece.length >= 8);
}

function lead(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Argumentos verificables: frases de la descripción y características visibles.
 * Como máximo seis; la pieza usa hasta tres.
 */
export function promoBenefitPoints(input: {
  name: string;
  short: string;
  description?: string;
  facts?: { name: string; value: string }[];
}) {
  const name = input.name.replace(/\s+/g, " ").trim().toLowerCase();
  const seen = new Set<string>();
  const points: string[] = [];
  const push = (raw: string) => {
    const full = raw.replace(/\s+/g, " ").trim();
    const clipped = clipWords(full, 96);
    if (clipped.length < 8 || clipped.length < full.length) return;
    const clean = clipped;
    const key = clean.toLowerCase();
    if (key === name || seen.has(key)) return;
    seen.add(key);
    points.push(lead(clean));
  };
  for (const sentence of [...sentencesOf(input.short), ...sentencesOf(input.description ?? "")]) push(sentence);
  for (const fact of input.facts ?? []) {
    const label = fact.name.replace(/\s+/g, " ").trim();
    const value = fact.value.replace(/\s+/g, " ").trim();
    if (!label || !value) continue;
    push(`${label}: ${value}`);
  }
  return points.slice(0, 6);
}

export function hasBenefitPoints(input: {
  name: string;
  short: string;
  description?: string;
  facts?: { name: string; value: string }[];
}) {
  return promoBenefitPoints(input).length > 0;
}

/** Ningún estilo actual exige foto: sin ella la pieza usa texto sobre el color de marca. */
const TEMPLATES_THAT_NEED_PHOTO = new Set<string>();

export function templateNeedsPhoto(template: string) {
  return TEMPLATES_THAT_NEED_PHOTO.has(canonicalTemplate(template) ?? template);
}

const MONEY = /\$\s?\d{1,3}(?:\.\d{3})+/g;

/** Deja en el texto solo los precios que el catálogo publica ahora. */
export function alignCaptionPrices(caption: string, input: { priceLabel: string; compareLabel: string; offer: boolean }) {
  const price = input.priceLabel.trim();
  const compare = input.offer ? input.compareLabel.trim() : "";
  const publicPrice = price.startsWith("$");
  let text = caption;
  if (!publicPrice) {
    text = text.replace(/\s*Antes\s+\$\s?[\d.]+,\s*ahora\s+\$\s?[\d.]+/gi, "");
    text = text.replace(/\s{2,}/g, " ").trim();
    return { caption: text, updated: text !== caption };
  }
  const antes = text.match(/Antes\s+\$\s?[\d.]+,\s*ahora\s+\$\s?[\d.]+/i);
  if (antes) {
    const rebuilt = input.offer && compare ? `Antes ${compare}, ahora ${price}` : price;
    if (antes[0] !== rebuilt) text = text.replace(antes[0], rebuilt);
  }
  text = text.replace(MONEY, (token) => {
    const compact = token.replace(/\s/g, "");
    if (compact === price || (compare && compact === compare)) return compact;
    return price;
  });
  return { caption: text, updated: text !== caption };
}

export function promoClaimProblem(caption: string, offer: boolean) {
  if (offer) return "";
  if (/descuento|rebaja/i.test(caption)) return "El texto anuncia un descuento que el catálogo no tiene.";
  if (/antes\s+\$/i.test(caption)) return "El texto cita un precio anterior y el catálogo no lo tiene.";
  return "";
}

export function promoExportBlocks(input: {
  priceLabel: string;
  priceMode: string;
  paintedPrice: string;
  headlineContrast: number;
  ctaContrast: number;
  overflow: boolean;
  photoUrl: string;
  template: string;
}) {
  const blocks: string[] = [];
  const asks = input.priceMode === "ask" || !input.priceLabel.trim() || input.priceLabel === "Consultar precio";
  if (asks) {
    if (input.paintedPrice.trim()) blocks.push("La imagen muestra un precio que el producto no publica.");
  } else if (input.paintedPrice !== input.priceLabel) {
    blocks.push("El precio de la imagen no coincide con el del producto.");
  }
  if (input.headlineContrast < 4.5) blocks.push("El titular no tiene contraste suficiente.");
  if (input.ctaContrast < 4.5) blocks.push("El llamado a la acción no tiene contraste suficiente.");
  if (input.overflow) blocks.push("Hay texto que se sale o se encima.");
  if (templateNeedsPhoto(input.template) && !input.photoUrl.trim()) blocks.push("Este estilo necesita una foto del producto.");
  return blocks;
}

function clipSentence(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export type PromoArtCopy = {
  style: PromoTemplate;
  kicker: string;
  headline: string;
  benefit: string;
  points: string[];
  name: string;
  price: string;
  compare: string;
  note: string;
  cta: string;
  whatsapp: boolean;
};

/**
 * Titular, beneficio y CTA a partir de datos reales.
 * No inventa propiedades, urgencia, testimonios ni descuentos.
 */
export function promoArtCopy(input: {
  template: string;
  name: string;
  short: string;
  description?: string;
  facts?: { name: string; value: string }[];
  points?: string[];
  category?: string;
  priceLabel: string;
  compareLabel: string;
  priceMode?: string;
  availability?: string;
  cta: string;
}): PromoArtCopy {
  const style = canonicalTemplate(input.template) ?? "direct";
  const name = input.name.replace(/\s+/g, " ").trim();
  const short = input.short.replace(/\s+/g, " ").trim();
  const sentence = firstSentence(short);
  const bare = sentence.replace(/[.!?]+$/, "");
  const distinct = bare.length >= 8 && bare.toLowerCase() !== name.toLowerCase();
  const headline = distinct ? (bare.length <= 52 ? bare : hookFrom(bare, 36)) : name;
  const leftover = distinct ? remainder(bare, headline) : "";
  const after = distinct ? restAfter(short, sentence) : (short.toLowerCase() === name.toLowerCase() ? "" : short);
  const posterSource = leftover.length >= 12 ? leftover : [leftover, after].filter(Boolean).join(". ");
  const benefitRaw = !posterSource || headline.toLowerCase() === posterSource.toLowerCase() ? "" : clipWords(posterSource, 64);
  const benefit = benefitRaw ? lead(benefitRaw) : "";
  const pool = style === "benefit"
    ? (input.points ?? promoBenefitPoints({ name, short, description: input.description, facts: input.facts }))
    : [];
  let benefitHeadline = headline;
  let points: string[] = [];
  if (style === "benefit" && pool.length) {
    const extra = pool.filter((point) => {
      const key = point.toLowerCase();
      return key !== benefitHeadline.toLowerCase() && !key.startsWith(benefitHeadline.toLowerCase());
    });
    if (extra.length) points = extra.slice(0, 3);
    else if (benefitHeadline.toLowerCase() !== name.toLowerCase()) {
      benefitHeadline = name;
      points = pool.slice(0, 3);
    } else {
      points = pool.slice(0, 3);
    }
  }
  const priced = Boolean(input.priceLabel) && input.priceLabel !== "Consultar precio" && input.priceMode !== "ask";
  const compare = style === "direct" && priced && input.compareLabel ? input.compareLabel : "";
  const category = (input.category ?? "").replace(/\s+/g, " ").trim();
  const kicker = category && !name.toLowerCase().includes(category.toLowerCase()) ? clipWords(category, 32) : "";
  return {
    style,
    kicker,
    headline: benefitHeadline,
    benefit: style === "benefit" ? "" : benefit,
    points,
    name: benefitHeadline.toLowerCase() === name.toLowerCase() ? "" : name,
    price: priced ? input.priceLabel : "",
    compare,
    note: input.availability === "sold_out"
      ? "Agotado"
      : input.availability === "made_to_order"
        ? "Bajo pedido"
        : input.priceMode === "ask" && style === "direct"
          ? "Precio a consultar"
          : "",
    cta: input.cta.trim(),
    whatsapp: /whatsapp/i.test(input.cta),
  };
}

/** Texto inicial a partir de datos del producto. No inventa un descuento. */
export function defaultCaption(input: {
  name: string;
  short: string;
  description?: string;
  facts?: { name: string; value: string }[];
  points?: string[];
  template: string;
  priceLabel: string;
  compareLabel: string;
  category?: string;
  priceMode?: string;
  availability?: string;
  cta?: string;
}) {
  const art = promoArtCopy({ ...input, cta: input.cta ?? "" });
  const parts = [art.headline];
  if (art.name) parts.push(art.name);
  if (art.points.length) parts.push(...art.points);
  else if (art.benefit) parts.push(art.benefit);
  const short = input.short.replace(/\s+/g, " ").trim();
  for (const piece of short.split(/(?<=[.!?])\s+/)) {
    const bit = piece.replace(/[.!?]+$/, "").trim();
    if (bit.length < 8) continue;
    const probe = bit.toLowerCase().slice(0, Math.min(24, bit.length));
    if (parts.join(" ").toLowerCase().includes(probe)) continue;
    parts.push(bit);
  }
  if (art.compare && art.price) parts.push(`Antes ${art.compare}, ahora ${art.price}`);
  else if (art.price) parts.push(art.price);
  const body = parts.filter(Boolean).join(". ");
  return clipSentence(body.endsWith(".") ? body : `${body}.`, 500);
}

export function promoLink(origin: string, slug: string, channel: PromoChannel) {
  const base = origin.trim().replace(/\/$/, "");
  return `${base}/producto/${encodeURIComponent(slug)}?utm_source=${channel}`;
}

export function promoShareText(caption: string, link: string) {
  return `${caption.trim()}\n${link}`;
}

export function promoFileName(slug: string, channel: PromoChannel) {
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "pieza";
  return `${clean}-${channel}.png`;
}

/** JPG de entrega para dibujar la pieza. No altera URLs que no son de Cloudinary. */
export function promoDeliveryUrl(value: string, width: number) {
  const raw = value.trim();
  if (!raw) return "";
  const safeWidth = Math.min(1600, Math.max(64, Math.round(width)));
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return raw;
    const marker = "/upload/";
    const index = url.pathname.indexOf(marker);
    if (index < 0) return raw;
    const head = url.pathname.slice(0, index + marker.length);
    const tail = url.pathname.slice(index + marker.length);
    if (!tail) return raw;
    url.pathname = `${head}f_jpg,q_85,w_${safeWidth},c_limit/${tail}`;
    return url.toString();
  } catch {
    return raw;
  }
}

export function promoWhen(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(date);
}

export type PromoEditor = {
  id: string;
  channel: PromoChannel;
  format: PromoFormat;
  template: PromoTemplate;
  photoUrl: string;
  caption: string;
  cta: string;
  offerRemoved: boolean;
  priceUpdated: boolean;
  variantId: string;
  variants: {
    id: string;
    label: string;
    priceLabel: string;
    compareLabel: string;
    offer: boolean;
    availability: string;
    photoUrl: string;
  }[];
  product: {
    id: string;
    name: string;
    slug: string;
    short: string;
    category: string;
    priceMode: string;
    availability: string;
    points: string[];
    priceLabel: string;
    compareLabel: string;
    offer: boolean;
  };
  photos: { url: string; preview: string; alt: string }[];
  brand: {
    name: string;
    logoUrl: string;
    background: string;
    ink: string;
    muted: string;
    accent: string;
    button: string;
    buttonInk: string;
    photoWell: string;
    fontPair: string;
  };
  origin: string;
  whatsapp: string;
  hasWhatsapp: boolean;
};

export function promoProblem(input: {
  channel: string;
  format: string;
  template: string;
  caption: string;
  cta: string;
  photoUrl: string;
  photos: string[];
  points?: string[];
  priceMode: string;
  price: number | null;
  compare: number | null;
}) {
  if (!isPromoChannel(input.channel)) return "Elige un canal.";
  if (!isPromoFormat(input.format)) return "Elige un formato.";
  if (!canonicalTemplate(input.template)) return "Elige un estilo.";
  if (canonicalTemplate(input.template) === "benefit" && !(input.points && input.points.length)) {
    return "Este producto no tiene argumentos para Beneficio.";
  }
  const caption = input.caption.trim();
  if (caption.length < 2) return "Escribe el texto de la publicación.";
  if (caption.length > 500) return "El texto pasa de 500 caracteres.";
  const cta = input.cta.trim();
  if (cta.length < 2) return "Escribe el llamado a la acción.";
  if (cta.length > 40) return "El llamado a la acción tiene que ser más corto.";
  const claim = promoClaimProblem(caption, offerAllowed({
    priceMode: input.priceMode,
    price: input.price,
    compare: input.compare,
  }));
  if (claim) return claim;
  if (input.photoUrl && !input.photos.includes(input.photoUrl)) return "Elige una foto de este producto.";
  return "";
}
