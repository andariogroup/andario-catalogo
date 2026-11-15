import { saveQuoteRetentionAction } from "@/actions/quotes";
import { QuoteBoard } from "@/components/admin/cotizaciones-list";
import { BoundForm } from "@/components/admin/form";
import { requirePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { quoteItems } from "@/lib/db/schema";
import { allows } from "@/lib/permissions";
import { purgeExpiredQuotes } from "@/lib/quote-retention";
import { byArrival, isQuoteState, quoteAgeDays, quoteAgo, quoteIsOpen, quoteManagerLabel, quoteStateLabel, quoteSummary, quoteWhen, readableVariant, type QuoteCard } from "@/lib/quotes";
import { adminLists } from "@/lib/store";

function lineSummary(name: string, variant: string, extra: number) {
  const head = [name, variant].filter(Boolean).join(" · ");
  if (!extra) return head || "Sin piezas";
  return `${head} y ${extra} más`;
}

export default async function QuotesPage() {
  const user = await requirePermission("quotes", "read");
  const canTune = allows(user.role, "settings", "manage");
  const retention = await purgeExpiredQuotes();
  const lists = await adminLists();
  const db = getDb();
  if (!lists || !db) return <p>No hay base de datos.</p>;
  const lines = await db.select({ quoteId: quoteItems.quoteId, quantity: quoteItems.quantity, productName: quoteItems.productName, variantLabel: quoteItems.variantLabel }).from(quoteItems);
  const optionLabel = new Map(lists.options.map((option) => {
    const attribute = lists.attributes.find((item) => item.id === option.attributeId);
    return [option.id, attribute ? `${attribute.name}: ${option.label}` : option.label] as const;
  }));
  const grouped = new Map<string, { pieces: number; name: string; variant: string }[]>();
  for (const line of lines) {
    const bucket = grouped.get(line.quoteId) ?? [];
    bucket.push({ pieces: line.quantity, name: line.productName, variant: readableVariant(line.variantLabel, optionLabel) });
    grouped.set(line.quoteId, bucket);
  }
  const now = new Date();
  const names = new Map(lists.users.map((person) => [person.email.toLowerCase(), person.name]));
  const quotes = byArrival(lists.quotes.flatMap((quote): QuoteCard[] => {
    if (!isQuoteState(quote.status)) return [];
    const items = grouped.get(quote.id) ?? [];
    const first = items[0];
    return [{
      id: quote.id,
      reference: quote.reference,
      name: quote.name,
      phone: quote.phone,
      city: quote.city,
      status: quote.status,
      statusLabel: quoteStateLabel(quote.status),
      open: quoteIsOpen(quote.status),
      when: quoteWhen(quote.createdAt),
      ago: quoteAgo(quote.createdAt, now),
      arrived: quote.createdAt.getTime(),
      pieces: items.reduce((sum, item) => sum + item.pieces, 0),
      summary: first ? lineSummary(first.name, first.variant, items.length - 1) : "Sin piezas",
      unmanaged: quote.status === "nueva",
      ageDays: quoteAgeDays(quote.createdAt, now),
      manager: quoteManagerLabel(quote.managedBy, names, quote.status),
    }];
  }));
  const open = quotes.filter((quote) => quote.open).length;
  return (
    <main className="category-page">
      <header className="category-head">
        <div>
          <p>Gestión</p>
          <h1>Cotizaciones</h1>
          <p className="lead">Responde en el orden en que llegaron. Cada solicitud pide información: no es una compra ni una oferta aprobada.</p>
          <p className="hint">{quoteSummary(quotes.length, open)}{retention.days ? ` Pasados ${retention.days} días, la solicitud se quita sola.` : ""}</p>
        </div>
      </header>
      {canTune ? (
        <BoundForm action={saveQuoteRetentionAction} label="Guardar plazo">
          <label className="field">Días antes de quitar una solicitud
            <input name="days" type="number" min={1} max={3650} defaultValue={retention.days ?? 365} required />
          </label>
          <p className="hint">Al guardar, se quitan las que ya pasaron de ese plazo. La política publicada no cambia con este número.</p>
        </BoundForm>
      ) : null}
      {quotes.length ? <QuoteBoard quotes={quotes} /> : <p className="hint">Cuando alguien pida una cotización en un producto o en su lista, aparecerá aquí. La última que llegue quedará arriba.</p>}
    </main>
  );
}
