import { RequestPanelSkeleton } from "@/components/catalog/skeletons";

export default function ListaLoading() {
  return (
    <main className="wrap section">
      <RequestPanelSkeleton label="Cargando lista…" />
    </main>
  );
}