import Link from "next/link";
import { notFound } from "next/navigation";
import { PromoStudio } from "@/components/admin/promo-studio";
import { requirePermission } from "@/lib/auth";
import { activePromoProducts, loadPromoEditor } from "@/lib/promo-data";

export default async function NewPromoPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  await requirePermission("promos", "write");
  const { producto } = await searchParams;
  if (!producto) {
    const products = await activePromoProducts();
    if (!products) return <p>No hay base de datos.</p>;
    return (
      <main className="category-page">
        <header className="category-head">
          <div>
            <p>Redes</p>
            <h1>Elige el producto</h1>
            <p className="lead">La foto, el nombre y el precio salen del catálogo. Solo aparecen productos activos.</p>
          </div>
        </header>
        {products.length ? (
          <ul className="promo-history">
            {products.map((product) => (
              <li key={product.id}>
                <Link href={`/admin/promocionar/nueva?producto=${product.id}`}>
                  {product.photo ? <img src={product.photo} alt="" /> : null}
                  <strong>{product.name}</strong>
                  <span>{product.price}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="hint">Activa un producto para promocionarlo.</p>}
      </main>
    );
  }
  const editor = await loadPromoEditor(producto);
  if (editor === "missing") notFound();
  if (!editor) return <p>No hay base de datos.</p>;
  if (editor === "inactive") {
    return (
      <main className="category-page">
        <h1>Producto inactivo</h1>
        <p className="lead">Actívalo en el catálogo para armar una pieza. El enlace tiene que abrir una ficha visible.</p>
        <Link className="btn" href={`/admin/productos/${producto}`}>Abrir producto</Link>
      </main>
    );
  }
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Redes</p>
          <h1>{editor.product.name}</h1>
          <p className="lead">{editor.product.priceLabel}. La pieza usa los colores y el logo del negocio.</p>
          {editor.offerRemoved ? <p className="hint">La oferta se quitó porque el precio anterior ya no es mayor.</p> : null}
        </div>
        <Link className="quiet" href={`/admin/productos/${editor.product.id}`}>Volver al producto</Link>
      </header>
      <PromoStudio editor={editor} />
    </main>
  );
}
