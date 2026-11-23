"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createQuoteAction } from "@/actions/quotes";
import { sendEvent } from "@/lib/track-client";
import { emitAddToCart, emitContactWhatsapp, TrackViewItem } from "@/components/consent/analytics-hooks";
import { emptyForm } from "@/lib/form";
import { cartEligible } from "@/lib/cart";
import {
  discountPercentLabel,
  fichaAvailabilityLabel,
  fichaCommerceSupportNote,
  fichaCompareLabel,
  fichaConversionPrimary,
  fichaOptionReachable,
  fichaPriceLabel,
  fichaPriceNote,
  fichaPrimaryTag,
  fichaProseBlocks,
  fichaSecondaryActions,
  fichaShowBlock,
  fichaShowQuantity,
  fichaWhatsAppCtaLabel,
} from "@/lib/ficha-presentation";
import { productAsk, whatsappHref } from "@/lib/whatsapp";
import { useCart } from "./cart";
import { ProductGallery } from "./product-gallery";
import { useInterest } from "./interes";
import { InlineActionSpinner } from "./skeletons";
import { ShoppingBag } from "lucide-react";

function WhatsAppGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

type Variant = { id: string; signature: string; pricePesos: string | null; availability: string; sku: string };
type Option = { id: string; attributeId: string; label: string };
type Value = { variantId: string; attributeId: string; optionId: string };
type AttributeMeta = { id: string; name: string };

function variantKey(variantId: string, values: Value[]) {
  return values.filter((value) => value.variantId === variantId).map((value) => value.optionId).sort().join(".");
}

export function FichaCompra({
  store,
  storeId,
  phone,
  symbol,
  product,
  variants,
  options,
  values,
  attributes,
  comparePesos,
  shortDescription,
  description,
  facts,
  tags,
  policies,
  category,
  url,
  photoUrl = "",
  intro = "",
  onSignature,
  initialOptionIds = [],
}: {
  store: string;
  storeId: string;
  phone: string;
  symbol: string;
  product: { id: string; name: string; sku: string; price: number | null; priceMode: string; availability: string; kind: string };
  variants: Variant[];
  options: Option[];
  values: Value[];
  attributes: AttributeMeta[];
  comparePesos: number | null;
  shortDescription: string;
  description: string;
  facts: { id: string; name: string; value: string }[];
  tags: string[];
  policies: string[];
  category: { name: string; href: string } | null;
  url: string;
  photoUrl?: string;
  intro?: string;
  onSignature?: (signature: string) => void;
  initialOptionIds?: string[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Option[]>();
    for (const value of values) {
      const option = options.find((item) => item.id === value.optionId);
      if (!option) continue;
      map.set(option.attributeId, [...(map.get(option.attributeId) ?? []), option]);
    }
    return [...map.entries()].map(([attributeId, list]) => {
      const unique = [...new Map(list.map((item) => [item.id, item])).values()];
      const meta = attributes.find((item) => item.id === attributeId);
      return { attributeId, name: meta?.name?.trim() || "Opción", options: unique };
    });
  }, [attributes, options, values]);

  const [picked, setPicked] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    const valid = new Set(values.map((row) => row.optionId));
    for (const optionId of initialOptionIds) {
      if (!valid.has(optionId)) continue;
      const option = options.find((item) => item.id === optionId);
      if (!option) continue;
      seed[option.attributeId] = optionId;
    }
    if (!Object.keys(seed).length) return {};
    const signature = Object.values(seed).sort().join(".");
    const exact = variants.some((item) => variantKey(item.id, values) === signature);
    if (exact) return seed;
    const partial: Record<string, string> = {};
    for (const [attributeId, optionId] of Object.entries(seed)) {
      const ok = values.some((row) => row.attributeId === attributeId && row.optionId === optionId);
      if (ok) partial[attributeId] = optionId;
    }
    return partial;
  });
  const [quantity, setQuantity] = useState(1);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [cartNote, setCartNote] = useState("");
  const [adding, setAdding] = useState(false);
  const signature = Object.values(picked).sort().join(".");
  const variant = signature ? variants.find((item) => variantKey(item.id, values) === signature) : undefined;
  const unit = variant?.pricePesos != null ? Number(variant.pricePesos) : product.price;
  const availability = variant?.availability ?? product.availability;
  const sku = (variant?.sku || product.sku || "").trim();
  const priceLabel = fichaPriceLabel({ priceMode: product.priceMode, unit, symbol });
  const priceNote = fichaPriceNote(product.priceMode);
  const discount = discountPercentLabel({ priceMode: product.priceMode, comparePesos, unit });
  const compare = fichaCompareLabel({ comparePesos, unit, symbol });
  const variantLabel = Object.values(picked)
    .map((id) => options.find((option) => option.id === id)?.label)
    .filter(Boolean)
    .join(" · ");
  const ask = productAsk(store, { name: product.name, sku, variant: variantLabel, price: priceLabel, quantity, url }, intro);
  const href = whatsappHref(phone, ask);
  const interest = useInterest();
  const cart = useCart(storeId);
  const [quote, quoteAction, pending] = useActionState(createQuoteAction, emptyForm);
  const needsChoice = groups.length > 0 && !variant;
  const closed = availability === "sold_out";
  const canAdd = cartEligible({ needsChoice, availability });
  const leadTag = fichaPrimaryTag(tags);
  const secondaryTags = tags.filter((tag) => tag !== leadTag);
  const showQuantity = fichaShowQuantity({ kind: product.kind, priceMode: product.priceMode });
  const primary = fichaConversionPrimary({
    cartEligible: !closed,
    hasWhatsApp: Boolean(href),
    soldOut: closed,
    priceMode: product.priceMode,
    kind: product.kind,
  });
  const secondary = fichaSecondaryActions({
    primary,
    cartEligible: !closed,
    hasWhatsApp: Boolean(href),
    soldOut: closed,
    priceMode: product.priceMode,
  });
  const showSummary = fichaShowBlock(shortDescription);
  const showDescription = fichaShowBlock(description);
  const showFacts = fichaShowBlock(facts);
  const showSku = fichaShowBlock(sku);
  const showTags = fichaShowBlock(tags);
  const showVariants = groups.length > 0;
  const policyLinks = [
    policies.includes("envios") ? { href: "/politicas/envios", label: "Envíos" } : null,
    policies.includes("cambios") ? { href: "/politicas/cambios", label: "Cambios" } : null,
    policies.includes("terminos") ? { href: "/politicas/terminos", label: "Términos" } : null,
    policies.includes("privacidad") ? { href: "/politicas/privacidad", label: "Privacidad" } : null,
  ].filter(Boolean) as { href: string; label: string }[];
  const origin = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "";
    }
  })();
  const trackPath = origin || "/";
  const summary = shortDescription.trim();
  const body = description.trim();
  const saved = interest.items.some(
    (item) => item.productId === product.id && (item.variantId || "") === (variant?.id || ""),
  );

  async function share() {
    const data = { title: product.name, text: product.name, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        sendEvent("product_share", trackPath, product.id);
        setShareNote("Compartido");
        return;
      }
      await navigator.clipboard.writeText(url);
      sendEvent("product_link_copy", trackPath, product.id);
      setShareNote("Enlace copiado");
    } catch {
      setShareNote("");
    }
  }

  function openQuote() {
    setQuoteOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("ficha-quote")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function addToCart() {
    if (!canAdd || adding) return;
    setAdding(true);
    const unitPesos = product.priceMode === "ask" ? null : Number.isFinite(unit as number) ? (unit as number) : null;
    try {
      cart.add({
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        variantLabel: variantLabel || undefined,
        photoUrl: photoUrl || undefined,
        productUrl: url,
        sku: sku || undefined,
        priceMode: product.priceMode,
        unitPesos,
        currencySymbol: symbol,
        availability,
        quantity,
      });
      setCartNote("Producto agregado al carrito");
      sendEvent("cart_add", trackPath, product.id);
      emitAddToCart({
        currency: "COP",
        value: unitPesos == null ? null : unitPesos * quantity,
        items: [
          {
            item_id: sku || product.id,
            item_name: product.name,
            item_variant: variantLabel || undefined,
            price: unitPesos ?? undefined,
            quantity,
          },
        ],
      });
    } finally {
      // Sin espera artificial: el guard `adding` evita doble clic en el mismo turno.
      queueMicrotask(() => setAdding(false));
    }
  }

  return (
    <div className="ficha-buy">
      <TrackViewItem
        currency="COP"
        value={product.priceMode === "ask" || unit == null || !Number.isFinite(unit as number) ? null : Number(unit)}
        items={[
          {
            item_id: sku || product.id,
            item_name: product.name,
            item_variant: variantLabel || undefined,
            price: product.priceMode === "ask" || unit == null || !Number.isFinite(unit as number) ? undefined : Number(unit),
            quantity: 1,
          },
        ]}
      />
      <nav className="ficha-crumbs" aria-label="Ubicación">
        <ol>
          <li>
            <Link href="/catalogo">Catálogo</Link>
          </li>
          {category ? (
            <li>
              <Link href={category.href}>{category.name}</Link>
            </li>
          ) : null}
          <li>
            <span aria-current="page">{product.name}</span>
          </li>
        </ol>
      </nav>

      <header className="ficha-head">
        <h1>{product.name}</h1>
        {showTags ? (
          <ul className="ficha-tags" aria-label="Etiquetas">
            {leadTag ? <li className="is-primary">{leadTag}</li> : null}
            {secondaryTags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="ficha-price-block">
        {compare || discount ? (
          <p className="ficha-offer-line">
            {compare ? <span className="ficha-compare">{compare}</span> : null}
            {discount ? <span className="ficha-off">{discount}</span> : null}
          </p>
        ) : null}
        <p className="ficha-price">{priceLabel}</p>
        {priceNote ? <p className="ficha-price-note">{priceNote}</p> : null}
        <p className={`ficha-stock is-${availability}`}>{fichaAvailabilityLabel(availability)}</p>
      </div>

      {showSummary ? <p className="ficha-summary">{summary}</p> : null}

      {showVariants ? (
        <div className="ficha-options">
          {groups.map((group) => (
            <fieldset className="ficha-option-group" key={group.attributeId}>
              <legend>{group.name}</legend>
              <div className="ficha-option-list" role="group" aria-label={group.name}>
                {group.options.map((option) => {
                  const state = fichaOptionReachable({
                    attributeId: group.attributeId,
                    optionId: option.id,
                    picked,
                    values,
                    variants,
                  });
                  const selected = picked[group.attributeId] === option.id;
                  return (
                    <button
                      key={option.id}
                      className={`ficha-option${state.allSoldOut ? " is-sold" : ""}${!state.reachable ? " is-unavailable" : ""}`}
                      type="button"
                      aria-pressed={selected}
                      aria-disabled={!state.reachable || undefined}
                      disabled={!state.reachable}
                      title={
                        !state.reachable
                          ? "Combinación no disponible"
                          : state.allSoldOut
                            ? "Agotado"
                            : undefined
                      }
                      onClick={() => {
                        if (!state.reachable) return;
                        const next = { ...picked, [group.attributeId]: option.id };
                        setPicked(next);
                        onSignature?.(Object.values(next).sort().join("."));
                      }}
                    >
                      {option.label}
                      {state.reachable && state.allSoldOut ? <span className="ficha-option-note">Agotado</span> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {needsChoice ? (
            <p className="hint">
              {primary === "cart"
                ? "Elige cada opción para agregar la variante correcta al carrito."
                : "Elige cada opción para consultar la variante correcta."}
            </p>
          ) : null}
        </div>
      ) : null}

      {showQuantity ? (
        <div className="ficha-qty">
          <span className="ficha-qty-label" id="ficha-qty-label">
            Cantidad
          </span>
          <div className="ficha-qty-control" role="group" aria-labelledby="ficha-qty-label">
            <button
              className="ficha-qty-btn"
              type="button"
              aria-label="Reducir cantidad"
              disabled={quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              −
            </button>
            <span className="ficha-qty-value" aria-live="polite">
              {quantity}
            </span>
            <button
              className="ficha-qty-btn"
              type="button"
              aria-label="Aumentar cantidad"
              disabled={quantity >= 20}
              onClick={() => setQuantity((value) => Math.min(20, value + 1))}
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <div className="ficha-cta">
        {primary === "whatsapp" && href ? (
          <a
            className="btn ficha-cta-primary ficha-cta-whatsapp"
            href={href}
            onClick={() => {
              sendEvent("whatsapp_click", trackPath, product.id, "product");
              emitContactWhatsapp("product", { id: product.id, name: product.name });
            }}
          >
            <WhatsAppGlyph />
            {fichaWhatsAppCtaLabel(product.priceMode)}
          </a>
        ) : null}
        {primary === "cart" ? (
          <button
            className="btn ficha-cta-primary ficha-cta-cart"
            type="button"
            disabled={!canAdd || adding}
            onClick={addToCart}
          >
            {adding ? <InlineActionSpinner label="Agregando al carrito" /> : <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.9} />}
            {adding ? "Agregando…" : needsChoice ? "Elige opciones para agregar" : "Agregar al carrito"}
          </button>
        ) : null}
        {primary === "quote" ? (
          <button
            className="btn ficha-cta-primary"
            type="button"
            disabled={needsChoice || closed || Boolean(quote.ok)}
            onClick={openQuote}
            aria-expanded={quoteOpen}
            aria-controls="ficha-quote"
          >
            Solicitar cotización
          </button>
        ) : null}
        {cartNote ? (
          <div className="ficha-cart-confirm" role="status" aria-live="polite">
            <p>{cartNote}</p>
            <div className="ficha-cart-confirm-actions">
              <button className="quiet" type="button" onClick={() => setCartNote("")}>
                Seguir explorando
              </button>
              <Link className="btn" href="/carrito">
                Ver carrito
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className="ficha-cta-extra">
        {secondary.showCart ? (
          <button
            className="ficha-cta-secondary ficha-cta-cart"
            type="button"
            disabled={!canAdd || adding}
            onClick={addToCart}
          >
            {adding ? <InlineActionSpinner label="Agregando al carrito" /> : <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.9} />}
            {adding ? "Agregando…" : needsChoice ? "Elige opciones para agregar" : "Agregar al carrito"}
          </button>
        ) : null}
        <p className="ficha-commerce-note">{fichaCommerceSupportNote({ primary, store })}</p>
      </div>

      <div className="ficha-secondary" aria-label="Otras acciones">
        {secondary.showQuote ? (
          <button
            className="quiet ficha-tertiary"
            type="button"
            disabled={needsChoice || closed || Boolean(quote.ok)}
            onClick={openQuote}
            aria-expanded={quoteOpen}
            aria-controls="ficha-quote"
          >
            Solicitar cotización
          </button>
        ) : null}
        {secondary.showWhatsApp && href ? (
          <a
            className="quiet ficha-tertiary"
            href={href}
            onClick={() => {
              sendEvent("whatsapp_click", trackPath, product.id, "product_secondary");
              emitContactWhatsapp("product_secondary", { id: product.id, name: product.name });
            }}
          >
            {fichaWhatsAppCtaLabel(product.priceMode)}
          </a>
        ) : null}
        <button
          className={`quiet ficha-tertiary${saved ? " is-saved" : ""}`}
          type="button"
          disabled={needsChoice || closed}
          onClick={() => {
            interest.add({
              productId: product.id,
              name: product.name,
              variantId: variant?.id,
              variant: variantLabel,
              quantity,
              price: priceLabel,
            });
            sendEvent("interest_list_add", trackPath, product.id);
          }}
        >
          {saved ? "En tu lista" : "Guardar en lista"}
        </button>
        <button className="quiet ficha-tertiary" type="button" onClick={() => void share()}>
          Compartir
        </button>
        {shareNote ? (
          <span className="ficha-share-note" role="status">
            {shareNote}
          </span>
        ) : null}
      </div>

      {showSku ? <p className="ficha-sku">SKU {sku}</p> : null}

      {policyLinks.length ? (
        <nav className="ficha-policies" aria-label="Condiciones">
          {policyLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {showDescription || showFacts ? (
        <div className="ficha-info">
          {showDescription ? (
            <section className="ficha-section" aria-labelledby="ficha-desc-title">
              <h2 id="ficha-desc-title">Descripción</h2>
              <FichaProse text={body} />
            </section>
          ) : null}
          {showFacts ? (
            <section className="ficha-section" aria-labelledby="ficha-specs-title">
              <h2 id="ficha-specs-title">Características</h2>
              <dl className="ficha-facts">
                {facts.map((item) => (
                  <div key={item.id}>
                    <dt>{item.name}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}

      <section
        id="ficha-quote"
        className={`ficha-quote${quoteOpen || quote.ok || quote.error ? " is-open" : ""}`}
        hidden={!quoteOpen && !quote.ok && !quote.error}
        aria-label="Solicitar cotización"
      >
        <h2>Solicitar cotización</h2>
        <p className="ficha-quote-lead">
          {product.name}
          {variantLabel ? ` · ${variantLabel}` : ""}
          {showQuantity ? ` · Cantidad ${quantity}` : ""}
        </p>
        <form className="ficha-quote-form" action={quoteAction}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden />
          <input type="hidden" name="origin" value={origin} />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify([{ productId: product.id, variantId: variant?.id ?? "", quantity }])}
          />
          <label className="field">
            Nombre
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
          <label className="field">
            WhatsApp
            <input name="phone" inputMode="tel" autoComplete="tel" />
          </label>
          <label className="field">
            Correo
            <input name="email" type="email" autoComplete="email" />
          </label>
          <label className="field">
            Ciudad
            <input name="city" autoComplete="address-level2" />
          </label>
          <label className="field">
            Mensaje
            <textarea name="message" rows={3} />
          </label>
          <label className="field check">
            <input name="consent" type="checkbox" required />
            <span>
              Acepto el tratamiento de estos datos según la{" "}
              <Link href="/politicas/privacidad" onMouseDown={(event) => event.preventDefault()}>
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {closed ? <p className="hint">Está agotado. Cuando vuelva, podrás pedir la cotización.</p> : null}
          {needsChoice ? <p className="hint">Elige cada opción antes de solicitar la cotización.</p> : null}
          {quote.error ? <p className="note-bad">{quote.error}</p> : null}
          {quote.ok ? (
            <p className="note-ok">
              Listo. {store} recibió tu solicitud {quote.ok}. Guarda esa referencia: si cierras la página, no vuelve a
              aparecer. Te escriben al dato que dejaste. No es una compra.
            </p>
          ) : null}
          <button
            className="btn"
            disabled={pending || needsChoice || closed || Boolean(quote.ok)}
            aria-busy={pending || undefined}
          >
            {pending ? <InlineActionSpinner label="Enviando cotización" /> : null}
            {pending ? "Enviando…" : "Enviar cotización"}
          </button>
        </form>
      </section>
    </div>
  );
}

function FichaProse({ text }: { text: string }) {
  const blocks = fichaProseBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className="ficha-prose">
      {blocks.map((block, index) => {
        if (block.type === "ul") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{item}</li>
              ))}
            </ol>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}

export function FichaVista({
  name,
  photos,
  albums,
  ...compra
}: {
  name: string;
  photos: { url: string; alt: string }[];
  albums: Record<string, { url: string; alt: string }[]>;
} & Omit<Parameters<typeof FichaCompra>[0], "onSignature" | "photoUrl">) {
  const [signature, setSignature] = useState("");
  const chosen = albums[signature];
  const shown = chosen?.length ? chosen : photos;
  return (
    <div className="ficha">
      <ProductGallery key={shown.map((photo) => photo.url).join("|") || "vacio"} name={name} photos={shown} />
      <FichaCompra {...compra} photoUrl={shown[0]?.url || photos[0]?.url || ""} onSignature={setSignature} />
    </div>
  );
}
