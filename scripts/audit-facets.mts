import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import {
  attributeOptions,
  attributes,
  categoryAttributes,
  products,
  variantMedia,
  variants,
  variantValues,
} from "../src/lib/db/schema";

const db = getDb();
if (!db) {
  console.log(JSON.stringify({ error: "NO_DB" }));
  process.exit(0);
}

const [defs, opts, active, vars, vals, links, vMedia] = await Promise.all([
  db.select().from(attributes),
  db.select().from(attributeOptions),
  db
    .select({
      id: products.id,
      name: products.name,
      kind: products.kind,
      availability: products.availability,
      price: products.pricePesos,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.status, "active")),
  db.select().from(variants),
  db.select().from(variantValues),
  db.select().from(categoryAttributes),
  db.select().from(variantMedia),
]);

console.log(
  JSON.stringify(
    {
      defs: defs.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        kind: d.kind,
        filterable: d.filterable,
        visible: d.visible,
      })),
      opts: opts.map((o) => ({ id: o.id, attributeId: o.attributeId, label: o.label })),
      products: active,
      variants: vars.map((v) => ({
        id: v.id,
        productId: v.productId,
        price: v.pricePesos,
        availability: v.availability,
        imageUrl: v.imageUrl,
      })),
      variantValues: vals,
      categoryAttributes: links,
      variantMediaCount: vMedia.length,
    },
    null,
    2,
  ),
);
