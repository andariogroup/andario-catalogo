"use client";

import Link from "next/link";
import { useState } from "react";
import { ATTRIBUTE_KINDS, splitOptionLabels, type AttributeCard, type VariantCard } from "@/lib/attribute-draft";

const PAGE_SIZES = [5, 10, 20] as const;
const STOCK: Record<string, string> = { available: "Disponible", sold_out: "Agotado", made_to_order: "Bajo pedido" };

function chooses(kind: string) {
  return kind === "single" || kind === "multi";
}

function purpose(kind: string) {
  return chooses(kind) ? "Se elige en cada variante del producto." : "Se escribe una vez en el producto.";
}

export function AttributeBoard({ attributes }: { attributes: AttributeCard[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [use, setUse] = useState("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = attributes.filter((attribute) => {
    if (kind !== "all" && attribute.kind !== kind) return false;
    if (use === "visible" && !attribute.visible) return false;
    if (use === "filter" && !(attribute.filterable && chooses(attribute.kind))) return false;
    if (use === "required" && !attribute.required) return false;
    if (!needle) return true;
    return attribute.name.toLocaleLowerCase("es").includes(needle) || attribute.code.toLocaleLowerCase("es").includes(needle) || attribute.optionPreview.toLocaleLowerCase("es").includes(needle);
  });
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = visible.slice(start, start + pageSize);
  const from = visible.length ? start + 1 : 0;
  const to = start + slice.length;

  return (
    <div className="category-tools">
      <div className="category-filters attribute-filters">
        <label className="field">Buscar
          <input type="search" value={query} placeholder="Nombre, código o valor" onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <label className="field">Tipo
          <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            {Object.entries(ATTRIBUTE_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="field">Uso
          <select value={use} onChange={(event) => { setUse(event.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            <option value="visible">Visibles</option>
            <option value="filter">Filtrables</option>
            <option value="required">Obligatorios</option>
          </select>
        </label>
        <label className="field">Por página
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">{visible.length ? `${from}–${to} de ${visible.length}` : "Ningún atributo coincide."}</p>
      {slice.length ? (
        <ul className="attribute-board">
          {slice.map((attribute) => {
            const labels = splitOptionLabels(attribute.optionPreview);
            const usage = [
              attribute.visible ? "Visible en el catálogo" : "Oculto en el catálogo",
              chooses(attribute.kind) && attribute.filterable ? "Filtrable" : "",
              attribute.required ? "Obligatorio para publicar" : "",
              attribute.categoryCount ? `${attribute.categoryCount} categoría${attribute.categoryCount === 1 ? "" : "s"}` : "Global",
            ].filter(Boolean).join(" · ");
            return (
              <li key={attribute.id}>
                <article className="attribute-row">
                  <Link href={`/admin/atributos/${attribute.id}`}>
                    <span className="attribute-kind">{ATTRIBUTE_KINDS[attribute.kind] ?? attribute.kind}</span>
                    <span className="attribute-copy">
                      <h2>{attribute.name}</h2>
                      <p>{purpose(attribute.kind)}</p>
                    </span>
                    {chooses(attribute.kind) ? (
                      <span className="attribute-chips">
                        {labels.slice(0, 6).map((item, index) => <span className="category-tag" key={`${item}-${index}`}>{item}</span>)}
                        {attribute.optionCount > 6 ? <span className="category-tag">+{attribute.optionCount - 6}</span> : null}
                      </span>
                    ) : <span className="attribute-chips" />}
                    <span className="attribute-foot">
                      <span>{usage}</span>
                      <span className="category-open">Abrir</span>
                    </span>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
      {pages > 1 ? (
        <nav className="category-pager" aria-label="Páginas de atributos">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button>
          <span>Página {current} de {pages}</span>
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button>
        </nav>
      ) : null}
    </div>
  );
}

export function VariantBoard({ variants }: { variants: VariantCard[] }) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = variants.filter((variant) => {
    if (availability !== "all" && variant.availability !== availability) return false;
    if (!needle) return true;
    return variant.productName.toLocaleLowerCase("es").includes(needle) || variant.label.toLocaleLowerCase("es").includes(needle);
  });
  const groups = [...visible.reduce((map, variant) => {
    const list = map.get(variant.productId) ?? [];
    list.push(variant);
    map.set(variant.productId, list);
    return map;
  }, new Map<string, VariantCard[]>())];

  return (
    <div className="category-tools">
      <div className="category-filters attribute-filters">
        <label className="field">Buscar
          <input type="search" value={query} placeholder="Producto o valor" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="field">Disponibilidad
          <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
            <option value="all">Todas</option>
            <option value="available">Disponible</option>
            <option value="sold_out">Agotado</option>
            <option value="made_to_order">Bajo pedido</option>
          </select>
        </label>
      </div>
      <p className="hint">{visible.length ? `${visible.length === 1 ? "1 variante" : `${visible.length} variantes`} en ${groups.length === 1 ? "1 producto" : `${groups.length} productos`}` : "Ninguna variante coincide."}</p>
      {groups.length ? (
        <ul className="attribute-board">
          {groups.map(([productId, rows]) => (
            <li key={productId}>
              <article className="attribute-row variant-group-card">
                <header>
                  <h3>{rows[0]?.productName}</h3>
                  <Link href={`/admin/productos/${productId}`}>Abrir producto</Link>
                </header>
                <ul>
                  {rows.map((variant) => (
                    <li key={variant.id}>
                      <span>{variant.label}</span>
                      <span>{variant.price}</span>
                      <span className={variant.availability === "sold_out" ? "category-tag off" : "category-tag"}>{STOCK[variant.availability] ?? variant.availability}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
