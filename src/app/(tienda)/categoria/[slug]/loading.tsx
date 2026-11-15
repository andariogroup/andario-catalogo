import { CatalogPageSkeleton } from "@/components/catalog/skeletons";

export default function CategoriaLoading() {
  return <CatalogPageSkeleton label="Cargando categoría…" count={8} />;
}
