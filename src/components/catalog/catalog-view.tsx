import Link from "next/link";
import { CatalogFilters, type CatalogFacets } from "@/components/catalog/catalog-filters";
import { CatalogSortSelect } from "@/components/catalog/catalog-sort";
import { ProductCard } from "@/components/catalog/product-card";
import { TrackViewItemList } from "@/components/consent/analytics-hooks";
import {
  catalogActiveFilterCount,
  catalogActiveFilters,
  catalogCopy,
  catalogEmptyCopy,
  catalogEmptyKind,
  catalogHasAdvancedFilters,
  catalogIsExploring,
  catalogLayoutMode,
  catalogPageHeading,
  catalogResultsLabel,
  catalogShowBreadcrumb,
  catalogShowSort,
  type CatalogCategoryChip,
  type CatalogFilterOption,
  type CatalogProductCard,
} from "@/lib/catalog-page";
import { catalogCanonical } from "@/lib/seo";

type Card = {
  product: CatalogProductCard;
  photo: string;
};

type Props = {
  business: { name: string; slogan: string; shortDescription: string; currencySymbol: string };
  query: Record<string, string | undefined>;
  filters: CatalogFilterOption[];
  facets: CatalogFacets;
  categories: CatalogCategoryChip[];
  cards: Card[];
  optionIds?: string[];
  total: number;
  page: number;
  pages: number;
};

export function CatalogView({
  business,
  query,
  filters,
  facets,
  categories,
  cards,
  optionIds = [],
  total,
  page,
  pages,
}: Props) {
  const exploring = catalogIsExploring(query);
  const layout = catalogLayoutMode(total);
  const results = catalogResultsLabel(
    total,
    cards.map((card) => card.product.kind),
  );
  const active = catalogActiveFilters(query, filters);
  const activeCount = catalogActiveFilterCount(query);
  const parents = categories.filter((category) => !category.parentId);
  const selectedCategory = categories.find((category) => category.id === query.categoria);
  const parentForSubs =
    selectedCategory?.parentId || (selectedCategory && !selectedCategory.parentId ? selectedCategory.id : "");
  const parentCategory = parentForSubs ? categories.find((category) => category.id === parentForSubs) : undefined;
  const children = parentForSubs ? categories.filter((category) => category.parentId === parentForSubs) : [];
  const advancedOpen = catalogHasAdvancedFilters(query);
  const symbol = business.currencySymbol || "$";
  const hasQuery = Boolean(catalogCopy(query.q));
  const heading = catalogPageHeading(selectedCategory);
  const showCrumbs = catalogShowBreadcrumb(selectedCategory);
  const showResultsBar = layout !== "empty" || exploring || activeCount > 0 || facets.useful;
  const showSort = catalogShowSort(total);
  const showFilters = facets.useful || activeCount > 0 || advancedOpen;
  const optionQuery = optionIds.length ? `?opciones=${optionIds.join(",")}` : "";
  const crumbSub =
    selectedCategory?.parentId && parentCategory
      ? { id: selectedCategory.id, name: selectedCategory.name }
      : null;
  const crumbParent = parentCategory ? { id: parentCategory.id, name: parentCategory.name } : null;

  return (
    <main className={`wrap section catalog-page layout-${layout}`}>
      <TrackViewItemList
        itemListId={selectedCategory?.id || "catalogo"}
        itemListName={heading}
        items={cards.map((card) => ({
          item_id: card.product.id,
          item_name: card.product.name,
          price: card.product.pricePesos == null ? undefined : Number(card.product.pricePesos),
          quantity: 1,
        }))}
      />
      {showCrumbs && crumbParent ? (
        <nav className="catalog-crumbs" aria-label="Ubicación en el catálogo">
          <ol>
            <li>
              <Link href={catalogCanonical({ ...query, categoria: undefined, pagina: undefined })}>Catálogo</Link>
            </li>
            <li>
              {crumbSub ? (
                <Link href={catalogCanonical({ ...query, categoria: crumbParent.id, pagina: undefined })}>
                  {crumbParent.name}
                </Link>
              ) : (
                <span aria-current="page">{crumbParent.name}</span>
              )}
            </li>
            {crumbSub ? (
              <li>
                <span aria-current="page">{crumbSub.name}</span>
              </li>
            ) : null}
          </ol>
        </nav>
      ) : null}

      <header className="catalog-head">
        <h1>{heading}</h1>
      </header>

      {parents.length ? (
        <nav className="catalog-cats" aria-label="Categorías">
          <Link
            className={`catalog-cat${!query.categoria ? " is-active" : ""}`}
            href={catalogCanonical({ ...query, categoria: undefined, pagina: undefined })}
            aria-current={!query.categoria ? "page" : undefined}
          >
            Todos
          </Link>
          {parents.map((category) => {
            const selected =
              query.categoria === category.id ||
              Boolean(selectedCategory && selectedCategory.parentId === category.id);
            return (
              <Link
                key={category.id}
                className={`catalog-cat${selected ? " is-active" : ""}`}
                href={catalogCanonical({ ...query, categoria: category.id, pagina: undefined })}
                aria-current={selected ? "page" : undefined}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {children.length ? (
        <nav className="catalog-subs" aria-label="Subcategorías">
          <Link
            className={`catalog-sub${selectedCategory && !selectedCategory.parentId ? " is-active" : ""}`}
            href={catalogCanonical({ ...query, categoria: parentForSubs || undefined, pagina: undefined })}
            aria-label="Todas las subcategorías"
            aria-current={selectedCategory && !selectedCategory.parentId ? "page" : undefined}
          >
            Todas
          </Link>
          {children.map((category) => (
            <Link
              key={category.id}
              className={`catalog-sub${query.categoria === category.id ? " is-active" : ""}`}
              href={catalogCanonical({ ...query, categoria: category.id, pagina: undefined })}
              aria-current={query.categoria === category.id ? "page" : undefined}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {showResultsBar ? (
        <div className="catalog-toolbar">
          <p className="catalog-count" aria-live="polite">
            {results}
            {hasQuery && !selectedCategory ? (
              <span className="catalog-count-hint"> · “{catalogCopy(query.q)}”</span>
            ) : null}
          </p>
          <div className="catalog-toolbar-actions">
            {showSort ? (
              <CatalogSortSelect
                current={query.orden ?? ""}
                hidden={{
                  q: query.q,
                  categoria: query.categoria,
                  disponibilidad: query.disponibilidad,
                  minimo: query.minimo,
                  maximo: query.maximo,
                  opcion: query.opcion,
                  opciones: query.opciones,
                  tipo: query.tipo,
                }}
              />
            ) : null}
            {showFilters ? (
              <CatalogFilters query={query} facets={facets} advancedOpen={advancedOpen} activeCount={activeCount} />
            ) : null}
          </div>
        </div>
      ) : null}

      {active.length ? (
        <div className="catalog-chips" aria-label="Filtros activos">
          {active.map((chip) => (
            <Link key={chip.key} className="catalog-chip" href={catalogCanonical(chip.clear)}>
              <span>{chip.label}</span>
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link className="catalog-chip-clear" href={catalogCanonical({ q: query.q, categoria: query.categoria, orden: query.orden })}>
            Limpiar filtros
          </Link>
        </div>
      ) : null}

      {layout === "empty" ? (
        <div className="catalog-empty">
          {(() => {
            const emptyKind = catalogEmptyKind({
              q: query.q,
              categoria: query.categoria,
              filterCount: activeCount,
            });
            const empty = catalogEmptyCopy(emptyKind, query.q ?? "");
            const clearFiltersHref = catalogCanonical({
              q: query.q,
              categoria: query.categoria,
              orden: query.orden,
            });
            const clearSearchHref = catalogCanonical({
              ...query,
              q: undefined,
              pagina: undefined,
            });
            function action(kind: "clear_search" | "clear_filters" | "catalog" | null, style: "btn" | "quiet") {
              if (!kind) return null;
              if (kind === "clear_search") {
                return (
                  <Link className={style} href={hasQuery ? clearSearchHref : "/catalogo"}>
                    Limpiar búsqueda
                  </Link>
                );
              }
              if (kind === "clear_filters") {
                return (
                  <Link className={style} href={clearFiltersHref}>
                    Limpiar filtros
                  </Link>
                );
              }
              return (
                <Link className={style} href="/catalogo">
                  Explorar catálogo
                </Link>
              );
            }
            return (
              <>
                <h2>{empty.title}</h2>
                <p>{empty.body}</p>
                <div className="catalog-empty-actions">
                  {action(empty.primary, "btn")}
                  {action(empty.secondary, empty.primary ? "quiet" : "btn")}
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <>
          <div className="catalog-grid">
            {cards.map(({ product, photo }) => (
              <ProductCard
                key={product.id}
                product={product}
                photo={photo}
                symbol={symbol}
                href={`/producto/${product.slug}${optionQuery}`}
              />
            ))}
          </div>

          {pages > 1 ? (
            <nav className="catalog-pages" aria-label="Páginas del catálogo">
              {page > 1 ? (
                <Link className="quiet" href={catalogCanonical(query, page - 1)}>
                  Anterior
                </Link>
              ) : (
                <span className="catalog-page-spacer" />
              )}
              <p>
                {page} / {pages}
              </p>
              {page < pages ? (
                <Link className="quiet" href={catalogCanonical(query, page + 1)}>
                  Siguiente
                </Link>
              ) : (
                <span className="catalog-page-spacer" />
              )}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
