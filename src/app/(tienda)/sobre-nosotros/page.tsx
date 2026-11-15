import type { Metadata } from "next";
import { AboutPageView } from "@/components/catalog/about-page";
import { aboutPageTitle, publicBusinessCopy } from "@/lib/about-page";
import { loadShell } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  const shell = await loadShell().catch(() => null);
  if (!shell) return { title: "El negocio", alternates: { canonical: "/sobre-nosotros" } };
  const title = aboutPageTitle(shell.business);
  const description =
    publicBusinessCopy(shell.business.shortDescription) ||
    publicBusinessCopy(shell.business.description) ||
    publicBusinessCopy(shell.business.slogan);
  return {
    title,
    description: description || undefined,
    alternates: { canonical: "/sobre-nosotros" },
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
