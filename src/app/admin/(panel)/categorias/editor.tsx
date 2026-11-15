import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/categorias-form";
import { requirePermission } from "@/lib/auth";
import { toCategoryDrafts, type CategoryDraft } from "@/lib/category-draft";
import { cloudinaryEnv } from "@/lib/env";
import { allows } from "@/lib/permissions";
import { adminLists } from "@/lib/store";

const blank: CategoryDraft = {
  id: "",
  name: "",
  description: "",
  parentId: "",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
  active: true,
  showOnHome: true,
  imageUrl: "",
};

export async function CategoryEditor({ id }: { id: string | null }) {
  const user = await requirePermission("categories", id ? "read" : "write");
  const lists = await adminLists();
  if (!lists) return <p>No hay base de datos.</p>;
  const categories = toCategoryDrafts(lists.categories);
  const category = id ? categories.find((item) => item.id === id) ?? null : blank;
  if (id && !category) notFound();
  const current = category ?? blank;
  const parents = categories.filter((item) => !item.parentId).map((item) => ({ id: item.id, name: item.name }));
  const canWrite = allows(user.role, "categories", "write");
  return (
    <main>
      <p>Catálogo</p>
      <h1>{id ? current.name : "Nueva categoría"}</h1>
      <p className="lead">{id
        ? "Esta ficha corresponde solo a esta categoría. Al guardar vuelves a la lista."
        : "Completa la ficha. Al guardar vuelves a la lista y puedes crear otra."}</p>
      <p><Link className="quiet" href="/admin/categorias">Volver a la lista</Link></p>
      <CategoryForm category={current} parents={parents} uploadsReady={Boolean(cloudinaryEnv())} canWrite={canWrite} />
    </main>
  );
}
