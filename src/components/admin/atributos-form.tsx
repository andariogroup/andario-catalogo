"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent, type KeyboardEvent } from "react";
import { deleteAttributeAction, saveAttributeAction } from "@/actions/catalog";
import { ATTRIBUTE_KINDS, splitOptionLabels, type AttributeDraft, type CategoryOption } from "@/lib/attribute-draft";
import { emptyForm, type FormState } from "@/lib/form";

const KIND_HINT: Record<string, string> = {
  text: "Un texto libre en el producto.",
  number: "Un número entero.",
  decimal: "Un número con decimales.",
  boolean: "Sí o no.",
  date: "Una fecha.",
  single: "El cliente elige un valor, por ejemplo un color. Agrega cada valor abajo.",
  multi: "Cada variante lleva un solo valor. Sirve para agrupar varias posibilidades, como colores.",
};

function Count({ value, max }: { value: string; max: number }) {
  return <small className={value.length > max * 0.9 ? "count warn" : "count"}>{value.length}/{max}</small>;
}

function noticeOf(state: FormState, pending: boolean) {
  if (pending) return { kind: "pending" as const, text: "Guardando el atributo…" };
  if (state.error) return { kind: "bad" as const, text: state.error };
  if (state.ok) return { kind: "ok" as const, text: state.ok };
  return null;
}


export function DeleteAttribute({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteAttributeAction, emptyForm);
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={action}>
      <fieldset className="panel section-card">
        <legend>Eliminar</legend>
        <p className="hint">Se quita el atributo y las variantes que usaban sus valores. Si hay productos publicados que lo usan, primero despublícalos. No se puede deshacer.</p>
        <input type="hidden" name="id" value={id} />
        {confirming ? (
          <span className="variant-confirm">
            <button className="quiet danger" type="submit" disabled={pending}>{pending ? "Eliminando" : "Eliminar atributo"}</button>
            <button className="quiet" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
          </span>
        ) : <button className="quiet danger" type="button" onClick={() => setConfirming(true)}>Eliminar atributo</button>}
        {state.error ? <p className="note-bad">{state.error}</p> : null}
      </fieldset>
    </form>
  );
}

export function AttributeForm({ attribute, categories, canWrite }: { attribute: AttributeDraft; categories: CategoryOption[]; canWrite: boolean }) {
  const [state, action, pending] = useActionState(saveAttributeAction, emptyForm);
  const [dismissed, setDismissed] = useState("");
  const [draft, setDraft] = useState("");
  const [optionNote, setOptionNote] = useState("");
  const [values, setValues] = useState({
    name: attribute.name,
    code: attribute.code,
    kind: attribute.kind,
    unit: attribute.unit,
    required: attribute.required,
    visible: attribute.visible,
    filterable: attribute.filterable,
    sortOrder: attribute.sortOrder,
    options: splitOptionLabels(attribute.options),
    categoryIds: attribute.categoryIds,
  });
  const nameProblem = values.name.trim().length > 0 && values.name.trim().length < 2 ? "Usa al menos 2 caracteres." : "";
  const chooses = values.kind === "single" || values.kind === "multi";
  const optionsMissing = chooses && values.options.length === 0;
  const notice = noticeOf(state, pending);
  const signature = `${pending}|${state.ok}|${state.error}`;
  const visibleNotice = notice && signature !== dismissed ? notice : null;
  function addValues() {
    const incoming = splitOptionLabels(draft).map((item) => item.slice(0, 40));
    if (!incoming.length) {
      setOptionNote("Escribe un valor.");
      return;
    }
    if (values.options.length >= 24) {
      setOptionNote("Máximo 24 valores.");
      return;
    }
    const next = [...values.options];
    for (const label of incoming) {
      if (next.length >= 24) break;
      if (next.some((item) => item.toLocaleLowerCase("es") === label.toLocaleLowerCase("es"))) continue;
      next.push(label);
    }
    if (next.length === values.options.length) {
      setOptionNote("Ese valor ya está.");
      return;
    }
    setValues((current) => ({ ...current, options: next }));
    setDraft("");
    setOptionNote("");
  }

  function onDraftKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addValues();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (values.name.trim().length < 2 || optionsMissing) {
      event.preventDefault();
      setDismissed("");
    }
  }

  return (
    <form className="studio" action={canWrite ? action : undefined} onSubmit={canWrite ? submit : (event) => event.preventDefault()}>
      {attribute.id ? <input type="hidden" name="id" value={attribute.id} /> : null}
      <input type="hidden" name="code" value={values.code} />
      <input type="hidden" name="unit" value={values.unit} />
      <input type="hidden" name="sortOrder" value={values.sortOrder} />
      {chooses ? <input type="hidden" name="options" value={values.options.join(", ")} /> : null}
      <div className="stack wide">
        <fieldset className="panel section-card">
          <legend>Identidad</legend>
          <p className="hint">El nombre es el que se ve al armar el producto. Ejemplo: Color.</p>
          <label className="field">
            <span className="field-head"><span>Nombre</span><Count value={values.name} max={80} /></span>
            <input name="name" value={values.name} maxLength={80} required={canWrite} disabled={!canWrite} aria-invalid={nameProblem ? true : undefined} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
            {nameProblem ? <small className="note-bad">{nameProblem}</small> : null}
          </label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Tipo</legend>
          <label className="field">Tipo
            <select name="kind" value={values.kind} disabled={!canWrite} onChange={(event) => {
              const kind = event.target.value;
              setValues((current) => ({ ...current, kind, filterable: kind === "single" || kind === "multi" ? current.filterable : false }));
            }}>
              {Object.entries(ATTRIBUTE_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <small className="hint">{KIND_HINT[values.kind] ?? ""}</small>
          </label>
        </fieldset>

        {chooses ? (
          <fieldset className="panel section-card">
            <legend>Valores</legend>
            <p className="hint">Agrega uno por vez. Si pegas varios, sepáralos con coma. Máximo 24.</p>
            {canWrite ? (
              <div className="option-adder">
                <label className="field">Nuevo valor
                  <input value={draft} maxLength={40} disabled={pending} aria-invalid={optionsMissing ? true : undefined} onChange={(event) => setDraft(event.target.value)} onKeyDown={onDraftKey} />
                </label>
                <button className="quiet" type="button" disabled={pending || values.options.length >= 24} onClick={addValues}>Agregar</button>
              </div>
            ) : null}
            {optionNote ? <small className="note-bad">{optionNote}</small> : null}
            {optionsMissing ? <small className="note-bad">Agrega al menos un valor.</small> : null}
            {values.options.length ? (
              <ul className="option-list">
                {values.options.map((option, index) => (
                  <li key={`${option}-${index}`}>
                    <span>{option}</span>
                    {canWrite ? <button className="quiet" type="button" onClick={() => setValues((current) => ({ ...current, options: current.options.filter((_, item) => item !== index) }))}>Quitar</button> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="hint">Todavía no hay valores.</p>}
          </fieldset>
        ) : null}

        <fieldset className="panel section-card">
          <legend>Uso</legend>
          <label className="field check"><input name="visible" type="checkbox" checked={values.visible} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, visible: event.target.checked }))} />Se ve en el catálogo</label>
          {chooses ? <label className="field check"><input name="filterable" type="checkbox" checked={values.filterable} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, filterable: event.target.checked }))} />El catálogo puede filtrar por este atributo</label> : <p className="hint">El filtro del catálogo solo usa atributos con valores, como Color.</p>}
          <label className="field check"><input name="required" type="checkbox" checked={values.required} disabled={!canWrite} onChange={(event) => setValues((current) => ({ ...current, required: event.target.checked }))} />Hay que completarlo antes de publicar el producto</label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Categorías</legend>
          <p className="hint">Si no marcas ninguna, el atributo sirve en todo el catálogo. Si marcas, solo aparece en productos de esas categorías.</p>
          {categories.length ? (
            <ul className="option-list attribute-categories">
              {categories.map((category) => {
                const checked = values.categoryIds.includes(category.id);
                return (
                  <li key={category.id} style={{ paddingLeft: `${category.depth * 1.1}rem` }}>
                    <label className="field check">
                      <input
                        name="categoryId"
                        type="checkbox"
                        value={category.id}
                        checked={checked}
                        disabled={!canWrite}
                        onChange={(event) => {
                          const on = event.target.checked;
                          setValues((current) => ({
                            ...current,
                            categoryIds: on
                              ? [...current.categoryIds, category.id]
                              : current.categoryIds.filter((item) => item !== category.id),
                          }));
                        }}
                      />
                      {category.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : <p className="hint">Todavía no hay categorías. El atributo quedará global.</p>}
          <p className="hint">{values.categoryIds.length ? `Limitado a ${values.categoryIds.length} categoría${values.categoryIds.length === 1 ? "" : "s"}.` : "Global: todas las categorías."}</p>
        </fieldset>

        <div className="section-save">
          <p>{!canWrite ? "Puedes consultar este atributo. Tu rol no lo modifica." : pending ? "Guardando…" : nameProblem || optionsMissing ? "Revisa el nombre y los valores." : chooses ? "Al guardar vuelves a la lista. Luego, en el producto, crea una variante por valor." : "Al guardar vuelves a la lista."}</p>
          <div className="save-actions">
            <Link className="quiet" href="/admin/atributos">Volver a la lista</Link>
            {canWrite ? <button className="btn" disabled={pending}>{pending ? "Guardando" : attribute.id ? "Guardar atributo" : "Crear atributo"}</button> : null}
          </div>
        </div>
      </div>

      <aside className="studio-side">
        <p className="hint">Vista previa</p>
        <article className="story-card attribute-preview">
          <h2>{values.name || "Atributo"}</h2>
          <p>{ATTRIBUTE_KINDS[values.kind] ?? values.kind}</p>
          {chooses ? (
            values.options.length ? <ul>{values.options.map((option, index) => <li key={`${option}-${index}`}>{option}</li>)}</ul> : <p className="hint">Sin valores</p>
          ) : <p className="hint">Este tipo no usa valores.</p>}
          <p className="hint">{values.visible ? "Visible" : "Oculto"}{chooses && values.filterable ? " · Filtrable" : ""}{values.required ? " · Obligatorio" : ""}</p>
        </article>
        <p className="hint">La vista previa cambia al momento. El catálogo cambia al guardar.</p>
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
