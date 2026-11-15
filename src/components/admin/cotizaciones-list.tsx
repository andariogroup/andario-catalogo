"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateQuoteAction } from "@/actions/quotes";
import { emptyForm } from "@/lib/form";
import { byArrival, quoteMatchesStatuses, quoteNext, QUOTE_STATES, QUOTE_WAIT_DAYS, type QuoteCard, type QuoteState, type QuoteStatusChoice } from "@/lib/quotes";

const PAGE_SIZES = [8, 16, 24] as const;
const STATUS_CHOICES: { id: QuoteStatusChoice; label: string }[] = [
  { id: "open", label: "Abiertas" },
  { id: "nueva", label: "Nuevas" },
  { id: "en-gestion", label: "En gestión" },
  { id: "atendida", label: "Atendidas" },
  { id: "cerrada", label: "Cerradas" },
];

function piecesOf(count: number) {
  if (count === 1) return "1 pieza";
  return `${count} piezas`;
}

export function QuoteBoard({ quotes }: { quotes: QuoteCard[] }) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<QuoteStatusChoice[]>([]);
  const [wait, setWait] = useState<(typeof QUOTE_WAIT_DAYS)[number] | null>(null);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(8);
  const [page, setPage] = useState(1);
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = byArrival(quotes.filter((quote) => {
    if (wait != null && !(quote.unmanaged && quote.ageDays >= wait)) return false;
    if (!quoteMatchesStatuses(quote.status, statuses)) return false;
    if (!needle) return true;
    return [quote.reference, quote.name, quote.phone, quote.city, quote.summary, quote.manager].some((value) => value.toLocaleLowerCase("es").includes(needle));
  }));
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const slice = visible.slice(start, start + pageSize);
  const from = visible.length ? start + 1 : 0;
  const to = start + slice.length;

  return (
    <div className="category-tools">
      <section className="quote-aging" aria-label="Sin gestionar">
        <h2>Sin gestionar</h2>
        <p className="hint">Siguen en Nueva. Nadie las ha tomado.</p>
        <div className="quote-aging-grid">
          {QUOTE_WAIT_DAYS.map((days) => {
            const count = quotes.filter((quote) => quote.unmanaged && quote.ageDays >= days).length;
            return (
              <button key={days} type="button" aria-pressed={wait === days} onClick={() => { setWait((current) => current === days ? null : days); setStatuses([]); setPage(1); }}>
                <b>{count}</b>
                <span>Más de {days} días</span>
              </button>
            );
          })}
        </div>
      </section>
      <div className="category-filters quote-filters">
        <label className="field">Buscar
          <input type="search" value={query} placeholder="Referencia, nombre, teléfono o ciudad" onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        </label>
        <label className="field">Por página
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <div className="field">
        <span id="quote-status-label">Estado</span>
        <div className="quote-status-filter" role="group" aria-labelledby="quote-status-label">
          <button type="button" aria-pressed={statuses.length === 0 && wait == null} onClick={() => { setStatuses([]); setWait(null); setPage(1); }}>Todas</button>
          {STATUS_CHOICES.map((choice) => (
            <button key={choice.id} type="button" aria-pressed={statuses.includes(choice.id)} onClick={() => {
              setWait(null);
              setStatuses((current) => current.includes(choice.id) ? current.filter((item) => item !== choice.id) : [...current, choice.id]);
              setPage(1);
            }}>{choice.label}</button>
          ))}
        </div>
      </div>
      <p className="hint">{wait == null ? "La última que llegó queda arriba." : `Más de ${wait} días sin tomar. La última que llegó queda arriba.`}</p>
      <p className="hint">{visible.length ? `${from}–${to} de ${visible.length}` : "Ninguna solicitud coincide."}</p>
      {slice.length ? (
        <ol className="quote-queue">
          {slice.map((quote) => (
            <li key={quote.id}>
              <Link href={`/admin/cotizaciones/${quote.id}`}>
                <span className="quote-when">
                  <strong>{quote.ago}</strong>
                  <span>{quote.when}</span>
                </span>
                <span className="quote-main">
                  <strong>{quote.name}</strong>
                  <span>{[quote.summary, piecesOf(quote.pieces), quote.city].filter(Boolean).join(" · ")}</span>
                  <span>{quote.reference}</span>
                  <span>{quote.manager}</span>
                </span>
                <span className={`category-tag quote-state quote-state-${quote.status}`}>{quote.statusLabel}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
      {pages > 1 ? (
        <nav className="category-pager" aria-label="Páginas de cotizaciones">
          <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button>
          <span>Página {current} de {pages}</span>
          <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button>
        </nav>
      ) : null}
    </div>
  );
}

export function QuoteActions({ id, status }: { id: string; status: QuoteState }) {
  const [state, action, pending] = useActionState(updateQuoteAction, emptyForm);
  const next = quoteNext(status);
  const rest = QUOTE_STATES.filter((item) => item !== status && item !== next.status);
  return (
    <form className="stack wide" action={action}>
      <input type="hidden" name="id" value={id} />
      <label className="field">Nota interna. Quien pidió la cotización no la ve.
        <textarea name="note" maxLength={400} />
      </label>
      {state.error ? <p className="note-bad">{state.error}</p> : null}
      {state.ok ? <p className="note-ok">{state.ok}</p> : null}
      <div className="quote-actions">
        <button className="btn" name="status" value={next.status} disabled={pending}>{pending ? "Guardando" : next.label}</button>
        <button className="quiet" name="status" value={status} disabled={pending}>Guardar nota</button>
      </div>
      {rest.length ? (
        <details className="quote-more">
          <summary>Otro estado</summary>
          <div className="quote-actions">
            {rest.map((item) => (
              <button className="quiet" key={item} name="status" value={item} disabled={pending}>{item === "cerrada" ? "Cerrar" : item === "nueva" ? "Dejar como nueva" : item === "en-gestion" ? "Pasar a gestión" : "Marcar atendida"}</button>
            ))}
          </div>
        </details>
      ) : null}
    </form>
  );
}
