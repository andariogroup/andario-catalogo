import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { DeleteProduct, ProductExtras, ProductForm } from "@/components/admin/productos-form";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mediaAssets, productAttributeValues, productTags, products, variantMedia, variantValues, variants } from "@/lib/db/schema";
import { formatPesos, pesosFromDb } from "@/lib/money";
import { allows } from "@/lib/permissions";
import { filterAttributesForCategory } from "@/lib/attribute-draft";
import { categoryNodes, type ProductDraft } from "@/lib/product-draft";
import { adminLists, productPhotos } from "@/lib/store";

const STOCK: Record<string, string> = { available: "Disponible", sold_out: "Agotado", made_to_order: "Bajo pedido" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("products", "read");
  const { id } = await params;
  const db = getDb();
  const lists = await adminLists();
  if (!db || !lists) return <p>No hay base de datos.</p>;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) notFound();
  const photos = await productPhotos(product.id);
  const tags = (await db.select().from(productTags).where(eq(productTags.productId, product.id))).map((tag) => tag.tag);
  const attributeRows = await db.select().from(productAttributeValues).where(eq(productAttributeValues.productId, product.id));
  const variantRows = await db.select().from(variants).where(eq(variants.productId, product.id));
  const variantIds = variantRows.map((row) => row.id);
  const variantLinks = variantIds.length ? await db.select().from(variantValues).where(inArray(variantValues.variantId, variantIds)) : [];
  const photoRows = variantIds.length
    ? await db.select({ id: variantMedia.id, variantId: variantMedia.variantId, url: mediaAssets.url, sortOrder: variantMedia.sortOrder })
      .from(variantMedia)
      .innerJoin(mediaAssets, eq(variantMedia.mediaId, mediaAssets.id))
      .where(inArray(variantMedia.variantId, variantIds))
      .orderBy(asc(variantMedia.sortOrder))
    : [];
  const names = new Map(lists.attributes.map((attribute) => [attribute.id, attribute.name]));
  const optionMeta = new Map(lists.options.map((option) => [option.id, option]));
  const canWrite = allows(user.role, "products", "write") && allows(user.role, "attributes", "write");
  const draft: ProductDraft = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    short: product.shortDescription,
    description: product.description,
    kind: product.kind,
    categoryId: product.categoryId ?? "",
    price: product.pricePesos ?? "",
    compare: product.comparePesos ?? "",
    priceMode: product.priceMode,
    status: product.status,
    availability: product.availability,
    featured: product.featured,
    sortOrder: String(product.sortOrder),
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    tags,
    photos: photos.map((photo) => ({ id: photo.id, url: photo.url, alt: photo.alt })),
  };
  return (
    <main>
      <p>Catálogo</p>
      <h1>{product.name}</h1>
      <p className="lead">Esta ficha corresponde solo a este producto. Al guardar vuelves a la lista.</p>
      <ProductForm product={draft} categories={categoryNodes(lists.categories)} canWrite={allows(user.role, "products", "write")} />
      {canWrite ? (
        <ProductExtras
          productId={product.id}
          attributes={filterAttributesForCategory(
            lists.attributes.flatMap((attribute) => attribute.kind === "single" || attribute.kind === "multi" ? [] : [{ id: attribute.id, name: attribute.name, kind: attribute.kind }]),
            product.categoryId,
            lists.categoryAttributes,
          )}
          groups={filterAttributesForCategory(
            lists.attributes.flatMap((attribute) => {
              const choices = lists.options.filter((option) => option.attributeId === attribute.id);
              if (!choices.length) return [];
              return [{ id: attribute.id, name: attribute.name, kind: attribute.kind, options: choices.map((option) => ({ id: option.id, name: option.label })) }];
            }),
            product.categoryId,
            lists.categoryAttributes,
          )}
          savedAttributes={attributeRows.map((row) => ({ id: row.attributeId, name: names.get(row.attributeId) ?? "Atributo", value: row.value }))}
          savedVariants={variantRows.map((row) => {
            const amount = pesosFromDb(row.pricePesos);
            return {
              id: row.id,
              label: variantLinks.filter((link) => link.variantId === row.id).map((link) => {
                const option = optionMeta.get(link.optionId);
                if (!option) return "";
                const name = names.get(option.attributeId);
                return name ? `${name}: ${option.label}` : option.label;
              }).filter(Boolean).join(" · "),
              sku: row.sku,
              price: amount == null ? "" : String(amount),
              priceLabel: amount == null ? "Precio del producto" : formatPesos(amount),
              availability: row.availability,
              availabilityLabel: STOCK[row.availability] ?? row.availability,
              photos: photoRows.filter((photo) => photo.variantId === row.id).map((photo) => ({ id: photo.id, url: photo.url })),
            };
          })}
        />
      ) : null}
      {allows(user.role, "products", "write") ? <DeleteProduct id={product.id} /> : null}
    </main>
  );
}
