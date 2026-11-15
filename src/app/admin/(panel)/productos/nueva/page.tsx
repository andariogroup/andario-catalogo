import { ProductForm } from "@/components/admin/productos-form";
import { requirePermission } from "@/lib/auth";
import { blankProduct, categoryNodes } from "@/lib/product-draft";
import { adminLists } from "@/lib/store";

export default async function NewProductPage() {
  await requirePermission("products", "write");
  const lists = await adminLists();
  if (!lists) return <p>No hay base de datos.</p>;
  return (
    <main>
      <p>Catálogo</p>
      <h1>Nuevo producto</h1>
      <p className="lead">Completa la ficha. Al guardar vuelves a la lista y puedes crear otro.</p>
      <ProductForm product={blankProduct} categories={categoryNodes(lists.categories)} canWrite />
    </main>
  );
}
