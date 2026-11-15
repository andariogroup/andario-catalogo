export type AskLine = {
  name: string;
  sku?: string;
  variant?: string;
  price?: string;
  quantity?: number;
  url?: string;
};

import { internationalPhoneDigits } from "@/lib/phone";

export function whatsappHref(phone: string, text: string): string | null {
  const digits = internationalPhoneDigits(phone);
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function productAsk(store: string, line: AskLine, intro = ""): string {
  const rows = [intro.trim() || `Hola, vi en ${store}:`, "", line.name];
  if (line.sku) rows.push(`SKU: ${line.sku}`);
  if (line.variant) rows.push(line.variant);
  if (line.quantity && line.quantity > 1) rows.push(`${line.quantity} unidades`);
  if (line.price) rows.push(`Precio publicado: ${line.price}`);
  if (line.url) rows.push(line.url);
  rows.push("", "Quiero información. El precio publicado no es una oferta cerrada.");
  return rows.join("\n");
}

export function listAsk(store: string, lines: AskLine[], catalogUrl: string): string {
  const body = lines.map((line) => {
    const bits = [line.name];
    if (line.variant) bits.push(line.variant);
    if (line.quantity) bits.push(`${line.quantity}`);
    return `- ${bits.join(" · ")}`;
  });
  return [`Hola, vi en ${store}:`, "", ...body, "", catalogUrl].join("\n");
}

export type CartAskLine = {
  name: string;
  variant?: string;
  quantity: number;
  price?: string;
};

/** Solicitud comercial del carrito: precios solo como referencia. */
export function cartAsk(
  store: string,
  lines: CartAskLine[],
  options: { subtotal?: string | null; catalogUrl?: string } = {},
): string {
  const body = lines.map((line, index) => {
    const rows = [`${index + 1}. ${line.name}`];
    if (line.variant) rows.push(`   Variante: ${line.variant}`);
    rows.push(`   Cantidad: ${line.quantity}`);
    if (line.price) rows.push(`   Precio de referencia: ${line.price}`);
    return rows.join("\n");
  });
  const rows = [`Hola, quiero consultar estos productos de ${store}:`, "", ...body];
  if (options.subtotal) {
    rows.push("", `Subtotal de referencia: ${options.subtotal}`);
  }
  rows.push("", "Quisiera confirmar disponibilidad y condiciones de entrega.");
  rows.push("El precio publicado no es una oferta cerrada.");
  if (options.catalogUrl) rows.push("", options.catalogUrl);
  return rows.join("\n");
}

export function quoteAsk(store: string, reference: string): string {
  return `Hola, vi en ${store}. Quiero continuar la solicitud ${reference}.`;
}

export function quoteReply(store: string, name: string, reference: string, lines: string[]): string {
  const who = name.trim() || "hola";
  const rows = [`Hola ${who}, te escribimos de ${store} por tu solicitud ${reference}.`];
  if (lines.length) rows.push("", ...lines.map((line) => `- ${line}`));
  rows.push("", "El precio publicado no es una oferta cerrada.");
  return rows.join("\n");
}
