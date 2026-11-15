"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPesos, pesosFromDb } from "@/lib/money";

const PAGE_SIZES = [5, 10, 20] as const;
const STATUSES: Record<string, string> = { draft: "Borrador", active: "Activo", inactive: "Inactivo" };
const STOCK: Record<string, string> = { available: "Disponible", sold_out: "Agotado", made_to_order: "Bajo pedido" };

export type ProductCard = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  priceMode: string;
  pricePesos: string | null;
  status: string;
  availability: string;
  kind: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  featured: boolean;
};

export type ProductCategory = { id: string; name: string; parentId: string };

function priceOf(product: ProductCard) {
  if (product.priceMode === "ask") return "Consultar";
  const label = formatPesos(pesosFromDb(product.pricePesos));
  return product.priceMode === "from" ? `Desde ${label}` : label;
}

export function ProductBoard({ products, categories }: { products: ProductCard[]; categories: ProductCategory[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const parents = categories.filter((category) => !category.parentId).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const children = parentId ? categories.filter((category) => category.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name, "es")) : [];
  const allowed = new Set(childId ? [childId] : parentId ? [parentId, ...children.map((category) => category.id)] : []);
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = products.filter((product) => {
    if (status !== "all" && product.status !== status) return false;
    if (kind !== "all" && product.kind !== kind) return false;
    if (allowed.size && !allowed.has(product.categoryId)) return false;
    if (!needle) return true;
    return product.name.toLocaleLowerCase("es").includes(needle) || product.sku.toLocaleLowerCase("es").includes(needle);
  });
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = visible.slice(start, start + pageSize);
  const from = visible.length ? start + 1 : 0;
  const to = start + slice.length;

  return (
    <div className="category-tools">
      <div className="category-filters product-filters">
        <label className="field">Buscar
          <input type="search" value={query} placeholder="Nombre o SKU" onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <label className="field">Estado
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
        <label className="field">Tipo
          <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            <option value="physical">Físico</option>
            <option value="digital">Digital</option>
            <option value="service">Servicio</option>
            <option value="intangible">Intangible</option>
          </select>
        </label>
        <label className="field">Categoría
          <select value={parentId} onChange={(event) => { setParentId(event.target.value); setChildId(""); setPage(1); }}>
            <option value="">Todas</option>
            {parents.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        {parentId && children.length ? (
          <label className="field">Subcategoría
            <select value={childId} onChange={(event) => { setChildId(event.target.value); setPage(1); }}>
              <option value="">Todas</option>
              {children.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="field">Por página
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">{visible.length ? `${from}–${to} de ${visible.length}` : "Ningún producto coincide."}</p>
      {slice.length ? (
        <ul className="category-board product-board">
          {slice.map((product) => {
            const statusClass = product.status === "inactive" ? "category-tag off" : product.status === "draft" ? "category-tag draft" : "category-tag";
            const stock = STOCK[product.availability] ?? product.availability;
            return (
              <li key={product.id}>
                <article className="category-card product-card">
                  <Link className="category-main" href={`/admin/productos/${product.id}`}>
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="category-photo" src={product.imageUrl} alt="" />
                    ) : <span className="category-photo empty">Sin foto</span>}
                    <span className="category-body">
                      <span className="category-tags">
                        <span className={statusClass}>{STATUSES[product.status] ?? product.status}</span>
                        {product.availability === "available" ? null : <span className={product.availability === "sold_out" ? "category-tag off" : "category-tag"}>{stock}</span>}
                        {product.featured ? <span className="category-tag">Destacado</span> : null}
                      </span>
                      <h2>{product.name}</h2>
                      <p className="product-price">{priceOf(product)}{product.availability === "available" ? ` · ${stock}` : ""}</p>
                      <p>{product.categoryName || "Sin categoría"}{product.sku ? ` · SKU ${product.sku}` : ""}</p>
                      <span className="category-open">Abrir</span>
                    </span>
                  </Link>
                  <p className="product-links">
                    {product.status === "active" ? (
                      <>
                        <Link href={`/producto/${product.slug}`}>Ver en el catálogo</Link>
                        <a href={`/qr?path=${encodeURIComponent(`/producto/${product.slug}`)}&format=png`}>Descargar QR</a>
                      </>
                    ) : <span>{product.status === "inactive" ? "Inactivo: no se ve en el catálogo." : "Borrador: no se ve en el catálogo."}</span>}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
      {pages > 1 ? (
        <nav className="category-pager" aria-label="Páginas de productos">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button>
          <span>Página {current} de {pages}</span>
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button>
        </nav>
      ) : null}
    </div>
  );
}
