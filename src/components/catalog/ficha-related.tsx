"use client";

import { emitSelectItem, TrackViewItemList } from "@/components/consent/analytics-hooks";
import { mediaDeliveryUrl } from "@/lib/images";

const LIST_NAME = "También te podría interesar";

export type FichaRelatedItem = {
  id: string;
  name: string;
  slug: string;
  priceLabel: string;
  compareLabel: string;
  discountLabel: string;
  availabilityLabel: string;
  price: number | null;
  photoUrl: string;
  photoAlt: string;
};

export function FichaRelated({ items }: { items: FichaRelatedItem[] }) {
  if (!items.length) return null;
  return (
    <section className="ficha-related" aria-labelledby="ficha-related-title">
      <h2 id="ficha-related-title">{LIST_NAME}</h2>
      <TrackViewItemList
        itemListId="ficha-related"
        itemListName={LIST_NAME}
        items={items.map((item) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price ?? undefined,
          quantity: 1,
        }))}
      />
      <ul className="ficha-related-grid">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`/producto/${item.slug}`}
              onClick={() =>
                emitSelectItem(
                  [{ item_id: item.id, item_name: item.name, price: item.price ?? undefined, quantity: 1 }],
                  LIST_NAME,
                )
              }
            >
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaDeliveryUrl(item.photoUrl, { width: 480, crop: "limit" })}
                  alt={item.photoAlt || item.name}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="ph" aria-hidden="true" />
              )}
              <span className="ficha-related-name">{item.name}</span>
              {item.compareLabel ? <span className="ficha-related-compare">{item.compareLabel}</span> : null}
              <span className="ficha-related-price">{item.priceLabel}</span>
              {item.discountLabel ? <span className="ficha-related-off">{item.discountLabel}</span> : null}
              {item.availabilityLabel ? <span className="ficha-related-stock">{item.availabilityLabel}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
