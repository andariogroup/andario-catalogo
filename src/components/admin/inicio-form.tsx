"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState } from "react";
import { deleteBannerAction, deleteSlideAction, saveAnnouncementAction, saveBannerAction, saveHeroAction, saveSectionAction, saveSlideAction } from "@/actions/content";
import { contrastRatio } from "@/lib/contrast";
import { emptyForm, type FormState } from "@/lib/form";

type Toast = { kind: "ok" | "bad" | "pending"; text: string } | null;
const ToastContext = createContext<(toast: Toast) => void>(() => {});

export type HomeEditorData = {
  hero: {
    mode: string;
    desktopUrl: string;
    videoUrl: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    align: string;
    overlay: number;
    autoplay: boolean;
    loop: boolean;
    active: boolean;
  };
  slides: { id: string; desktopUrl: string; title: string; subtitle: string; sortOrder: number }[];
  bar: { active: boolean; text: string; href: string; background: string; color: string; dismissible: boolean; startsOn: string; endsOn: string };
  sections: { key: string; title: string; subtitle: string; enabled: boolean; sortOrder: number }[];
  banners: { id: string; title: string; subtitle: string; imageUrl: string; href: string; sortOrder: number }[];
};

const SECTION_HINT: Record<string, string> = {
  categories: "Lista de categorías en la portada.",
  featured: "Productos marcados como destacados.",
  news: "Los productos más recientes.",
  banner: "Los banners promocionales.",
  catalog: "Una muestra del catálogo.",
  about: "La historia del negocio.",
  trust: "El mensaje de confianza.",
  contact: "Dirección, horario y teléfono.",
};

const SECTION_NAME: Record<string, string> = {
  categories: "Categorías",
  featured: "Destacados",
  news: "Novedades",
  banner: "Banner",
  catalog: "Catálogo",
  about: "El negocio",
  trust: "Confianza",
  contact: "Contacto",
};

function linkProblem(value: string) {
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//")) return "";
  if (/^https:\/\//i.test(value)) return "";
  return "Usa una ruta del catálogo, como /catalogo, o un enlace https.";
}

function colorProblem(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? "" : "Usa un color como #1B4332.";
}

function hexOr(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#1B4332";
}

function Count({ value, max }: { value: string; max: number }) {
  return <small className={value.length > max * 0.9 ? "count warn" : "count"}>{value.length}/{max}</small>;
}

function usePublish(state: FormState, pending: boolean, pendingText: string) {
  const setToast = useContext(ToastContext);
  useEffect(() => {
    if (pending) {
      setToast({ kind: "pending", text: pendingText });
      return;
    }
    if (state.error) setToast({ kind: "bad", text: state.error });
    else if (state.ok) setToast({ kind: "ok", text: state.ok });
  }, [pending, pendingText, setToast, state]);
}

function Field({
  label, name, value, onChange, max, hint, problem, type = "text", placeholder, min, maxNumber,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  max?: number;
  hint?: string;
  problem?: string;
  type?: string;
  placeholder?: string;
  min?: number;
  maxNumber?: number;
}) {
  return (
    <label className="field">
      <span className="field-head"><span>{label}</span>{max ? <Count value={value} max={max} /> : null}</span>
      <input name={name} type={type} value={value} onChange={onChange} maxLength={max} placeholder={placeholder} min={min} max={maxNumber} aria-invalid={problem ? true : undefined} />
      {problem ? <small className="note-bad">{problem}</small> : hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

function MediaPicker({
  name, removeName, label, hint, current, accept, kind, saved, onPreview,
}: {
  name: string;
  removeName?: string;
  label: string;
  hint: string;
  current: string;
  accept: string;
  kind: "image" | "video";
  saved: boolean;
  onPreview?: (url: string) => void;
}) {
  const [local, setLocal] = useState("");
  const [removed, setRemoved] = useState(false);
  const [problem, setProblem] = useState("");
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const shown = local || (removed ? "" : current);
  const allowed = kind === "video" ? ["video/mp4", "video/webm"] : ["image/png", "image/jpeg", "image/webp"];
  const max = kind === "video" ? 8 * 1024 * 1024 : 5 * 1024 * 1024;

  useEffect(() => {
    if (saved && fileRef.current) fileRef.current.value = "";
  }, [saved]);

  useEffect(() => {
    if (!current) setRemoved(false);
  }, [current]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && shown && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, shown]);

  function choose(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    if (!allowed.includes(file.type)) {
      input.value = "";
      setProblem(kind === "video" ? "Usa mp4 o webm." : "Usa png, jpg o webp.");
      return;
    }
    if (file.size > max) {
      input.value = "";
      setProblem(kind === "video" ? "El video pasa de 8 MB." : "La imagen pasa de 5 MB.");
      return;
    }
    if (local) URL.revokeObjectURL(local);
    const url = URL.createObjectURL(file);
    setProblem("");
    setRemoved(false);
    setLocal(url);
    onPreview?.(url);
  }

  function dropLocal() {
    if (local) URL.revokeObjectURL(local);
    setLocal("");
    setProblem("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearLocal() {
    dropLocal();
    onPreview?.(current);
  }

  function remove() {
    dropLocal();
    setRemoved(true);
    setOpen(false);
    onPreview?.("");
  }

  return (
    <div className="brand-picker">
      <div className={`story-visual brand-visual${kind === "image" ? " cover" : ""}`}>
        {shown && kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" />
        ) : shown ? <video src={shown} muted playsInline /> : <p className="story-empty">{label}</p>}
      </div>
      <div className="story-actions">
        {shown ? <button className="quiet" type="button" onClick={() => setOpen(true)}>Previsualizar</button> : null}
        <label className="btn">{shown ? "Cambiar" : "Elegir"}
          <input ref={fileRef} name={name} type="file" accept={accept} onChange={(event) => choose(event.target.files?.[0], event.target)} />
        </label>
        {local ? <button className="quiet" type="button" onClick={clearLocal}>Cancelar</button> : null}
        {current && removeName && !local ? (
          <button className="quiet danger" type="button" onClick={removed ? () => { setRemoved(false); onPreview?.(current); } : remove}>{removed ? "Recuperar" : "Quitar"}</button>
        ) : null}
      </div>
      <p className="hint">{label}</p>
      {removed && removeName ? <input type="hidden" name={removeName} value="1" /> : null}
      {problem ? <small className="note-bad">{problem}</small> : <small className="hint">{removed ? "Se quita de la portada al guardar." : hint}</small>}
      <dialog ref={dialogRef} className="lightbox" aria-labelledby={titleId} onClose={() => setOpen(false)}>
        <p id={titleId}>{label}</p>
        {shown && kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={label} />
        ) : shown ? <video src={shown} controls playsInline /> : null}
        <button className="quiet" type="button" onClick={() => setOpen(false)}>Cerrar</button>
      </dialog>
    </div>
  );
}

function RemoveRow({ id, action, label }: { id: string; action: (state: FormState, data: FormData) => Promise<FormState>; label: string }) {
  const [state, formAction, pending] = useActionState(action, emptyForm);
  usePublish(state, pending, "Quitando…");
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button className="quiet danger" disabled={pending}>{pending ? "Quitando" : label}</button>
    </form>
  );
}

function HeroForm({ hero, slideCount, uploadsReady, onMode }: { hero: HomeEditorData["hero"]; slideCount: number; uploadsReady: boolean; onMode: (mode: string) => void }) {
  const [state, action, pending] = useActionState(saveHeroAction, emptyForm);
  usePublish(state, pending, "Publicando el hero…");
  const setToast = useContext(ToastContext);
  const [values, setValues] = useState({
    mode: hero.mode === "video" || hero.mode === "carousel" ? hero.mode : "image",
    title: hero.title,
    subtitle: hero.subtitle,
    ctaLabel: hero.ctaLabel,
    ctaHref: hero.ctaHref,
    align: hero.align === "center" ? "center" : "left",
    overlay: String(hero.overlay),
    autoplay: hero.autoplay,
    loop: hero.loop,
    active: hero.active,
  });
  const [imagePreview, setImagePreview] = useState(hero.desktopUrl);
  const shade = `linear-gradient(transparent, rgb(0 0 0 / ${Math.min(80, Math.max(0, Number(values.overlay) || 0))}%))`;

  function set(key: "title" | "subtitle" | "ctaLabel" | "ctaHref" | "overlay") {
    return (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const problem = linkProblem(values.ctaHref) || (values.mode === "carousel" && slideCount < 1 ? "El carrusel necesita al menos una diapositiva." : "");
    if (!problem) return;
    event.preventDefault();
    setToast({ kind: "bad", text: problem });
  }

  return (
    <form action={action} onSubmit={submit}>
      <fieldset className="panel section-card">
        <legend>Hero</legend>
        <p className="hint">Es la primera pieza de la portada. La vista previa cambia al momento y el catálogo cambia al guardar.</p>
        {!uploadsReady ? <p className="note-bad">Puedes ver la imagen aquí. Para guardarla falta configurar Cloudinary.</p> : null}
        <div className="home-hero">
          <div className="stack wide">
            <label className="field">Modo
              <select name="mode" value={values.mode} onChange={(event) => { const mode = event.target.value; setValues((current) => ({ ...current, mode })); onMode(mode); }}>
                <option value="image">Imagen</option>
                <option value="video">Video</option>
                <option value="carousel">Carrusel</option>
              </select>
              <small className="hint">{values.mode === "carousel" ? "El carrusel usa las diapositivas de abajo." : values.mode === "video" ? "El video se reproduce sin sonido. La imagen queda como poster." : "Una imagen grande con el texto encima."}</small>
            </label>
            <div className="pair">
              <Field label="Título" name="title" value={values.title} onChange={set("title")} max={120} />
              <Field label="Subtítulo" name="subtitle" value={values.subtitle} onChange={set("subtitle")} max={180} />
            </div>
            <div className="pair">
              <Field label="Botón" name="ctaLabel" value={values.ctaLabel} onChange={set("ctaLabel")} max={40} hint="Déjalo vacío si no quieres botón." />
              <Field label="Destino" name="ctaHref" value={values.ctaHref} onChange={set("ctaHref")} max={180} placeholder="/catalogo" problem={linkProblem(values.ctaHref)} hint="Ruta del catálogo o enlace https." />
            </div>
            <div className="pair">
              <label className="field">Alineación
                <select name="align" value={values.align} onChange={(event) => setValues((current) => ({ ...current, align: event.target.value }))}>
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                </select>
              </label>
              <label className="field">Velo: {values.overlay}%
                <input name="overlay" type="range" min={0} max={80} step={1} value={values.overlay} onChange={set("overlay")} />
                <small className="hint">Oscurece la foto para que el texto se lea.</small>
              </label>
            </div>
            <div className="switch-grid">
              <label className="field check"><input name="active" type="checkbox" checked={values.active} onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} />Visible en la portada</label>
              <label className="field check"><input name="autoplay" type="checkbox" checked={values.autoplay} onChange={(event) => setValues((current) => ({ ...current, autoplay: event.target.checked }))} />Reproducir solo</label>
              <label className="field check"><input name="loop" type="checkbox" checked={values.loop} onChange={(event) => setValues((current) => ({ ...current, loop: event.target.checked }))} />Repetir video</label>
            </div>
            <div className="picker-grid">
              <MediaPicker name="image" removeName="removeHeroImage" label={values.mode === "video" ? "Poster" : "Imagen"} hint="PNG, JPG o WebP. Máximo 5 MB." current={hero.desktopUrl} accept="image/png,image/jpeg,image/webp" kind="image" saved={Boolean(state.ok) && !pending} onPreview={setImagePreview} />
              {values.mode === "video" ? <MediaPicker name="video" removeName="removeHeroVideo" label="Video" hint="MP4 o WebM. Máximo 8 MB. Se guarda sin sonido." current={hero.videoUrl} accept="video/mp4,video/webm" kind="video" saved={Boolean(state.ok) && !pending} /> : null}
            </div>
          </div>
          <aside>
            <p className="hint">Vista previa</p>
            <div className="home-stage">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" />
              ) : null}
              <div className="copy" style={{ textAlign: values.align === "center" ? "center" : "left", background: shade }}>
                <h2>{values.title || "Título del hero"}</h2>
                {values.subtitle ? <p>{values.subtitle}</p> : null}
                {values.ctaLabel ? <span className="btn">{values.ctaLabel}</span> : null}
              </div>
            </div>
            {!values.active ? <p className="note-bad">El hero está oculto. No se verá en la portada.</p> : null}
          </aside>
        </div>
        <div className="section-save">
          <p>{pending ? "Publicando el hero…" : "Se publica en la portada al guardar."}</p>
          <button className="btn" disabled={pending}>{pending ? "Guardando" : "Guardar hero"}</button>
        </div>
      </fieldset>
    </form>
  );
}

function SlideForm() {
  const [state, action, pending] = useActionState(saveSlideAction, emptyForm);
  usePublish(state, pending, "Publicando la diapositiva…");
  const setToast = useContext(ToastContext);
  const [values, setValues] = useState({ title: "", subtitle: "", ctaLabel: "", ctaHref: "", sortOrder: "0" });

  useEffect(() => {
    if (!state.ok) return;
    setValues({ title: "", subtitle: "", ctaLabel: "", ctaHref: "", sortOrder: "0" });
  }, [state.ok]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const problem = linkProblem(values.ctaHref);
    if (!problem) return;
    event.preventDefault();
    setToast({ kind: "bad", text: problem });
  }

  return (
    <form className="stack wide" action={action} onSubmit={submit}>
      <div className="pair">
        <Field label="Título" name="title" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} max={120} />
        <Field label="Subtítulo" name="subtitle" value={values.subtitle} onChange={(event) => setValues((current) => ({ ...current, subtitle: event.target.value }))} max={180} />
      </div>
      <div className="pair">
        <Field label="Botón" name="ctaLabel" value={values.ctaLabel} onChange={(event) => setValues((current) => ({ ...current, ctaLabel: event.target.value }))} max={40} />
        <Field label="Destino" name="ctaHref" value={values.ctaHref} onChange={(event) => setValues((current) => ({ ...current, ctaHref: event.target.value }))} max={180} placeholder="/catalogo" problem={linkProblem(values.ctaHref)} />
      </div>
      <Field label="Orden" name="sortOrder" type="number" value={values.sortOrder} onChange={(event) => setValues((current) => ({ ...current, sortOrder: event.target.value }))} min={0} maxNumber={999} hint="Un número menor aparece primero." />
      <MediaPicker name="image" label="Imagen" hint="PNG, JPG o WebP. Máximo 5 MB." current="" accept="image/png,image/jpeg,image/webp" kind="image" saved={Boolean(state.ok) && !pending} />
      <div className="section-save">
        <p>{pending ? "Publicando la diapositiva…" : "Se suma al carrusel al guardar."}</p>
        <button className="btn" disabled={pending}>{pending ? "Guardando" : "Agregar diapositiva"}</button>
      </div>
    </form>
  );
}

function AnnouncementForm({ bar }: { bar: HomeEditorData["bar"] }) {
  const [state, action, pending] = useActionState(saveAnnouncementAction, emptyForm);
  usePublish(state, pending, "Publicando el aviso…");
  const setToast = useContext(ToastContext);
  const [values, setValues] = useState(bar);
  const dateProblem = values.startsOn && values.endsOn && values.startsOn > values.endsOn ? "La fecha final tiene que ser igual o posterior a la inicial." : "";
  const contrast = contrastRatio(values.color, values.background);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const problem = linkProblem(values.href) || colorProblem(values.background) || colorProblem(values.color) || dateProblem;
    if (!problem) return;
    event.preventDefault();
    setToast({ kind: "bad", text: problem });
  }

  return (
    <form action={action} onSubmit={submit}>
      <fieldset className="panel section-card">
        <legend>Aviso</legend>
        <p className="hint">La franja corta que aparece arriba de la portada. Puedes limitarla a unas fechas.</p>
        <label className="field check"><input name="active" type="checkbox" checked={values.active} onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} />Visible</label>
        <Field label="Texto" name="text" value={values.text} onChange={(event) => setValues((current) => ({ ...current, text: event.target.value }))} max={160} />
        <Field label="Enlace" name="href" value={values.href} onChange={(event) => setValues((current) => ({ ...current, href: event.target.value }))} max={180} placeholder="/catalogo" problem={linkProblem(values.href)} hint="Opcional." />
        <div className="pair">
          <label className="color-field">
            <input type="color" aria-label="Fondo del aviso" value={hexOr(values.background)} onChange={(event) => setValues((current) => ({ ...current, background: event.target.value }))} />
            <span>Fondo
              <input name="background" value={values.background} maxLength={7} spellCheck={false} aria-invalid={colorProblem(values.background) ? true : undefined} onChange={(event) => setValues((current) => ({ ...current, background: event.target.value }))} />
              {colorProblem(values.background) ? <small className="note-bad">{colorProblem(values.background)}</small> : <small className="hint">Color de la franja.</small>}
            </span>
          </label>
          <label className="color-field">
            <input type="color" aria-label="Texto del aviso" value={hexOr(values.color)} onChange={(event) => setValues((current) => ({ ...current, color: event.target.value }))} />
            <span>Texto
              <input name="color" value={values.color} maxLength={7} spellCheck={false} aria-invalid={colorProblem(values.color) ? true : undefined} onChange={(event) => setValues((current) => ({ ...current, color: event.target.value }))} />
              {colorProblem(values.color) ? <small className="note-bad">{colorProblem(values.color)}</small> : <small className="hint">Color de las letras.</small>}
            </span>
          </label>
        </div>
        <p className={contrast !== null && contrast < 4.5 ? "note-bad" : "hint"}>Contraste: {contrast ? contrast.toFixed(2) : "revisa los colores"}. Por debajo de 4.5 el aviso cuesta leerse.</p>
        <div className="pair">
          <label className="field">Desde<input name="startsOn" type="date" value={values.startsOn} onChange={(event) => setValues((current) => ({ ...current, startsOn: event.target.value }))} /></label>
          <label className="field">Hasta<input name="endsOn" type="date" value={values.endsOn} onChange={(event) => setValues((current) => ({ ...current, endsOn: event.target.value }))} />{dateProblem ? <small className="note-bad">{dateProblem}</small> : <small className="hint">Déjalas vacías si el aviso no tiene plazo.</small>}</label>
        </div>
        <label className="field check"><input name="dismissible" type="checkbox" checked={values.dismissible} onChange={(event) => setValues((current) => ({ ...current, dismissible: event.target.checked }))} />La persona puede cerrarlo</label>
        <p className="hint">Vista previa</p>
        <p className="bar-preview" style={{ background: hexOr(values.background), color: hexOr(values.color) }}>{values.text || "El texto del aviso se verá aquí."}</p>
        <div className="section-save">
          <p>{pending ? "Publicando el aviso…" : values.active ? "Se publica en la portada al guardar." : "El aviso quedará oculto."}</p>
          <button className="btn" disabled={pending}>{pending ? "Guardando" : "Guardar aviso"}</button>
        </div>
      </fieldset>
    </form>
  );
}

function SectionForm({ section }: { section: HomeEditorData["sections"][number] }) {
  const [state, action, pending] = useActionState(saveSectionAction, emptyForm);
  usePublish(state, pending, "Publicando la sección…");
  const setToast = useContext(ToastContext);
  const [values, setValues] = useState({ title: section.title, subtitle: section.subtitle, sortOrder: String(section.sortOrder), enabled: section.enabled });
  const titleProblem = values.title.trim().length > 0 && values.title.trim().length < 2 ? "Usa al menos 2 caracteres." : "";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (values.title.trim().length >= 2) return;
    event.preventDefault();
    setToast({ kind: "bad", text: "La sección necesita un título." });
  }

  return (
    <form className="section-row" action={action} onSubmit={submit}>
      <input type="hidden" name="key" value={section.key} />
      <header>
        <div>
          <h2>{SECTION_NAME[section.key] || section.title || section.key}</h2>
          <p className="hint">{SECTION_HINT[section.key] || "Bloque de la portada."}</p>
        </div>
        <label className="field check"><input name="enabled" type="checkbox" checked={values.enabled} onChange={(event) => setValues((current) => ({ ...current, enabled: event.target.checked }))} />Visible</label>
      </header>
      <div className="section-fields">
        <Field label="Título" name="title" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} max={80} problem={titleProblem} />
        <Field label="Subtítulo" name="subtitle" value={values.subtitle} onChange={(event) => setValues((current) => ({ ...current, subtitle: event.target.value }))} max={160} />
        <Field label="Orden" name="sortOrder" type="number" value={values.sortOrder} onChange={(event) => setValues((current) => ({ ...current, sortOrder: event.target.value }))} min={0} maxNumber={999} />
        <div className="section-save">
          <button className="btn" disabled={pending}>{pending ? "Guardando" : "Guardar sección"}</button>
        </div>
      </div>
    </form>
  );
}

function BannerForm({ uploadsReady, sortOrder, onDone }: { uploadsReady: boolean; sortOrder: number; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveBannerAction, emptyForm);
  usePublish(state, pending, "Publicando el banner…");
  const setToast = useContext(ToastContext);
  const [values, setValues] = useState({ title: "", subtitle: "", href: "", sortOrder: String(sortOrder) });

  useEffect(() => {
    if (!state.ok) return;
    onDone();
  }, [onDone, state.ok]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const problem = values.title.trim().length < 2 ? "El banner necesita un título." : linkProblem(values.href);
    if (!problem) return;
    event.preventDefault();
    setToast({ kind: "bad", text: problem });
  }

  return (
    <form className="stack wide" action={action} onSubmit={submit}>
      {!uploadsReady ? <p className="note-bad">Puedes ver la imagen aquí. Para guardarla falta configurar Cloudinary.</p> : null}
      <div className="pair">
        <Field label="Título" name="title" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} max={120} />
        <Field label="Subtítulo" name="subtitle" value={values.subtitle} onChange={(event) => setValues((current) => ({ ...current, subtitle: event.target.value }))} max={160} />
      </div>
      <div className="pair">
        <Field label="Enlace" name="href" value={values.href} onChange={(event) => setValues((current) => ({ ...current, href: event.target.value }))} max={180} placeholder="/catalogo" problem={linkProblem(values.href)} />
        <Field label="Orden" name="sortOrder" type="number" value={values.sortOrder} onChange={(event) => setValues((current) => ({ ...current, sortOrder: event.target.value }))} min={0} maxNumber={999} />
      </div>
      <MediaPicker name="image" label="Imagen" hint="PNG, JPG o WebP. Máximo 5 MB." current="" accept="image/png,image/jpeg,image/webp" kind="image" saved={Boolean(state.ok) && !pending} />
      <div className="section-save">
        <button className="quiet" type="button" onClick={onDone}>Cancelar</button>
        <button className="btn" disabled={pending}>{pending ? "Guardando" : "Publicar banner"}</button>
      </div>
    </form>
  );
}

function BannerDesk({ banners, uploadsReady }: { banners: HomeEditorData["banners"]; uploadsReady: boolean }) {
  const [adding, setAdding] = useState(false);
  const nextOrder = banners.reduce((max, banner) => Math.max(max, banner.sortOrder), -10) + 10;
  return (
    <>
      {banners.length ? banners.map((banner) => (
        <article className="slide-row" key={banner.id}>
          <div className="story-visual brand-visual cover">
            {banner.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner.imageUrl} alt="" />
            ) : <p className="story-empty">Sin imagen</p>}
          </div>
          <div>
            <strong>{banner.title}</strong>
            {banner.subtitle ? <p className="hint">{banner.subtitle}</p> : null}
            <p className="hint">Orden {banner.sortOrder}</p>
          </div>
          <RemoveRow id={banner.id} action={deleteBannerAction} label="Quitar banner" />
        </article>
      )) : <p className="hint">Todavía no hay banners en la portada.</p>}
      {adding ? (
        <BannerForm key={banners.length} uploadsReady={uploadsReady} sortOrder={nextOrder} onDone={() => setAdding(false)} />
      ) : (
        <button className="btn" type="button" onClick={() => setAdding(true)}>{banners.length ? "Agregar otro banner" : "Agregar banner"}</button>
      )}
    </>
  );
}

export function HomeStudio({ data, uploadsReady }: { data: HomeEditorData; uploadsReady: boolean }) {
  const [toast, setToast] = useState<Toast>(null);
  const [heroMode, setHeroMode] = useState(data.hero.mode === "video" || data.hero.mode === "carousel" ? data.hero.mode : "image");
  return (
    <ToastContext.Provider value={setToast}>
      <div className="stack wide">
        <HeroForm hero={data.hero} slideCount={data.slides.length} uploadsReady={uploadsReady} onMode={setHeroMode} />
        {heroMode === "carousel" ? <fieldset className="panel section-card">
          <legend>Diapositivas</legend>
          <p className="hint">Cada diapositiva del carrusel puede tener su foto y su texto.</p>
          {data.slides.length ? data.slides.map((slide) => (
            <article className="slide-row" key={slide.id}>
              <div className="story-visual brand-visual cover">
                {slide.desktopUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.desktopUrl} alt="" />
                ) : <p className="story-empty">Sin imagen</p>}
              </div>
              <div>
                <strong>{slide.title || "Sin título"}</strong>
                {slide.subtitle ? <p className="hint">{slide.subtitle}</p> : null}
                <p className="hint">Orden {slide.sortOrder}</p>
              </div>
              <RemoveRow id={slide.id} action={deleteSlideAction} label="Quitar diapositiva" />
            </article>
          )) : <p className="hint">Todavía no hay diapositivas.</p>}
          <SlideForm />
        </fieldset> : null}
        <AnnouncementForm bar={data.bar} />
        <fieldset className="panel section-card">
          <legend>Secciones</legend>
          <p className="hint">Título, subtítulo y orden de cada bloque. Un número menor aparece primero.</p>
          {data.sections.map((section) => <SectionForm key={section.key} section={section} />)}
        </fieldset>
        <fieldset className="panel section-card">
          <legend>Banners</legend>
          <p className="hint">Puedes publicar varios. Cada uno sale en la sección Banner de la portada, en el orden indicado.</p>
          <BannerDesk banners={data.banners} uploadsReady={uploadsReady} />
        </fieldset>
      </div>
      {toast?.kind === "pending" ? <div className="toast" role="status">{toast.text}</div> : null}
      {toast && toast.kind !== "pending" ? (
        <div className={`toast${toast.kind === "bad" ? " bad" : ""}`} role={toast.kind === "bad" ? "alert" : "status"}>
          <p>{toast.text}</p>
          <button type="button" onClick={() => setToast(null)}>Cerrar</button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
