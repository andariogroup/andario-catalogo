"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { getDb, recordAudit, takeAttempt } from "@/lib/db";
import { attributeOptions, attributes, products, quoteItems, quoteNotes, quotes, settings, variantValues, variants } from "@/lib/db/schema";
import { authSecret } from "@/lib/env";
import type { FormState } from "@/lib/form";
import { text } from "@/lib/form";
import { pesosFromDb } from "@/lib/money";
import { purgeExpiredQuotes } from "@/lib/quote-retention";
import { isQuoteState, quoteContactProblem, quoteLineProblem, quoteOrigin, quoteReference, quoteUpdateMessage, retentionCutoff } from "@/lib/quotes";
import { attemptKey, clientAddress, LOGIN_WINDOW_MS } from "@/lib/security";
import { recordEvent } from "@/lib/store";

type Incoming = { productId: string; variantId: string; quantity: number };
type Prepared = { productId: string; variantId: string | null; productName: string; sku: string; variantLabel: string; unitPrice: string | null; quantity: number };

function incomingItems(raw: string): Incoming[] | null {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.slice(0, 20).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { productId?: unknown; variantId?: unknown; quantity?: unknown };
      const productId = typeof record.productId === "string" ? record.productId : "";
      if (!productId) return [];
      const variantId = typeof record.variantId === "string" ? record.variantId.trim() : "";
      const quantity = Math.min(20, Math.max(1, Math.trunc(Number(record.quantity)) || 1));
      return [{ productId, variantId, quantity }];
    });
  } catch {
    return null;
  }
}

export async function createQuoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (text(formData, "website")) return { error: "", ok: "" };
  if (formData.get("consent") !== "on") return { error: "Necesitamos tu aceptación para tratar estos datos.", ok: "" };
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  if (name.length < 2) return { error: "Escribe tu nombre.", ok: "" };
  const contact = quoteContactProblem(phone, email);
  if (contact) return { error: contact, ok: "" };
  const incoming = incomingItems(text(formData, "items"));
  if (!incoming) return { error: "La solicitud no trae productos.", ok: "" };
  if (!incoming.length) return { error: "Elige al menos un producto.", ok: "" };
  const secret = authSecret();
  const address = clientAddress((await headers()).get("x-forwarded-for"));
  if (secret) {
    const allowed = await takeAttempt(attemptKey(new TextDecoder().decode(secret), "quote", address, phone || email), 6, LOGIN_WINDOW_MS);
    if (!allowed) return { error: "Ya enviaste varias solicitudes. Espera un momento.", ok: "" };
  }
  const db = getDb();
  if (!db) return { error: "El catálogo todavía no puede guardar solicitudes.", ok: "" };
  const reference = quoteReference(new Date(), crypto.randomUUID());
  const id = crypto.randomUUID();
  let problem = "";
  try {
    await db.transaction(async (tx) => {
      const rows: Prepared[] = [];
      for (const item of incoming) {
        const [product] = await tx.select().from(products).where(and(eq(products.id, item.productId), eq(products.status, "active"))).limit(1);
        if (!product) {
          problem = "Una pieza de la lista ya no está publicada. Revísala e inténtalo de nuevo.";
          throw new Error("stop");
        }
        const [variant] = item.variantId ? await tx.select().from(variants).where(and(eq(variants.id, item.variantId), eq(variants.productId, product.id))).limit(1) : [];
        if (item.variantId && !variant) {
          problem = "Una variante de la lista ya no está disponible. Revísala e inténtalo de nuevo.";
          throw new Error("stop");
        }
        const [hasVariant] = item.variantId ? [] : await tx.select({ id: variants.id }).from(variants).where(eq(variants.productId, product.id)).limit(1);
        const lineProblem = quoteLineProblem({
          productName: product.name,
          productAvailability: product.availability,
          variantAvailability: variant?.availability ?? null,
          hasVariants: Boolean(variant || hasVariant),
          variantId: item.variantId,
        });
        if (lineProblem) {
          problem = lineProblem;
          throw new Error("stop");
        }
        const links = variant
          ? await tx.select({ attribute: attributes.name, label: attributeOptions.label }).from(variantValues).innerJoin(attributeOptions, eq(variantValues.optionId, attributeOptions.id)).innerJoin(attributes, eq(variantValues.attributeId, attributes.id)).where(eq(variantValues.variantId, variant.id)).orderBy(asc(attributes.sortOrder), asc(attributeOptions.sortOrder))
          : [];
        const price = variant?.pricePesos != null ? pesosFromDb(variant.pricePesos) : pesosFromDb(product.pricePesos);
        rows.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          productName: product.name,
          sku: variant?.sku || product.sku,
          variantLabel: links.map((link) => `${link.attribute}: ${link.label}`).join(" · "),
          unitPrice: product.priceMode === "ask" ? null : price == null ? null : String(price),
          quantity: item.quantity,
        });
      }
      await tx.insert(quotes).values({
        id,
        reference,
        name: name.slice(0, 80),
        phone: phone.slice(0, 40),
        email: email.slice(0, 120),
        city: text(formData, "city").slice(0, 80),
        message: text(formData, "message").slice(0, 500),
        consent: true,
        status: "nueva",
      });
      await tx.insert(quoteItems).values(rows.map((row) => ({ id: crypto.randomUUID(), quoteId: id, ...row })));
    });
  } catch {
    return { error: problem || "No pude guardar la solicitud. Inténtalo de nuevo.", ok: "" };
  }
  await recordEvent("quote_request_created", quoteOrigin(text(formData, "origin")));
  revalidatePath("/admin/cotizaciones");
  revalidatePath("/admin", "layout");
  return { error: "", ok: reference };
}

export async function updateQuoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("quotes", "manage");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (!isQuoteState(status)) return { error: "Ese estado no existe.", ok: "" };
  const [current] = await db.select({ id: quotes.id, status: quotes.status }).from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!current) return { error: "No encontré la solicitud.", ok: "" };
  const note = text(formData, "note");
  const changed = current.status !== status;
  if (!changed && !note) return { error: "", ok: quoteUpdateMessage(false, false) };
  await db.transaction(async (tx) => {
    await tx.update(quotes).set({ status, updatedAt: new Date(), ...(changed ? { managedBy: user.email } : {}) }).where(eq(quotes.id, id));
    if (note) await tx.insert(quoteNotes).values({ id: crypto.randomUUID(), quoteId: id, authorEmail: user.email, body: note.slice(0, 400) });
  });
  await recordAudit(user.email, changed ? `paso-cotizacion-${status}` : "anoto-cotizacion", id);
  revalidatePath("/admin/cotizaciones");
  revalidatePath(`/admin/cotizaciones/${id}`);
  revalidatePath("/admin", "layout");
  return { error: "", ok: quoteUpdateMessage(changed, Boolean(note)) };
}

export async function deleteQuoteAction(formData: FormData): Promise<void> {
  const user = await requirePermission("quotes", "manage");
  const db = getDb();
  if (!db || formData.get("confirm") !== "on") return;
  const id = text(formData, "id");
  const [current] = await db.select({ id: quotes.id, reference: quotes.reference }).from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!current) return;
  await db.delete(quotes).where(eq(quotes.id, id));
  await recordAudit(user.email, "quito-cotizacion", current.reference);
  revalidatePath("/admin/cotizaciones");
  revalidatePath("/admin", "layout");
  redirect("/admin/cotizaciones");
}

export async function saveQuoteRetentionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("settings", "manage");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const days = Number(text(formData, "days"));
  if (!retentionCutoff(days)) return { error: "Usa un número entero de 1 a 3650 días.", ok: "" };
  await db.update(settings).set({ quoteRetentionDays: days }).where(eq(settings.businessId, 1));
  await purgeExpiredQuotes();
  revalidatePath("/admin/cotizaciones");
  return { error: "", ok: `Pasados ${days} días, la solicitud se quita sola.` };
}
