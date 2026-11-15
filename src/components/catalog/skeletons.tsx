/** Skeletons de presentación pública — proporciones alineadas a ProductCard / ficha / catálogo. */

export function InlineActionSpinner({ label = "Procesando" }: { label?: string }) {
  return (
    <span className="action-spinner" role="status" aria-live="polite">
      <span className="action-spinner-dot" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function CatalogCardSkeleton() {
  return (
    <article className="catalog-card catalog-card-skeleton" aria-hidden="true">
      <div className="catalog-card-link">
        <div className="catalog-card-media">
          <span className="skeleton-bone skeleton-media" />
        </div>
        <div className="catalog-card-body">
          <span className="skeleton-bone skeleton-title" />
          <span className="skeleton-bone skeleton-price" />
        </div>
      </div>
    </article>
  );
}

export function CatalogGridSkeleton({ count = 8 }: { count?: number }) {
  const n = Math.min(Math.max(count, 2), 12);
  return (
    <div className="catalog-grid catalog-grid-skeleton" aria-hidden="true">
      {Array.from({ length: n }, (_, index) => (
        <CatalogCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CatalogPageSkeleton({
  label = "Cargando catálogo…",
  count = 8,
}: {
  label?: string;
  count?: number;
}) {
  return (
    <main className="wrap section catalog-page catalog-page-skeleton" aria-busy="true" aria-live="polite">
      <div className="catalog-head">
        <span className="skeleton-bone skeleton-heading" />
        <span className="skeleton-bone skeleton-meta" />
      </div>
      <CatalogGridSkeleton count={count} />
      <p className="sr-only">{label}</p>
    </main>
  );
}

export function FichaSkeleton({ label = "Cargando producto…" }: { label?: string }) {
  return (
    <main className="wrap section ficha-page ficha-skeleton" aria-busy="true" aria-live="polite">
      <div className="ficha-layout">
        <div className="ficha-gallery-skel">
          <span className="skeleton-bone skeleton-ficha-media" />
        </div>
        <div className="ficha-buy-skel">
          <span className="skeleton-bone skeleton-meta" />
          <span className="skeleton-bone skeleton-heading" />
          <span className="skeleton-bone skeleton-price" />
          <span className="skeleton-bone skeleton-line" />
          <span className="skeleton-bone skeleton-cta" />
        </div>
      </div>
      <p className="sr-only">{label}</p>
    </main>
  );
}

/** Loading genérico de tienda (portada / rutas sin layout de catálogo). */
export function ShopShellSkeleton({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="wrap section shop-loading" aria-busy="true" aria-live="polite">
      <span className="skeleton-bone skeleton-heading" />
      <span className="skeleton-bone skeleton-line wide" />
      <span className="skeleton-bone skeleton-panel" />
      <p className="sr-only">{label}</p>
    </div>
  );
}

export function RequestPanelSkeleton({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="cart-empty cart-loading" aria-busy="true" aria-live="polite">
      <span className="skeleton-bone skeleton-heading" />
      <span className="skeleton-bone skeleton-panel" />
      <p className="sr-only">{label}</p>
    </div>
  );
}
