"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { saveBusinessAction } from "@/actions/content";
import { emptyForm } from "@/lib/form";

export type BusinessDraft = {
  name: string;
  slogan: string;
  short: string;
  description: string;
  city: string;
  region: string;
  country: string;
  address: string;
  mapsUrl: string;
  phone: string;
  email: string;
  whatsapp: string;
  hours: string;
  yearStarted: string;
  attentionScope: string;
  deliveryText: string;
  commercialTerms: string;
  storyTitle: string;
  story: string;
  commercialMessage: string;
  storyImageUrl: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
};

const SOCIALS = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["website", "Sitio web"],
] as const;

function mapsProblem(value: string) {
  if (!value) return "";
  if (!/^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(value) && !/^https:\/\/maps\.app\.goo\.gl\//i.test(value)) return "Usa un enlace https de Google Maps.";
  return "";
}

function emailProblem(value: string) {
  if (!value) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Revisa el correo.";
  return "";
}

function whatsappProblem(value: string) {
  if (!value) return "";
  if (!/^\d{10,15}$/.test(value)) return "Solo dígitos, con indicativo. Ejemplo: 573001112233.";
  return "";
}

function httpsProblem(value: string, label: string) {
  if (!value) return "";
  if (!/^https:\/\//i.test(value)) return `El enlace de ${label} tiene que empezar por https.`;
  return "";
}

function yearProblem(value: string) {
  if (!value) return "";
  if (!/^\d{4}$/.test(value)) return value.length < 4 ? "" : "Usa un año entre 1900 y 2100.";
  const year = Number(value);
  if (year < 1900 || year > 2100) return "Usa un año entre 1900 y 2100.";
  return "";
}

function firstProblem(values: BusinessDraft) {
  if (values.name.trim().length < 2) return "El negocio necesita un nombre.";
  return mapsProblem(values.mapsUrl)
    || emailProblem(values.email)
    || whatsappProblem(values.whatsapp)
    || yearProblem(values.yearStarted)
    || SOCIALS.map(([network, label]) => httpsProblem(values[network], label)).find(Boolean)
    || "";
}

function Count({ value, max }: { value: string; max: number }) {
  return <small className={value.length > max * 0.9 ? "count warn" : "count"}>{value.length}/{max}</small>;
}

function Field({
  label,
  name,
  value,
  onChange,
  max,
  hint,
  problem,
  type = "text",
  rows,
  required,
  min,
  maxNumber,
  placeholder,
  inputMode,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  max?: number;
  hint?: string;
  problem?: string;
  type?: string;
  rows?: number;
  required?: boolean;
  min?: number;
  maxNumber?: number;
  placeholder?: string;
  inputMode?: "text" | "url" | "tel" | "email" | "numeric";
  autoComplete?: string;
}) {
  const invalid = Boolean(problem);
  return (
    <label className="field">
      <span className="field-head">
        <span>{label}</span>
        {max ? <Count value={value} max={max} /> : null}
      </span>
      {rows ? (
        <textarea name={name} value={value} onChange={onChange} maxLength={max} rows={rows} required={required} aria-invalid={invalid || undefined} placeholder={placeholder} />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          maxLength={max}
          required={required}
          min={min}
          max={maxNumber}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
        />
      )}
      {problem ? <small className="note-bad">{problem}</small> : hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

export function BusinessStudio({ initial, uploadsReady }: { initial: BusinessDraft; uploadsReady: boolean }) {
  const [state, action, pending] = useActionState(saveBusinessAction, emptyForm);
  const [values, setValues] = useState(initial);
  const [localPreview, setLocalPreview] = useState("");
  const [removeSaved, setRemoveSaved] = useState(false);
  const [imageProblem, setImageProblem] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);
  const [lightOpen, setLightOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lightRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const shown = localPreview || (removeSaved ? "" : initial.storyImageUrl);
  const problem = firstProblem(values);

  const [seenState, setSeenState] = useState(state);
  // Cada respuesta nueva del servidor se muestra como aviso.
  if (!pending && seenState !== state) {
    setSeenState(state);
    if (state.error) setNotice({ kind: "bad", text: state.error });
    else if (state.ok) setNotice({ kind: "ok", text: state.ok });
  }

  useEffect(() => {
    if (!pending && state.ok && fileRef.current) fileRef.current.value = "";
  }, [pending, state]);

  useEffect(() => {
    const dialog = lightRef.current;
    if (!dialog) return;
    if (lightOpen && !dialog.open) dialog.showModal();
    if (!lightOpen && dialog.open) dialog.close();
  }, [lightOpen]);

  function set(key: keyof BusinessDraft) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
    };
  }

  function choose(file: File | undefined, input: HTMLInputElement) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      input.value = "";
      setImageProblem("Usa png, jpg o webp.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      input.value = "";
      setImageProblem("La imagen pasa de 5 MB.");
      return;
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    setImageProblem("");
    setRemoveSaved(false);
    setLocalPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    clearLocal();
    setRemoveSaved(true);
    setLightOpen(false);
  }

  function clearLocal() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
    setImageProblem("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const blocked = firstProblem(values);
    if (!blocked) return;
    event.preventDefault();
    setNotice({ kind: "bad", text: blocked });
  }

  const place = [values.address, values.city, values.region].filter(Boolean).join(", ");
  const contact = [values.hours, values.phone].filter(Boolean).join(" · ");

  return (
    <form className="studio" action={action} onSubmit={submit}>
      <div className="stack wide">
        <fieldset className="panel section-card">
          <legend>Identidad</legend>
          <p className="hint">El nombre y el eslogan aparecen en el encabezado y en la portada.</p>
          <Field label="Nombre comercial" name="name" value={values.name} onChange={set("name")} max={80} required autoComplete="organization" problem={values.name.trim().length > 0 && values.name.trim().length < 2 ? "Usa al menos 2 caracteres." : ""} />
          <Field label="Eslogan" name="slogan" value={values.slogan} onChange={set("slogan")} max={140} hint="Una frase corta, debajo del nombre." />
          <Field label="Descripción corta" name="short" value={values.short} onChange={set("short")} max={180} rows={2} hint="Sirve para resúmenes y para compartir." />
          <Field label="Descripción" name="description" value={values.description} onChange={set("description")} max={4000} rows={4} />
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Ubicación y contacto</legend>
          <div className="pair">
            <Field label="Ciudad" name="city" value={values.city} onChange={set("city")} max={80} autoComplete="address-level2" />
            <Field label="Departamento" name="region" value={values.region} onChange={set("region")} max={80} autoComplete="address-level1" />
          </div>
          <div className="pair">
            <Field label="País" name="country" value={values.country} onChange={set("country")} max={80} autoComplete="country-name" />
            <Field label="Año de inicio" name="yearStarted" inputMode="numeric" value={values.yearStarted} onChange={set("yearStarted")} max={4} problem={yearProblem(values.yearStarted)} hint="Opcional. Solo si quieres publicarlo." />
          </div>
          <Field label="Dirección" name="address" value={values.address} onChange={set("address")} max={180} autoComplete="street-address" hint="Local, edificio o punto de referencia." />
          <Field label="Google Maps" name="mapsUrl" type="url" inputMode="url" value={values.mapsUrl} onChange={set("mapsUrl")} placeholder="https://maps.app.goo.gl/..." problem={mapsProblem(values.mapsUrl)} hint="Pega el enlace de compartir de Google Maps." />
          <div className="pair">
            <Field label="Teléfono" name="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} max={20} autoComplete="tel" />
            <Field label="Correo" name="email" type="email" inputMode="email" value={values.email} onChange={set("email")} max={120} autoComplete="email" problem={emailProblem(values.email)} />
          </div>
          <div className="pair">
            <Field label="WhatsApp" name="whatsapp" type="tel" inputMode="tel" value={values.whatsapp} onChange={set("whatsapp")} max={20} placeholder="573001112233" problem={whatsappProblem(values.whatsapp)} hint="Solo números, con indicativo de país." />
            <Field label="Horario" name="hours" value={values.hours} onChange={set("hours")} max={120} placeholder="Lunes a sábado, 9:00 a 18:00" />
          </div>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Confianza</legend>
          <Field label="Alcance" name="attentionScope" value={values.attentionScope} onChange={set("attentionScope")} max={400} rows={3} hint="A quién atiendes y desde dónde." />
          <Field label="Entregas" name="deliveryText" value={values.deliveryText} onChange={set("deliveryText")} max={800} rows={3} />
          <Field label="Condiciones" name="commercialTerms" value={values.commercialTerms} onChange={set("commercialTerms")} max={800} rows={3} />
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Historia</legend>
          <Field label="Título de la historia" name="storyTitle" value={values.storyTitle} onChange={set("storyTitle")} max={120} />
          <Field label="Historia" name="story" value={values.story} onChange={set("story")} max={4000} rows={5} />
          <Field label="Mensaje comercial" name="commercialMessage" value={values.commercialMessage} onChange={set("commercialMessage")} max={240} rows={2} hint="Una frase de confianza, sin promesas que el negocio no pueda cumplir." />
          <div className="story-picker">
            <div className="story-visual">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt="" />
              ) : <p className="story-empty">La foto del local se verá aquí, en grande.</p>}
            </div>
            <div className="story-actions">
              {shown ? <button className="quiet" type="button" onClick={() => setLightOpen(true)}>Previsualizar</button> : null}
              <label className="btn">
                {shown ? "Cambiar imagen" : "Elegir imagen"}
                <input ref={fileRef} name="storyImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => choose(event.target.files?.[0], event.target)} />
              </label>
              {localPreview ? <button className="quiet" type="button" onClick={clearLocal}>Cancelar cambio</button> : null}
              {initial.storyImageUrl && !localPreview ? (
                <button className="quiet danger" type="button" onClick={removeSaved ? () => setRemoveSaved(false) : removeImage}>
                  {removeSaved ? "Recuperar imagen" : "Quitar imagen"}
                </button>
              ) : null}
            </div>
            {removeSaved ? <input type="hidden" name="removeStoryImage" value="1" /> : null}
            {removeSaved ? <small className="hint">La imagen se quita del catálogo al guardar.</small> : null}
            {imageProblem ? <small className="note-bad">{imageProblem}</small> : <small className="hint">PNG, JPG o WebP. Máximo 5 MB. Una foto horizontal del local se lee mejor.</small>}
            {!uploadsReady ? <small className="note-bad">Puedes ver la foto aquí. Para guardarla falta configurar Cloudinary.</small> : null}
          </div>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Redes</legend>
          <p className="hint">Déjalas vacías si el negocio todavía no las tiene. Si las escribes, empiezan por https.</p>
          <div className="pair">
            {SOCIALS.map(([network, label]) => (
              <Field key={network} label={label} name={network} type="url" inputMode="url" value={values[network]} onChange={set(network)} placeholder="https://" problem={httpsProblem(values[network], label)} />
            ))}
          </div>
        </fieldset>

        <div className="negocio-save">
          <p>{pending ? "Guardando los datos…" : problem ? "Revisa los campos marcados." : "Los cambios se publican al guardar."}</p>
          <button className="btn" disabled={pending}>{pending ? "Guardando" : "Guardar negocio"}</button>
        </div>
      </div>

      <aside className="studio-side">
        <p className="hint">Vista previa</p>
        <article className="story-card">
          <div className="story-visual">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="" />
            ) : <p className="story-empty">Sin foto</p>}
          </div>
          <h2>{values.storyTitle || values.name || "El negocio"}</h2>
          {values.slogan ? <p>{values.slogan}</p> : null}
          <p>{(values.story || values.description || values.short || "La historia aparecerá aquí.").slice(0, 220)}</p>
          {place ? <p className="hint">{place}</p> : null}
          {contact ? <p className="hint">{contact}</p> : null}
          {values.commercialMessage ? <p>{values.commercialMessage}</p> : null}
        </article>
        <p className="hint">La vista previa cambia al momento. El catálogo público cambia al guardar.</p>
      </aside>

      {pending ? (
        <div className="toast" role="status">Guardando {values.name || "el negocio"}…</div>
      ) : notice ? (
        <div className={`toast${notice.kind === "bad" ? " bad" : ""}`} role={notice.kind === "bad" ? "alert" : "status"}>
          <p>{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)}>Cerrar</button>
        </div>
      ) : null}

      <dialog ref={lightRef} className="lightbox" aria-labelledby={titleId} onClose={() => setLightOpen(false)}>
        <p id={titleId}>Imagen de la historia</p>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={values.storyTitle || values.name || "Imagen de la historia"} />
        ) : null}
        <button className="quiet" type="button" onClick={() => setLightOpen(false)}>Cerrar</button>
      </dialog>
    </form>
  );
}
