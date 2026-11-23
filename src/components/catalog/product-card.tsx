"use client";

import {
  catalogAvailabilityLabel,
  catalogKindLabel,
  type CatalogProductCard,
} from "@/lib/catalog-page";
import { discountPercentLabel } from "@/lib/ficha-presentation";
import { mediaDeliveryUrl } from "@/lib/images";
import { formatPesos } from "@/lib/money";
import { emitSelectItem } from "@/components/consent/analytics-hooks";

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
    product.priceMode === "ask"
      ? ""
      : product.comparePesos != null &&
          product.pricePesos != null &&
          Number(product.comparePesos) > Number(product.pricePesos)
        ? formatPesos(Number(product.comparePesos), symbol)
        : "";
  const discount = discountPercentLabel({
    priceMode: product.priceMode,
    comparePesos: product.comparePesos == null ? null : Number(product.comparePesos),
    unit: product.pricePesos == null ? null : Number(product.pricePesos),
  });
  const meta = [kind, availability].filter(Boolean).join(" · ");
  // <a> nativo: evita que el router cliente reutilice redirects 308 cacheados (tumba SEO)
  // que hacen que el clic “no cargue” mientras abrir en pestaña nueva sí funciona.
  const target = href || `/producto/${product.slug}`;
  const priceNumber = product.pricePesos == null ? undefined : Number(product.pricePesos);

  return (
    <article className={`catalog-card${availability === "Agotado" ? " is-sold" : ""}`}>
      <a
        className="catalog-card-link"
        href={target}
        aria-label={`Ver ${product.name}`}
        onClick={() =>
          emitSelectItem(
            [
              {
                item_id: product.id,
                item_name: product.name,
                price: priceNumber,
                quantity: 1,
              },
            ],
            "Catálogo",
          )
        }
      >
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
            {discount ? <span className="catalog-card-off">{discount}</span> : null}
          </div>
          {meta ? <p className="catalog-card-meta">{meta}</p> : null}
        </div>
      </a>
    </article>
  );
}
