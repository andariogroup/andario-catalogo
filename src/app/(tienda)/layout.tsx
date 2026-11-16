import type { Metadata } from "next";
import { JsonLd } from "@/components/shared/json-ld";
import { ShopFrame, EmptyCatalog } from "@/components/catalog/tienda";
import { readSession } from "@/lib/auth";
import { catalogOrigin, organizationJsonLd } from "@/lib/seo";
import { loadShell, publishedPolicySlugs } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  const shell = await loadShell().catch(() => null);
  if (!shell) return {};
  const image = shell.brand.socialImageUrl || shell.brand.logoUrl;
  // El favicon vive en el layout raíz (src/app/layout.tsx) para no competir con favicon.ico estático.
  return {
    ...(image ? { openGraph: { images: [image] } } : {}),
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let shell = null;
  try {
    shell = await loadShell();
  } catch {
    shell = null;
  }
  if (!shell) return <EmptyCatalog title="Andario Catálogo" body="Falta la base de desarrollo. Define DATABASE_URL y ejecuta npm run db:setup. No uses la base de producción." />;
  const [policies, session] = await Promise.all([publishedPolicySlugs(), readSession()]);
  const origin = catalogOrigin(shell.settings.publicUrl);
  return (
    <ShopFrame shell={shell} policies={policies} showAdminLink={Boolean(session)}>
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
