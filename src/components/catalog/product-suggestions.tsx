import { FichaRelated } from "@/components/catalog/ficha-related";
import { discountPercentLabel, fichaAvailabilityLabel, fichaCompareLabel, fichaPriceLabel } from "@/lib/ficha-presentation";
import { pesosFromDb } from "@/lib/money";
import { loadRelatedProducts } from "@/lib/store";

export async function ProductSuggestions({
  productId,
  categoryId,
  symbol,
}: {
  productId: string;
  categoryId: string | null;
  symbol: string;
}) {
  const rows = await loadRelatedProducts({ id: productId, categoryId });
  if (!rows.length) return null;
  return (
    <FichaRelated
      items={rows.map((item) => {
        const price = pesosFromDb(item.pricePesos);
        const compare = pesosFromDb(item.comparePesos);
        const availabilityLabel = item.availability === "available" ? "" : fichaAvailabilityLabel(item.availability);
        return {
          id: item.id,
          name: item.name,
          slug: item.slug,
          priceLabel: fichaPriceLabel({ priceMode: item.priceMode, unit: price, symbol }),
          compareLabel: item.priceMode === "ask" ? "" : fichaCompareLabel({ comparePesos: compare, unit: price, symbol }),
          discountLabel: discountPercentLabel({ priceMode: item.priceMode, comparePesos: compare, unit: price }),
          availabilityLabel,
          price: item.priceMode === "ask" ? null : price,
          photoUrl: item.photo?.url ?? "",
          photoAlt: item.photo?.alt || item.name,
        };
      })}
    />
  );
}
