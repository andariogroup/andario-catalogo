"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deletePromoAction, markPromoSharedAction, savePromoAction } from "@/actions/promos";
import { BoundForm } from "@/components/admin/form";
import { emptyForm } from "@/lib/form";
import { paintPromo } from "@/lib/promo-canvas";
import {
  PROMO_CHANNELS,
  PROMO_FORMATS,
  PROMO_TEMPLATES,
  alignCaptionPrices,
  defaultCaption,
  defaultCta,
  promoChannelLabel,
  promoFileName,
  promoFormatLabel,
  promoLink,
  promoShareText,
  promoTemplateLabel,
  type PromoChannel,
  type PromoEditor,
  type PromoFormat,
  type PromoTemplate,
} from "@/lib/promo";
import { whatsappHref } from "@/lib/whatsapp";

const TEMPLATE_HINT: Record<PromoTemplate, string> = {
  editorial: "La foto manda. El titular sale de la descripción real del producto.",
  direct: "Precio y llamado a la acción, con el producto bien visible.",
  experience: "La imagen ocupa la pieza. Si no hay foto, usa una composición más sobria.",
  benefit: "El producto y hasta tres argumentos tomados de su descripción o de sus características.",
};

export function PromoStudio({ editor }: { editor: PromoEditor }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const job = useRef(0);
  const settled = useRef(0);
  const [channel, setChannel] = useState<PromoChannel>(editor.channel);
  const [format, setFormat] = useState<PromoFormat>(editor.format);
  const [template, setTemplate] = useState<PromoTemplate>(editor.template);
  const [photoUrl, setPhotoUrl] = useState(editor.photoUrl);
  const [variantId, setVariantId] = useState(editor.variantId);
  const [caption, setCaption] = useState(editor.caption);
  const [cta, setCta] = useState(editor.cta);
  const [captionTouched, setCaptionTouched] = useState(Boolean(editor.id));
  const [ctaTouched, setCtaTouched] = useState(Boolean(editor.id));
  const [captionKey, setCaptionKey] = useState(`${editor.product.id}:${editor.template}`);
  const [ctaKey, setCtaKey] = useState(editor.product.id);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const variant = editor.variants.find((item) => item.id === variantId);
  const priceLabel = variant?.priceLabel ?? editor.product.priceLabel;
  const compareLabel = variant?.compareLabel ?? editor.product.compareLabel;
  const offer = variant?.offer ?? editor.product.offer;
  const availability = variant?.availability ?? editor.product.availability;
  const generated = defaultCaption({
    name: editor.product.name,
    short: editor.product.short,
    points: editor.product.points,
    template,
    category: editor.product.category,
    priceLabel,
    compareLabel,
    priceMode: editor.product.priceMode,
    availability,
    cta,
  });
  const nextCaptionKey = `${editor.product.id}:${template}:${cta}:${priceLabel}:${compareLabel}:${availability}`;
  if (!captionTouched && captionKey !== nextCaptionKey) {
    setCaptionKey(nextCaptionKey);
    setCaption(generated);
  }
  if (captionTouched) {
    const aligned = alignCaptionPrices(caption, { priceLabel, compareLabel, offer });
    if (aligned.updated) setCaption(aligned.caption);
  }
  const nextCta = defaultCta({
    hasWhatsapp: editor.hasWhatsapp,
    priceMode: editor.product.priceMode,
    availability,
  });
  const ctaIdentity = `${editor.product.id}:${availability}`;
  if (!ctaTouched && cta !== nextCta && ctaKey !== ctaIdentity) {
    setCtaKey(ctaIdentity);
    setCta(nextCta);
  }

  const link = promoLink(editor.origin, editor.product.slug, channel);
  const preview = editor.photos.find((photo) => photo.url === photoUrl)?.preview ?? "";
  const dirty = caption.trim() !== editor.caption.trim()
    || cta.trim() !== editor.cta.trim()
    || channel !== editor.channel
    || format !== editor.format
    || template !== editor.template
    || photoUrl !== editor.photoUrl
    || variantId !== editor.variantId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = ++job.current;
    let cancel = false;
    const timer = window.setTimeout(() => {
      void paintPromo(canvas, {
        format,
        template,
        business: editor.brand.name,
        name: editor.product.name,
        short: editor.product.short,
        category: editor.product.category,
        priceLabel,
        compareLabel,
        priceMode: editor.product.priceMode,
        availability,
        points: editor.product.points,
        cta,
        background: editor.brand.background,
        ink: editor.brand.ink,
        muted: editor.brand.muted,
        accent: editor.brand.accent,
        button: editor.brand.button,
        buttonInk: editor.brand.buttonInk,
        photoWell: editor.brand.photoWell,
        photoUrl: preview,
        logoUrl: editor.brand.logoUrl,
        fontPair: editor.brand.fontPair,
      }, () => cancel).then((result) => {
        if (!result.ok || job.current !== current) return;
        settled.current = current;
        setBlocks(result.blocks);
      });
    }, 40);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [format, template, cta, preview, editor, priceLabel, compareLabel, availability]);

  async function blobOf() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  }

  function imageReady() {
    return settled.current === job.current && job.current > 0;
  }

  async function rememberShare() {
    if (!editor.id || shared) return;
    const result = await markPromoSharedAction(editor.id);
    if (!result.error) setShared(true);
  }

  async function download() {
    setNotice("");
    if (!imageReady()) {
      setNotice("Espera un momento, la imagen se está armando.");
      return;
    }
    if (blocks.length) {
      setNotice(blocks[0]);
      return;
    }
    const blob = await blobOf();
    if (!blob) {
      setNotice("No se pudo armar la imagen. Prueba otra foto del producto.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = promoFileName(editor.product.slug, channel);
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(channel === "whatsapp"
      ? "Imagen lista. Ábrela en WhatsApp junto con el texto copiado."
      : `Imagen lista. Súbela a ${promoChannelLabel(channel)} con el texto copiado.`);
  }

  function chooseVariant(id: string) {
    setVariantId(id);
    const next = editor.variants.find((item) => item.id === id);
    if (next?.photoUrl) {
      setPhotoUrl(next.photoUrl);
      return;
    }
    const variantPhotos = new Set(editor.variants.map((item) => item.photoUrl).filter(Boolean));
    if (variantPhotos.has(photoUrl)) {
      const productPhoto = editor.photos.find((photo) => !variantPhotos.has(photo.url));
      if (productPhoto) setPhotoUrl(productPhoto.url);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(promoShareText(caption, link));
    } catch {
      setNotice("No se pudo copiar solo. Selecciona el texto y cópialo.");
      return;
    }
    setCopied(true);
    setNotice("");
  }

  async function shareFile() {
    setNotice("");
    if (!imageReady()) {
      setNotice("Espera un momento, la imagen se está armando.");
      return;
    }
    if (blocks.length) {
      setNotice(blocks[0]);
      return;
    }
    const blob = await blobOf();
    if (!blob) {
      setNotice("No se pudo armar la imagen. Prueba otra foto del producto.");
      return;
    }
    const file = new File([blob], promoFileName(editor.product.slug, channel), { type: "image/png" });
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      setNotice("Este navegador no abre el menú de compartir. Descarga la imagen.");
      return;
    }
    try {
      await navigator.share({ files: [file], text: promoShareText(caption, link), title: editor.product.name });
      setNotice("Lista para publicar en la app que elegiste.");
      await rememberShare();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("No se pudo compartir. Descarga la imagen.");
    }
  }

  const whatsapp = whatsappHref(editor.whatsapp, promoShareText(caption, link));
  const styles = PROMO_TEMPLATES.filter((item) => item !== "benefit" || editor.product.points.length > 0);
  const canExport = Boolean(editor.id) && !dirty && blocks.length === 0;

  return (
    <div className="promo-studio">
      <div className="promo-stage">
        <canvas ref={canvasRef} className="promo-canvas" data-format={format} role="img" aria-label={`Vista previa de ${editor.product.name}`} />
        <div className="promo-controls">
          <BoundForm action={savePromoAction} label={editor.id ? "Guardar cambios" : "Guardar pieza"}>
            <input type="hidden" name="id" value={editor.id} />
            <input type="hidden" name="productId" value={editor.product.id} />
            <input type="hidden" name="channel" value={channel} />
            <input type="hidden" name="format" value={format} />
            <input type="hidden" name="template" value={template} />
            <input type="hidden" name="photoUrl" value={photoUrl} />
            <input type="hidden" name="variantId" value={variantId} />
            <fieldset className="promo-field">
              <legend>Canal</legend>
              <div className="promo-pills">
                {PROMO_CHANNELS.map((item) => (
                  <label key={item}>
                    <input type="radio" name="channel-ui" value={item} checked={channel === item} onChange={() => setChannel(item)} />
                    <span>{promoChannelLabel(item)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="promo-field">
              <legend>Formato</legend>
              <div className="promo-pills">
                {PROMO_FORMATS.map((item) => (
                  <label key={item}>
                    <input type="radio" name="format-ui" value={item} checked={format === item} onChange={() => setFormat(item)} />
                    <span>{promoFormatLabel(item)}</span>
                  </label>
                ))}
              </div>
              {format === "story" ? <p className="hint">El margen deja libre la zona de la historia y de una pieza vertical para TikTok.</p> : null}
            </fieldset>
            <fieldset className="promo-field">
              <legend>Estilo</legend>
              <div className="promo-pills">
                {styles.map((item) => (
                  <label key={item}>
                    <input type="radio" name="template-ui" value={item} checked={template === item} onChange={() => setTemplate(item)} />
                    <span>{promoTemplateLabel(item)}</span>
                  </label>
                ))}
              </div>
              <p className="hint">{TEMPLATE_HINT[template]}{template === "direct" && offer ? " Incluye el precio anterior porque ya está en el catálogo." : ""}</p>
            </fieldset>
            {editor.variants.length ? (
              <label className="field">Variante
                <select value={variantId} onChange={(event) => chooseVariant(event.target.value)}>
                  <option value="">Precio del producto</option>
                  {editor.variants.map((item) => (
                    <option key={item.id} value={item.id}>{item.label} · {item.priceLabel}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {editor.photos.length ? (
              <fieldset className="promo-field">
                <legend>Foto</legend>
                <div className="promo-photos">
                  {editor.photos.map((photo, index) => (
                    <label key={photo.url}>
                      <input type="radio" name="photo-ui" value={photo.url} checked={photoUrl === photo.url} onChange={() => setPhotoUrl(photo.url)} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.preview} alt={photo.alt || `Foto ${index + 1}`} />
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : <p className="hint">Este producto no tiene foto. La pieza usa la inicial del nombre.</p>}
            <label className="field">Texto para pegar
              <textarea name="caption" rows={4} maxLength={500} value={caption} onChange={(event) => { setCaptionTouched(true); setCopied(false); setCaption(event.target.value); }} />
            </label>
            <p className="hint promo-count">{caption.trim().length}/500</p>
            <label className="field">Línea de la imagen
              <input name="cta" maxLength={40} value={cta} onChange={(event) => { setCtaTouched(true); setCta(event.target.value); }} />
            </label>
            <p className="hint">El precio de la imagen y del texto sale del catálogo. Si cambia, la pieza usa el precio actual.</p>
            {editor.priceUpdated ? <p className="hint">El texto tenía un precio que ya no está en el catálogo. Quedó el precio de ahora.</p> : null}
            <p className="promo-link">{link}</p>
            {blocks.length ? (
              <ul className="note-bad" role="alert">
                {blocks.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
            {editor.id && dirty ? <p className="hint">Hay cambios sin guardar. La descarga usa la última versión guardada.</p> : null}
            {!editor.id ? <p className="hint">Guarda la pieza para descargarla y dejarla en el historial.</p> : null}
          </BoundForm>
          <div className="promo-share">
            {canExport ? <button type="button" className="btn" onClick={() => void download()}>Descargar imagen</button> : null}
            <button type="button" className="quiet" onClick={() => void copyText()}>{copied ? "Texto copiado" : "Copiar texto"}</button>
            {canExport ? <button type="button" className="quiet" onClick={() => void shareFile()}>Compartir</button> : null}
            {canExport && channel === "whatsapp" && whatsapp ? (
              <a className="quiet" href={whatsapp} target="_blank" rel="noreferrer" onClick={() => void rememberShare()}>Abrir WhatsApp</a>
            ) : null}
          </div>
          {notice ? <p className="note-ok" role="status">{notice}</p> : null}
          {shared ? <p className="hint">Quedó marcada como compartida.</p> : null}
          {canExport ? (
            <p className="hint">
              {channel === "whatsapp"
                ? "El catálogo no publica el estado. Descargar deja la pieza como creada. Abrir WhatsApp la marca como compartida."
                : `El catálogo no publica solo. Descargar deja la pieza como creada. Compartir la marca como compartida.`}
            </p>
          ) : null}
          {editor.id ? <DeletePiece id={editor.id} /> : null}
        </div>
      </div>
    </div>
  );
}

function DeletePiece({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deletePromoAction, emptyForm);
  const [confirming, setConfirming] = useState(false);
  return (
    <form className="promo-delete" action={action}>
      <input type="hidden" name="id" value={id} />
      <p className="hint">Se quita del historial. Si ya la publicaste, esa publicación sigue en la red.</p>
      {confirming ? (
        <span className="variant-confirm">
          <button className="quiet danger" type="submit" disabled={pending}>{pending ? "Eliminando" : "Eliminar pieza"}</button>
          <button className="quiet" type="button" onClick={() => setConfirming(false)}>Cancelar</button>
        </span>
      ) : (
        <button className="quiet danger" type="button" onClick={() => setConfirming(true)}>Eliminar pieza</button>
      )}
      {state.error ? <p className="note-bad" role="alert">{state.error}</p> : null}
    </form>
  );
}
