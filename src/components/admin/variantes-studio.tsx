"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { removeVariantAction, saveVariantAction, updateVariantAction } from "@/actions/catalog";
import { emptyForm, type FormState } from "@/lib/form";
import type { Choice } from "@/lib/product-draft";

const PAGE = 8;
const PHOTO_CAP = 4;

export type VariantRow = {
  id: string;
  label: string;
  sku: string;
  price: string;
  priceLabel: string;
  availability: string;
  availabilityLabel: string;
  photos: { id: string; url: string }[];
};

function noticeOf(state: FormState, pending: boolean, pendingText: string) {
  if (pending) return { kind: "pending" as const, text: pendingText };
  if (state.error) return { kind: "bad" as const, text: state.error };
  if (state.ok) return { kind: "ok" as const, text: state.ok };
  return null;
}

function photoCount(count: number) {
  if (count === 0) return "Sin fotos";
  return count === 1 ? "1 foto" : `${count} fotos`;
}

function keepOne(event: ChangeEvent<HTMLInputElement>) {
  const form = event.currentTarget.form;
  const group = event.currentTarget.dataset.group;
  if (!form || !group || !event.currentTarget.checked) return;
  form.querySelectorAll<HTMLInputElement>(`input[data-group="${CSS.escape(group)}"]`).forEach((box) => {
    if (box !== event.currentTarget) box.checked = false;
  });
}

function Toast({ state, pending, pendingText }: { state: FormState; pending: boolean; pendingText: string }) {
  const [dismissed, setDismissed] = useState("");
  const notice = noticeOf(state, pending, pendingText);
  const signature = `${pending}|${state.ok}|${state.error}`;
  const visible = notice && signature !== dismissed ? notice : null;
  if (!visible) return null;
  if (visible.kind === "pending") return <div className="toast" role="status">{visible.text}</div>;
  return (
    <div className={`toast${visible.kind === "bad" ? " bad" : ""}`} role={visible.kind === "bad" ? "alert" : "status"}>
      <p>{visible.text}</p>
      <button type="button" onClick={() => setDismissed(signature)}>Cerrar</button>
    </div>
  );
}

function VariantPhotos({ saved }: { saved: { id: string; url: string }[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);
  const [pending, setPending] = useState<{ url: string }[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [order, setOrder] = useState(saved.map((photo) => photo.id));
  const [problem, setProblem] = useState("");
  const keptIds = order.filter((id) => saved.some((photo) => photo.id === id) && !removed.includes(id));
  const kept = keptIds.flatMap((id) => {
    const photo = saved.find((item) => item.id === id);
    return photo ? [photo] : [];
  });

  function syncFiles(files: File[]) {
    const input = fileRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
  }

  function choose(list: FileList | null) {
    const room = PHOTO_CAP - kept.length - filesRef.current.length;
    const accepted: File[] = [];
    let note = "";
    for (const file of [...(list ?? [])]) {
      if (accepted.length >= room) {
        note = "Una variante admite hasta 4 fotos.";
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
    setPending((items) => [...items, ...accepted.map((file) => ({ url: URL.createObjectURL(file) }))]);
    setProblem(note);
  }

  function dropPending(index: number) {
    const files = filesRef.current.filter((_, item) => item !== index);
    filesRef.current = files;
    syncFiles(files);
    setPending((items) => items.filter((_, item) => item !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setOrder((current) => {
      const visible = current.filter((id) => saved.some((photo) => photo.id === id) && !removed.includes(id));
      const next = index + direction;
      if (next < 0 || next >= visible.length) return current;
      const copy = [...visible];
      const [item] = copy.splice(index, 1);
      if (!item) return current;
      copy.splice(next, 0, item);
      return copy;
    });
  }

  const total = kept.length + pending.length;
  return (
    <div className="variant-photos">
      {removed.map((id) => <input key={id} type="hidden" name="removePhoto" value={id} />)}
      {kept.map((photo) => <input key={`order-${photo.id}`} type="hidden" name="photoOrder" value={photo.id} />)}
      <div className="variant-photo-head">
        <strong>Fotos</strong>
        <span>{total} de {PHOTO_CAP}</span>
      </div>
      <div className="variant-photo-stage">
        {total === 0 ? <span className="variant-photo-empty">Sin foto</span> : null}
        {kept.map((photo, index) => (
          <figure key={photo.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" />
            {index === 0 ? <span>Portada</span> : null}
            {kept.length > 1 ? (
              <div className="variant-photo-move">
                <button className="quiet" type="button" disabled={index === 0} onClick={() => move(index, -1)}>Antes</button>
                <button className="quiet" type="button" disabled={index === kept.length - 1} onClick={() => move(index, 1)}>Después</button>
              </div>
            ) : null}
            <button className="quiet" type="button" onClick={() => setRemoved((items) => [...items, photo.id])}>Quitar</button>
          </figure>
        ))}
        {pending.map((photo, index) => (
          <figure key={photo.url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" />
            <span>{kept.length === 0 && index === 0 ? "Portada" : "Nueva"}</span>
            <button className="quiet" type="button" onClick={() => dropPending(index)}>Quitar</button>
          </figure>
        ))}
      </div>
      {total < PHOTO_CAP ? (
        <label className="btn product-add">
          Agregar fotos
          <input ref={fileRef} name="photo" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => choose(event.target.files)} />
        </label>
      ) : null}
      {problem ? <small className="note-bad">{problem}</small> : <small className="hint">Si no agregas fotos, la ficha muestra las del producto. PNG, JPG o WebP, hasta 5 MB. La primera es la portada. Antes y Después cambian el orden al guardar.</small>}
    </div>
  );
}

function CommercialFields({ sku, price, availability }: { sku: string; price: string; availability: string }) {
  return (
    <div className="variant-meta">
      <label className="field">SKU<input name="sku" maxLength={40} defaultValue={sku} /></label>
      <label className="field">Precio propio
        <input name="price" inputMode="numeric" defaultValue={price} />
        <small className="hint">Vacío: usa el precio del producto.</small>
      </label>
      <label className="field">Disponibilidad
        <select name="availability" defaultValue={availability}>
          <option value="available">Disponible</option>
          <option value="sold_out">Agotado</option>
          <option value="made_to_order">Bajo pedido</option>
        </select>
      </label>
    </div>
  );
}

function VariantRemove({ productId, id }: { productId: string; id: string }) {
  const [state, action, pending] = useActionState(removeVariantAction, emptyForm);
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="productId" value={productId} />
      {confirming ? (
        <span className="variant-confirm">
          <button className="quiet" type="submit" disabled={pending}>{pending ? "Quitando" : "Quitar"}</button>
          <button className="quiet" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
        </span>
      ) : <button className="quiet" type="button" onClick={() => setConfirming(true)}>Quitar</button>}
      <Toast state={state} pending={pending} pendingText="Quitando…" />
    </form>
  );
}

function VariantEditor({ productId, item }: { productId: string; item: VariantRow }) {
  const [state, action, pending] = useActionState(updateVariantAction, emptyForm);
  return (
    <form className="variant-editor" action={action} key={`${item.id}-${item.photos.map((photo) => photo.id).join(".")}-${state.ok}`}>
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="productId" value={productId} />
      <VariantPhotos saved={item.photos} />
      <CommercialFields sku={item.sku} price={item.price} availability={item.availability} />
      <div className="section-save">
        <p>La combinación se queda igual. Aquí cambias fotos, precio, SKU y disponibilidad.</p>
        <button className="btn" disabled={pending}>{pending ? "Guardando" : "Guardar variante"}</button>
      </div>
      <Toast state={state} pending={pending} pendingText="Guardando la variante…" />
    </form>
  );
}

function VariantComposer({ productId, groups }: { productId: string; groups: { id: string; name: string; kind: string; options: Choice[] }[] }) {
  const [state, action, pending] = useActionState(saveVariantAction, emptyForm);
  return (
    <form className="variant-composer" key={state.ok || "nueva"} action={action}>
      <h3>Nueva variante</h3>
      <p className="hint">Elige un valor en cada grupo que corresponda. Las fotos son opcionales: esta variante puede ir sin ellas.</p>
      <input type="hidden" name="productId" value={productId} />
      <div className="variant-groups">
        {groups.map((group) => (
          <div className="variant-group" key={group.id}>
            <h3>{group.name}</h3>
            <div className="variant-picks" role="group" aria-label={group.name}>
              {group.options.map((option) => (
                <label className="variant-pick" key={option.id}>
                  <input type="checkbox" name="option" value={option.id} data-group={group.id} onChange={keepOne} />
                  <span>{option.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <VariantPhotos saved={[]} />
      <CommercialFields sku="" price="" availability="available" />
      <div className="section-save">
        <p>{pending ? "Guardando…" : "Se agrega a la lista. No se crean el resto de combinaciones."}</p>
        <button className="btn" disabled={pending}>{pending ? "Guardando" : "Agregar variante"}</button>
      </div>
      <Toast state={state} pending={pending} pendingText="Guardando la variante…" />
    </form>
  );
}

export function VariantStudio({ productId, groups, saved }: {
  productId: string;
  groups: { id: string; name: string; kind: string; options: Choice[] }[];
  saved: VariantRow[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? saved.filter((item) => `${item.label} ${item.sku} ${item.priceLabel} ${item.availabilityLabel}`.toLowerCase().includes(needle))
    : saved;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);
  return (
    <section className="variant-studio">
      <fieldset className="panel section-card">
        <legend>Variantes</legend>
        <p className="hint">Cada fila es una combinación. Ábrela para cambiar precio, SKU, disponibilidad o fotos. Una variante puede tener fotos o ninguna.</p>
        <div className="variant-toolbar">
          <p>{saved.length === 1 ? "1 variante" : `${saved.length} variantes`}</p>
          {saved.length > 4 ? (
            <label className="field variant-find">
              Buscar
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Color, talla, SKU" />
            </label>
          ) : null}
          {groups.length ? (
            <button className="btn" type="button" aria-expanded={adding} onClick={() => { setAdding((open) => !open); setOpenId(null); }}>
              {adding ? "Cerrar" : "Agregar variante"}
            </button>
          ) : null}
        </div>
        {saved.length === 0 ? <p className="hint">Todavía no hay variantes.</p> : null}
        {saved.length > 0 && filtered.length === 0 ? <p className="hint">Ninguna variante coincide con la búsqueda.</p> : null}
        {slice.length ? (
          <ul className="variant-board">
            {slice.map((item) => (
              <li className="variant-card" key={item.id}>
                <div className="variant-line">
                  {item.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="variant-thumb" src={item.photos[0].url} alt="" />
                  ) : <span className="variant-thumb empty">Sin foto</span>}
                  <div>
                    <span className="attribute-chips">
                      {(item.label || "Sin valores").split(" · ").map((part, index) => <span className="category-tag" key={`${part}-${index}`}>{part}</span>)}
                    </span>
                    <span>{item.sku || "Sin SKU"} · {item.priceLabel} · {item.availabilityLabel} · {photoCount(item.photos.length)}</span>
                  </div>
                  <div className="variant-line-actions">
                    <button className="quiet" type="button" aria-expanded={openId === item.id} onClick={() => { setOpenId((current) => current === item.id ? null : item.id); setAdding(false); }}>
                      {openId === item.id ? "Cerrar" : "Editar"}
                    </button>
                    <VariantRemove productId={productId} id={item.id} />
                  </div>
                </div>
                {openId === item.id ? <VariantEditor productId={productId} item={item} /> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {pages > 1 ? (
          <div className="variant-pager">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button>
            <span>{safePage * PAGE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE)} de {filtered.length}</span>
            <button type="button" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Siguiente</button>
          </div>
        ) : null}
        {groups.length ? null : <p className="hint">Crea un atributo de una opción, como Color, y agrega sus valores. Después vuelves a este producto para guardar cada variante.</p>}
        {adding && groups.length ? <VariantComposer productId={productId} groups={groups} /> : null}
      </fieldset>
    </section>
  );
}
