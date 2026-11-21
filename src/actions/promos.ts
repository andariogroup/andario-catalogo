"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { getDb, recordAudit } from "@/lib/db";
import { marketingPieces, products } from "@/lib/db/schema";
import type { FormState } from "@/lib/form";
import { text } from "@/lib/form";
import { pesosFromDb } from "@/lib/money";
import { alignCaptionPrices, canonicalTemplate, promoPrices, promoProblem } from "@/lib/promo";
import { productBenefitPoints, promoVariantChoices } from "@/lib/promo-data";
import { loadShell, productPhotos } from "@/lib/store";

function isId(value: string) {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export async function savePromoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("promos", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const productId = text(formData, "productId");
  if (!isId(productId) || (id && !isId(id))) return { error: "Esa pieza no existe.", ok: "" };
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return { error: "Ese producto no existe.", ok: "" };
  if (!id && product.status !== "active") return { error: "Activa el producto para promocionarlo.", ok: "" };
  const shell = await loadShell();
  const symbol = shell?.business.currencySymbol || "$";
  const choices = await promoVariantChoices(product, symbol);
  const variantId = text(formData, "variantId");
  if (variantId && !isId(variantId)) return { error: "Esa variante no es de este producto.", ok: "" };
  const choice = variantId ? choices.find((item) => item.id === variantId) : undefined;
  if (variantId && !choice) return { error: "Esa variante no es de este producto.", ok: "" };
  const productPrice = pesosFromDb(product.pricePesos);
  const compare = pesosFromDb(product.comparePesos);
  const unit = choice ? choice.unit : productPrice;
  const shown = choice ?? promoPrices({ priceMode: product.priceMode, price: productPrice, compare, symbol });
  const photos = [...new Set([
    ...(await productPhotos(product.id)).map((photo) => photo.url),
    ...choices.map((item) => item.photoUrl).filter(Boolean),
  ])];
  const points = await productBenefitPoints(product);
  const channel = text(formData, "channel");
  const format = text(formData, "format");
  const template = canonicalTemplate(text(formData, "template")) ?? "";
  const aligned = alignCaptionPrices(text(formData, "caption"), {
    priceLabel: shown.priceLabel,
    compareLabel: shown.compareLabel,
    offer: shown.offer,
  });
  const caption = aligned.caption;
  const cta = text(formData, "cta");
  const photoUrl = text(formData, "photoUrl");
  const problem = promoProblem({
    channel,
    format,
    template,
    caption,
    cta,
    photoUrl,
    photos,
    points,
    priceMode: product.priceMode,
    price: unit,
    compare,
  });
  if (problem) return { error: problem, ok: "" };
  const now = new Date();
  const values = {
    productId: product.id,
    channel,
    format,
    template,
    photoUrl,
    caption,
    cta,
    variantId: choice?.id ?? "",
    updatedAt: now,
  };
  if (!id) {
    const newId = crypto.randomUUID();
    await db.insert(marketingPieces).values({ id: newId, ...values, status: "created" });
    await recordAudit(user.email, "promo.create", newId);
    revalidatePath("/admin/promocionar");
    redirect(`/admin/promocionar/${newId}`);
  }
  const [existing] = await db.select({ id: marketingPieces.id, productId: marketingPieces.productId }).from(marketingPieces).where(eq(marketingPieces.id, id)).limit(1);
  if (!existing || existing.productId !== product.id) return { error: "Esa pieza no existe.", ok: "" };
  await db.update(marketingPieces).set(values).where(eq(marketingPieces.id, id));
  await recordAudit(user.email, "promo.update", id);
  revalidatePath("/admin/promocionar");
  revalidatePath(`/admin/promocionar/${id}`);
  return { error: "", ok: "La pieza quedó guardada." };
}

export async function deletePromoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("promos", "write");
  const db = getDb();
  const id = text(formData, "id");
  if (!db || !isId(id)) return { error: "Esa pieza no existe.", ok: "" };
  const [existing] = await db.select({ id: marketingPieces.id }).from(marketingPieces).where(eq(marketingPieces.id, id)).limit(1);
  if (!existing) return { error: "Esa pieza no existe.", ok: "" };
  await db.delete(marketingPieces).where(eq(marketingPieces.id, id));
  await recordAudit(user.email, "promo.delete", id);
  revalidatePath("/admin/promocionar");
  redirect("/admin/promocionar?aviso=eliminada");
}

export async function markPromoSharedAction(id: string): Promise<FormState> {
  const user = await requirePermission("promos", "write");
  const db = getDb();
  if (!db || !isId(id)) return { error: "Esa pieza no existe.", ok: "" };
  const [existing] = await db.select({ id: marketingPieces.id }).from(marketingPieces).where(eq(marketingPieces.id, id)).limit(1);
  if (!existing) return { error: "Esa pieza no existe.", ok: "" };
  await db.update(marketingPieces).set({ status: "shared", updatedAt: new Date() }).where(eq(marketingPieces.id, id));
  await recordAudit(user.email, "promo.share", id);
  revalidatePath("/admin/promocionar");
  revalidatePath(`/admin/promocionar/${id}`);
  return { error: "", ok: "Quedó como compartida." };
}
