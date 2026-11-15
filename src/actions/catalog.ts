"use server";

import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { destroyAsset, uploadAsset } from "@/lib/cloudinary";
import { getDb, recordAudit, takeAttempt } from "@/lib/db";
import { attributeOptions, attributes, categories, categoryAttributes, mediaAssets, productAttributeValues, productMedia, products, productTags, variantMedia, variants, variantValues } from "@/lib/db/schema";
import { releaseUnused, releaseUrls } from "@/lib/media-release";
import { authSecret } from "@/lib/env";
import { checked, text, type FormState } from "@/lib/form";
import { splitOptionLabels } from "@/lib/attribute-draft";
import { parsePesos } from "@/lib/money";
import { attemptKey, LOGIN_WINDOW_MS } from "@/lib/security";
import {
  attributeDeleteError,
  categoryInactivationError,
  categoryTombstoneTarget,
  optionRemovalError,
  productPublicPath,
  shouldClearProductRedirect,
  shouldTombstoneProductPath,
  variantRemovalError,
} from "@/lib/catalog-lifecycle";
import { categoryPath, slugify } from "@/lib/slug";
import {
  countActiveChildCategories,
  countActiveProductsInCategories,
  countAttributePublicUsage,
  forgetSlug,
  listLibrary,
  purgeStaleSlugRedirects,
  rememberSlug,
} from "@/lib/store";

const KINDS = new Set(["physical", "digital", "service", "intangible"]);
const MODES = new Set(["fixed", "from", "ask"]);
const STATUSES = new Set(["draft", "active", "inactive"]);
const AVAIL = new Set(["available", "sold_out", "made_to_order"]);
const TAGS = ["nuevo", "oferta", "exclusivo", "destacado"] as const;
const VARIANT_PHOTO_CAP = 4;

function variantFiles(formData: FormData) {
  return formData.getAll("photo").filter((file): file is File => file instanceof File && file.size > 0).slice(0, VARIANT_PHOTO_CAP);
}

async function rollbackUploads(files: { url: string }[]) {
  for (const file of files) await destroyAsset(file.url);
}

async function uploadImages(files: File[], email: string): Promise<{ ok: true; files: { url: string; bytes: number }[] } | { ok: false; error: string }> {
  if (!files.length) return { ok: true, files: [] };
  const secret = authSecret();
  if (!secret) return { ok: false, error: "Falta la clave de sesión." };
  const allowed = await takeAttempt(attemptKey(new TextDecoder().decode(secret), "upload", email), 20, LOGIN_WINDOW_MS);
  if (!allowed) return { ok: false, error: "Demasiadas imágenes. Espera unos minutos." };
  const uploaded: { url: string; bytes: number }[] = [];
  for (const file of files) {
    const result = await uploadAsset(new Uint8Array(await file.arrayBuffer()), "image");
    if (!result.ok) {
      await rollbackUploads(uploaded);
      return { ok: false, error: result.error };
    }
    uploaded.push({ url: result.url, bytes: result.bytes });
  }
  return { ok: true, files: uploaded };
}

async function storeVariantPhotos(db: NonNullable<ReturnType<typeof getDb>>, variantId: string, alt: string, files: { url: string; bytes: number }[], startOrder: number) {
  let order = startOrder;
  for (const file of files) {
    order += 1;
    const mediaId = crypto.randomUUID();
    await db.insert(mediaAssets).values({ id: mediaId, kind: "image", url: file.url, alt: alt.slice(0, 180), bytes: file.bytes });
    await db.insert(variantMedia).values({ id: crypto.randomUUID(), variantId, mediaId, sortOrder: order });
  }
}

function sameSku(left: string, right: string) {
  return left.trim().toLocaleLowerCase("es") === right.trim().toLocaleLowerCase("es");
}

async function skuTaken(db: NonNullable<ReturnType<typeof getDb>>, sku: string, currentId: string | null) {
  const clean = sku.trim();
  if (!clean) return false;
  const rows = await db.select({ id: products.id, sku: products.sku }).from(products);
  return rows.some((row) => row.id !== currentId && row.sku.trim() !== "" && sameSku(row.sku, clean));
}

async function freeSku(db: NonNullable<ReturnType<typeof getDb>>, sku: string, currentId: string | null) {
  const clean = sku.trim().slice(0, 40);
  if (!clean) return "";
  if (!(await skuTaken(db, clean, currentId))) return clean;
  for (let attempt = 2; attempt < 20; attempt += 1) {
    const suffix = `-${attempt}`;
    const candidate = `${clean.slice(0, 40 - suffix.length)}${suffix}`;
    if (!(await skuTaken(db, candidate, currentId))) return candidate;
  }
  return `${clean.slice(0, 33)}-${crypto.randomUUID().slice(0, 6)}`;
}

function fixedValue(kind: string, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim().slice(0, 120);
  if (!value) return { ok: false, error: "Completa el atributo." };
  if (kind === "text") return { ok: true, value };
  if (kind === "number") {
    if (!/^-?\d+$/.test(value)) return { ok: false, error: "Este dato fijo es un número entero." };
    return { ok: true, value };
  }
  if (kind === "decimal") {
    const normalized = value.replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) return { ok: false, error: "Este dato fijo es un número, con o sin decimales." };
    return { ok: true, value: normalized };
  }
  if (kind === "boolean") {
    const key = value.toLocaleLowerCase("es");
    if (key === "sí" || key === "si" || key === "true" || key === "1") return { ok: true, value: "Sí" };
    if (key === "no" || key === "false" || key === "0") return { ok: true, value: "No" };
    return { ok: false, error: "Este dato fijo es sí o no." };
  }
  if (kind === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: "La fecha va como año-mes-día." };
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== (month ?? 1) - 1 || date.getUTCDate() !== day) return { ok: false, error: "Esa fecha no existe." };
    return { ok: true, value };
  }
  return { ok: false, error: "Ese atributo se usa en variantes." };
}

async function missingRequired(db: NonNullable<ReturnType<typeof getDb>>, productId: string, status: string) {
  if (status !== "active") return "";
  const required = await db.select().from(attributes).where(eq(attributes.required, true));
  if (!required.length) return "";
  const productVariants = await db.select({ id: variants.id }).from(variants).where(eq(variants.productId, productId));
  const variantIds = productVariants.map((item) => item.id);
  const links = variantIds.length ? await db.select({ attributeId: variantValues.attributeId }).from(variantValues).where(inArray(variantValues.variantId, variantIds)) : [];
  const fixed = await db.select().from(productAttributeValues).where(eq(productAttributeValues.productId, productId));
  for (const definition of required) {
    if (definition.kind === "single" || definition.kind === "multi") {
      if (!links.some((link) => link.attributeId === definition.id)) return `${definition.name} es obligatorio. Agrégalo como variante antes de publicar.`;
    } else if (!fixed.some((row) => row.attributeId === definition.id && row.value.trim())) {
      return `${definition.name} es obligatorio. Completa el dato fijo antes de publicar.`;
    }
  }
  return "";
}

async function variantMediaIds(db: NonNullable<ReturnType<typeof getDb>>, variantIds: string[]) {
  if (!variantIds.length) return [];
  const rows = await db.select({ mediaId: variantMedia.mediaId }).from(variantMedia).where(inArray(variantMedia.variantId, variantIds));
  return rows.map((row) => row.mediaId);
}

async function dropVariantsForOptions(db: NonNullable<ReturnType<typeof getDb>>, optionIds: string[]) {
  if (!optionIds.length) return 0;
  const rows = await db.select({ variantId: variantValues.variantId }).from(variantValues).where(inArray(variantValues.optionId, optionIds));
  const ids = [...new Set(rows.map((row) => row.variantId))];
  if (!ids.length) return 0;
  const mediaIds = await variantMediaIds(db, ids);
  await db.delete(variants).where(inArray(variants.id, ids));
  await releaseUnused(db, mediaIds);
  return ids.length;
}

async function syncVariantCover(db: NonNullable<ReturnType<typeof getDb>>, variantId: string) {
  const [cover] = await db
    .select({ url: mediaAssets.url })
    .from(variantMedia)
    .innerJoin(mediaAssets, eq(variantMedia.mediaId, mediaAssets.id))
    .where(eq(variantMedia.variantId, variantId))
    .orderBy(asc(variantMedia.sortOrder))
    .limit(1);
  await db.update(variants).set({ imageUrl: cover?.url ?? "" }).where(eq(variants.id, variantId));
}

async function uniqueSlug(table: "products" | "categories", name: string, current: string | null) {
  const db = getDb();
  const base = slugify(name);
  if (!db) return base;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const rows = table === "products"
      ? await db.select({ id: products.id }).from(products).where(eq(products.slug, candidate)).limit(1)
      : await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, candidate)).limit(1);
    if (!rows[0] || rows[0].id === current) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("categories", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const name = text(formData, "name");
  if (name.length < 2) return { error: "La categoría necesita un nombre.", ok: "" };
  const id = text(formData, "id") || crypto.randomUUID();
  const parentId = text(formData, "parentId") || null;
  if (parentId) {
    const [parent] = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
    if (!parent || parent.parentId || parent.id === id) return { error: "La categoría padre tiene que ser de primer nivel.", ok: "" };
  }
  const [current] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  let uploaded = "";
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploadedAsset = await uploadAsset(new Uint8Array(await file.arrayBuffer()), "image");
    if (!uploadedAsset.ok) return { error: uploadedAsset.error, ok: "" };
    uploaded = uploadedAsset.url;
    await db.insert(mediaAssets).values({ id: crypto.randomUUID(), kind: "image", url: uploadedAsset.url, alt: name, bytes: uploadedAsset.bytes });
  }
  const slug = await uniqueSlug("categories", name, current?.id ?? null);
  const values = {
    parentId,
    name,
    slug,
    description: text(formData, "description").slice(0, 400),
    imageUrl: uploaded || (formData.get("removeImage") === "1" ? "" : current?.imageUrl ?? ""),
    sortOrder: Math.min(999, Math.max(0, Number(text(formData, "sortOrder")) || 0)),
    status: checked(formData, "active") ? "active" : "inactive",
    showOnHome: checked(formData, "showOnHome"),
    seoTitle: text(formData, "seoTitle").slice(0, 70),
    seoDescription: text(formData, "seoDescription").slice(0, 180),
  };
  const becomingInactive = Boolean(current) && values.status === "inactive" && current!.status !== "inactive";
  if (becomingInactive) {
    const childIds = (await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id))).map((row) => row.id);
    const treeIds = [id, ...childIds];
    const [activeProductCount, activeChildCount] = await Promise.all([
      countActiveProductsInCategories(treeIds),
      countActiveChildCategories(id),
    ]);
    const blocked = categoryInactivationError({ activeProductCount, activeChildCount });
    if (blocked) return { error: blocked, ok: "" };
  }

  if (current && current.slug !== slug) {
    const [parent] = current.parentId ? await db.select().from(categories).where(eq(categories.id, current.parentId)).limit(1) : [];
    const [nextParent] = parentId ? await db.select().from(categories).where(eq(categories.id, parentId)).limit(1) : [];
    await rememberSlug(categoryPath(parent?.slug ?? null, current.slug), categoryPath(nextParent?.slug ?? null, slug));
  }

  const nextPath = categoryPath(
    parentId
      ? ((await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, parentId)).limit(1))[0]?.slug ?? null)
      : null,
    slug,
  );
  const previousPath = current
    ? categoryPath(
        current.parentId
          ? ((await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, current.parentId)).limit(1))[0]?.slug ?? null)
          : null,
        current.slug,
      )
    : nextPath;

  if (current) await db.update(categories).set(values).where(eq(categories.id, id));
  else await db.insert(categories).values({ id, ...values });

  if (values.status === "active") {
    await forgetSlug(nextPath);
    if (previousPath !== nextPath) await forgetSlug(previousPath);
  } else if (becomingInactive) {
    const [parent] = parentId ? await db.select({ slug: categories.slug, status: categories.status }).from(categories).where(eq(categories.id, parentId)).limit(1) : [];
    await rememberSlug(
      previousPath,
      categoryTombstoneTarget({ parentSlug: parent?.slug ?? null, parentActive: parent?.status === "active" }),
    );
    if (previousPath !== nextPath) {
      await rememberSlug(
        nextPath,
        categoryTombstoneTarget({ parentSlug: parent?.slug ?? null, parentActive: parent?.status === "active" }),
      );
    }
  }

  if (current?.imageUrl && current.imageUrl !== values.imageUrl) await releaseUrls(db, [current.imageUrl]);
  await purgeStaleSlugRedirects();
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-categoria", "category");
  redirect("/admin/categorias?aviso=guardada", RedirectType.replace);
}

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("products", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const name = text(formData, "name");
  if (name.length < 2) return { error: "El producto necesita un nombre.", ok: "" };
  const kind = text(formData, "kind");
  const priceMode = text(formData, "priceMode");
  const status = text(formData, "status");
  const availability = text(formData, "availability");
  if (!KINDS.has(kind) || !MODES.has(priceMode) || !STATUSES.has(status) || !AVAIL.has(availability)) return { error: "Revisa el tipo, el precio o el estado.", ok: "" };
  const price = priceMode === "ask" ? null : parsePesos(text(formData, "price"));
  if (priceMode !== "ask" && price == null) return { error: "El precio va en pesos enteros.", ok: "" };
  const compare = text(formData, "compare") ? parsePesos(text(formData, "compare")) : null;
  const id = text(formData, "id") || crypto.randomUUID();
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const slug = await uniqueSlug("products", name, current?.id ?? null);
  const categoryId = text(formData, "categoryId") || null;
  if (categoryId) {
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!category) return { error: "Esa categoría no existe.", ok: "" };
    if (status === "active" && category.status !== "active") {
      return { error: "No puedes publicar un producto en una categoría inactiva. Activa la categoría o elige otra.", ok: "" };
    }
  }
  const gap = await missingRequired(db, id, status);
  if (gap) return { error: gap, ok: "" };
  const sku = text(formData, "sku").trim().slice(0, 40);
  if (await skuTaken(db, sku, current?.id ?? null)) return { error: "Ese SKU ya está en otro producto.", ok: "" };
  const incoming = formData.getAll("photo").filter((file): file is File => file instanceof File && file.size > 0);
  const removeIds = [...new Set(formData.getAll("removePhoto").map(String).filter(Boolean))];
  const stored = current
    ? await db.select({ id: productMedia.id, mediaId: productMedia.mediaId, sortOrder: productMedia.sortOrder }).from(productMedia).where(eq(productMedia.productId, id))
    : [];
  const kept = stored.filter((photo) => !removeIds.includes(photo.id));
  if (kept.length + incoming.length > 8) return { error: "Un producto admite hasta 8 fotos.", ok: "" };
  const uploads: { url: string; bytes: number }[] = [];
  if (incoming.length) {
    const secret = authSecret();
    if (!secret) return { error: "Falta la clave de sesión.", ok: "" };
    const allowed = await takeAttempt(attemptKey(new TextDecoder().decode(secret), "upload", user.email), 20, LOGIN_WINDOW_MS);
    if (!allowed) return { error: "Demasiadas imágenes. Espera unos minutos.", ok: "" };
    for (const file of incoming) {
      const uploaded = await uploadAsset(new Uint8Array(await file.arrayBuffer()), "image");
      if (!uploaded.ok) {
        await rollbackUploads(uploads);
        return { error: uploaded.error, ok: "" };
      }
      uploads.push({ url: uploaded.url, bytes: uploaded.bytes });
    }
  }
  if (current && current.slug !== slug) {
    // Conserva SEO: slug anterior → slug nuevo. No limpiar el origen.
    await rememberSlug(productPublicPath(current.slug), productPublicPath(slug));
  }
  if (shouldClearProductRedirect(status)) {
    // Solo limpia zombies del slug vivo actual (p. ej. tumba a /catalogo tras recrear).
    await forgetSlug(productPublicPath(slug));
  } else if (shouldTombstoneProductPath(current?.status, status)) {
    await rememberSlug(productPublicPath(current?.slug || slug), "/catalogo");
  }
  const values = {
    sku,
    name,
    slug,
    shortDescription: text(formData, "short").slice(0, 180),
    description: text(formData, "description").slice(0, 4000),
    kind,
    categoryId,
    pricePesos: price == null ? null : String(price),
    comparePesos: compare == null ? null : String(compare),
    priceMode,
    status,
    availability,
    featured: checked(formData, "featured"),
    sortOrder: Math.min(999, Math.max(0, Number(text(formData, "sortOrder")) || 0)),
    seoTitle: text(formData, "seoTitle").slice(0, 70),
    seoDescription: text(formData, "seoDescription").slice(0, 180),
    updatedAt: new Date(),
  };
  if (current) await db.update(products).set(values).where(eq(products.id, id));
  else await db.insert(products).values({ id, ...values });
  const removedMedia = stored.filter((photo) => removeIds.includes(photo.id)).map((photo) => photo.mediaId);
  if (removeIds.length) await db.delete(productMedia).where(and(eq(productMedia.productId, id), inArray(productMedia.id, removeIds)));
  const keptIds = kept.map((photo) => photo.id);
  const requested = formData.getAll("photoOrder").map(String);
  const ordered = [...requested.filter((photoId) => keptIds.includes(photoId)), ...keptIds.filter((photoId) => !requested.includes(photoId))];
  for (const [index, photoId] of ordered.entries()) {
    await db.update(productMedia).set({ sortOrder: index + 1 }).where(and(eq(productMedia.id, photoId), eq(productMedia.productId, id)));
  }
  let order = ordered.length;
  for (const uploaded of uploads) {
    order += 1;
    const mediaId = crypto.randomUUID();
    await db.insert(mediaAssets).values({ id: mediaId, kind: "image", url: uploaded.url, alt: name, bytes: uploaded.bytes });
    await db.insert(productMedia).values({ id: crypto.randomUUID(), productId: id, mediaId, sortOrder: order });
  }
  await releaseUnused(db, removedMedia);
  await db.delete(productTags).where(eq(productTags.productId, id));
  for (const tag of TAGS) {
    if (checked(formData, `tag-${tag}`)) await db.insert(productTags).values({ productId: id, tag });
  }
  await purgeStaleSlugRedirects();
  revalidatePath("/", "layout");
  await recordAudit(user.email, "guardo-producto", "product");
  redirect("/admin/productos?aviso=guardado", RedirectType.replace);
}

export async function saveAttributeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const name = text(formData, "name");
  const kind = text(formData, "kind");
  if (name.length < 2) return { error: "El atributo necesita un nombre.", ok: "" };
  if (!["text", "number", "decimal", "boolean", "date", "single", "multi"].includes(kind)) return { error: "Ese tipo no existe.", ok: "" };
  const id = text(formData, "id") || crypto.randomUUID();
  const code = slugify(text(formData, "code") || name).replace(/-/g, "_");
  const [clash] = await db.select().from(attributes).where(and(eq(attributes.code, code), ne(attributes.id, id))).limit(1);
  if (clash) return { error: "Ese código ya existe.", ok: "" };
  const labels: string[] = [];
  const seenLabels = new Set<string>();
  for (const label of splitOptionLabels(text(formData, "options"))) {
    const key = label.toLocaleLowerCase("es");
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    labels.push(label);
  }
  if ((kind === "single" || kind === "multi") && labels.length === 0) return { error: "Agrega al menos una opción.", ok: "" };
  const order = Number(text(formData, "sortOrder"));
  const values = {
    name,
    code,
    kind,
    unit: text(formData, "unit").slice(0, 20),
    required: checked(formData, "required"),
    visible: checked(formData, "visible"),
    filterable: (kind === "single" || kind === "multi") && checked(formData, "filterable"),
    sortOrder: Number.isFinite(order) ? Math.min(999, Math.max(0, Math.trunc(order))) : 0,
  };
  const [current] = await db.select().from(attributes).where(eq(attributes.id, id)).limit(1);
  if (current) await db.update(attributes).set(values).where(eq(attributes.id, id));
  else await db.insert(attributes).values({ id, ...values });
  const existing = await db.select().from(attributeOptions).where(eq(attributeOptions.attributeId, id));
  let dropped = 0;
  if (kind === "single" || kind === "multi") {
    const kept = new Set<string>();
    const plannedKept: { id?: string; label: string; sortOrder: number }[] = [];
    for (const [index, label] of labels.entries()) {
      const key = label.toLocaleLowerCase("es");
      const match = existing.find((option) => !kept.has(option.id) && option.label.toLocaleLowerCase("es") === key);
      if (match) {
        kept.add(match.id);
        plannedKept.push({ id: match.id, label, sortOrder: index });
      } else {
        plannedKept.push({ label, sortOrder: index });
      }
    }
    const removed = existing.filter((option) => !kept.has(option.id)).map((option) => option.id);
    if (removed.length) {
      const usage = await countAttributePublicUsage(id, removed);
      const blocked = optionRemovalError({
        removedLabelCount: removed.length,
        activeProductCount: usage.activeProductCount,
        variantCount: usage.variantCount,
      });
      if (blocked) return { error: blocked, ok: "" };
    }
    await db.delete(productAttributeValues).where(eq(productAttributeValues.attributeId, id));
    for (const item of plannedKept) {
      if (item.id) {
        const currentOption = existing.find((option) => option.id === item.id);
        if (currentOption && (currentOption.label !== item.label || currentOption.sortOrder !== item.sortOrder)) {
          await db.update(attributeOptions).set({ label: item.label, sortOrder: item.sortOrder }).where(eq(attributeOptions.id, item.id));
        }
      } else {
        await db.insert(attributeOptions).values({
          id: crypto.randomUUID(),
          attributeId: id,
          label: item.label,
          sortOrder: item.sortOrder,
        });
      }
    }
    dropped = await dropVariantsForOptions(db, removed);
    if (removed.length) await db.delete(attributeOptions).where(inArray(attributeOptions.id, removed));
  } else if (existing.length) {
    const usage = await countAttributePublicUsage(id, existing.map((option) => option.id));
    const blocked = optionRemovalError({
      removedLabelCount: existing.length,
      activeProductCount: usage.activeProductCount,
      variantCount: usage.variantCount,
    });
    if (blocked) return { error: blocked, ok: "" };
    dropped = await dropVariantsForOptions(db, existing.map((option) => option.id));
    await db.delete(attributeOptions).where(eq(attributeOptions.attributeId, id));
  }
  const categoryIds = [...new Set(formData.getAll("categoryId").map(String).filter(Boolean))];
  if (categoryIds.length) {
    const known = await db.select({ id: categories.id }).from(categories).where(inArray(categories.id, categoryIds));
    if (known.length !== categoryIds.length) return { error: "Una categoría ya no existe.", ok: "" };
  }
  await db.delete(categoryAttributes).where(eq(categoryAttributes.attributeId, id));
  if (categoryIds.length) {
    await db.insert(categoryAttributes).values(categoryIds.map((categoryId) => ({ categoryId, attributeId: id })));
  }
  await recordAudit(user.email, "guardo-atributo", "attribute");
  revalidatePath("/", "layout");
  redirect(dropped ? "/admin/atributos?aviso=variantes" : "/admin/atributos?aviso=guardado", RedirectType.replace);
}

export async function saveVariantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const productId = text(formData, "productId");
  const optionIds = formData.getAll("option").map(String).filter(Boolean).sort();
  if (!productId || optionIds.length === 0) return { error: "Elige las opciones de la variante.", ok: "" };
  const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return { error: "No encontré el producto.", ok: "" };
  const chosen = [];
  for (const optionId of optionIds) {
    const [option] = await db.select().from(attributeOptions).where(eq(attributeOptions.id, optionId)).limit(1);
    if (!option) return { error: "Una de las opciones ya no existe.", ok: "" };
    chosen.push(option);
  }
  const seenAttributes = new Set<string>();
  for (const option of chosen) {
    if (seenAttributes.has(option.attributeId)) return { error: "Elige un solo valor de cada atributo.", ok: "" };
    seenAttributes.add(option.attributeId);
  }
  const signature = optionIds.join(".");
  const [dup] = await db.select().from(variants).where(and(eq(variants.productId, productId), eq(variants.signature, signature))).limit(1);
  if (dup) return { error: "Esa combinación ya existe.", ok: "" };
  const priceText = text(formData, "price");
  const price = priceText ? parsePesos(priceText) : null;
  if (priceText && price == null) return { error: "El precio de la variante va en pesos enteros.", ok: "" };
  const availability = text(formData, "availability");
  if (!AVAIL.has(availability)) return { error: "La disponibilidad no es válida.", ok: "" };
  const files = variantFiles(formData);
  if (files.length > VARIANT_PHOTO_CAP) return { error: "Una variante admite hasta 4 fotos.", ok: "" };
  const uploaded = await uploadImages(files, user.email);
  if (!uploaded.ok) return { error: uploaded.error, ok: "" };
  const id = crypto.randomUUID();
  await db.insert(variants).values({
    id,
    productId,
    sku: text(formData, "sku").slice(0, 40),
    pricePesos: price == null ? null : String(price),
    availability,
    imageUrl: "",
    signature,
  });
  for (const option of chosen) {
    await db.insert(variantValues).values({ variantId: id, attributeId: option.attributeId, optionId: option.id });
  }
  await storeVariantPhotos(db, id, product.name, uploaded.files, 0);
  await syncVariantCover(db, id);
  await recordAudit(user.email, "guardo-variante", "variant");
  revalidatePath("/", "layout");
  return { error: "", ok: "La variante quedó guardada." };
}

export async function updateVariantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const productId = text(formData, "productId");
  const [current] = await db.select().from(variants).where(and(eq(variants.id, id), eq(variants.productId, productId))).limit(1);
  if (!current) return { error: "No encontré esa variante.", ok: "" };
  const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return { error: "No encontré el producto.", ok: "" };
  const priceText = text(formData, "price");
  const price = priceText ? parsePesos(priceText) : null;
  if (priceText && price == null) return { error: "El precio de la variante va en pesos enteros.", ok: "" };
  const availability = text(formData, "availability");
  if (!AVAIL.has(availability)) return { error: "La disponibilidad no es válida.", ok: "" };
  const stored = await db.select({ id: variantMedia.id, mediaId: variantMedia.mediaId, sortOrder: variantMedia.sortOrder }).from(variantMedia).where(eq(variantMedia.variantId, id)).orderBy(asc(variantMedia.sortOrder));
  const removeIds = [...new Set(formData.getAll("removePhoto").map(String).filter((photoId) => stored.some((photo) => photo.id === photoId)))];
  const kept = stored.filter((photo) => !removeIds.includes(photo.id));
  const files = variantFiles(formData);
  if (kept.length + files.length > VARIANT_PHOTO_CAP) return { error: "Una variante admite hasta 4 fotos.", ok: "" };
  const uploaded = await uploadImages(files, user.email);
  if (!uploaded.ok) return { error: uploaded.error, ok: "" };
  const keptIds = kept.map((photo) => photo.id);
  const requested = formData.getAll("photoOrder").map(String);
  const ordered = [...requested.filter((photoId) => keptIds.includes(photoId)), ...keptIds.filter((photoId) => !requested.includes(photoId))];
  await db.update(variants).set({
    sku: text(formData, "sku").slice(0, 40),
    pricePesos: price == null ? null : String(price),
    availability,
  }).where(eq(variants.id, id));
  if (removeIds.length) await db.delete(variantMedia).where(and(eq(variantMedia.variantId, id), inArray(variantMedia.id, removeIds)));
  for (const [index, photoId] of ordered.entries()) {
    await db.update(variantMedia).set({ sortOrder: index + 1 }).where(and(eq(variantMedia.id, photoId), eq(variantMedia.variantId, id)));
  }
  await storeVariantPhotos(db, id, product.name, uploaded.files, ordered.length);
  await syncVariantCover(db, id);
  await releaseUnused(db, stored.filter((photo) => removeIds.includes(photo.id)).map((photo) => photo.mediaId));
  await recordAudit(user.email, "edito-variante", "variant");
  revalidatePath("/", "layout");
  return { error: "", ok: "La variante quedó actualizada." };
}

export async function removeVariantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const productId = text(formData, "productId");
  const [current] = await db.select().from(variants).where(and(eq(variants.id, id), eq(variants.productId, productId))).limit(1);
  if (!current) return { error: "No encontré esa variante.", ok: "" };
  const [product] = await db.select({ status: products.status }).from(products).where(eq(products.id, productId)).limit(1);
  const siblings = await db.select({ id: variants.id }).from(variants).where(eq(variants.productId, productId));
  const remainingIds = siblings.filter((row) => row.id !== id).map((row) => row.id);
  if (product?.status === "active") {
    const required = await db.select().from(attributes).where(eq(attributes.required, true));
    let requiredGap = "";
    if (required.length) {
      const links = remainingIds.length
        ? await db.select({ attributeId: variantValues.attributeId }).from(variantValues).where(inArray(variantValues.variantId, remainingIds))
        : [];
      const fixed = await db.select().from(productAttributeValues).where(eq(productAttributeValues.productId, productId));
      for (const definition of required) {
        if (definition.kind === "single" || definition.kind === "multi") {
          if (!links.some((link) => link.attributeId === definition.id)) {
            requiredGap = `${definition.name} es obligatorio.`;
            break;
          }
        } else if (!fixed.some((row) => row.attributeId === definition.id && row.value.trim())) {
          requiredGap = `${definition.name} es obligatorio.`;
          break;
        }
      }
    }
    const blocked = variantRemovalError({
      productStatus: product.status,
      remainingVariantCount: remainingIds.length,
      requiredGap,
    });
    if (blocked) return { error: blocked, ok: "" };
  }
  const mediaIds = await variantMediaIds(db, [id]);
  await db.delete(variants).where(eq(variants.id, id));
  await releaseUnused(db, mediaIds);
  await recordAudit(user.email, "quito-variante", "variant");
  revalidatePath("/", "layout");
  return { error: "", ok: "La variante se quitó." };
}

export async function deleteProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("products", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) return { error: "No encontré el producto.", ok: "" };
  const photos = await db.select({ mediaId: productMedia.mediaId }).from(productMedia).where(eq(productMedia.productId, id));
  const productVariants = await db.select({ id: variants.id }).from(variants).where(eq(variants.productId, id));
  const mediaIds = [...photos.map((photo) => photo.mediaId), ...await variantMediaIds(db, productVariants.map((item) => item.id))];
  if (current.slug) await rememberSlug(productPublicPath(current.slug), "/catalogo");
  await db.delete(products).where(eq(products.id, id));
  await releaseUnused(db, mediaIds);
  await purgeStaleSlugRedirects();
  await recordAudit(user.email, "elimino-producto", "product");
  revalidatePath("/", "layout");
  redirect("/admin/productos?aviso=eliminado", RedirectType.replace);
}

export async function deleteAttributeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const [current] = await db.select().from(attributes).where(eq(attributes.id, id)).limit(1);
  if (!current) return { error: "No encontré el atributo.", ok: "" };
  const usage = await countAttributePublicUsage(id);
  const blocked = attributeDeleteError(usage);
  if (blocked) return { error: blocked, ok: "" };
  const options = await db.select({ id: attributeOptions.id }).from(attributeOptions).where(eq(attributeOptions.attributeId, id));
  await dropVariantsForOptions(db, options.map((option) => option.id));
  await db.delete(attributes).where(eq(attributes.id, id));
  await recordAudit(user.email, "elimino-atributo", "attribute");
  revalidatePath("/", "layout");
  redirect("/admin/atributos?aviso=eliminado", RedirectType.replace);
}

export async function duplicateProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("products", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) return { error: "No encontré el producto.", ok: "" };
  const copyId = crypto.randomUUID();
  const slug = await uniqueSlug("products", `${current.name} copia`, null);
  const sku = await freeSku(db, current.sku ? `${current.sku}-copia`.slice(0, 40) : "", null);
  await db.insert(products).values({
    ...current,
    id: copyId,
    sku,
    name: `${current.name} copia`,
    slug,
    status: "draft",
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const tags = await db.select().from(productTags).where(eq(productTags.productId, current.id));
  for (const tag of tags) await db.insert(productTags).values({ productId: copyId, tag: tag.tag });
  const photos = await db.select().from(productMedia).where(eq(productMedia.productId, current.id));
  for (const photo of photos) await db.insert(productMedia).values({ id: crypto.randomUUID(), productId: copyId, mediaId: photo.mediaId, sortOrder: photo.sortOrder });
  const fixed = await db.select().from(productAttributeValues).where(eq(productAttributeValues.productId, current.id));
  for (const row of fixed) await db.insert(productAttributeValues).values({ id: crypto.randomUUID(), productId: copyId, attributeId: row.attributeId, value: row.value });
  const sourceVariants = await db.select().from(variants).where(eq(variants.productId, current.id));
  for (const source of sourceVariants) {
    const variantId = crypto.randomUUID();
    await db.insert(variants).values({ ...source, id: variantId, productId: copyId });
    const links = await db.select().from(variantValues).where(eq(variantValues.variantId, source.id));
    for (const link of links) await db.insert(variantValues).values({ variantId, attributeId: link.attributeId, optionId: link.optionId });
    const media = await db.select().from(variantMedia).where(eq(variantMedia.variantId, source.id));
    for (const photo of media) await db.insert(variantMedia).values({ id: crypto.randomUUID(), variantId, mediaId: photo.mediaId, sortOrder: photo.sortOrder });
  }
  redirect(`/admin/productos/${copyId}`);
}

export async function saveProductAttributeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const productId = text(formData, "productId");
  const attributeId = text(formData, "attributeId");
  if (!productId || !attributeId) return { error: "Completa el atributo.", ok: "" };
  const [definition] = await db.select().from(attributes).where(eq(attributes.id, attributeId)).limit(1);
  if (!definition) return { error: "Ese atributo no existe.", ok: "" };
  if (definition.kind === "single" || definition.kind === "multi") return { error: "Ese atributo se usa en variantes.", ok: "" };
  const parsed = fixedValue(definition.kind, text(formData, "value"));
  if (!parsed.ok) return { error: parsed.error, ok: "" };
  const [current] = await db.select().from(productAttributeValues).where(and(eq(productAttributeValues.productId, productId), eq(productAttributeValues.attributeId, attributeId))).limit(1);
  if (current) await db.update(productAttributeValues).set({ value: parsed.value }).where(eq(productAttributeValues.id, current.id));
  else await db.insert(productAttributeValues).values({ id: crypto.randomUUID(), productId, attributeId, value: parsed.value });
  revalidatePath("/", "layout");
  return { error: "", ok: "El atributo quedó en el producto." };
}

export async function removeProductAttributeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("attributes", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const productId = text(formData, "productId");
  const attributeId = text(formData, "attributeId");
  const [current] = await db.select().from(productAttributeValues).where(and(eq(productAttributeValues.productId, productId), eq(productAttributeValues.attributeId, attributeId))).limit(1);
  if (!current) return { error: "No encontré ese dato.", ok: "" };
  await db.delete(productAttributeValues).where(eq(productAttributeValues.id, current.id));
  revalidatePath("/", "layout");
  return { error: "", ok: "El dato fijo se quitó." };
}

export async function updateMediaAltAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("media", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const [current] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!current) return { error: "No encontré el archivo.", ok: "" };
  await db.update(mediaAssets).set({ alt: text(formData, "alt").slice(0, 180) }).where(eq(mediaAssets.id, id));
  revalidatePath("/", "layout");
  await recordAudit(user.email, "edito-texto-archivo", "media");
  return { error: "", ok: "El texto quedó guardado." };
}

export async function deleteMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("media", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const [current] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!current) return { error: "No encontré el archivo.", ok: "" };
  const library = await listLibrary();
  const item = library.find((entry) => entry.id === id);
  if (item && item.uses.length > 0) return { error: "Este archivo está en uso. Quítalo desde donde aparece.", ok: "" };
  await releaseUnused(db, [id]);
  const [still] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (still) return { error: "No pude borrar el archivo. Sigue en la biblioteca.", ok: "" };
  await recordAudit(user.email, "elimino-archivo", "media");
  revalidatePath("/", "layout");
  redirect("/admin/multimedia?aviso=eliminado", RedirectType.replace);
}

export async function replaceMediaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("media", "write");
  const db = getDb();
  if (!db) return { error: "No hay base de datos.", ok: "" };
  const id = text(formData, "id");
  const [current] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!current) return { error: "No encontré el archivo.", ok: "" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) return { error: "Elige un archivo para reemplazar.", ok: "" };
  const kind = current.kind === "video" ? "video" : "image";
  if (kind === "image" && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Usa png, jpg o webp.", ok: "" };
  }
  if (kind === "video" && !["video/mp4", "video/webm"].includes(file.type)) {
    return { error: "Usa mp4 o webm.", ok: "" };
  }
  const secret = authSecret();
  if (!secret) return { error: "Falta la clave de sesión.", ok: "" };
  const allowed = await takeAttempt(attemptKey(new TextDecoder().decode(secret), "upload", user.email), 20, LOGIN_WINDOW_MS);
  if (!allowed) return { error: "Demasiadas subidas. Espera unos minutos.", ok: "" };
  const uploaded = await uploadAsset(new Uint8Array(await file.arrayBuffer()), kind);
  if (!uploaded.ok) return { error: uploaded.error, ok: "" };
  const previous = current.url;
  await db.update(mediaAssets).set({ url: uploaded.url, bytes: uploaded.bytes, kind }).where(eq(mediaAssets.id, id));
  if (previous !== uploaded.url) await destroyAsset(previous);
  await recordAudit(user.email, "reemplazo-archivo", "media");
  revalidatePath("/", "layout");
  return { error: "", ok: "El archivo quedó reemplazado. Los usos siguen apuntando aquí." };
}
