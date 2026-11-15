import Link from "next/link";
import { SavedNotice } from "@/components/admin/categorias-form";
import { CategoryBoard } from "@/components/admin/categorias-list";
import { toCategoryDrafts } from "@/lib/category-draft";
import { requirePermission } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { adminLists } from "@/lib/store";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const user = await requirePermission("categories", "read");
  const query = await searchParams;
  const lists = await adminLists();
  if (!lists) return <p>No hay base de datos.</p>;
  const categories = toCategoryDrafts(lists.categories);
  const canWrite = allows(user.role, "categories", "write");
  const count = categories.length === 1 ? "1 categoría" : `${categories.length} categorías`;
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Catálogo</p>
          <h1>Categorías</h1>
          <p className="lead">Consulta las categorías del catálogo. Abre una ficha para editarla, o crea otra cuando la necesites.</p>
          <p className="hint">{categories.length ? count : "Todavía no hay categorías."}</p>
        </div>
        {canWrite ? <Link className="btn" href="/admin/categorias/nueva">Nueva categoría</Link> : null}
      </header>
      {query.aviso === "guardada" ? <SavedNotice message="La categoría quedó guardada." /> : null}
      {categories.length ? <CategoryBoard categories={categories} /> : null}
    </main>
  );
}
