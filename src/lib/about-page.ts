export type AboutBusiness = {
  name: string;
  slogan: string;
  shortDescription: string;
  description: string;
  storyTitle: string;
  story: string;
  storyImageUrl: string;
  commercialMessage: string;
  yearStarted: number | null;
  address: string;
  city: string;
  region: string;
  country: string;
  mapsUrl: string;
  phone: string;
  email: string;
  whatsapp: string;
  hours: string;
  attentionScope: string;
  deliveryText: string;
  commercialTerms: string;
};

const PROVISIONAL = [
  /este texto se puede/i,
  /se puede reemplazar/i,
  /el administrador puede/i,
  /nuestro sistema permite/i,
  /somos los mejores/i,
  /líderes en el mercado/i,
  /no calcula(?:\s+\w+){0,4}\s+env[ií]o/i,
  /este texto no calcula/i,
];

/** Frases que describen la plataforma o el catálogo, no el negocio. */
const PLATFORM_SPEAK = [
  /es el catálogo del negocio/i,
  /catálogo digital autoadministrable/i,
  /nuestra plataforma/i,
  /este catálogo (?:permite|sirve|muestra)/i,
  /aquí se publican las piezas/i,
  /precio de referencia y la forma de pedir/i,
  /forma de pedir información por whatsapp/i,
  /se puede configurar desde el administrador/i,
];

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isBlockedCopy(text: string) {
  return PROVISIONAL.some((rule) => rule.test(text)) || PLATFORM_SPEAK.some((rule) => rule.test(text));
}

export function publicBusinessCopy(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text || isBlockedCopy(text)) return "";
  return text;
}

/** Quita oraciones que describen la plataforma o son texto provisional. */
export function scrubPlatformSentences(value: string | null | undefined) {
  const text = cleanText(value);
  if (!text) return "";
  if (PROVISIONAL.some((rule) => rule.test(text)) && text.length < 220) return "";
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((sentence) => !PLATFORM_SPEAK.some((rule) => rule.test(sentence)) && !PROVISIONAL.some((rule) => rule.test(sentence)));
  return parts.join(" ").trim();
}

export function isLocationCentricTitle(
  title: string,
  business: Pick<AboutBusiness, "name" | "city" | "address" | "region">,
) {
  const custom = cleanText(title);
  if (!custom) return true;
  const name = cleanText(business.name);
  const city = cleanText(business.city);
  const address = cleanText(business.address);
  const region = cleanText(business.region);
  const lower = custom.toLocaleLowerCase("es");

  if (city && lower === city.toLocaleLowerCase("es")) return true;
  if (address && lower === address.toLocaleLowerCase("es")) return true;
  if (region && lower === region.toLocaleLowerCase("es")) return true;
  if (/^(en|desde|ubicad[oa]s?\s+en)\b/i.test(custom) && custom.length < 48) return true;
  if (name && new RegExp(`^${escapeRegExp(name)}\\s+en\\s+.+`, "i").test(custom)) return true;
  if (city && new RegExp(`\\ben\\s+${escapeRegExp(city)}$`, "i").test(custom) && custom.length < 64) return true;
  if (address && lower.includes(address.toLocaleLowerCase("es")) && custom.length < 72) return true;
  return false;
}

export function aboutPageTitle(
  business: Pick<AboutBusiness, "name" | "storyTitle" | "city" | "address" | "region">,
) {
  const name = publicBusinessCopy(business.name) || "el negocio";
  const custom = cleanText(business.storyTitle);
  if (!custom || isBlockedCopy(custom) || isLocationCentricTitle(custom, business)) {
    return `Conoce ${name}`;
  }
  return custom;
}

export function aboutYearLabel(yearStarted: number | null | undefined, now = new Date()) {
  if (!yearStarted || !Number.isFinite(yearStarted)) return "";
  const year = Math.trunc(yearStarted);
  const current = now.getFullYear();
  // Solo tiene sentido como señal de trayectoria si ya hay al menos un año.
  if (year < 1800 || year >= current) return "";
  return `Desde ${year}`;
}

function tidyClause(value: string) {
  return value
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,(?=\s*[.!?])/g, "")
    .replace(/\s+([.!?])/g, "$1")
    .replace(/(?:^|\s)(?:desde|en|de|del|la|el|los|las|ubicad[oa]s?)\s*[.!?]?\s*$/i, "")
    .replace(/^\s*(?:y|e|o|,)\s+/i, "")
    .trim();
}

/** Evita repetir ciudad/dirección en la narrativa cuando el contacto ya las muestra. */
export function aboutWithoutLocationEcho(
  value: string | null | undefined,
  business: Pick<AboutBusiness, "address" | "city" | "region" | "country">,
  options?: { placeVisible?: boolean },
) {
  let text = scrubPlatformSentences(value);
  if (!text) return "";
  if (!options?.placeVisible) return text;

  const address = cleanText(business.address);
  const city = cleanText(business.city);
  const region = cleanText(business.region);
  const country = cleanText(business.country);

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((sentence) => {
      let next = sentence;
      if (address) {
        next = next.replace(
          new RegExp(`(?:desde|en|ubicad[oa]s?\\s+en)\\s+(?:el|la|los|las)?\\s*${escapeRegExp(address)}`, "gi"),
          "",
        );
        next = next.replace(new RegExp(escapeRegExp(address), "gi"), "");
      }
      if (city) {
        next = next.replace(new RegExp(`(?:,)?\\s*(?:en|desde)\\s+${escapeRegExp(city)}\\b`, "gi"), "");
      }
      if (region) {
        next = next.replace(new RegExp(`(?:,)?\\s*${escapeRegExp(region)}\\b`, "gi"), "");
      }
      if (country) {
        next = next.replace(new RegExp(`(?:,)?\\s*${escapeRegExp(country)}\\b`, "gi"), "");
      }
      next = next.replace(/\b(?:edificio|local)\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚáéíóúñ'’.-]*/gi, "");
      next = tidyClause(next);
      if (!next || next.length < 12) return "";
      // Si tras limpiar solo queda una ubicación residual, descartar.
      const residual = [city, address, region, country].filter(Boolean).some((marker) => next.toLocaleLowerCase("es").includes(marker.toLocaleLowerCase("es")));
      if (residual && next.length < 48) return "";
      return next;
    })
    .filter(Boolean);

  return sentences.join(" ").trim();
}

export function aboutLead(
  business: Pick<AboutBusiness, "shortDescription" | "description" | "slogan" | "address" | "city" | "region" | "country">,
  options?: { placeVisible?: boolean },
) {
  for (const candidate of [business.shortDescription, business.description, business.slogan]) {
    const cleaned = aboutWithoutLocationEcho(candidate, business, options);
    if (cleaned) return cleaned;
  }
  return "";
}

export function aboutStoryBody(
  business: Pick<AboutBusiness, "story" | "description" | "shortDescription" | "address" | "city" | "region" | "country">,
  options?: { placeVisible?: boolean },
) {
  const story = aboutWithoutLocationEcho(business.story, business, options);
  if (story) return story;

  const short =
    aboutWithoutLocationEcho(business.shortDescription, business, options) ||
    (!options?.placeVisible ? scrubPlatformSentences(business.shortDescription) : "");
  const description =
    aboutWithoutLocationEcho(business.description, business, options) ||
    (!options?.placeVisible ? scrubPlatformSentences(business.description) : "");
  if (description && description !== short) return description;
  return "";
}

export function aboutCatalogCtaLabel(
  business: Pick<
    AboutBusiness,
    "attentionScope" | "deliveryText" | "commercialTerms" | "commercialMessage" | "shortDescription" | "description" | "slogan"
  >,
) {
  const haystack = [
    business.shortDescription,
    business.description,
    business.slogan,
    business.attentionScope,
    business.deliveryText,
    business.commercialTerms,
    business.commercialMessage,
  ]
    .map((item) => scrubPlatformSentences(item) || publicBusinessCopy(item))
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es");
  if (/servicio|asesor|consultor|cita|sesión/.test(haystack)) return "Conocer servicios";
  if (/curso|academia|formación|clase|capacitaci/.test(haystack)) return "Ver catálogo";
  if (/digital|descarga|membresía|membresia|licencia|suscripci|plan\b/.test(haystack)) return "Descubrir nuestras soluciones";
  if (/producto|pieza|tienda|envío|envio|local|showroom/.test(haystack)) return "Ver productos";
  return "Explorar catálogo";
}

export function aboutLocationLine(business: Pick<AboutBusiness, "address" | "city" | "region" | "country">) {
  return [business.address, business.city, business.region, business.country]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
}

export function aboutHasPlace(business: Pick<AboutBusiness, "address" | "city" | "mapsUrl">) {
  return Boolean(cleanText(business.address) || cleanText(business.city) || cleanText(business.mapsUrl));
}

export function aboutContactAvailable(
  business: Pick<
    AboutBusiness,
    "whatsapp" | "phone" | "email" | "hours" | "attentionScope" | "deliveryText" | "commercialTerms" | "address" | "city" | "mapsUrl"
  >,
) {
  return Boolean(
    cleanText(business.whatsapp) ||
      cleanText(business.phone) ||
      cleanText(business.email) ||
      cleanText(business.hours) ||
      scrubPlatformSentences(business.attentionScope) ||
      scrubPlatformSentences(business.deliveryText) ||
      scrubPlatformSentences(business.commercialTerms) ||
      aboutHasPlace(business),
  );
}

export function aboutWhatsAppLabel(business: Pick<AboutBusiness, "attentionScope" | "deliveryText">) {
  const haystack = `${scrubPlatformSentences(business.attentionScope)} ${scrubPlatformSentences(business.deliveryText)}`.toLocaleLowerCase(
    "es",
  );
  if (/servicio|asesor|consultor|cita/.test(haystack)) return "Consultar por WhatsApp";
  return "Escribir por WhatsApp";
}

export function aboutTrustMessage(business: Pick<AboutBusiness, "commercialMessage">) {
  return scrubPlatformSentences(business.commercialMessage);
}

export function aboutModality(business: Pick<AboutBusiness, "attentionScope">) {
  return scrubPlatformSentences(business.attentionScope);
}

export function aboutCommercialNotes(business: Pick<AboutBusiness, "deliveryText" | "commercialTerms">) {
  return {
    delivery: scrubPlatformSentences(business.deliveryText),
    terms: scrubPlatformSentences(business.commercialTerms),
  };
}
