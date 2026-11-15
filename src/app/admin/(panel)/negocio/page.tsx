import { BusinessStudio, type BusinessDraft } from "@/components/admin/negocio-form";
import { requirePermission } from "@/lib/auth";
import { cloudinaryEnv } from "@/lib/env";
import { loadShell } from "@/lib/store";

export default async function BusinessPage() {
  await requirePermission("brand", "write");
  const shell = await loadShell();
  if (!shell) return <p>No hay base de datos.</p>;
  const { business, socials } = shell;
  const social = (network: string) => socials.find((item) => item.network === network)?.url ?? "";
  const initial: BusinessDraft = {
    name: business.name,
    slogan: business.slogan,
    short: business.shortDescription,
    description: business.description,
    city: business.city,
    region: business.region,
    country: business.country,
    address: business.address,
    mapsUrl: business.mapsUrl,
    phone: business.phone,
    email: business.email,
    whatsapp: business.whatsapp,
    hours: business.hours,
    yearStarted: business.yearStarted ? String(business.yearStarted) : "",
    attentionScope: business.attentionScope,
    deliveryText: business.deliveryText,
    commercialTerms: business.commercialTerms,
    storyTitle: business.storyTitle,
    story: business.story,
    commercialMessage: business.commercialMessage,
    storyImageUrl: business.storyImageUrl,
    instagram: social("instagram"),
    facebook: social("facebook"),
    tiktok: social("tiktok"),
    youtube: social("youtube"),
    website: social("website"),
  };
  return (
    <main>
      <p>Datos del catálogo</p>
      <h1>Mi negocio</h1>
      <p className="lead">Completa la ficha de {business.name}. Cada bloque agrupa un tema y la columna de la derecha muestra cómo se leerá la historia.</p>
      <BusinessStudio initial={initial} uploadsReady={Boolean(cloudinaryEnv())} />
    </main>
  );
}
