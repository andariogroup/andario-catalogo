import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clip, pageOpenGraph, titled } from "@/lib/seo";
import { loadShell, publishedPage } from "@/lib/store";

const SLUGS = new Set(["privacidad", "terminos", "envios", "cambios"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = SLUGS.has(slug) ? await publishedPage(slug) : null;
  if (!page) return { title: "No está", robots: { index: false, follow: false } };
  const shell = await loadShell().catch(() => null);
  const description = clip(page.body.split(/\n{2,}/)[0] ?? "", 160);
  const brand = shell?.business.name?.trim() ?? "";
  const path = `/politicas/${slug}`;
  return {
    title: titled(page.title, brand),
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ title: brand ? `${page.title} · ${brand}` : page.title, description, path, brand, image: shell?.brand.socialImageUrl || shell?.brand.logoUrl }),
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUGS.has(slug)) notFound();
  const page = await publishedPage(slug);
  if (!page) notFound();
  return (
    <main className="wrap section">
      <h1>{page.title}</h1>
      <p>Actualizada el {page.updatedAt.toLocaleDateString("es-CO")}</p>
      {page.body.split(/\n{2,}/).map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
    </main>
  );
}
