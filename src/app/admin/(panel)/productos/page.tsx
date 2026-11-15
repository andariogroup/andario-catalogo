import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { SavedNotice } from "@/components/admin/categorias-form";
import { ProductBoard, type ProductCard } from "@/components/admin/productos-list";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mediaAssets, productMedia } from "@/lib/db/schema";
import { allows } from "@/lib/permissions";
import { adminLists } from "@/lib/store";

async function coverOf(ids: string[]) {
  const db = getDb();
  const covers = new Map<string, string>();
  if (!db || ids.length === 0) return covers;
  const rows = await db
    .select({ productId: productMedia.productId, url: mediaAssets.url, sortOrder: productMedia.sortOrder })
    .from(productMedia)
    .innerJoin(mediaAssets, eq(productMedia.mediaId, mediaAssets.id))
    .orderBy(asc(productMedia.sortOrder));
  for (const row of rows) {
    if (ids.includes(row.productId) && !covers.has(row.productId)) covers.set(row.productId, row.url);
  }
  return covers;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const user = await requirePermission("products", "read");
  const query = await searchParams;
  const lists = await adminLists();
  if (!lists) return <p>No hay base de datos.</p>;
  const names = new Map(lists.categories.map((category) => [category.id, category.name]));
  const covers = await coverOf(lists.products.map((product) => product.id));
  const products: ProductCard[] = lists.products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    priceMode: product.priceMode,
    pricePesos: product.pricePesos,
    status: product.status,
    availability: product.availability,
    kind: product.kind,
    categoryId: product.categoryId ?? "",
    categoryName: product.categoryId ? names.get(product.categoryId) ?? "" : "",
    imageUrl: covers.get(product.id) ?? "",
    featured: product.featured,
  }));
  const canWrite = allows(user.role, "products", "write");
  const count = products.length === 1 ? "1 producto" : `${products.length} productos`;
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Catálogo</p>
          <h1>Productos</h1>
          <p className="lead">Abre un producto para editarlo. Solo los activos se ven en el catálogo.</p>
          <p className="hint">{products.length ? count : "Todavía no hay productos."}</p>
        </div>
        {canWrite ? <Link className="btn" href="/admin/productos/nueva">Nuevo producto</Link> : null}
      </header>
      {query.aviso === "guardado" ? <SavedNotice message="El producto quedó guardado." /> : null}
      {query.aviso === "eliminado" ? <SavedNotice message="El producto se eliminó." /> : null}
      {products.length ? <ProductBoard products={products} categories={lists.categories.map((category) => ({ id: category.id, name: category.name, parentId: category.parentId ?? "" }))} /> : null}
    </main>
  );
}
