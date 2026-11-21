import type { Metadata } from "next";
import { AboutPageView } from "@/components/catalog/about-page";
import { aboutPageTitle, publicBusinessCopy } from "@/lib/about-page";
import { clip, pageOpenGraph } from "@/lib/seo";
import { loadShell } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  const shell = await loadShell().catch(() => null);
  if (!shell) return { title: "El negocio", alternates: { canonical: "/sobre-nosotros" } };
  const title = aboutPageTitle(shell.business);
  // Prefiere el texto largo para no repetir la descripción corta que ya usa la portada.
  const description = clip(
    publicBusinessCopy(shell.business.description) ||
      publicBusinessCopy(shell.business.shortDescription) ||
      publicBusinessCopy(shell.business.slogan) ||
      "",
    160,
  );
  return {
    title,
    description: description || undefined,
    alternates: { canonical: "/sobre-nosotros" },
    openGraph: pageOpenGraph({
      title,
      description,
      path: "/sobre-nosotros",
      brand: shell.business.name.trim(),
      image: shell.brand.socialImageUrl || shell.brand.logoUrl,
    }),
  };
}

export default async function AboutPage() {
  const shell = await loadShell();
  if (!shell) return null;
  const { business, settings } = shell;
  return (
    <AboutPageView
      business={business}
      whatsappMessage={settings.whatsappGeneral || `Hola, vi ${business.name}.`}
    />
  );
}
