"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRedirectAction, savePageAction, saveSeoAction } from "@/actions/content";
import { BoundForm } from "@/components/admin/form";
import { emptyForm } from "@/lib/form";
import { clip, publicUrlProblem } from "@/lib/seo";
import { productAsk } from "@/lib/whatsapp";

export type SeoDraft = {
  metaTitle: string;
  metaDescription: string;
  publicUrl: string;
  indexable: boolean;
  whatsappGeneral: string;
  whatsappProduct: string;
  floatWhatsapp: boolean;
  floatLabel: string;
  floatSide: string;
};

export type PolicyDraft = { slug: string; title: string; body: string; published: boolean };

const PAGES: { slug: string; name: string; hint: string }[] = [
  { slug: "privacidad", name: "Privacidad", hint: "Cómo se tratan los datos de quien escribe." },
  { slug: "terminos", name: "Términos", hint: "Condiciones de uso del catálogo." },
  { slug: "envios", name: "Envíos", hint: "Cómo salen los pedidos, si el negocio lo publica." },
  { slug: "cambios", name: "Cambios", hint: "Cambios y devoluciones, si el negocio lo publica." },
];

function Count({ value, max }: { value: string; max: number }) {
  return <small className={value.length > max * 0.9 ? "count warn" : "count"}>{value.length}/{max}</small>;
}

export function SeoStudio({
  initial,
  pages,
  redirects,
  storeName,
  fallbackUrl,
  fallbackDescription,
  canEdit,
}: {
  initial: SeoDraft;
  pages: PolicyDraft[];
  redirects: { fromPath: string; toPath: string }[];
  storeName: string;
  fallbackUrl: string;
  fallbackDescription: string;
  canEdit: boolean;
}) {
  const [seo, setSeo] = useState(initial);
  const origin = seo.publicUrl.trim().replace(/\/$/, "");
  const originProblem = publicUrlProblem(seo.publicUrl);
  const shownOrigin = !originProblem && origin ? origin : fallbackUrl;
  const title = seo.metaTitle.trim() || storeName;
  const description = clip(seo.metaDescription.trim() || fallbackDescription, 180);
  const general = seo.whatsappGeneral.trim() || `Hola, vi ${storeName}.`;
  const product = productAsk(storeName, { name: "Producto de ejemplo", sku: "SKU", price: "Precio publicado", url: `${shownOrigin}/producto/ejemplo` }, seo.whatsappProduct);
  const bySlug = new Map(pages.map((page) => [page.slug, page]));

  return (
    <div className="seo-layout">
      <div className="seo-main">
        <section className="seo-card">
          <header className="seo-card-head">
            <div>
              <h2>Cómo te encuentra Google</h2>
              <p>El título y la descripción salen en la portada, el sitemap y las tarjetas.</p>
            </div>
          </header>
          {canEdit ? (
            <BoundForm action={saveSeoAction} label="Guardar configuración">
              <label className="field">
                <span className="field-head"><span>Título de la portada</span><Count value={seo.metaTitle} max={70} /></span>
                <input name="metaTitle" value={seo.metaTitle} maxLength={70} onChange={(event) => setSeo((current) => ({ ...current, metaTitle: event.target.value }))} />
              </label>
              <label className="field">
                <span className="field-head"><span>Descripción</span><Count value={seo.metaDescription} max={180} /></span>
                <textarea name="metaDescription" value={seo.metaDescription} maxLength={180} rows={3} onChange={(event) => setSeo((current) => ({ ...current, metaDescription: event.target.value }))} />
              </label>
              {!seo.metaDescription.trim() && fallbackDescription ? <p className="hint">Si la dejas vacía, la portada usa: {clip(fallbackDescription, 180)}</p> : null}
              <label className="field">URL pública
                <input name="publicUrl" value={seo.publicUrl} placeholder="https://catalogo.ejemplo" onChange={(event) => setSeo((current) => ({ ...current, publicUrl: event.target.value }))} />
              </label>
              {originProblem ? <p className="note-bad">{originProblem}</p> : <p className="hint">{origin ? "Canónico, sitemap, robots y QR usan esta dirección." : `Si la dejas vacía, usan ${fallbackUrl}.`}</p>}
              <label className="field check"><input name="indexable" type="checkbox" checked={seo.indexable} onChange={(event) => setSeo((current) => ({ ...current, indexable: event.target.checked }))} />Permitir que los buscadores listen el catálogo</label>
              <p className="hint">{seo.indexable ? "Robots deja entrar a la tienda y niega administración, QR y lista de interés." : "Robots cierra todo el sitio y el sitemap queda vacío."}</p>
              <h3>WhatsApp</h3>
              <label className="field">
                <span className="field-head"><span>Mensaje general</span><Count value={seo.whatsappGeneral} max={300} /></span>
                <textarea name="whatsappGeneral" value={seo.whatsappGeneral} maxLength={300} rows={3} onChange={(event) => setSeo((current) => ({ ...current, whatsappGeneral: event.target.value }))} />
              </label>
              <p className="hint">Lo usan el botón del encabezado, el flotante y la portada.</p>
              <label className="field">
                <span className="field-head"><span>Mensaje de la ficha</span><Count value={seo.whatsappProduct} max={300} /></span>
                <textarea name="whatsappProduct" value={seo.whatsappProduct} maxLength={300} rows={3} onChange={(event) => setSeo((current) => ({ ...current, whatsappProduct: event.target.value }))} />
              </label>
              <p className="hint">Va al inicio del mensaje. El nombre, el SKU y el precio publicado se agregan solos.</p>
              <label className="field check"><input name="floatWhatsapp" type="checkbox" checked={seo.floatWhatsapp} onChange={(event) => setSeo((current) => ({ ...current, floatWhatsapp: event.target.checked }))} />Botón flotante</label>
              <p className="hint">En pantallas grandes se oculta cuando el encabezado ya muestra WhatsApp, para no tapar las fotos.</p>
              <div className="seo-pair">
                <label className="field">
                  <span className="field-head"><span>Texto del botón</span><Count value={seo.floatLabel} max={24} /></span>
                  <input name="floatLabel" value={seo.floatLabel} maxLength={24} onChange={(event) => setSeo((current) => ({ ...current, floatLabel: event.target.value }))} />
                </label>
                <label className="field">Lado
                  <select name="floatSide" value={seo.floatSide} onChange={(event) => setSeo((current) => ({ ...current, floatSide: event.target.value }))}>
                    <option value="right">Derecha</option>
                    <option value="left">Izquierda</option>
                  </select>
                </label>
              </div>
            </BoundForm>
          ) : (
            <div className="seo-read">
              <p><strong>{title}</strong></p>
              <p>{description || "Sin descripción."}</p>
              <p className="hint">{shownOrigin}</p>
              <p>{seo.indexable ? "Los buscadores pueden listar el catálogo." : "El catálogo no se indexa."}</p>
            </div>
          )}
        </section>
        <section className="seo-policies">
          <h2>Políticas</h2>
          <p className="hint">Solo las publicadas aparecen en el pie y en el sitemap. El texto que guardes es el que ve el visitante.</p>
          {PAGES.map((page) => {
            const saved = bySlug.get(page.slug);
            return <PolicyCard key={page.slug} meta={page} saved={saved} canEdit={canEdit} />;
          })}
        </section>
        <section className="seo-card">
          <h2>Rutas anteriores</h2>
          <p className="hint">Cuando cambia el enlace de un producto o una categoría, la ruta vieja sigue llevando a la nueva. Puedes quitar las de prueba.</p>
          {redirects.length ? (
            <ul className="seo-redirects">
              {redirects.map((item) => (
                <RedirectRow key={item.fromPath} fromPath={item.fromPath} toPath={item.toPath} canEdit={canEdit} />
              ))}
            </ul>
          ) : <p>Todavía no hay rutas anteriores.</p>}
        </section>
      </div>
      <aside className="seo-side">
        <section className="seo-card" aria-label="Vista previa de búsqueda">
          <h2>Así se ve la portada</h2>
          <div className="seo-snippet">
            <p>{shownOrigin}</p>
            <strong>{title}</strong>
            <span>{description || "Sin descripción."}</span>
          </div>
          <p className="hint">{seo.indexable ? "Indexable." : "No indexable."}</p>
        </section>
        <section className="seo-card">
          <h2>Así sale el WhatsApp</h2>
          <p className="seo-kicker">General</p>
          <p className="seo-bubble">{general}</p>
          <p className="seo-kicker">Ficha</p>
          <p className="seo-bubble">{product}</p>
          <p className="hint">{seo.floatWhatsapp ? `Flotante «${seo.floatLabel.trim() || "WhatsApp"}» a la ${seo.floatSide === "left" ? "izquierda" : "derecha"}.` : "El flotante está apagado."}</p>
        </section>
        <section className="seo-card">
          <h2>QR del catálogo</h2>
          <p className="hint">El código abre {shownOrigin}.</p>
          <a className="btn" href="/qr?path=/&format=png">Descargar QR</a>
        </section>
      </aside>
    </div>
  );
}

function RedirectRow({ fromPath, toPath, canEdit }: { fromPath: string; toPath: string; canEdit: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteRedirectAction, emptyForm);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  return (
    <li>
      <div className="seo-redirect-paths">
        <span>{fromPath}</span>
        <span>{toPath}</span>
      </div>
      {canEdit ? (
        <form action={formAction}>
          <input type="hidden" name="fromPath" value={fromPath} />
          {state.error ? <p className="note-bad">{state.error}</p> : null}
          {state.ok ? <p className="note-ok">{state.ok}</p> : null}
          <button className="btn" type="submit" disabled={pending}>{pending ? "Quitando" : "Quitar"}</button>
        </form>
      ) : null}
    </li>
  );
}

function PolicyCard({ meta, saved, canEdit }: { meta: { slug: string; name: string; hint: string }; saved: PolicyDraft | undefined; canEdit: boolean }) {
  const [draft, setDraft] = useState<PolicyDraft>(saved ?? { slug: meta.slug, title: meta.name, body: "", published: false });
  return (
    <article className="seo-card">
      <header className="seo-card-head">
        <div>
          <h3>{meta.name}</h3>
          <p>{meta.hint}</p>
        </div>
        <span className={draft.published ? "category-tag quote-state quote-state-en-gestion" : "category-tag quote-state quote-state-cerrada"}>{draft.published ? "Publicada" : "Borrador"}</span>
      </header>
      <p className="hint">/politicas/{meta.slug}</p>
      {canEdit ? (
        <BoundForm action={savePageAction} label={`Guardar ${meta.name.toLowerCase()}`}>
          <input type="hidden" name="slug" value={meta.slug} />
          <label className="field">
            <span className="field-head"><span>Título</span><Count value={draft.title} max={120} /></span>
            <input name="title" value={draft.title} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-head"><span>Contenido</span><Count value={draft.body} max={8000} /></span>
            <textarea name="body" rows={8} value={draft.body} maxLength={8000} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} />
          </label>
          <label className="field check"><input name="published" type="checkbox" checked={draft.published} onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))} />Publicada en el catálogo</label>
          {draft.published && draft.body.trim().length < 80 ? <p className="note-bad">El texto es corto para una política publicada. Google la listará igual.</p> : null}
          {draft.published ? <p><a href={`/politicas/${meta.slug}`}>Ver en el catálogo</a></p> : <p className="hint">Mientras sea borrador, el enlace público no existe.</p>}
        </BoundForm>
      ) : <p>{draft.body ? "Hay un texto guardado." : "Todavía no tiene texto."}</p>}
    </article>
  );
}
