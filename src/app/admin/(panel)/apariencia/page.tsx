import { AppearanceStudio } from "@/components/admin/apariencia-form";
import { requirePermission } from "@/lib/auth";
import { cloudinaryEnv } from "@/lib/env";
import { loadShell } from "@/lib/store";

export default async function BrandingPage() {
  await requirePermission("brand", "write");
  const shell = await loadShell();
  if (!shell) return <p>No hay base de datos.</p>;
  return (
    <main>
      <p>Marca</p>
      <h1>Apariencia</h1>
      <p className="lead">Elige el logo, los colores y la tipografía. Cada bloque agrupa un tema y la columna de la derecha muestra el catálogo antes de publicarlo.</p>
      <AppearanceStudio brand={shell.brand} businessName={shell.business.name} uploadsReady={Boolean(cloudinaryEnv())} />
    </main>
  );
}
