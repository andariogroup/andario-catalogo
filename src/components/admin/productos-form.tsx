"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { deleteProductAction, duplicateProductAction, removeProductAttributeAction, saveProductAction, saveProductAttributeAction } from "@/actions/catalog";
import { VariantStudio, type VariantRow } from "@/components/admin/variantes-studio";
import { emptyForm, type FormState } from "@/lib/form";
import type { CategoryNode, Choice, ProductDraft } from "@/lib/product-draft";

const TAGS = ["nuevo", "oferta", "exclusivo", "destacado"] as const;

function Count({ value, max }: { value: string; max: number }) {
  return <small className={value.length > max * 0.9 ? "count warn" : "count"}>{value.length}/{max}</small>;
}

function noticeOf(state: FormState, pending: boolean, pendingText: string) {
  if (pending) return { kind: "pending" as const, text: pendingText };
  if (state.error) return { kind: "bad" as const, text: state.error };
  if (state.ok) return { kind: "ok" as const, text: state.ok };
  return null;
}

function priceLabel(mode: string, price: string) {
  if (mode === "ask") return "Precio a consultar";
  const digits = price.replace(/\D/g, "");
  if (!digits) return "Sin precio";
  const formatted = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(digits));
  return mode === "from" ? `Desde $${formatted}` : `$${formatted}`;
}

const PHOTO_LIMIT = 8;

function ProductPhotos({ photos, canWrite, onPreview }: { photos: { id: string; url: string; alt: string }[]; canWrite: boolean; onPreview: (url: string) => void }) {
  const [pending, setPending] = useState<{ url: string }[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [order, setOrder] = useState(() => photos.map((photo) => photo.id));
  const [problem, setProblem] = useState("");
  const [view, setView] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const savedIds = order.filter((id) => photos.some((photo) => photo.id === id) && !removed.includes(id));
  const saved = savedIds.flatMap((id) => {
    const photo = photos.find((item) => item.id === id);
    return photo ? [photo] : [];
  });

  function open(url: string) {
    setView(url);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }

  function close() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }

  function syncFiles(files: File[]) {
    const input = fileRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
  }

  function choose(list: FileList | null) {
    const picked = [...(list ?? [])];
    const room = PHOTO_LIMIT - saved.length - filesRef.current.length;
    const accepted: File[] = [];
    let note = "";
    for (const file of picked) {
      if (accepted.length >= room) {
        note = "Un producto admite hasta 8 fotos.";
        break;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        note = "Usa png, jpg o webp.";
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        note = "Cada imagen admite hasta 5 MB.";
        continue;
      }
      accepted.push(file);
    }
    filesRef.current = [...filesRef.current, ...accepted];
    syncFiles(filesRef.current);
    const added = accepted.map((file) => ({ url: URL.createObjectURL(file) }));
    setPending((items) => [...items, ...added]);
    setProblem(note);
    const next = added[0]?.url;
    if (next) onPreview(next);
  }

  function dropPending(index: number) {
    const files = filesRef.current.filter((_, item) => item !== index);
    filesRef.current = files;
    syncFiles(files);
    setPending((items) => {
      const copy = [...items];
      const gone = copy.splice(index, 1)[0];
      if (gone) URL.revokeObjectURL(gone.url);
      return copy;
    });
    setProblem("");
  }

  function dropSaved(id: string) {
    const next = saved.filter((photo) => photo.id !== id);
    setRemoved((items) => [...items, id]);
    setOrder((items) => items.filter((item) => item !== id));
    onPreview(next[0]?.url ?? pending[0]?.url ?? "");
  }

  function moveSaved(id: string, delta: -1 | 1) {
    setOrder((items) => {
      const visible = items.filter((item) => !removed.includes(item) && photos.some((photo) => photo.id === item));
      const index = visible.indexOf(id);
      const swap = index + delta;
      if (index < 0 || swap < 0 || swap >= visible.length) return items;
      const nextVisible = [...visible];
      [nextVisible[index], nextVisible[swap]] = [nextVisible[swap], nextVisible[index]];
      const hidden = items.filter((item) => !nextVisible.includes(item));
      return [...nextVisible, ...hidden];
    });
  }

  return (
    <div className="product-gallery">
      {removed.map((id) => <input key={id} type="hidden" name="removePhoto" value={id} />)}
      {saved.map((photo) => <input key={`order-${photo.id}`} type="hidden" name="photoOrder" value={photo.id} />)}
      {saved.length || pending.length ? (
        <div className="product-frames">
          {saved.map((photo, index) => (
            <figure key={photo.id}>
              <button className="product-shot" type="button" aria-label={`Ver foto ${index + 1}`} onClick={() => open(photo.url)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.alt} />
                {index === 0 ? <span>Portada</span> : null}
              </button>
              <div className="product-shot-actions">
                <button className="quiet" type="button" onClick={() => open(photo.url)}>Ver</button>
                {canWrite ? (
                  <>
                    <button className="quiet" type="button" disabled={index === 0} onClick={() => moveSaved(photo.id, -1)}>Subir</button>
                    <button className="quiet" type="button" disabled={index === saved.length - 1} onClick={() => moveSaved(photo.id, 1)}>Bajar</button>
                    <button className="quiet" type="button" onClick={() => dropSaved(photo.id)}>Quitar</button>
                  </>
                ) : null}
              </div>
            </figure>
          ))}
          {pending.map((photo, index) => (
            <figure key={photo.url}>
              <button className="product-shot" type="button" aria-label={`Ver foto nueva ${index + 1}`} onClick={() => open(photo.url)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" />
                <em>Nueva</em>
              </button>
              <div className="product-shot-actions">
                <button className="quiet" type="button" onClick={() => open(photo.url)}>Ver</button>
                <button className="quiet" type="button" onClick={() => dropPending(index)}>Quitar</button>
              </div>
            </figure>
          ))}
        </div>
      ) : <p className="hint">Todavía no hay fotos. La primera que guardes será la portada.</p>}
      {canWrite ? (
        <label className="btn product-add">
          Agregar fotos
          <input ref={fileRef} name="photo" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => choose(event.target.files)} />
        </label>
      ) : null}
      {problem ? <small className="note-bad">{problem}</small> : <small className="hint">PNG, JPG o WebP. Hasta 8 fotos, 5 MB cada una. Se ven completas, sin recorte.</small>}
      <dialog ref={dialogRef} className="lightbox" aria-labelledby={titleId} onClose={close}>
        <p id={titleId}>Foto del producto</p>
        {view ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={view} alt="" />
        ) : null}
        <button className="quiet" type="button" onClick={close}>Cerrar</button>
      </dialog>
    </div>
  );
}

function placedCategory(categoryId: string, categories: CategoryNode[]) {
  const current = categories.find((category) => category.id === categoryId);
  if (!current) return { categoryParent: "", categoryChild: "" };
  if (current.parentId) return { categoryParent: current.parentId, categoryChild: current.id };
  return { categoryParent: current.id, categoryChild: "" };
}

export function DeleteProduct({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteProductAction, emptyForm);
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={action}>
      <fieldset className="panel section-card">
        <legend>Eliminar</legend>
        <p className="hint">Se quita el producto, sus fotos, sus variantes y sus datos fijos. No se puede deshacer.</p>
        <input type="hidden" name="id" value={id} />
        {confirming ? (
          <span className="variant-confirm">
            <button className="quiet danger" type="submit" disabled={pending}>{pending ? "Eliminando" : "Eliminar producto"}</button>
            <button className="quiet" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </span>
        ) : <button className="quiet danger" type="button" onClick={() => setConfirming(true)}>Eliminar producto</button>}
        {state.error ? <p className="note-bad">{state.error}</p> : null}
      </fieldset>
    </form>
  );
}

export function ProductForm({ product, categories, canWrite }: { product: ProductDraft; categories: CategoryNode[]; canWrite: boolean }) {
  const [state, action, pending] = useActionState(saveProductAction, emptyForm);
  const [dismissed, setDismissed] = useState("");
  const [priceMissing, setPriceMissing] = useState(false);
  const [categoryMissing, setCategoryMissing] = useState(false);
  const placed = placedCategory(product.categoryId, categories);
  const [values, setValues] = useState({
    name: product.name,
    sku: product.sku,
    short: product.short,
    description: product.description,
    kind: product.kind,
    categoryParent: placed.categoryParent,
    categoryChild: placed.categoryChild,
    price: product.price,
    compare: product.compare,
    priceMode: product.priceMode,
    status: product.status,
    availability: product.availability,
    featured: product.featured,
    sortOrder: product.sortOrder,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    tags: product.tags,
  });
  const [preview, setPreview] = useState(product.photos[0]?.url ?? "");
  const nameProblem = values.name.trim().length > 0 && values.name.trim().length < 2 ? "Usa al menos 2 caracteres." : "";
  const notice = noticeOf(state, pending, "Guardando el producto…");
  const signature = `${pending}|${state.ok}|${state.error}`;
  const visibleNotice = notice && signature !== dismissed ? notice : null;
  const asking = values.priceMode === "ask";
  const parents = categories.filter((category) => !category.parentId).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const children = values.categoryParent
    ? categories.filter((category) => category.parentId === values.categoryParent).sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];
  const needsChild = children.length > 0;
  const categoryId = needsChild ? values.categoryChild : values.categoryParent;
  const parentName = parents.find((category) => category.id === values.categoryParent)?.name;
  const childName = children.find((category) => category.id === values.categoryChild)?.name;
  const categoryLabel = parentName && childName ? `${parentName} / ${childName}` : parentName || "Sin categoría";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const missingPrice = !asking && !values.price.trim();
    const missingCategory = !values.categoryParent || (needsChild && !values.categoryChild);
    if (values.name.trim().length < 2 || missingPrice || missingCategory) {
      event.preventDefault();
      setPriceMissing(missingPrice);
      setCategoryMissing(missingCategory);
      setDismissed("");
    }
  }

  function toggleTag(tag: string) {
    setValues((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  }

  return (
    <form className="studio" action={canWrite ? action : undefined} onSubmit={canWrite ? submit : (event) => event.preventDefault()}>
      {product.id ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="product-save">
        <p>{!canWrite ? "Puedes consultar este producto. Tu rol no lo modifica." : pending ? "Guardando…" : nameProblem || priceMissing || categoryMissing ? "Revisa el nombre, el precio y la categoría." : "Al guardar vuelves a la lista."}</p>
        <div className="save-actions">
          <Link className="quiet" href="/admin/productos">Volver a la lista</Link>
          {canWrite ? <button className="btn" disabled={pending}>{pending ? "Guardando" : product.id ? "Guardar producto" : "Crear producto"}</button> : null}
        </div>
      </div>
      <div className="stack wide">
        <fieldset className="panel section-card">
          <legend>Identidad</legend>
          <p className="hint">El nombre es el que ve la persona en el catálogo.</p>
          <label className="field">
            <span className="field-head"><span>Nombre</span><Count value={values.name} max={120} /></span>
            <input name="name" value={values.name} maxLength={120} required={canWrite} disabled={!canWrite} aria-invalid={nameProblem ? true : undefined} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
            {nameProblem ? <small className="note-bad">{nameProblem}</small> : null}
          </label>
          <label className="field">
            <span className="field-head"><span>SKU</span><Count value={values.sku} max={40} /></span>
            <input name="sku" value={values.sku} maxLength={40} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, sku: event.target.value }))} />
            <small className="hint">Opcional. Si lo escribes, no puede repetirse.</small>
          </label>
          <label className="field">
            <span className="field-head"><span>Descripción corta</span><Count value={values.short} max={180} /></span>
            <textarea name="short" value={values.short} maxLength={180} rows={3} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, short: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-head"><span>Descripción</span><Count value={values.description} max={4000} /></span>
            <textarea name="description" value={values.description} maxLength={4000} rows={6} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
          </label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Precio</legend>
          <label className="field">Modo
            <select name="priceMode" value={values.priceMode} disabled={!canWrite} onChange={(event) => { setPriceMissing(false); setValues((current) => ({ ...current, priceMode: event.target.value })); }}>
              <option value="fixed">Precio fijo</option>
              <option value="from">Desde</option>
              <option value="ask">Consultar</option>
            </select>
            <small className="hint">Consultar oculta el monto y deja el precio para WhatsApp.</small>
          </label>
          {asking ? null : (
            <div className="pair">
              <label className="field">Pesos
                <input name="price" inputMode="numeric" value={values.price} disabled={!canWrite} aria-invalid={priceMissing ? true : undefined} onChange={(event) => { setPriceMissing(false); setValues((current) => ({ ...current, price: event.target.value })); }} />
                {priceMissing ? <small className="note-bad">Escribe el precio en pesos enteros.</small> : <small className="hint">Sin centavos. Puedes usar 85000 o 85.000.</small>}
              </label>
              <label className="field">Precio anterior
                <input name="compare" inputMode="numeric" value={values.compare} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, compare: event.target.value }))} />
                <small className="hint">Opcional. Se muestra tachado junto al precio.</small>
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Organización</legend>
          <label className="field">Categoría
            <select value={values.categoryParent} disabled={!canWrite} aria-invalid={categoryMissing && !values.categoryParent ? true : undefined} onChange={(event) => { setCategoryMissing(false); setValues((current) => ({ ...current, categoryParent: event.target.value, categoryChild: "" })); }}>
              <option value="">Elige una categoría</option>
              {parents.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {categoryMissing && !values.categoryParent ? <small className="note-bad">Elige primero la categoría de primer nivel.</small> : <small className="hint">Elige primero la categoría de primer nivel.</small>}
          </label>
          {values.categoryParent && needsChild ? (
            <label className="field">Categoría hija
              <select value={values.categoryChild} disabled={!canWrite} required={canWrite} aria-invalid={categoryMissing && !values.categoryChild ? true : undefined} onChange={(event) => { setCategoryMissing(false); setValues((current) => ({ ...current, categoryChild: event.target.value })); }}>
                <option value="">Elige una categoría hija</option>
                {children.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {categoryMissing && !values.categoryChild ? <small className="note-bad">Elige una categoría hija de {parentName}.</small> : <small className="hint">Categorías dentro de {parentName}.</small>}
            </label>
          ) : null}
          {values.categoryParent && !needsChild ? <p className="hint">Esta categoría no tiene categorías hijas. El producto queda en {parentName}.</p> : null}
          <div className="pair">
            <label className="field">Tipo
              <select name="kind" value={values.kind} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, kind: event.target.value }))}>
                <option value="physical">Físico</option>
                <option value="digital">Digital</option>
                <option value="service">Servicio</option>
                <option value="intangible">Intangible</option>
              </select>
            </label>
            <label className="field">Estado
              <select name="status" value={values.status} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
              <small className="hint">Solo un producto activo aparece en el catálogo público.</small>
            </label>
            <label className="field">Disponibilidad
              <select name="availability" value={values.availability} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, availability: event.target.value }))}>
                <option value="available">Disponible</option>
                <option value="sold_out">Agotado</option>
                <option value="made_to_order">Bajo pedido</option>
              </select>
            </label>
          </div>
          <label className="field">Orden
            <input name="sortOrder" type="number" min={0} max={999} inputMode="numeric" value={values.sortOrder} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, sortOrder: event.target.value }))} />
            <small className="hint">Un número menor aparece primero en el catálogo.</small>
          </label>
          <label className="field check"><input name="featured" type="checkbox" checked={values.featured} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, featured: event.target.checked }))} />Destacado en la portada</label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Fotos</legend>
          <ProductPhotos photos={product.photos} canWrite={canWrite} onPreview={setPreview} />
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Etiquetas</legend>
          <p className="hint">Aparecen sobre la ficha del producto.</p>
          {TAGS.map((tag) => (
            <label className="field check" key={tag}>
              <input name={`tag-${tag}`} type="checkbox" checked={values.tags.includes(tag)} disabled={!canWrite} onChange={() => toggleTag(tag)} />
              {tag}
            </label>
          ))}
        </fieldset>

        <fieldset className="panel section-card">
          <legend>SEO</legend>
          <p className="hint">Opcional. Si lo dejas vacío, el catálogo usa el nombre y la descripción corta.</p>
          <label className="field">
            <span className="field-head"><span>Título SEO</span><Count value={values.seoTitle} max={70} /></span>
            <input name="seoTitle" value={values.seoTitle} maxLength={70} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, seoTitle: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-head"><span>Descripción SEO</span><Count value={values.seoDescription} max={180} /></span>
            <input name="seoDescription" value={values.seoDescription} maxLength={180} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, seoDescription: event.target.value }))} />
          </label>
        </fieldset>

      </div>

      <aside className="studio-side">
        <p className="hint">Vista previa</p>
        <article className="story-card">
          <div className="story-visual product-preview">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : <p className="story-empty">Sin foto</p>}
          </div>
          <h2>{values.name || "Producto"}</h2>
          <p>{priceLabel(values.priceMode, values.price)}</p>
          <p>{(values.short || "La descripción corta aparecerá aquí.").slice(0, 180)}</p>
          <p className="hint">{categoryLabel}</p>
        </article>
        <p className="hint">La vista previa cambia al momento. El catálogo público cambia al guardar.</p>
      </aside>

      {visibleNotice?.kind === "pending" ? <div className="toast" role="status">{visibleNotice.text}</div> : null}
      {visibleNotice && visibleNotice.kind !== "pending" ? (
        <div className={`toast${visibleNotice.kind === "bad" ? " bad" : ""}`} role={visibleNotice.kind === "bad" ? "alert" : "status"}>
          <p>{visibleNotice.text}</p>
          <button type="button" onClick={() => setDismissed(signature)}>Cerrar</button>
        </div>
      ) : null}
    </form>
  );
}

function ExtraForm({ action, title, hint, label, children }: { action: (state: FormState, data: FormData) => Promise<FormState>; title: string; hint: string; label: string; children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(action, emptyForm);
  const [dismissed, setDismissed] = useState("");
  const notice = noticeOf(state, pending, "Guardando…");
  const signature = `${pending}|${state.ok}|${state.error}`;
  const visibleNotice = notice && signature !== dismissed ? notice : null;
  return (
    <form action={formAction}>
      <fieldset className="panel section-card">
        <legend>{title}</legend>
        <p className="hint">{hint}</p>
        {children}
        <div className="section-save">
          <p>{pending ? "Guardando…" : "Este cambio se guarda aparte de la ficha."}</p>
          <button className="btn" disabled={pending}>{pending ? "Guardando" : label}</button>
        </div>
      </fieldset>
      {visibleNotice?.kind === "pending" ? <div className="toast" role="status">{visibleNotice.text}</div> : null}
      {visibleNotice && visibleNotice.kind !== "pending" ? (
        <div className={`toast${visibleNotice.kind === "bad" ? " bad" : ""}`} role={visibleNotice.kind === "bad" ? "alert" : "status"}>
          <p>{visibleNotice.text}</p>
          <button type="button" onClick={() => setDismissed(signature)}>Cerrar</button>
        </div>
      ) : null}
    </form>
  );
}

function FixedRemove({ productId, attributeId }: { productId: string; attributeId: string }) {
  const [state, action, pending] = useActionState(removeProductAttributeAction, emptyForm);
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState("");
  const notice = noticeOf(state, pending, "Quitando…");
  const signature = `${pending}|${state.ok}|${state.error}`;
  const visibleNotice = notice && signature !== dismissed ? notice : null;
  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="attributeId" value={attributeId} />
      {confirming ? (
        <span className="variant-confirm">
          <button className="quiet" type="submit" disabled={pending}>{pending ? "Quitando" : "Quitar"}</button>
          <button className="quiet" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
        </span>
      ) : <button className="quiet" type="button" onClick={() => setConfirming(true)}>Quitar</button>}
      {visibleNotice && visibleNotice.kind !== "pending" ? <span className={visibleNotice.kind === "bad" ? "note-bad" : "hint"}>{visibleNotice.text}</span> : null}
    </form>
  );
}

function FixedFields({ attributes }: { attributes: { id: string; name: string; kind: string }[] }) {
  const [attributeId, setAttributeId] = useState(attributes[0]?.id ?? "");
  const kind = attributes.find((item) => item.id === attributeId)?.kind ?? "text";
  const hint = kind === "number" ? "Un número entero." : kind === "decimal" ? "Puedes usar coma o punto." : kind === "boolean" ? "Sí o no." : kind === "date" ? "Elige el día." : "Hasta 120 caracteres.";
  return (
    <>
      <label className="field">Atributo
        <select name="attributeId" value={attributeId} onChange={(event) => setAttributeId(event.target.value)}>
          {attributes.map((attribute) => <option key={attribute.id} value={attribute.id}>{attribute.name}</option>)}
        </select>
      </label>
      <label className="field" key={attributeId}>Valor
        {kind === "boolean" ? (
          <select name="value" defaultValue="Sí">
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        ) : kind === "date" ? <input name="value" type="date" required /> : (
          <input name="value" maxLength={120} required inputMode={kind === "number" ? "numeric" : kind === "decimal" ? "decimal" : "text"} />
        )}
        <small className="hint">{hint}</small>
      </label>
    </>
  );
}

export function ProductExtras({ productId, attributes, groups, savedAttributes, savedVariants }: {
  productId: string;
  attributes: { id: string; name: string; kind: string }[];
  groups: { id: string; name: string; kind: string; options: Choice[] }[];
  savedAttributes: { id: string; name: string; value: string }[];
  savedVariants: VariantRow[];
}) {
  return (
    <div className="stack wide">
      <VariantStudio productId={productId} groups={groups} saved={savedVariants} />
      <fieldset className="panel section-card">
        <legend>Datos fijos</legend>
        <p className="hint">Un dato que no cambia en este producto, como el material. Si el atributo está visible, aparece en la ficha.</p>
        {savedAttributes.length ? (
          <ul className="variant-saved">
            {savedAttributes.map((item) => (
              <li className="variant-row" key={item.id}>
                <div><strong>{item.name}</strong><span>{item.value}</span></div>
                <FixedRemove productId={productId} attributeId={item.id} />
              </li>
            ))}
          </ul>
        ) : <p className="hint">Todavía no hay datos fijos.</p>}
      </fieldset>
      {attributes.length ? (
        <ExtraForm action={saveProductAttributeAction} title="Agregar dato fijo" hint="Los colores y las tallas van en Variantes." label="Guardar dato">
          <input type="hidden" name="productId" value={productId} />
          <FixedFields attributes={attributes} />
        </ExtraForm>
      ) : <p className="hint">Los colores y las tallas van en Variantes. Para un dato fijo, crea un atributo de texto, como Material.</p>}
      <ExtraForm action={duplicateProductAction} title="Copia" hint="Crea un borrador con las fotos, las variantes y los datos fijos. El SKU lleva el sufijo copia." label="Duplicar como borrador">
        <input type="hidden" name="id" value={productId} />
      </ExtraForm>
    </div>
  );
}
