import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuoteAction } from "@/actions/quotes";
import { QuoteActions } from "@/components/admin/cotizaciones-list";
import { requirePermission } from "@/lib/auth";
import { formatPesos, pesosFromDb } from "@/lib/money";
import { allows } from "@/lib/permissions";
import { purgeExpiredQuotes } from "@/lib/quote-retention";
import { isQuoteState, QUOTE_STATES, quoteAgo, quoteIsOpen, quoteManagerLabel, quoteNext, quoteStateLabel, quoteStepHint, quoteStepRecord, quoteWhen, readableVariant } from "@/lib/quotes";
import { adminLists, loadShell, quoteDetail } from "@/lib/store";
import { quoteReply, whatsappHref } from "@/lib/whatsapp";

function piecesOf(count: number) {
  if (count === 1) return "1 pieza";
  return `${count} piezas`;
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("quotes", "read");
  const { id } = await params;
  await purgeExpiredQuotes();
  const detail = await quoteDetail(id);
  const shell = await loadShell();
  const lists = await adminLists();
  if (!detail || !shell || !lists) notFound();
  const canManage = allows(user.role, "quotes", "manage");
  const status = isQuoteState(detail.quote.status) ? detail.quote.status : null;
  const optionLabel = new Map(lists.options.map((option) => {
    const attribute = lists.attributes.find((item) => item.id === option.attributeId);
    return [option.id, attribute ? `${attribute.name}: ${option.label}` : option.label] as const;
  }));
  const symbol = shell.business.currencySymbol || "$";
  const lines = detail.items.map((item) => {
    const amount = pesosFromDb(item.unitPrice);
    const variant = readableVariant(item.variantLabel, optionLabel);
    return {
      ...item,
      variant,
      unit: amount == null ? "Sin precio publicado" : formatPesos(amount, symbol),
      total: amount == null ? null : amount * item.quantity,
      reply: [item.productName, variant, item.quantity === 1 ? "1 unidad" : `${item.quantity} unidades`].filter(Boolean).join(" · "),
    };
  });
  const priced = lines.every((line) => line.total != null);
  const publishedTotal = priced ? lines.reduce((sum, line) => sum + (line.total ?? 0), 0) : null;
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0);
  const href = whatsappHref(detail.quote.phone, quoteReply(shell.business.name, detail.quote.name, detail.quote.reference, lines.map((line) => line.reply)));
  const products = new Set(lists.products.map((product) => product.id));
  const manager = status ? quoteManagerLabel(detail.quote.managedBy, new Map(lists.users.map((person) => [person.email.toLowerCase(), person.name])), status) : "Sin responsable";
  const step = QUOTE_STATES.indexOf(status ?? "nueva");
  const next = status ? quoteNext(status) : null;
  const changed = detail.quote.updatedAt.getTime() > detail.quote.createdAt.getTime();
  const history = [
    ...detail.steps.flatMap((item) => {
      const label = quoteStepRecord(item.action);
      return label ? [{ id: item.id, at: item.createdAt.getTime(), title: label, detail: quoteWhen(item.createdAt) }] : [];
    }),
    ...detail.notes.map((note) => ({
      id: note.id,
      at: note.createdAt.getTime(),
      title: note.body,
      detail: `${note.authorEmail} · ${quoteWhen(note.createdAt)}`,
    })),
  ].sort((left, right) => left.at - right.at);
  return (
    <main className="quote-page">
      <p className="quote-crumb"><Link href="/admin/cotizaciones">Cotizaciones</Link></p>
      <header className="quote-hero">
        <div>
          <p className="quote-kicker">{detail.quote.reference}</p>
          <div className="quote-title">
            <h1>{detail.quote.name}</h1>
            <span className={status ? `category-tag quote-state quote-state-${status}` : "category-tag draft"}>{status ? quoteStateLabel(status) : detail.quote.status}</span>
          </div>
          <p className="lead">No es una compra ni una oferta aprobada.</p>
          <p className="hint">{quoteAgo(detail.quote.createdAt)} · {quoteWhen(detail.quote.createdAt)}{changed ? ` · Último cambio ${quoteAgo(detail.quote.updatedAt)}` : ""}</p>
        </div>
        <div className="quote-hero-meta">
          <p>{manager}</p>
          {next ? <p className="hint">Siguiente paso: {next.label}</p> : null}
        </div>
      </header>
      {status ? (
        <ol className="quote-steps" aria-label="Paso actual">
          {QUOTE_STATES.map((item, index) => (
            <li key={item} aria-current={item === status ? "step" : undefined} data-done={index < step ? "true" : "false"}>
              <span>{index + 1}</span>
              {quoteStateLabel(item)}
            </li>
          ))}
        </ol>
      ) : null}
      {status ? <p className="quote-now">{quoteStepHint(status)}</p> : null}
      <div className="quote-layout">
        <div className="quote-layout-main">
          <section className="quote-card">
            <header className="quote-card-head">
              <h2>Qué pidió</h2>
              <p>{piecesOf(pieces)}</p>
            </header>
            {lines.length ? (
              <ul className="quote-lines">
                {lines.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{[item.variant, item.sku ? `SKU ${item.sku}` : "", item.quantity === 1 ? "1 unidad" : `${item.quantity} unidades`].filter(Boolean).join(" · ")}</span>
                    </div>
                    <div className="quote-line-price">
                      <b>{item.unit}</b>
                      {item.total != null ? <span>{formatPesos(item.total, symbol)} publicados</span> : null}
                      {item.productId && products.has(item.productId) ? <Link href={`/admin/productos/${item.productId}`}>Ver producto</Link> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="hint">Esta solicitud se guardó sin piezas.</p>}
            {publishedTotal != null ? <p className="quote-total">Total publicado {formatPesos(publishedTotal, symbol)} <span>No incluye envío ni impuestos.</span></p> : lines.length ? <p className="hint">Hay piezas sin precio publicado, así que no hay un total.</p> : null}
          </section>
          <section className="quote-card">
            <h2>Historial</h2>
            {history.length ? (
              <ol className="quote-history">
                {history.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="hint">Todavía no hay pasos ni notas.</p>}
          </section>
        </div>
        <aside className="quote-layout-side">
          <section className="quote-card">
            <h2>Contacto</h2>
            <dl className="quote-facts">
              <div><dt>Teléfono</dt><dd>{detail.quote.phone || "Sin teléfono"}</dd></div>
              <div><dt>Correo</dt><dd>{detail.quote.email || "Sin correo"}</dd></div>
              <div><dt>Ciudad</dt><dd>{detail.quote.city || "Sin ciudad"}</dd></div>
            </dl>
            {detail.quote.message ? <p className="quote-message">{detail.quote.message}</p> : <p className="hint">No dejó un mensaje.</p>}
            {href ? <a className="btn" href={href} target="_blank" rel="noreferrer">{status && quoteIsOpen(status) ? "Escribir por WhatsApp" : "Abrir WhatsApp"}</a> : <p className="hint">El teléfono no alcanza para abrir WhatsApp.</p>}
          </section>
          <section className="quote-card quote-work">
            <h2>Tu gestión</h2>
            {canManage && status ? <QuoteActions id={detail.quote.id} status={status} /> : <p className="hint">Puedes consultar la solicitud. Cambiar el estado queda para quien gestiona cotizaciones.</p>}
          </section>
          {canManage ? (
            <details className="quote-remove">
              <summary>Quitar esta solicitud</summary>
              <p className="hint">Se borra la solicitud, las piezas y las notas. No espera al plazo de retención.</p>
              <form className="stack" action={deleteQuoteAction}>
                <input type="hidden" name="id" value={detail.quote.id} />
                <label className="field check"><input name="confirm" type="checkbox" required /> Sí, quitar esta solicitud.</label>
                <button className="quiet" type="submit">Quitar solicitud</button>
              </form>
            </details>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
