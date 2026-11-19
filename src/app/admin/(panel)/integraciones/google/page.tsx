import { GoogleIntegrationsStudio } from "@/components/admin/google-form";
import { requirePermission } from "@/lib/auth";
import { apexHostFromOrigin, searchConsolePropertyFromOrigin } from "@/lib/google-ids";
import { loadGoogleSettings } from "@/lib/google-settings";
import { allows } from "@/lib/permissions";
import { catalogOrigin } from "@/lib/seo";
import { loadShell } from "@/lib/store";

export default async function GoogleIntegrationsPage() {
  const user = await requirePermission("integrations", "read");
  const [shell, google] = await Promise.all([loadShell(), loadGoogleSettings()]);
  if (!shell) return <p>No hay base de datos.</p>;
  const origin = catalogOrigin(shell.settings.publicUrl);
  const apexHost = apexHostFromOrigin(origin);
  const property = searchConsolePropertyFromOrigin(origin) || google.searchConsoleProperty;
  const canEdit = allows(user.role, "integrations", "write");
  return (
    <main className="seo-page">
      <header className="seo-head">
        <p>Integraciones</p>
        <h1>Integraciones de Google</h1>
        <p className="lead">
          Configura las herramientas de Google para conocer cómo encuentran tu tienda, analizar el comportamiento de los visitantes y
          medir las interacciones comerciales.
        </p>
        <p className="hint">Dominio configurado: {origin}</p>
      </header>
      <GoogleIntegrationsStudio
        initial={{
          searchConsoleProperty: property,
          ga4MeasurementId: google.ga4MeasurementId,
          ga4PropertyId: google.ga4PropertyId,
          gtmContainerId: google.gtmContainerId,
          trackingEnabled: google.trackingEnabled,
          commerceEventsEnabled: google.commerceEventsEnabled,
          lastSitemapCheckAt: google.lastSitemapCheckAt ? google.lastSitemapCheckAt.toISOString() : "",
          lastSitemapStatus: google.lastSitemapStatus,
          lastSitemapDetail: google.lastSitemapDetail,
          updatedAt: google.updatedAt && google.updatedAt.getTime() > 0 ? google.updatedAt.toISOString() : "",
          updatedBy: google.updatedBy,
        }}
        origin={origin}
        apexHost={apexHost}
        sitemapUrl={`${origin}/sitemap.xml`}
        envLabel={process.env.VERCEL_ENV || process.env.NODE_ENV || "development"}
        canEdit={canEdit}
      />
    </main>
  );
}
