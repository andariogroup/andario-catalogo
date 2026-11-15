"use client";

import Link from "next/link";
import { useState } from "react";
import type { CategoryDraft } from "@/lib/category-draft";

const PAGE_SIZES = [5, 10, 20] as const;

type StatusFilter = "all" | "active" | "inactive";
type HomeFilter = "all" | "home";

function matchesFlags(category: CategoryDraft, status: StatusFilter, home: HomeFilter) {
  if (status === "active" && !category.active) return false;
  if (status === "inactive" && category.active) return false;
  if (home === "home" && !category.showOnHome) return false;
  return true;
}

function matchesName(category: CategoryDraft, query: string) {
  return category.name.toLocaleLowerCase("es").includes(query);
}

function Photo({ url }: { url: string }) {
  if (!url) return <span className="category-photo empty" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="category-photo" src={url} alt="" />;
}

function Tags({ category, level }: { category: CategoryDraft; level: string }) {
  return (
    <span className="category-tags">
      <span className="category-tag">{level}</span>
      <span className="category-tag">Orden {category.sortOrder}</span>
      <span className={category.active ? "category-tag" : "category-tag off"}>{category.active ? "Activa" : "Inactiva"}</span>
      {category.showOnHome ? <span className="category-tag">En inicio</span> : null}
    </span>
  );
}

export function CategoryBoard({ categories }: { categories: CategoryDraft[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [home, setHome] = useState<HomeFilter>("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const needle = query.trim().toLocaleLowerCase("es");
  const parents = categories.filter((category) => !category.parentId);
  const parentIds = new Set(parents.map((category) => category.id));
  const loose = categories.filter((category) => category.parentId && !parentIds.has(category.parentId));
  const tops = [...parents, ...loose];
  const visible = tops.flatMap((parent) => {
    const children = categories.filter((category) => category.parentId === parent.id && matchesFlags(category, status, home));
    const parentVisible = matchesFlags(parent, status, home);
    if (!needle) {
      if (!parentVisible && children.length === 0) return [];
      return [{ parent, children }];
    }
    if (matchesName(parent, needle) && parentVisible) return [{ parent, children }];
    const found = children.filter((category) => matchesName(category, needle));
    return found.length ? [{ parent, children: found }] : [];
  });
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = visible.slice(start, start + pageSize);
  const from = visible.length ? start + 1 : 0;
  const to = start + slice.length;

  return (
    <div className="category-tools">
      <div className="category-filters">
        <label className="field">Buscar
          <input type="search" value={query} placeholder="Nombre de la categoría" onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <label className="field">Estado
          <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }}>
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </label>
        <label className="field">En inicio
          <select value={home} onChange={(event) => { setHome(event.target.value as HomeFilter); setPage(1); }}>
            <option value="all">Todas</option>
            <option value="home">Solo en inicio</option>
          </select>
        </label>
        <label className="field">Por página
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">{visible.length ? `${from}–${to} de ${visible.length}` : "Ninguna categoría coincide."}</p>
      {slice.length ? (
        <ul className="category-board">
          {slice.map(({ parent, children }) => (
            <li key={parent.id}>
              <article className="category-card">
                <Link className="category-main" href={`/admin/categorias/${parent.id}`}>
                  <Photo url={parent.imageUrl} />
                  <span className="category-body">
                    <Tags category={parent} level={parent.parentId ? "Sin padre" : "Primer nivel"} />
                    <h2>{parent.name}</h2>
                    {parent.description ? <p>{parent.description}</p> : <p>Sin descripción.</p>}
                    <span className="category-open">Consultar</span>
                  </span>
                </Link>
                {children.length ? (
                  <div className="category-subs">
                    <p>Subcategorías</p>
                    <ul>
                      {children.map((child) => (
                        <li key={child.id}>
                          <Link href={`/admin/categorias/${child.id}`}>
                            {child.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={child.imageUrl} alt="" />
                            ) : <span className="empty" />}
                            <span>
                              <strong>{child.name}</strong>
                              <small>Orden {child.sortOrder} · {child.active ? "Activa" : "Inactiva"}{child.showOnHome ? " · En inicio" : ""}</small>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      ) : null}
      {pages > 1 ? (
        <nav className="category-pager" aria-label="Páginas de categorías">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button>
          <span>Página {current} de {pages}</span>
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button>
        </nav>
      ) : null}
    </div>
  );
}
