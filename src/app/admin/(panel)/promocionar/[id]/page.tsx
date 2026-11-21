import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PromoStudio } from "@/components/admin/promo-studio";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { marketingPieces } from "@/lib/db/schema";
import { loadPromoEditor } from "@/lib/promo-data";

export default async function PromoPiecePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("promos", "read");
  const { id } = await params;
  const db = getDb();
  if (!db) return <p>No hay base de datos.</p>;
  const [piece] = await db.select({ id: marketingPieces.id, productId: marketingPieces.productId }).from(marketingPieces).where(eq(marketingPieces.id, id)).limit(1);
  if (!piece) notFound();
  const editor = await loadPromoEditor(piece.productId, piece.id);
  if (!editor || editor === "missing") notFound();
  if (editor === "inactive") notFound();
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Redes</p>
          <h1>{editor.product.name}</h1>
          <p className="lead">{editor.product.priceLabel}. Si el precio cambió en el catálogo, la imagen lo muestra al descargarla.</p>
          {editor.offerRemoved ? <p className="hint">La oferta se quitó porque el precio anterior ya no es mayor. Guarda la pieza para conservar ese cambio.</p> : null}
        </div>
        <Link className="quiet" href="/admin/promocionar">Volver al historial</Link>
      </header>
      <PromoStudio editor={editor} />
    </main>
  );
}
