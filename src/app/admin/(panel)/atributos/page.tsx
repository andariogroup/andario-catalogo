import Link from "next/link";
import { SavedNotice } from "@/components/admin/categorias-form";
import { AttributeBoard, VariantBoard } from "@/components/admin/atributos-list";
import { requirePermission } from "@/lib/auth";
import type { AttributeCard, VariantCard } from "@/lib/attribute-draft";
import { getDb } from "@/lib/db";
import { variantValues, variants } from "@/lib/db/schema";
import { formatPesos, pesosFromDb } from "@/lib/money";
import { allows } from "@/lib/permissions";
import { adminLists } from "@/lib/store";

export default async function AttributesPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const user = await requirePermission("attributes", "read");
  const query = await searchParams;
  const lists = await adminLists();
  if (!lists) return <p>No hay base de datos.</p>;
  const canWrite = allows(user.role, "attributes", "write");
  const attributes: AttributeCard[] = lists.attributes.map((attribute) => {
    const options = lists.options.filter((option) => option.attributeId === attribute.id);
    const categoryCount = lists.categoryAttributes.filter((link) => link.attributeId === attribute.id).length;
    return {
      id: attribute.id,
      name: attribute.name,
      code: attribute.code,
      kind: attribute.kind,
      visible: attribute.visible,
      filterable: attribute.filterable,
      required: attribute.required,
      optionCount: options.length,
      optionPreview: options.map((option) => option.label).join(", "),
      categoryCount,
    };
  });
  const db = getDb();
  const rows = db ? await db.select().from(variants) : [];
  const values = db ? await db.select().from(variantValues) : [];
  const attributeName = new Map(lists.attributes.map((attribute) => [attribute.id, attribute.name]));
  const optionName = new Map(lists.options.map((option) => {
    const name = attributeName.get(option.attributeId);
    return [option.id, name ? `${name}: ${option.label}` : option.label];
  }));
  const productName = new Map(lists.products.map((product) => [product.id, product.name]));
  const variantCards: VariantCard[] = rows.map((row) => {
    const labels = values.filter((value) => value.variantId === row.id).map((value) => optionName.get(value.optionId) ?? "").filter(Boolean);
    const amount = pesosFromDb(row.pricePesos);
    return {
      id: row.id,
      productId: row.productId,
      productName: productName.get(row.productId) ?? "Producto",
      label: labels.join(" · ") || "Sin opciones",
      price: amount == null ? "Precio del producto" : formatPesos(amount),
      availability: row.availability,
    };
  });
  const count = attributes.length === 1 ? "1 atributo" : `${attributes.length} atributos`;
  const variantCount = variantCards.length === 1 ? "1 variante" : `${variantCards.length} variantes`;
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Catálogo</p>
          <h1>Atributos y variantes</h1>
          <p className="lead">Un atributo describe el producto. Si tiene valores, como Color, cada valor se combina en una variante. Si es texto, se escribe una sola vez.</p>
          <p className="hint">{attributes.length ? count : "Todavía no hay atributos."}</p>
        </div>
        {canWrite ? <Link className="btn" href="/admin/atributos/nueva">Nuevo atributo</Link> : null}
      </header>
      {query.aviso === "guardado" ? <SavedNotice message="El atributo quedó guardado." /> : null}
      {query.aviso === "variantes" ? <SavedNotice message="El atributo quedó guardado. Se quitaron las variantes que usaban una opción eliminada." /> : null}
      {query.aviso === "eliminado" ? <SavedNotice message="El atributo se eliminó, junto con las variantes que lo usaban." /> : null}
      {attributes.length ? <AttributeBoard attributes={attributes} /> : null}
      <section className="category-tools">
        <header className="category-head">
          <div>
            <h2>Variantes por producto</h2>
            <p className="lead">Aquí ves qué combinaciones existen. Para cambiarlas, abre el producto.</p>
            <p className="hint">{variantCards.length ? variantCount : "Todavía no hay variantes."}</p>
          </div>
        </header>
        {variantCards.length ? <VariantBoard variants={variantCards} /> : null}
      </section>
    </main>
  );
}
