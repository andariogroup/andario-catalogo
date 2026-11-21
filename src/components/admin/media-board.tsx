"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteMediaAction, replaceMediaAction, updateMediaAltAction } from "@/actions/catalog";
import { emptyForm, type FormState } from "@/lib/form";
import type { LibraryItem } from "@/lib/library";

const PAGE_SIZES = [8, 16, 24] as const;

function sizeOf(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function noticeOf(state: FormState, pending: boolean) {
  if (pending) return null;
  if (state.error) return state.error;
  if (state.ok) return state.ok;
  return null;
}

export function MediaBoard({ items, canWrite }: { items: LibraryItem[]; canWrite: boolean }) {
  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState("all");
  const [kind, setKind] = useState("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(8);
  const [page, setPage] = useState(1);
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (usage === "used" && item.uses.length === 0) return false;
    if (usage === "free" && item.uses.length > 0) return false;
    if (!needle) return true;
    return item.alt.toLocaleLowerCase("es").includes(needle) || item.uses.some((use) => use.label.toLocaleLowerCase("es").includes(needle));
  });
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = visible.slice(start, start + pageSize);
  const from = visible.length ? start + 1 : 0;
  const to = start + slice.length;

  return (
    <div className="category-tools">
      <div className="category-filters attribute-filters">
        <label className="field">Buscar
          <input type="search" value={query} placeholder="Texto o lugar" onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <label className="field">Uso
          <select value={usage} onChange={(event) => { setUsage(event.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            <option value="used">En uso</option>
            <option value="free">Sin uso</option>
          </select>
        </label>
        <label className="field">Tipo
          <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}>
            <option value="all">Todos</option>
            <option value="image">Imágenes</option>
            <option value="video">Videos</option>
          </select>
        </label>
        <label className="field">Por página
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">{visible.length ? `${from}–${to} de ${visible.length}` : "Ningún archivo coincide."}</p>
      {slice.length ? (
        <ul className="media-board">
          {slice.map((item) => <MediaCard key={item.id} item={item} canWrite={canWrite} />)}
        </ul>
      ) : null}
      {pages > 1 ? (
        <nav className="category-pager" aria-label="Páginas de multimedia">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button>
          <span>Página {current} de {pages}</span>
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button>
        </nav>
      ) : null}
    </div>
  );
}

function MediaCard({ item, canWrite }: { item: LibraryItem; canWrite: boolean }) {
  const shown = item.uses.slice(0, 3);
  const extra = item.uses.length - shown.length;
  return (
    <li>
      <article className="media-card">
        <div className="media-frame">
          {item.kind === "video" ? (
            <video src={item.url} muted playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt} />
          )}
        </div>
        <div className="media-body">
          <span className="category-tags">
            <span className="category-tag">{item.kind === "video" ? "Video" : "Imagen"}</span>
            <span className={item.uses.length ? "category-tag" : "category-tag draft"}>{item.uses.length ? "En uso" : "Sin uso"}</span>
          </span>
          {canWrite ? <AltForm id={item.id} alt={item.alt} /> : <p>{item.alt || "Sin texto alterno"}</p>}
          <p className="hint">{sizeOf(item.bytes)}</p>
          {item.uses.length ? (
            <p className="media-uses">
              {shown.map((use) => <Link key={`${use.href}-${use.label}`} href={use.href}>{use.label}</Link>)}
              {extra > 0 ? <span>+{extra}</span> : null}
            </p>
          ) : <p className="hint">Nadie lo usa.</p>}
          {canWrite ? <ReplaceMedia id={item.id} kind={item.kind === "video" ? "video" : "image"} /> : null}
          {canWrite && item.uses.length === 0 ? <DeleteMedia id={item.id} /> : null}
        </div>
      </article>
    </li>
  );
}

function AltForm({ id, alt }: { id: string; alt: string }) {
  const [state, action, pending] = useActionState(updateMediaAltAction, emptyForm);
  const notice = noticeOf(state, pending);
  return (
    <form action={action} className="media-alt">
      <input type="hidden" name="id" value={id} />
      <label className="field">Texto alterno
        <input name="alt" defaultValue={alt} maxLength={180} />
      </label>
      <button className="quiet" type="submit" disabled={pending}>{pending ? "Guardando" : "Guardar texto"}</button>
      {notice ? <span className={state.error ? "note-bad" : "hint"}>{notice}</span> : null}
    </form>
  );
}

function ReplaceMedia({ id, kind }: { id: string; kind: "image" | "video" }) {
  const [state, action, pending] = useActionState(replaceMediaAction, emptyForm);
  const notice = noticeOf(state, pending);
  return (
    <form action={action} className="media-alt">
      <input type="hidden" name="id" value={id} />
      <label className="field">Reemplazar archivo
        <input name="file" type="file" accept={kind === "video" ? "video/mp4,video/webm" : "image/png,image/jpeg,image/webp"} required disabled={pending} />
      </label>
      <button className="quiet" type="submit" disabled={pending}>{pending ? "Subiendo" : "Reemplazar"}</button>
      {notice ? <span className={state.error ? "note-bad" : "hint"}>{notice}</span> : null}
      <p className="hint">Mantiene los usos. Solo cambia el archivo.</p>
    </form>
  );
}

function DeleteMedia({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteMediaAction, emptyForm);
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {confirming ? (
        <span className="variant-confirm">
          <button className="quiet danger" type="submit" disabled={pending}>{pending ? "Quitando" : "Quitar archivo"}</button>
          <button className="quiet" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
        </span>
      ) : <button className="quiet danger" type="button" onClick={() => setConfirming(true)}>Quitar</button>}
      {state.error ? <p className="note-bad">{state.error}</p> : null}
    </form>
  );
}
