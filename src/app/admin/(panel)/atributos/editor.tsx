import Link from "next/link";
import { notFound } from "next/navigation";
import { AttributeForm, DeleteAttribute } from "@/components/admin/atributos-form";
import { blankAttribute, type AttributeDraft, type CategoryOption } from "@/lib/attribute-draft";
import { requirePermission } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { adminLists } from "@/lib/store";

function categoryOptions(rows: { id: string; name: string; parentId: string | null; sortOrder: number }[]): CategoryOption[] {
  const byParent = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.parentId ?? "";
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));
  const out: CategoryOption[] = [];
  function walk(parentId: string, depth: number) {
    for (const row of byParent.get(parentId) ?? []) {
      out.push({ id: row.id, name: row.name, depth });
      walk(row.id, depth + 1);
    }
  }
  walk("", 0);
  return out;
}

export async function AttributeEditor({ id }: { id: string | null }) {
  const user = await requirePermission("attributes", id ? "read" : "write");
  const lists = await adminLists();
  if (!lists) return <p>No hay base de datos.</p>;
  const current = lists.attributes.find((item) => item.id === id);
  if (id && !current) notFound();
  const options = current ? lists.options.filter((option) => option.attributeId === current.id).map((option) => option.label).join(", ") : "";
  const categoryIds = current
    ? lists.categoryAttributes.filter((link) => link.attributeId === current.id).map((link) => link.categoryId)
    : [];
  const attribute: AttributeDraft = current ? {
    id: current.id,
    name: current.name,
    code: current.code,
    kind: current.kind,
    unit: current.unit,
    required: current.required,
    visible: current.visible,
    filterable: current.filterable,
    sortOrder: String(current.sortOrder),
    options,
    categoryIds,
  } : blankAttribute;
  const canWrite = allows(user.role, "attributes", "write");
  return (
    <main>
      <p>Catálogo</p>
      <h1>{id ? attribute.name : "Nuevo atributo"}</h1>
      <p className="lead">{id
        ? "Esta ficha corresponde solo a este atributo. Al guardar vuelves a la lista."
        : "Completa la ficha. Al guardar vuelves a la lista y puedes crear otro."}</p>
      <p><Link className="quiet" href="/admin/atributos">Volver a la lista</Link></p>
      <AttributeForm attribute={attribute} categories={categoryOptions(lists.categories)} canWrite={canWrite} />
      {id && canWrite ? <DeleteAttribute id={id} /> : null}
    </main>
  );
}
