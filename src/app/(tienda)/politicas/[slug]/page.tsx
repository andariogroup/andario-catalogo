import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clip, pageOpenGraph, titled } from "@/lib/seo";
import { policyDocument } from "@/lib/policy-prose";
import { policyReturnPath } from "@/lib/purchase-info";
import { loadShell, publishedPage } from "@/lib/store";

const SLUGS = new Set(["privacidad", "terminos", "envios", "cambios"]);

function asParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = SLUGS.has(slug) ? await publishedPage(slug) : null;
  if (!page) return { title: "No está", robots: { index: false, follow: false } };
  const shell = await loadShell().catch(() => null);
  const description = clip(page.body.replace(/\r\n/g, "\n").split(/\n{2,}/)[0]?.replace(/^#{1,3}\s+/, "") ?? "", 160);
  const brand = shell?.business.name?.trim() ?? "";
  const path = `/politicas/${slug}`;
  return {
    title: titled(page.title, brand),
    ...(description ? { description } : {}),
    alternates: { canonical: path },
    openGraph: pageOpenGraph({ title: brand ? `${page.title} · ${brand}` : page.title, description, path, brand, image: shell?.brand.socialImageUrl || shell?.brand.logoUrl }),
  };
}

export default async function PolicyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  if (!SLUGS.has(slug)) notFound();
  const page = await publishedPage(slug);
  if (!page) notFound();
  const back = policyReturnPath(asParam((await searchParams).desde));
  const document = policyDocument(page.body);
  const updated = page.updatedAt.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  return (
    <main className="wrap section policy-page">
      {back ? (
        <p className="policy-back">
          <Link href={back}>Volver al producto</Link>
        </p>
      ) : null}
      <header className="policy-head">
        <h1>{page.title}</h1>
        <p>Actualizada el {updated}</p>
      </header>
      {document.headings.length ? (
        <nav className="policy-index" aria-label="Secciones">
          <ol>
            {document.headings.map((heading) => (
              <li key={heading.id}>
                <a href={`#${heading.id}`}>{heading.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <article className="policy-doc">
        {document.blocks.map((block, index) => {
          if (block.type === "h2") return <h2 key={block.id} id={block.id}>{block.text}</h2>;
          if (block.type === "ul") {
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{item}</li>)}
              </ul>
            );
          }
          if (block.type === "ol") {
            return (
              <ol key={index}>
                {block.items.map((item, itemIndex) => <li key={`${index}-${itemIndex}`}>{item}</li>)}
              </ol>
            );
          }
          return <p key={index}>{block.text}</p>;
        })}
      </article>
    </main>
  );
}
