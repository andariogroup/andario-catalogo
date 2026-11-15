import type { Metadata } from "next";
import { CarritoVista } from "@/components/catalog/carrito";
import { cartStoreId } from "@/lib/cart";
import { catalogOrigin } from "@/lib/seo";
import { loadShell, quoteGuards } from "@/lib/store";

export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const shell = await loadShell();
  if (!shell) return null;
  const storeId = cartStoreId(shell.business.id, shell.settings.publicUrl);
  return (
    <main className="wrap section cart-page">
      <CarritoVista
        store={shell.business.name}
        storeId={storeId}
        phone={shell.business.whatsapp}
        catalogUrl={catalogOrigin(shell.settings.publicUrl)}
        guards={await quoteGuards()}
      />
    </main>
  );
}
