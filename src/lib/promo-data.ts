import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { attributeOptions, attributes, categories, marketingPieces, mediaAssets, productAttributeValues, products, variantMedia, variants, variantValues } from "@/lib/db/schema";
import { safeHex } from "@/lib/images";
import { pesosFromDb } from "@/lib/money";
import {
  alignCaptionPrices,
  canonicalTemplate,
  defaultCaption,
  defaultCta,
  isPromoChannel,
  isPromoFormat,
  promoBenefitPoints,
  promoDeliveryUrl,
  promoPrices,
  promoWhen,
  type PromoChannel,
  type PromoEditor,
  type PromoFormat,
  type PromoTemplate,
} from "@/lib/promo";
import { catalogOrigin } from "@/lib/seo";
import { loadShell, productFirstPhotos, productPhotos } from "@/lib/store";
import { whatsappHref } from "@/lib/whatsapp";

export type PromoListItem = {
  id: string;
  productId: string;
  name: string;
  channel: string;
  format: string;
  status: string;
  when: string;
};

export async function listPromos(): Promise<PromoListItem[] | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: marketingPieces.id,
      productId: marketingPieces.productId,
      channel: marketingPieces.channel,
      format: marketingPieces.format,
      status: marketingPieces.status,
      updatedAt: marketingPieces.updatedAt,
      name: products.name,
    })
    .from(marketingPieces)
    .leftJoin(products, eq(products.id, marketingPieces.productId))
    .orderBy(desc(marketingPieces.updatedAt))
    .limit(50);
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    name: row.name || "Producto eliminado",
    channel: row.channel,
    format: row.format,
    status: row.status,
    when: promoWhen(row.updatedAt),
  }));
}

export async function activePromoProducts() {
  const db = getDb();
  const shell = await loadShell();
  if (!db || !shell) return null;
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      priceMode: products.priceMode,
      pricePesos: products.pricePesos,
    })
    .from(products)
    .where(eq(products.status, "active"))
    .orderBy(asc(products.name));
  const photos = await productFirstPhotos(rows.map((row) => row.id));
  const symbol = shell.business.currencySymbol || "$";
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: promoPrices({
      priceMode: row.priceMode,
      price: pesosFromDb(row.pricePesos),
      compare: null,
      symbol,
    }).priceLabel,
    photo: promoDeliveryUrl(photos.get(row.id)?.url ?? "", 160),
  }));
}

export async function promoVariantChoices(product: {
  id: string;
  priceMode: string;
  pricePesos: string | null;
  comparePesos: string | null;
  availability: string;
}, symbol: string) {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(variants).where(eq(variants.productId, product.id));
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [links, options, definitions, media] = await Promise.all([
    db.select().from(variantValues).where(inArray(variantValues.variantId, ids)),
    db.select().from(attributeOptions),
    db.select().from(attributes),
    db
      .select({ variantId: variantMedia.variantId, url: mediaAssets.url, sortOrder: variantMedia.sortOrder })
      .from(variantMedia)
      .innerJoin(mediaAssets, eq(variantMedia.mediaId, mediaAssets.id))
      .where(inArray(variantMedia.variantId, ids))
      .orderBy(asc(variantMedia.sortOrder)),
  ]);
  const productPrice = pesosFromDb(product.pricePesos);
  const compare = pesosFromDb(product.comparePesos);
  return rows.map((row) => {
    const label = links.filter((link) => link.variantId === row.id).map((link) => {
      const option = options.find((item) => item.id === link.optionId);
      const definition = definitions.find((item) => item.id === option?.attributeId);
      if (!option) return "";
      return definition ? `${definition.name}: ${option.label}` : option.label;
    }).filter(Boolean).join(" · ") || "Variante";
    const unit = row.pricePesos == null ? productPrice : pesosFromDb(row.pricePesos);
    const prices = promoPrices({ priceMode: product.priceMode, price: unit, compare, symbol });
    const photoUrl = media.find((item) => item.variantId === row.id)?.url || row.imageUrl.trim();
    return {
      id: row.id,
      label,
      unit,
      priceLabel: prices.priceLabel,
      compareLabel: prices.compareLabel,
      offer: prices.offer,
      availability: row.availability || product.availability,
      photoUrl,
    };
  }).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function productBenefitPoints(product: { id: string; name: string; shortDescription: string; description: string }) {
  const db = getDb();
  if (!db) return [];
  const [valueRows, definitions] = await Promise.all([
    db.select().from(productAttributeValues).where(eq(productAttributeValues.productId, product.id)),
    db.select().from(attributes),
  ]);
  const facts = valueRows.flatMap((row) => {
    const definition = definitions.find((item) => item.id === row.attributeId);
    if (!definition?.visible || definition.kind === "single" || definition.kind === "multi" || !row.value.trim()) return [];
    return [{ name: definition.name, value: row.value }];
  });
  return promoBenefitPoints({
    name: product.name,
    short: product.shortDescription,
    description: product.description,
    facts,
  });
}

export async function loadPromoEditor(productId: string, pieceId = ""): Promise<PromoEditor | "missing" | "inactive" | null> {
  const db = getDb();
  const shell = await loadShell();
  if (!db || !shell) return null;
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return "missing";
  const piece = pieceId
    ? (await db.select().from(marketingPieces).where(eq(marketingPieces.id, pieceId)).limit(1))[0]
    : undefined;
  if (pieceId && (!piece || piece.productId !== product.id)) return "missing";
  if (!piece && product.status !== "active") return "inactive";
  const photos = await productPhotos(product.id);
  const symbol = shell.business.currencySymbol || "$";
  const choices = await promoVariantChoices(product, symbol);
  const selected = piece?.variantId ? choices.find((item) => item.id === piece.variantId) : undefined;
  const prices = promoPrices({
    priceMode: product.priceMode,
    price: pesosFromDb(product.pricePesos),
    compare: pesosFromDb(product.comparePesos),
    symbol,
  });
  const shown = selected ?? {
    priceLabel: prices.priceLabel,
    compareLabel: prices.compareLabel,
    offer: prices.offer,
    availability: product.availability,
    photoUrl: "",
  };
  const channel: PromoChannel = piece && isPromoChannel(piece.channel) ? piece.channel : "instagram";
  const format: PromoFormat = piece && isPromoFormat(piece.format) ? piece.format : "square";
  const stored = piece?.template ?? "";
  const points = await productBenefitPoints(product);
  let template: PromoTemplate = canonicalTemplate(stored) ?? "direct";
  const offerRemoved = stored === "offer" && !prices.offer;
  if (offerRemoved) template = "direct";
  if (template === "benefit" && !points.length) template = "direct";
  const categoryName = product.categoryId
    ? (await db.select({ name: categories.name }).from(categories).where(eq(categories.id, product.categoryId)).limit(1))[0]?.name ?? ""
    : "";
  const hasWhatsapp = Boolean(whatsappHref(shell.business.whatsapp, "hola"));
  const cta = piece?.cta.trim() || defaultCta({
    hasWhatsapp,
    priceMode: product.priceMode,
    availability: shown.availability,
  });
  const photoRows = photos.map((photo) => ({ url: photo.url, alt: photo.alt || product.name }));
  for (const choice of choices) {
    if (choice.photoUrl && !photoRows.some((photo) => photo.url === choice.photoUrl)) {
      photoRows.push({ url: choice.photoUrl, alt: choice.label });
    }
  }
  const photoUrl = piece?.photoUrl && photoRows.some((photo) => photo.url === piece.photoUrl)
    ? piece.photoUrl
    : shown.photoUrl || photoRows[0]?.url || "";
  const rawCaption = piece?.caption.trim()
    || defaultCaption({
      name: product.name,
      short: product.shortDescription,
      description: product.description,
      points,
      template,
      category: categoryName,
      priceLabel: shown.priceLabel,
      compareLabel: shown.compareLabel,
      priceMode: product.priceMode,
      availability: shown.availability,
      cta,
    });
  const aligned = piece?.caption.trim()
    ? alignCaptionPrices(rawCaption, { priceLabel: shown.priceLabel, compareLabel: shown.compareLabel, offer: shown.offer })
    : { caption: rawCaption, updated: false };
  return {
    id: piece?.id ?? "",
    channel,
    format,
    template,
    photoUrl,
    caption: aligned.caption,
    cta,
    offerRemoved,
    priceUpdated: aligned.updated,
    variantId: selected?.id ?? "",
    variants: choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      priceLabel: choice.priceLabel,
      compareLabel: choice.compareLabel,
      offer: choice.offer,
      availability: choice.availability,
      photoUrl: choice.photoUrl,
    })),
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      short: product.shortDescription,
      category: categoryName,
      priceMode: product.priceMode,
      availability: product.availability,
      points,
      priceLabel: prices.priceLabel,
      compareLabel: prices.compareLabel,
      offer: prices.offer,
    },
    photos: photoRows.map((photo) => ({
      url: photo.url,
      preview: promoDeliveryUrl(photo.url, 1600),
      alt: photo.alt || product.name,
    })),
    brand: {
      name: shell.business.name,
      logoUrl: promoDeliveryUrl(shell.brand.logoUrl, 240),
      background: safeHex(shell.brand.backgroundColor, "#F7F1E8"),
      ink: safeHex(shell.brand.textColor, "#1C1714"),
      muted: safeHex(shell.brand.mutedColor, "#5E564C"),
      accent: safeHex(shell.brand.accentColor, "#C4622D"),
      button: safeHex(shell.brand.buttonColor, "#1B4332"),
      buttonInk: safeHex(shell.brand.buttonTextColor, "#F7F1E8"),
      photoWell: safeHex(shell.brand.secondaryColor, "#F3EDE3"),
      fontPair: shell.brand.fontPair === "newsreader" ? "newsreader" : "fraunces",
    },
    origin: catalogOrigin(shell.settings.publicUrl),
    whatsapp: shell.business.whatsapp,
    hasWhatsapp,
  };
}
