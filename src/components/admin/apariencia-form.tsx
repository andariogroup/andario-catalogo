"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { saveBrandingAction } from "@/actions/content";
import { contrastRatio } from "@/lib/contrast";
import { emptyForm } from "@/lib/form";

type Brand = {
  logoUrl: string;
  logoAltUrl: string;
  faviconUrl: string;
  socialImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontPair: string;
  radius: string;
  showLogo: boolean;
  showName: boolean;
  showSearch: boolean;
  showHeaderWhatsapp: boolean;
  stickyHeader: boolean;
};

const COLORS: { name: "primaryColor" | "secondaryColor" | "accentColor" | "backgroundColor" | "textColor" | "mutedColor" | "borderColor" | "buttonColor" | "buttonTextColor"; label: string; hint: string }[] = [
  { name: "primaryColor", label: "Primario", hint: "Encabezados y acentos fuertes." },
  { name: "secondaryColor", label: "Secundario", hint: "Fondos suaves y bloques." },
  { name: "accentColor", label: "Acento", hint: "Precios y detalles." },
  { name: "backgroundColor", label: "Fondo", hint: "Color de la página." },
  { name: "textColor", label: "Texto", hint: "Texto principal." },
  { name: "mutedColor", label: "Texto secundario", hint: "Ayudas y datos menores." },
  { name: "borderColor", label: "Bordes", hint: "Líneas de las tarjetas." },
  { name: "buttonColor", label: "Botón", hint: "Fondo de las acciones." },
  { name: "buttonTextColor", label: "Texto del botón", hint: "Texto sobre el botón." },
];

const FIELD_NAME: Record<string, string> = {
  primaryColor: "primary",
  secondaryColor: "secondary",
  accentColor: "accent",
  backgroundColor: "background",
  textColor: "text",
  mutedColor: "muted",
  borderColor: "border",
  buttonColor: "button",
  buttonTextColor: "buttonText",
};

function hexOrEmpty(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

function colorProblem(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? "" : "Usa un color como #1B4332.";
}

function ImagePicker({
  name,
  removeName,
  label,
  hint,
  current,
  saved,
  fit,
  onPreview,
}: {
  name: string;
  removeName: string;
  label: string;
  hint: string;
  current: string;
  saved: boolean;
  fit: "contain" | "cover";
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

  useEffect(() => {
    if (!saved || !fileRef.current) return;
    fileRef.current.value = "";
  }, [saved]);

  const [syncedCurrent, setSyncedCurrent] = useState(current);
  // Si ya no hay imagen guardada, se olvida la marca de "quitar".
  if (syncedCurrent !== current) {
    setSyncedCurrent(current);
    if (!current) setRemoved(false);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

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
    const url = URL.createObjectURL(file);
    setProblem("");
    setRemoved(false);
    setLocal(url);
    onPreview?.(url);
  }

  function clearLocal() {
    if (local) URL.revokeObjectURL(local);
    setLocal("");
    setProblem("");
    if (fileRef.current) fileRef.current.value = "";
    onPreview?.(removed ? "" : current);
  }

  function remove() {
    if (local) URL.revokeObjectURL(local);
    setLocal("");
    setProblem("");
    if (fileRef.current) fileRef.current.value = "";
    setRemoved(true);
    setOpen(false);
    onPreview?.("");
  }

  return (
    <div className="brand-picker">
      <div className={`story-visual brand-visual${fit === "cover" ? " cover" : ""}`}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" />
        ) : <p className="story-empty">{label}</p>}
      </div>
      <div className="story-actions">
        {shown ? <button className="quiet" type="button" onClick={() => setOpen(true)}>Previsualizar</button> : null}
        <label className="btn">
          {shown ? "Cambiar" : "Elegir"}
          <input ref={fileRef} name={name} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => choose(event.target.files?.[0], event.target)} />
        </label>
        {local ? <button className="quiet" type="button" onClick={clearLocal}>Cancelar</button> : null}
        {current && !local ? (
          <button className="quiet danger" type="button" onClick={removed ? () => { setRemoved(false); onPreview?.(current); } : remove}>
            {removed ? "Recuperar" : "Quitar"}
          </button>
        ) : null}
      </div>
      <p className="hint">{label}</p>
      {removed ? <input type="hidden" name={removeName} value="1" /> : null}
      {problem ? <small className="note-bad">{problem}</small> : <small className="hint">{removed ? "Se quita del catálogo al publicar." : hint}</small>}
      <dialog ref={dialogRef} className="lightbox" aria-labelledby={titleId} onClose={() => setOpen(false)}>
        <p id={titleId}>{label}</p>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={label} />
        ) : null}
        <button className="quiet" type="button" onClick={() => setOpen(false)}>Cerrar</button>
      </dialog>
    </div>
  );
}

export function AppearanceStudio({ brand, businessName, uploadsReady }: { brand: Brand; businessName: string; uploadsReady: boolean }) {
  const [state, action, pending] = useActionState(saveBrandingAction, emptyForm);
  const [colors, setColors] = useState({
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    accentColor: brand.accentColor,
    backgroundColor: brand.backgroundColor,
    textColor: brand.textColor,
    mutedColor: brand.mutedColor,
    borderColor: brand.borderColor,
    buttonColor: brand.buttonColor,
    buttonTextColor: brand.buttonTextColor,
  });
  const [fontPair, setFontPair] = useState(brand.fontPair === "newsreader" ? "newsreader" : "fraunces");
  const [radius, setRadius] = useState(Math.min(28, Math.max(0, Number(brand.radius) || 18)));
  const [showLogo, setShowLogo] = useState(brand.showLogo);
  const [showName, setShowName] = useState(brand.showName);
  const [showSearch, setShowSearch] = useState(brand.showSearch);
  const [showWhatsapp, setShowWhatsapp] = useState(brand.showHeaderWhatsapp);
  const [stickyHeader, setStickyHeader] = useState(brand.stickyHeader);
  const [logoPreview, setLogoPreview] = useState(brand.logoUrl);
  const [socialPreview, setSocialPreview] = useState(brand.socialImageUrl);
  const [notice, setNotice] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);
  const textContrast = contrastRatio(colors.textColor, colors.backgroundColor);
  const buttonContrast = contrastRatio(colors.buttonTextColor, colors.buttonColor);
  const lowContrast = (textContrast !== null && textContrast < 4.5) || (buttonContrast !== null && buttonContrast < 4.5);
  const display = fontPair === "newsreader" ? "var(--font-newsreader)" : "var(--font-fraunces)";
  const colorIssue = COLORS.map((color) => colorProblem(colors[color.name]) ? color.label : "").find(Boolean) || "";

  const [seenState, setSeenState] = useState(state);
  // Cada respuesta nueva del servidor se muestra como aviso.
  if (!pending && seenState !== state) {
    setSeenState(state);
    if (state.error) setNotice({ kind: "bad", text: state.error });
    else if (state.ok) setNotice({ kind: "ok", text: state.ok });
  }

  function setColor(name: keyof typeof colors, value: string) {
    setColors((current) => ({ ...current, [name]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (!colorIssue) return;
    event.preventDefault();
    setNotice({ kind: "bad", text: `Revisa el color ${colorIssue}.` });
  }

  return (
    <form className="studio" action={action} onSubmit={submit}>
      <div className="stack wide">
        <fieldset className="panel section-card">
          <legend>Logo e imágenes</legend>
          <p className="hint">El logo se ve en el encabezado. El favicon es el icono de la pestaña. La imagen social acompaña el enlace cuando se comparte.</p>
          {!uploadsReady ? <p className="note-bad">Puedes elegir la imagen y verla aquí. Para guardarla falta configurar Cloudinary.</p> : null}
          <div className="picker-grid">
            <ImagePicker name="logo" removeName="removeLogo" label="Logo principal" hint="PNG, JPG o WebP. Máximo 5 MB." current={brand.logoUrl} saved={Boolean(state.ok) && !pending} fit="contain" onPreview={setLogoPreview} />
            <ImagePicker name="logoAlt" removeName="removeLogoAlt" label="Logo alternativo" hint="Versión clara u oscura, si la tienes." current={brand.logoAltUrl} saved={Boolean(state.ok) && !pending} fit="contain" />
            <ImagePicker name="favicon" removeName="removeFavicon" label="Favicon" hint="Un cuadrado simple se lee mejor." current={brand.faviconUrl} saved={Boolean(state.ok) && !pending} fit="contain" />
            <ImagePicker name="socialImage" removeName="removeSocialImage" label="Imagen social" hint="Horizontal, para compartir el catálogo." current={brand.socialImageUrl} saved={Boolean(state.ok) && !pending} fit="cover" onPreview={setSocialPreview} />
          </div>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Color</legend>
          <p className="hint">El cambio se ve en la vista previa al momento. El catálogo público cambia al publicar.</p>
          <div className="color-grid">
            {COLORS.map((color) => {
              const problem = colorProblem(colors[color.name]);
              return (
                <label className="color-field" key={color.name}>
                  <input
                    type="color"
                    aria-label={color.label}
                    value={hexOrEmpty(colors[color.name])}
                    onChange={(event) => setColor(color.name, event.target.value)}
                  />
                  <span>
                    {color.label}
                    <input
                      name={FIELD_NAME[color.name]}
                      value={colors[color.name]}
                      maxLength={7}
                      spellCheck={false}
                      autoCapitalize="off"
                      aria-invalid={problem ? true : undefined}
                      onChange={(event) => setColor(color.name, event.target.value)}
                    />
                    {problem ? <small className="note-bad">{problem}</small> : <small className="hint">{color.hint}</small>}
                  </span>
                </label>
              );
            })}
          </div>
          <p className={lowContrast ? "note-bad" : "hint"}>
            Contraste del texto: {textContrast ? textContrast.toFixed(2) : "revisa el código"}. Contraste del botón: {buttonContrast ? buttonContrast.toFixed(2) : "revisa el código"}. Por debajo de 4.5 el texto pequeño cuesta leerse.
          </p>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Tipografía y forma</legend>
          <label className="field">Pareja de fuentes
            <select name="fontPair" value={fontPair} onChange={(event) => setFontPair(event.target.value)}>
              <option value="fraunces">Fraunces y Outfit</option>
              <option value="newsreader">Newsreader y Source Sans</option>
            </select>
            <small className="hint">La primera fuente es para títulos. La segunda, para el texto.</small>
          </label>
          <label className="field">Radio de las esquinas: {radius}px
            <input name="radius" type="range" min={0} max={28} step={1} value={radius} onChange={(event) => setRadius(Number(event.target.value))} />
            <small className="hint">0 deja las esquinas rectas. 28 es la forma más redonda.</small>
          </label>
        </fieldset>

        <fieldset className="panel section-card">
          <legend>Encabezado</legend>
          <p className="hint">Estas opciones cambian la barra de arriba del catálogo.</p>
          <div className="switch-grid">
            <label className="field check"><input name="showLogo" type="checkbox" checked={showLogo} onChange={(event) => setShowLogo(event.target.checked)} />Mostrar logo</label>
            <label className="field check"><input name="showName" type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} />Mostrar nombre</label>
            <label className="field check"><input name="showSearch" type="checkbox" checked={showSearch} onChange={(event) => setShowSearch(event.target.checked)} />Mostrar buscador</label>
            <label className="field check"><input name="showHeaderWhatsapp" type="checkbox" checked={showWhatsapp} onChange={(event) => setShowWhatsapp(event.target.checked)} />WhatsApp en el encabezado</label>
            <label className="field check"><input name="stickyHeader" type="checkbox" checked={stickyHeader} onChange={(event) => setStickyHeader(event.target.checked)} />Encabezado fijo al desplazar</label>
          </div>
        </fieldset>

        <div className="negocio-save">
          <p>{pending ? "Publicando la apariencia…" : colorIssue ? "Revisa los colores marcados." : "Los cambios se publican en el catálogo."}</p>
          <button className="btn" disabled={pending}>{pending ? "Publicando" : "Publicar apariencia"}</button>
        </div>
      </div>

      <aside className="studio-side">
        <p className="hint">Vista previa</p>
        <div
          className="preview"
          style={{
            background: hexOrEmpty(colors.backgroundColor),
            color: hexOrEmpty(colors.textColor),
            borderColor: hexOrEmpty(colors.borderColor),
            fontFamily: fontPair === "newsreader" ? "var(--font-source)" : "var(--font-outfit)",
          }}
        >
          <div className="preview-bar">
            {showLogo && logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="" width={36} height={36} />
            ) : null}
            <strong style={{ fontFamily: display }}>{showName ? businessName : "Catálogo"}</strong>
            {showSearch ? <span style={{ color: hexOrEmpty(colors.mutedColor) }}>Buscar</span> : null}
            {showWhatsapp ? (
              <span style={{ background: hexOrEmpty(colors.buttonColor), color: hexOrEmpty(colors.buttonTextColor), borderRadius: 999, padding: "0.35rem 0.7rem" }}>WhatsApp</span>
            ) : null}
          </div>
          <div className="preview-card">
            <span className="preview-photo" style={{ background: hexOrEmpty(colors.secondaryColor), borderRadius: radius }} />
            <div>
              <p style={{ fontFamily: display, fontSize: "1.6rem", margin: 0 }}>Pieza de muestra</p>
              <p style={{ color: hexOrEmpty(colors.mutedColor) }}>Así se lee una descripción corta.</p>
              <p style={{ color: hexOrEmpty(colors.accentColor), fontFamily: display, fontSize: "1.3rem" }}>$80.000</p>
              <span style={{ display: "inline-flex", minHeight: 40, alignItems: "center", padding: "0 0.8rem", background: hexOrEmpty(colors.buttonColor), color: hexOrEmpty(colors.buttonTextColor), borderRadius: radius }}>Consultar</span>
            </div>
          </div>
        </div>
        {socialPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={socialPreview} alt="Así se vería al compartir" style={{ width: "100%", borderRadius: radius, aspectRatio: "1.91 / 1", objectFit: "cover" }} />
        ) : <p className="story-empty">La imagen social se verá aquí.</p>}
        <p className="hint">La vista previa cambia al momento. El catálogo público cambia al publicar.</p>
      </aside>

      {pending ? (
        <div className="toast" role="status">Publicando la apariencia…</div>
      ) : notice ? (
        <div className={`toast${notice.kind === "bad" ? " bad" : ""}`} role={notice.kind === "bad" ? "alert" : "status"}>
          <p>{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)}>Cerrar</button>
        </div>
      ) : null}
    </form>
  );
}
