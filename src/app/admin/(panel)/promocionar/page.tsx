import Link from "next/link";
import { SavedNotice } from "@/components/admin/categorias-form";
import { requirePermission } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { promoChannelLabel, promoFormatLabel, promoStatusLabel } from "@/lib/promo";
import { listPromos } from "@/lib/promo-data";

export default async function PromosPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const user = await requirePermission("promos", "read");
  const query = await searchParams;
  const pieces = await listPromos();
  if (!pieces) return <p>No hay base de datos.</p>;
  const canWrite = allows(user.role, "promos", "write");
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Redes</p>
          <h1>Promocionar</h1>
          <p className="lead">Arma una imagen con la foto, el nombre y el precio del catálogo. Luego la descargas y la publicas tú en la red.</p>
        </div>
        {canWrite ? <Link className="btn" href="/admin/promocionar/nueva">Nueva pieza</Link> : null}
      </header>
      {query.aviso === "eliminada" ? <SavedNotice message="La pieza se eliminó del historial." /> : null}
      {pieces.length ? (
        <ul className="promo-history">
          {pieces.map((piece) => (
            <li key={piece.id}>
              <Link href={`/admin/promocionar/${piece.id}`}>
                <strong>{piece.name}</strong>
                <span>{promoChannelLabel(piece.channel)} · {promoFormatLabel(piece.format)}</span>
                <span>{promoStatusLabel(piece.status)} · {piece.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Todavía no hay piezas. Elige un producto activo y arma la primera.</p>
      )}
    </main>
  );
}
