"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { colorSwatchFromLabel } from "@/lib/catalog-facets";
import { catalogCanonical } from "@/lib/seo";

export type CatalogFacetGroup = {
  id: string;
  name: string;
  code: string;
  isColor: boolean;
  options: { id: string; label: string; count: number }[];
};

export type CatalogFacets = {
  kinds: { id: string; label: string; count: number }[];
  attributes: CatalogFacetGroup[];
  availability: { id: string; label: string; count: number }[];
  useful: boolean;
};

type Props = {
  query: Record<string, string | undefined>;
  facets: CatalogFacets;
  advancedOpen: boolean;
  activeCount: number;
};

export function CatalogFilters({ query, facets, advancedOpen, activeCount }: Props) {
  // Empezar cerrado: los chips muestran el estado; el panel se abre a demanda.
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDetailsElement>(null);
  const titleId = useId();
  const selectedOptions = new Set(
    `${query.opciones ?? ""},${query.opcion ?? ""}`
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        const summary = rootRef.current?.querySelector("summary");
        summary?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Mantener prop en la firma (compat CatalogView) sin forzar apertura automática.
  void advancedOpen;

  if (!facets.useful && !activeCount) {
    return null;
  }

  const clearHref = catalogCanonical({
    q: query.q,
    categoria: query.categoria,
    orden: query.orden,
  });

  return (
    <form className="catalog-refine" action="/catalogo" method="get">
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      {query.categoria ? <input type="hidden" name="categoria" value={query.categoria} /> : null}
      {query.orden ? <input type="hidden" name="orden" value={query.orden} /> : null}
      <details
        ref={rootRef}
        className="catalog-advanced"
        open={open}
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
        }}
      >
        <summary aria-controls={titleId} aria-expanded={open}>
          Filtrar catálogo{activeCount ? ` (${activeCount})` : ""}
        </summary>
        <div
          className="catalog-advanced-panel"
          role="dialog"
          aria-labelledby={titleId}
          aria-hidden={!open}
          inert={!open ? true : undefined}
        >
          <div className="catalog-filter-head">
            <h2 id={titleId}>Filtrar catálogo</h2>
            <button
              type="button"
              className="catalog-filter-close quiet"
              onClick={() => {
                setOpen(false);
                rootRef.current?.querySelector("summary")?.focus();
              }}
            >
              Cerrar
            </button>
          </div>

          <div className="catalog-advanced-grid catalog-facet-stack">
            {facets.kinds.length ? (
              <label className="catalog-facet-select">
                <span>Tipo de oferta</span>
                <select name="tipo" defaultValue={query.tipo ?? ""}>
                  <option value="">Todos</option>
                  {facets.kinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.label} ({kind.count})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <fieldset className="catalog-facet">
              <legend>Precio</legend>
              <div className="catalog-facet-price">
                <label>
                  <span className="visually-hidden">Precio mínimo</span>
                  <input name="minimo" defaultValue={query.minimo ?? ""} inputMode="numeric" placeholder="Mínimo" />
                </label>
                <label>
                  <span className="visually-hidden">Precio máximo</span>
                  <input name="maximo" defaultValue={query.maximo ?? ""} inputMode="numeric" placeholder="Máximo" />
                </label>
              </div>
            </fieldset>

            {facets.availability.length ? (
              <label className="catalog-facet-select">
                <span>Disponibilidad</span>
                <select name="disponibilidad" defaultValue={query.disponibilidad ?? ""}>
                  <option value="">Todas</option>
                  {facets.availability.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({item.count})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {facets.attributes.map((group) => (
              <fieldset key={group.id} className="catalog-facet">
                <legend>{group.name}</legend>
                <div className={`catalog-facet-options${group.isColor ? " is-color" : ""}`}>
                  {group.options.map((option) => {
                    const swatch = group.isColor ? colorSwatchFromLabel(option.label) : null;
                    return (
                      <label key={option.id} className={`catalog-facet-check${swatch ? " has-swatch" : ""}`}>
                        <input
                          type="checkbox"
                          name="opciones"
                          value={option.id}
                          defaultChecked={selectedOptions.has(option.id)}
                        />
                        {swatch ? (
                          <span className="catalog-swatch" style={{ background: swatch }} aria-hidden="true" />
                        ) : null}
                        <span>
                          {option.label} <em>{option.count}</em>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="catalog-refine-actions">
            <button className="btn" type="submit">
              Aplicar
            </button>
            {activeCount ? (
              <Link className="quiet" href={clearHref}>
                Limpiar filtros
              </Link>
            ) : null}
          </div>
        </div>
      </details>
    </form>
  );
}
