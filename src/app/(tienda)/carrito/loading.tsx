import { RequestPanelSkeleton } from "@/components/catalog/skeletons";

export default function CartLoading() {
  return (
    <main className="wrap section cart-page">
      <RequestPanelSkeleton label="Cargando carrito…" />
    </main>
  );
}
