import { CatalogPageSkeleton } from "@/components/catalog/skeletons";

export default function CatalogoLoading() {
  return <CatalogPageSkeleton label="Cargando catálogo…" count={8} />;
}
