import { SeoStudio, type PolicyDraft } from "@/components/admin/seo-form";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugRedirects } from "@/lib/db/schema";
import { allows } from "@/lib/permissions";
import { siteUrl } from "@/lib/seo";
import { adminLists, loadShell } from "@/lib/store";

export default async function SeoPage() {
  const user = await requirePermission("seo", "read");
  const shell = await loadShell();
  const lists = await adminLists();
  if (!shell || !lists) return <p>No hay base de datos.</p>;
  const db = getDb();
  const redirects = db ? await db.select({ fromPath: slugRedirects.fromPath, toPath: slugRedirects.toPath }).from(slugRedirects) : [];
  const canEdit = allows(user.role, "seo", "write");
  const pages: PolicyDraft[] = lists.pages.map((page) => ({ slug: page.slug, title: page.title, body: page.body, published: page.published }));
  return (
    <main className="seo-page">
      <header className="seo-head">
        <p>Gestión</p>
        <h1>SEO y configuración</h1>
        <p className="lead">Decide cómo aparece la portada en buscadores, qué dice el WhatsApp y qué políticas ve el visitante.</p>
      </header>
      <SeoStudio
        initial={{
          metaTitle: shell.settings.metaTitle,
          metaDescription: shell.settings.metaDescription,
          publicUrl: shell.settings.publicUrl,
          indexable: shell.settings.indexable,
          whatsappGeneral: shell.settings.whatsappGeneral,
          whatsappProduct: shell.settings.whatsappProduct,
        }}
        pages={pages}
        redirects={redirects}
        storeName={shell.business.name || "el catálogo"}
        fallbackUrl={siteUrl()}
        fallbackDescription={shell.business.shortDescription || shell.business.slogan}
        canEdit={canEdit}
      />
    </main>
  );
}
