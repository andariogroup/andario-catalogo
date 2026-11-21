"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createQuoteAction } from "@/actions/quotes";
import { sendEvent } from "@/lib/track-client";
import { emptyForm } from "@/lib/form";
import { quoteLineProblem } from "@/lib/quotes";
import { listAsk, whatsappHref } from "@/lib/whatsapp";
import { ClientReady } from "./client-ready";
import { clearInterest, useInterest } from "./interes";
import { InlineActionSpinner, RequestPanelSkeleton } from "./skeletons";

type Guard = { productId: string; availability: string; variants: { id: string; availability: string }[] };

function lineProblem(name: string, productId: string, variantId: string | undefined, guards: Guard[]) {
  const product = guards.find((guard) => guard.productId === productId);
  if (!product) return `${name} ya no está publicada.`;
  return quoteLineProblem({
    productName: name,
    productAvailability: product.availability,
    variantAvailability: product.variants.find((variant) => variant.id === variantId)?.availability ?? null,
    hasVariants: product.variants.length > 0,
    variantId: variantId ?? "",
  });
}

function ListaSkeleton() {
  return <RequestPanelSkeleton label="Cargando lista…" />;
}

export function ListaCompra({
  store,
  phone,
  catalogUrl,
  guards,
}: {
  store: string;
  phone: string;
  catalogUrl: string;
  guards: Guard[];
}) {
  return (
    <ClientReady fallback={<ListaSkeleton />}>
      <ListaBody store={store} phone={phone} catalogUrl={catalogUrl} guards={guards} />
    </ClientReady>
  );
}

function ListaBody({
  store,
  phone,
  catalogUrl,
  guards,
}: {
  store: string;
  phone: string;
  catalogUrl: string;
  guards: Guard[];
}) {
  const interest = useInterest();
  const [quote, action, pending] = useActionState(createQuoteAction, emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const problems = interest.items.map((item) => lineProblem(item.name, item.productId, item.variantId, guards));
  const blocked = problems.some(Boolean);
  useEffect(() => {
    if (quote.ok) clearInterest();
  }, [quote.ok]);
  const href = whatsappHref(
    phone,
    listAsk(
      store,
      interest.items.map((item) => ({
        name: item.name,
        variant: item.variant,
        quantity: item.quantity,
        price: item.price,
      })),
      catalogUrl,
    ),
  );

  if (interest.items.length === 0 && !quote.ok) {
    return (
      <div className="cart-empty">
        <h2>Todavía no hay piezas en la lista</h2>
        <p>Guarda productos desde la ficha para consultarlos juntos. No es un carrito ni una compra.</p>
        <Link className="btn" href="/catalogo">
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="stack interest">
      {interest.items.map((item, index) => (
        <article className="row" key={`${item.productId}-${item.variantId ?? ""}`}>
          <strong>{item.name}</strong>
          <span>{item.variant}</span>
          <span>{item.price}</span>
          {problems[index] ? <p className="note-bad">{problems[index]}</p> : null}
          <button
            className="quiet"
            type="button"
            onClick={() => interest.setQuantity(item.productId, item.variantId, Math.max(1, item.quantity - 1))}
          >
            Menos
          </button>
          <span>{item.quantity}</span>
          <button
            className="quiet"
            type="button"
            onClick={() => interest.setQuantity(item.productId, item.variantId, Math.min(20, item.quantity + 1))}
          >
            Más
          </button>
          <button className="quiet" type="button" onClick={() => interest.remove(item.productId, item.variantId)}>
            Quitar
          </button>
        </article>
      ))}
      {href && interest.items.length ? (
        <a className="btn" href={href} onClick={() => sendEvent("interest_list_send", "/lista")}>
          Consultar la lista por WhatsApp
        </a>
      ) : null}
      <button className="quiet" type="button" aria-expanded={formOpen} onClick={() => setFormOpen((value) => !value)}>
        {formOpen ? "Ocultar formulario" : "Dejar datos para cotización"}
      </button>
      {formOpen || quote.ok || quote.error ? (
        <form className="stack" action={action}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden />
          <input type="hidden" name="origin" value="/lista" />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              interest.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId ?? "",
                quantity: item.quantity,
              })),
            )}
          />
          <label className="field">
            Nombre
            <input name="name" required minLength={2} />
          </label>
          <label className="field">
            WhatsApp
            <input name="phone" inputMode="tel" />
          </label>
          <label className="field">
            Correo
            <input name="email" type="email" />
          </label>
          <label className="field">
            Ciudad
            <input name="city" />
          </label>
          <label className="field">
            Mensaje
            <textarea name="message" rows={3} />
          </label>
          <label className="field check">
            <input name="consent" type="checkbox" required />{" "}
            <span>
              Acepto el tratamiento de estos datos según la{" "}
              <Link href="/politicas/privacidad" onMouseDown={(event) => event.preventDefault()}>
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {quote.error ? <p className="note-bad">{quote.error}</p> : null}
          {quote.ok ? (
            <p className="note-ok">
              Listo. {store} recibió tu solicitud {quote.ok}. Guarda esa referencia: si cierras la página, no vuelve a
              aparecer. Te escriben al dato que dejaste. No es una compra.
            </p>
          ) : null}
          <button
            className="btn"
            disabled={pending || blocked || interest.items.length === 0 || Boolean(quote.ok)}
            aria-busy={pending || undefined}
          >
            {pending ? <InlineActionSpinner label="Enviando cotización" /> : null}
            {pending ? "Enviando…" : "Solicitar cotización de la lista"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
