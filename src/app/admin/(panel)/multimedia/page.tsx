import { SavedNotice } from "@/components/admin/categorias-form";
import { MediaBoard } from "@/components/admin/media-board";
import { requirePermission } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { listLibrary } from "@/lib/store";

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const user = await requirePermission("media", "read");
  const query = await searchParams;
  const items = await listLibrary();
  const canWrite = allows(user.role, "media", "write");
  const count = items.length === 1 ? "1 archivo" : `${items.length} archivos`;
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Catálogo</p>
          <h1>Multimedia</h1>
          <p className="lead">Aquí están las fotos y los videos que ya guardaste. Si nadie los usa, puedes quitarlos. La foto de un producto se cambia en ese producto.</p>
          <p className="hint">{items.length ? count : "Todavía no hay archivos."}</p>
        </div>
      </header>
      {query.aviso === "eliminado" ? <SavedNotice message="El archivo se quitó." /> : null}
      {items.length ? <MediaBoard items={items} canWrite={canWrite} /> : <p className="hint">Las fotos entran al guardar un producto, la marca o el inicio.</p>}
    </main>
  );
}
