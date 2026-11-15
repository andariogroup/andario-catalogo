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

export function organizationJsonLd(input: { name: string; url: string; city: string; region: string; country: string; phone: string; image: string; address?: string; hours?: string }) {
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
    data.address = {
      "@type": "PostalAddress",
      ...(street ? { streetAddress: street } : {}),
      ...(input.city ? { addressLocality: input.city, addressRegion: input.region, addressCountry: input.country || "CO" } : {}),
    };
  }
  if (input.hours?.trim()) data.openingHours = input.hours.trim();
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
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.kind === "service" ? "Service" : "Product",
    name: input.name,
    description: input.description,
    sku: input.sku,
    url: input.url,
    brand: { "@type": "Brand", name: input.store },
  };
  if (input.image.length) data.image = input.image;
  if (input.kind !== "service" && input.price != null && input.priceMode !== "ask") {
    data.offers = {
      "@type": "Offer",
      priceCurrency: "COP",
      price: String(input.price),
      url: input.url,
      availability: input.availability === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    };
  }
  return data;
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
