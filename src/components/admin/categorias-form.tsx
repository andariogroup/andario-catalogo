"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { saveCategoryAction } from "@/actions/catalog";
import type { CategoryDraft } from "@/lib/category-draft";
import { emptyForm, type FormState } from "@/lib/form";

export type { CategoryDraft };

type ParentOption = { id: string; name: string };

function Count({ value, max }: { value: string; max: number }) {
  return <small className={value.length > max * 0.9 ? "count warn" : "count"}>{value.length}/{max}</small>;
}

function noticeOf(state: FormState, pending: boolean, pendingText: string) {
  if (pending) return { kind: "pending" as const, text: pendingText };
  if (state.error) return { kind: "bad" as const, text: state.error };
  if (state.ok) return { kind: "ok" as const, text: state.ok };
  return null;
}

function CategoryImage({ current, saved, locked, onPreview }: { current: string; saved: boolean; locked: boolean; onPreview: (url: string) => void }) {
  const [local, setLocal] = useState("");
  const [removed, setRemoved] = useState(false);
  const [problem, setProblem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [acknowledged, setAcknowledged] = useState(false);
  if (saved && !acknowledged) {
    setAcknowledged(true);
    if (local) URL.revokeObjectURL(local);
    setLocal("");
  }
  if (!saved && acknowledged) setAcknowledged(false);
  const shown = local || (removed ? "" : current);

  function choose(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      input.value = "";
      setProblem("Usa png, jpg o webp.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      input.value = "";
      setProblem("La imagen pasa de 5 MB.");
      return;
    }
    if (local) URL.revokeObjectURL(local);
    setProblem("");
    setRemoved(false);
    const url = URL.createObjectURL(file);
    setLocal(url);
    onPreview(url);
  }

  function clearLocal() {
    if (local) URL.revokeObjectURL(local);
    setLocal("");
    setProblem("");
    if (fileRef.current) fileRef.current.value = "";
    onPreview(current);
  }

  function toggleDialog(next: boolean) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (next && !dialog.open) dialog.showModal();
    if (!next && dialog.open) dialog.close();
  }

  return (
    <div className="story-picker">
      <div className="story-visual">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" />
        ) : <p className="story-empty">La imagen de la categoría se verá aquí.</p>}
      </div>
      <div className="story-actions">
        {shown ? <button className="quiet" type="button" onClick={() => toggleDialog(true)}>Previsualizar</button> : null}
        {locked ? null : (
          <label className="btn">
            {shown ? "Cambiar imagen" : "Elegir imagen"}
            <input ref={fileRef} name={local ? "image" : undefined} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => choose(event.target.files?.[0], event.target)} />
          </label>
        )}
        {!locked && local && !saved ? <button className="quiet" type="button" onClick={clearLocal}>Cancelar cambio</button> : null}
        {!locked && current && !local ? (
          <button className="quiet danger" type="button" onClick={() => setRemoved((value) => { const next = !value; onPreview(next ? "" : current); return next; })}>{removed ? "Recuperar imagen" : "Quitar imagen"}</button>
        ) : null}
      </div>
      {removed && !local ? <input type="hidden" name="removeImage" value="1" /> : null}
      {problem ? <small className="note-bad">{problem}</small> : <small className="hint">{removed ? "La imagen se quita del catálogo al guardar." : "PNG, JPG o WebP. Máximo 5 MB."}</small>}
      <dialog ref={dialogRef} className="lightbox" aria-labelledby={titleId}>
        <p id={titleId}>Imagen de la categoría</p>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" />
        ) : null}
        <button className="quiet" type="button" onClick={() => toggleDialog(false)}>Cerrar</button>
      </dialog>
    </div>
  );
}

export function CategoryForm({ category, parents, uploadsReady, canWrite }: { category: CategoryDraft; parents: ParentOption[]; uploadsReady: boolean; canWrite: boolean }) {
  const [state, action, pending] = useActionState(saveCategoryAction, emptyForm);
  const [dismissed, setDismissed] = useState("");
  const [values, setValues] = useState({
    name: category.name,
    description: category.description,
    parentId: category.parentId,
    sortOrder: String(category.sortOrder),
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    active: category.active,
    showOnHome: category.showOnHome,
  });
  const [preview, setPreview] = useState(category.imageUrl);
  const nameProblem = values.name.trim().length > 0 && values.name.trim().length < 2 ? "Usa al menos 2 caracteres." : "";
  const notice = noticeOf(state, pending, "Guardando la categoría…");
  const signature = `${pending}|${state.ok}|${state.error}`;
  const visibleNotice = notice && signature !== dismissed ? notice : null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (values.name.trim().length >= 2) return;
    event.preventDefault();
    setDismissed("");
  }

  return (
    <form className="studio" action={canWrite ? action : undefined} onSubmit={canWrite ? submit : (event) => event.preventDefault()}>
      {category.id ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="stack wide">
        <fieldset className="panel section-card">
          <legend>Identidad</legend>
          <p className="hint">El nombre es el que ve la persona en el catálogo.</p>
          <label className="field">
            <span className="field-head"><span>Nombre</span><Count value={values.name} max={80} /></span>
            <input name="name" value={values.name} maxLength={80} required={canWrite} disabled={!canWrite} aria-invalid={nameProblem ? true : undefined} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
            {nameProblem ? <small className="note-bad">{nameProblem}</small> : null}
          </label>
          <label className="field">
            <span className="field-head"><span>Descripción</span><Count value={values.description} max={400} /></span>
            <textarea name="description" value={values.description} maxLength={400} rows={3} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
            <small className="hint">Una frase breve. Se puede dejar vacía.</small>
          </label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Organización</legend>
          <div className="pair">
            <label className="field">Padre
              <select name="parentId" value={values.parentId} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, parentId: event.target.value }))}>
                <option value="">Primer nivel</option>
                {parents.filter((parent) => parent.id !== category.id).map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
              </select>
              <small className="hint">Solo una categoría de primer nivel puede ser padre.</small>
            </label>
            <label className="field">Orden
              <input name="sortOrder" type="number" min={0} max={999} inputMode="numeric" value={values.sortOrder} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, sortOrder: event.target.value }))} />
              <small className="hint">Un número menor aparece primero.</small>
            </label>
          </div>
          <label className="field check"><input name="active" type="checkbox" checked={values.active} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} />Activa</label>
          <label className="field check"><input name="showOnHome" type="checkbox" checked={values.showOnHome} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, showOnHome: event.target.checked }))} />Mostrar en inicio</label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Imagen</legend>
          {!uploadsReady ? <p className="note-bad">Puedes ver la imagen aquí. Para guardarla falta configurar Cloudinary.</p> : null}
          <CategoryImage current={category.imageUrl} saved={Boolean(state.ok) && !pending} locked={!canWrite} onPreview={setPreview} />
        </fieldset>

        <fieldset className="panel section-card">
          <legend>SEO</legend>
          <p className="hint">Opcional. Si lo dejas vacío, el catálogo usa el nombre y la descripción.</p>
          <label className="field">
            <span className="field-head"><span>Título SEO</span><Count value={values.seoTitle} max={70} /></span>
            <input name="seoTitle" value={values.seoTitle} maxLength={70} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, seoTitle: event.target.value }))} />
          </label>
          <label className="field">
            <span className="field-head"><span>Descripción SEO</span><Count value={values.seoDescription} max={180} /></span>
            <input name="seoDescription" value={values.seoDescription} maxLength={180} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, seoDescription: event.target.value }))} />
          </label>
        </fieldset>

        <div className="section-save">
          <p>{!canWrite ? "Puedes consultar esta categoría. Tu rol no la modifica." : pending ? "Guardando…" : nameProblem ? "Revisa el nombre." : "Al guardar vuelves a la lista."}</p>
          <div className="save-actions">
            <Link className="quiet" href="/admin/categorias">Volver a la lista</Link>
            {canWrite ? <button className="btn" disabled={pending}>{pending ? "Guardando" : category.id ? "Guardar categoría" : "Crear categoría"}</button> : null}
          </div>
        </div>
      </div>

      <aside className="studio-side">
        <p className="hint">Vista previa</p>
        <article className="story-card">
          <div className="story-visual">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" />
            ) : <p className="story-empty">Sin imagen</p>}
          </div>
          <h2>{values.name || "Categoría"}</h2>
          <p>{(values.description || "La descripción aparecerá aquí.").slice(0, 180)}</p>
          <p className="hint">{values.parentId ? parents.find((parent) => parent.id === values.parentId)?.name : "Primer nivel"} · Orden {values.sortOrder || "0"}</p>
          <p className="hint">{values.active ? "Activa" : "Inactiva"}{values.showOnHome ? " · En inicio" : ""}</p>
        </article>
        <p className="hint">La vista previa del texto cambia al momento. El catálogo público cambia al guardar.</p>
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

export function SavedNotice({ message }: { message: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("aviso")) return;
    url.searchParams.delete("aviso");
    const next = `${url.pathname}${url.search}`;
    window.history.replaceState(null, "", next);
  }, []);
  if (!open) return null;
  return (
    <div className="toast" role="status">
      <p>{message}</p>
      <button type="button" onClick={() => setOpen(false)}>Cerrar</button>
    </div>
  );
}
