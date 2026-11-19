"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { createQuoteAction } from "@/actions/quotes";
import { trackEventAction } from "@/actions/events";
import { emitContactWhatsapp, emitRemoveFromCart, TrackViewCart } from "@/components/consent/analytics-hooks";
import {
  CART_MAX_QTY,
  cartCountLabel,
  cartLineSubtotal,
  cartNeedsQuote,
  cartRequestLines,
  cartTotals,
  cartUnitPriceLabel,
  formatCartSubtotal,
} from "@/lib/cart";
import { mediaDeliveryUrl } from "@/lib/images";
import { emptyForm } from "@/lib/form";
import { formatPesos } from "@/lib/money";
import { quoteLineProblem } from "@/lib/quotes";
import { cartAsk, whatsappHref } from "@/lib/whatsapp";
import { ClientReady } from "./client-ready";
import { useCart } from "./cart";
import { InlineActionSpinner, RequestPanelSkeleton } from "./skeletons";

type Guard = { productId: string; availability: string; variants: { id: string; availability: string }[] };

function productHref(url?: string) {
  if (!url) return "";
  try {
    if (url.startsWith("/")) return url;
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

function lineProblem(name: string, productId: string, variantId: string | undefined, guards: Guard[]) {
  const product = guards.find((guard) => guard.productId === productId);
  if (!product) return `${name} ya no está publicado.`;
  return quoteLineProblem({
    productName: name,
    productAvailability: product.availability,
    variantAvailability: product.variants.find((variant) => variant.id === variantId)?.availability ?? null,
    hasVariants: product.variants.length > 0,
    variantId: variantId ?? "",
  });
}

function CartSkeleton() {
  return <RequestPanelSkeleton label="Cargando carrito…" />;
}

export function CarritoVista({
  store,
  storeId,
  phone,
  catalogUrl,
  guards,
}: {
  store: string;
  storeId: string;
  phone: string;
  catalogUrl: string;
  guards: Guard[];
}) {
  return (
    <ClientReady fallback={<CartSkeleton />}>
      <CarritoBody store={store} storeId={storeId} phone={phone} catalogUrl={catalogUrl} guards={guards} />
    </ClientReady>
  );
}

function CarritoBody({
  store,
  storeId,
  phone,
  catalogUrl,
  guards,
}: {
  store: string;
  storeId: string;
  phone: string;
  catalogUrl: string;
  guards: Guard[];
}) {
  const cart = useCart(storeId);
  const [quote, action, pending] = useActionState(createQuoteAction, emptyForm);
  const liveId = useId();
  const formId = useId();
  const [announce, setAnnounce] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const problems = cart.items.map((item) => lineProblem(item.name, item.productId, item.variantId, guards));
  const blocked = problems.some(Boolean);
  const totals = cartTotals(cart.items);
  const subtotalLabel = formatCartSubtotal(totals);
  const needsQuote = cartNeedsQuote(cart.items);
  const countLabel = cartCountLabel(totals.lineCount, totals.unitCount);
  const waLines = cart.items.map((item) => ({
    name: item.name,
    variant: item.variantLabel,
    quantity: item.quantity,
    price: item.priceMode === "ask" || item.unitPesos == null ? undefined : cartUnitPriceLabel(item),
  }));
  const href = whatsappHref(phone, cartAsk(store, waLines, { subtotal: subtotalLabel, catalogUrl }));

  useEffect(() => {
    if (quote.ok) {
      cart.clear();
      setContactOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al confirmar envío del formulario
  }, [quote.ok]);

  if (cart.items.length === 0 && !quote.ok) {
    return (
      <div className="cart-empty">
        <ShoppingBag aria-hidden="true" size={36} strokeWidth={1.5} />
        <h1>Tu carrito está vacío</h1>
        <p>
          Explora el catálogo y agrega los productos que te interesen. No es un pago en línea: es una solicitud para
          que te confirmen.
        </p>
        <Link className="btn" href="/catalogo">
          Explorar productos
        </Link>
      </div>
    );
  }

  if (quote.ok && cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <h1>Solicitud enviada</h1>
        <p className="note-ok">
          Listo. {store} recibió tu solicitud {quote.ok}. Guarda esa referencia: si cierras la página, no vuelve a
          aparecer. Te escriben al dato que dejaste. No es una compra.
        </p>
        <Link className="btn" href="/catalogo">
          Seguir explorando
        </Link>
      </div>
    );
  }

  const analyticsItems = cart.items.map((item) => ({
    item_id: item.sku || item.productId,
    item_name: item.name,
    item_variant: item.variantLabel || undefined,
    price: item.unitPesos ?? undefined,
    quantity: item.quantity,
  }));

  return (
    <div className="cart-layout">
      <TrackViewCart currency="COP" value={totals.pricedSubtotal ?? null} items={analyticsItems} />
      <div className="cart-main">
        <header className="cart-page-head">
          <div className="cart-page-head-row">
            <h1>Tu carrito</h1>
            <Link className="cart-keep" href="/catalogo">
              Seguir explorando
            </Link>
          </div>
          <p>Revisa tus productos antes de enviar la solicitud. No es un checkout ni un pago en línea.</p>
          <p className="cart-count" aria-live="polite">
            {countLabel}
          </p>
        </header>

        <div className="cart-list" aria-live="polite" aria-atomic="false" id={liveId}>
          {announce ? (
            <p className="sr-only" role="status">
              {announce}
            </p>
          ) : null}
          {cart.items.map((item, index) => {
            const lineTotal = cartLineSubtotal(item);
            const hrefProduct = productHref(item.productUrl);
            const unitLabel = cartUnitPriceLabel(item);
            return (
              <article className="cart-line" key={`${item.productId}-${item.variantId ?? ""}`}>
                <div className="cart-line-media">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaDeliveryUrl(item.photoUrl, { width: 192, height: 192, crop: "fill" })}
                      alt=""
                      width={96}
                      height={96}
                    />
                  ) : (
                    <span className="cart-line-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="cart-line-body">
                  <div className="cart-line-head">
                    {hrefProduct ? (
                      <Link href={hrefProduct}>
                        <strong>{item.name}</strong>
                      </Link>
                    ) : (
                      <strong>{item.name}</strong>
                    )}
                    <button
                      className="quiet cart-remove"
                      type="button"
                      onClick={() => {
                        emitRemoveFromCart({
                          currency: "COP",
                          value: item.unitPesos == null ? null : item.unitPesos * item.quantity,
                          items: [
                            {
                              item_id: item.sku || item.productId,
                              item_name: item.name,
                              item_variant: item.variantLabel || undefined,
                              price: item.unitPesos ?? undefined,
                              quantity: item.quantity,
                            },
                          ],
                        });
                        cart.remove(item.productId, item.variantId);
                        setAnnounce(`${item.name} eliminado del carrito`);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                  {item.variantLabel ? <p className="cart-line-variant">{item.variantLabel}</p> : null}
                  <p className="cart-line-price">
                    {item.priceMode === "ask" || item.unitPesos == null ? unitLabel : `Precio unitario: ${unitLabel}`}
                  </p>
                  {problems[index] ? <p className="note-bad">{problems[index]}</p> : null}
                  <div className="cart-line-actions">
                    <div className="ficha-qty-control cart-qty" role="group" aria-label={`Cantidad de ${item.name}`}>
                      <button
                        className="ficha-qty-btn"
                        type="button"
                        aria-label={`Reducir cantidad de ${item.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => cart.setQuantity(item.productId, item.variantId, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="ficha-qty-value" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        className="ficha-qty-btn"
                        type="button"
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        disabled={item.quantity >= CART_MAX_QTY}
                        onClick={() => cart.setQuantity(item.productId, item.variantId, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    {lineTotal != null ? (
                      <p className="cart-line-sub">Subtotal: {formatPesos(lineTotal, item.currencySymbol)}</p>
                    ) : (
                      <p className="cart-line-sub is-quote">Pendiente de cotización</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="cart-summary">
        <h2>Resumen de tu carrito</h2>
        <p className="cart-summary-count">{countLabel}</p>
        <dl className="cart-summary-facts">
          {subtotalLabel ? (
            <div>
              <dt>Subtotal de referencia</dt>
              <dd>{subtotalLabel}</dd>
            </div>
          ) : null}
          {totals.quoteCount > 0 ? (
            <div>
              <dt>Sin precio público</dt>
              <dd>
                {totals.quoteCount} {totals.quoteCount === 1 ? "artículo" : "artículos"} por cotizar
              </dd>
            </div>
          ) : null}
        </dl>
        {totals.mixedCurrency ? (
          <p className="note-bad">Hay monedas distintas; el subtotal no se unifica automáticamente.</p>
        ) : null}
        {totals.pricedCount > 0 && totals.quoteCount > 0 ? (
          <p className="cart-summary-note">
            El subtotal solo incluye artículos con precio publicado. Los demás requieren cotización.
          </p>
        ) : null}
        <p className="cart-summary-note">
          La disponibilidad y los costos adicionales, si aplican, se confirman con el negocio.
        </p>

        {href && cart.items.length ? (
          <a
            className="btn cart-summary-primary"
            href={href}
            onClick={() => {
              void trackEventAction("cart_send", "/carrito");
              emitContactWhatsapp("cart");
            }}
          >
            Enviar selección por WhatsApp
          </a>
        ) : null}

        <div className="cart-alt">
          <p className="cart-alt-lead">¿Prefieres que el negocio te contacte?</p>
          <button
            className="quiet cart-alt-toggle"
            type="button"
            aria-expanded={contactOpen}
            aria-controls={formId}
            onClick={() => setContactOpen((value) => !value)}
          >
            {contactOpen ? "Ocultar formulario" : "Dejar mis datos de contacto"}
          </button>
        </div>

        {contactOpen ? (
          <form className="cart-quote stack" id={formId} action={action}>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden />
            <input type="hidden" name="origin" value="/carrito" />
            <input type="hidden" name="items" value={JSON.stringify(cartRequestLines(cart.items))} />
            <div className="cart-quote-head">
              <h3>Deja tus datos para que te contactemos</h3>
              <p>
                {needsQuote
                  ? "Tu selección se enviará como solicitud de cotización. Incluye todos los productos del carrito."
                  : "Tu selección de productos se incluirá en la solicitud."}
              </p>
            </div>
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
            {quote.error ? <p className="note-bad">{quote.error}</p> : null}
            <button
              className="btn"
              disabled={pending || blocked || cart.items.length === 0 || Boolean(quote.ok)}
              type="submit"
              aria-busy={pending || undefined}
            >
              {pending ? <InlineActionSpinner label="Enviando solicitud" /> : null}
              {pending ? "Enviando…" : needsQuote ? "Solicitar cotización" : "Enviar solicitud"}
            </button>
          </form>
        ) : null}
      </aside>
    </div>
  );
}
