import {
  catalogAvailabilityLabel,
  catalogKindLabel,
  type CatalogProductCard,
} from "@/lib/catalog-page";
import { mediaDeliveryUrl } from "@/lib/images";
import { formatPesos } from "@/lib/money";

type Props = {
  product: CatalogProductCard;
  photo: string;
  symbol: string;
  href?: string;
};

export function ProductCard({ product, photo, symbol, href }: Props) {
  const availability = catalogAvailabilityLabel(product.availability);
  const kind = catalogKindLabel(product.kind);
  const price =
    product.priceMode === "ask"
      ? "Consultar precio"
      : product.priceMode === "from"
        ? `Desde ${formatPesos(product.pricePesos == null ? null : Number(product.pricePesos), symbol)}`
        : formatPesos(product.pricePesos == null ? null : Number(product.pricePesos), symbol);
  const compare =
    product.comparePesos != null &&
    product.pricePesos != null &&
    Number(product.comparePesos) > Number(product.pricePesos)
      ? formatPesos(Number(product.comparePesos), symbol)
      : "";
  const meta = [kind, availability].filter(Boolean).join(" · ");
  // <a> nativo: evita que el router cliente reutilice redirects 308 cacheados (tumba SEO)
  // que hacen que el clic “no cargue” mientras abrir en pestaña nueva sí funciona.
  const target = href || `/producto/${product.slug}`;

  return (
    <article className={`catalog-card${availability === "Agotado" ? " is-sold" : ""}`}>
      <a className="catalog-card-link" href={target} aria-label={`Ver ${product.name}`}>
        <div className={`catalog-card-media${photo ? "" : " is-empty"}`}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaDeliveryUrl(photo, { width: 640, height: 640, crop: "fill" })}
              alt={product.name}
              width={640}
              height={640}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="ph" aria-hidden="true" />
          )}
          {availability ? <span className="catalog-card-badge">{availability}</span> : null}
        </div>
        <div className="catalog-card-body">
          <h2 className="catalog-card-title" title={product.name}>
            {product.name}
          </h2>
          <div className="catalog-card-price">
            {compare ? <span className="catalog-card-compare">{compare}</span> : null}
            <span className="price">{price}</span>
          </div>
          {meta ? <p className="catalog-card-meta">{meta}</p> : null}
        </div>
      </a>
    </article>
  );
}
