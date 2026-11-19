import { JsonLd } from "@/components/shared/json-ld";
import { ShopFrame, EmptyCatalog } from "@/components/catalog/tienda";
import { readSession } from "@/lib/auth";
import { publicMeasurementContext } from "@/lib/google-settings";
import { catalogOrigin, organizationJsonLd } from "@/lib/seo";
import { loadShell, publishedPolicySlugs } from "@/lib/store";

// Open Graph (imagen, type, locale, siteName) vive en src/app/layout.tsx.
// Un openGraph parcial aquí reemplazaba el del layout raíz en Next.js.

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let shell = null;
  try {
    shell = await loadShell();
  } catch {
    shell = null;
  }
  if (!shell) return <EmptyCatalog title="Andario Catálogo" body="Falta la base de desarrollo. Define DATABASE_URL y ejecuta npm run db:setup. No uses la base de producción." />;
  const [policies, session, measurement] = await Promise.all([publishedPolicySlugs(), readSession(), publicMeasurementContext()]);
  const origin = catalogOrigin(shell.settings.publicUrl);
  return (
    <ShopFrame
      shell={shell}
      policies={policies}
      showAdminLink={Boolean(session)}
      measurement={{
        gtmContainerId: measurement.google.gtmContainerId,
        measurementConfigured: measurement.measurementAllowed,
        commerceEventsEnabled: measurement.google.commerceEventsEnabled,
        noticeEnabled: measurement.privacy.noticeEnabled,
        policyVersion: measurement.privacy.policyVersion,
        expirationDays: measurement.privacy.consentExpirationDays,
        noticeTitle: measurement.privacy.noticeTitle,
        noticeDescription: measurement.privacy.noticeDescription,
        policyPath: measurement.privacy.policyPath,
      }}
    >
      <JsonLd data={organizationJsonLd({
        name: shell.business.name,
        url: origin,
        city: shell.business.city,
        region: shell.business.region,
        country: shell.business.country,
        phone: shell.business.phone,
        image: shell.brand.socialImageUrl || shell.brand.logoUrl,
        address: shell.business.address,
        hours: shell.business.hours,
      })} />
      {children}
    </ShopFrame>
  );
}
