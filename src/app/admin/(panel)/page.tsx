import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { dashboardReport } from "@/lib/store";
import {
  PRESETS,
  buildAlerts,
  buildInsights,
  change,
  changeText,
  contactBreakdown,
  contactCount,
  funnelSteps,
  hourLabel,
  placementLabel,
  productFunnels,
  productSignal,
  ratePercent,
  resolveRange,
  sourceLabel,
  weekdayName,
  type Change,
} from "@/lib/dashboard-metrics";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const PRODUCT_ROWS = 10;

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  if (!year || !name || !day) return iso;
  return `${Number(day)} ${name} ${year}`;
}

function shortDay(iso: string) {
  const [, month, day] = iso.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`;
}

function pieces(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

const SIGNALS = {
  "no-views": { text: "Sin vistas", tone: "idle" },
  "views-no-contact": { text: "Vistas sin consultas", tone: "warn" },
  converting: { text: "Genera consultas", tone: "good" },
  "saved-only": { text: "Lo guardan, no preguntan", tone: "warn" },
  "low-data": { text: "Pocos datos", tone: "idle" },
} as const;

function Trend({ value, text }: { value: Change; text: string }) {
  return <p className={`dash-trend dash-trend-${value.kind}`}>{text}</p>;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const range = resolveRange(query);
  const report = await dashboardReport(range);
  const canQuotes = allows(user.role, "quotes", "read");
  const { totals, previous } = report;

  const views = totals.product_view ?? 0;
  const contacts = contactCount(totals);
  const previousContacts = contactCount(previous);
  const rate = ratePercent(contacts, views);
  const viewsChange = change(views, previous.product_view ?? 0);
  const contactsChange = change(contacts, previousContacts);
  const funnel = funnelSteps(totals);
  const funnelMax = Math.max(1, ...funnel.map((step) => step.count));
  const insights = buildInsights({ totals, products: report.products, searches: report.searches, hours: report.hours, weekdays: report.weekdays });
  const alerts = buildAlerts({
    products: report.products,
    searches: report.searches,
    totals,
    openQuotes: report.quotes.openNow,
    canQuotes,
  });
  const funnels = productFunnels(report.products, 8);
  const funnelViewsPeak = Math.max(1, ...funnels.map((item) => item.views));
  const hasActivity = views + contacts + (totals.catalog_view ?? 0) > 0;

  const dayPeak = Math.max(1, ...report.days.flatMap((day) => [day.views, day.contacts]));
  const hourPeak = Math.max(1, ...report.hours.map((hour) => hour.total));
  const weekdayPeak = Math.max(1, ...report.weekdays.map((day) => day.total));
  const topSearches = report.searches.slice(0, 8);
  const missedSearches = report.searches.filter((item) => item.empty > 0).sort((a, b) => b.empty - a.empty).slice(0, 8);
  const sourceTotal = report.sources.reduce((sum, item) => sum + item.total, 0);
  const placementTotal = report.placements.reduce((sum, item) => sum + item.total, 0);
  const unseen = report.products.filter((item) => item.views === 0).length;
  const shownProducts = report.products.slice(0, PRODUCT_ROWS);
  const period = `${dayLabel(range.fromDay)} al ${dayLabel(range.toDay)} (${pieces(range.days, "día", "días")}, hora de Colombia).`;

  const cards = [
    {
      label: "Fichas de producto vistas",
      value: String(views),
      note: <Trend value={viewsChange} text={changeText(viewsChange)} />,
    },
    {
      label: "Pidieron hablar contigo",
      value: String(contacts),
      note: <Trend value={contactsChange} text={changeText(contactsChange)} />,
      hint: contactBreakdown(totals) || "WhatsApp de la ficha, envío del carrito, lista y cotizaciones.",
    },
    {
      label: "Consultas por cada 100 vistas",
      value: rate == null ? "—" : String(rate),
      note: <p>{rate == null ? "Todavía no hay vistas de producto para medirlo." : `${pieces(contacts, "consulta", "consultas")} por ${pieces(views, "vista", "vistas")}.`}</p>,
      hint: rate != null && rate === 0 ? "Hay interés en ver, pero nadie escribe. Revisa precio, foto y el mensaje de WhatsApp." : undefined,
    },
    {
      label: "Cotizaciones por atender",
      value: canQuotes ? String(report.quotes.openNow) : "—",
      note: <p>{canQuotes ? (report.quotes.openNow === 0 ? "No hay solicitudes abiertas." : "Siguen abiertas, de cualquier fecha.") : "Tu rol no ve cotizaciones."}</p>,
      href: canQuotes ? "/admin/cotizaciones" : "",
    },
  ];

  return (
    <main className="dash">
      <header className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p>{period} Una consulta no es una venta.</p>
        </div>
        <div className="dash-presets">
          {PRESETS.map((days) => (
            <Link key={days} href={`/admin?rango=${days}`} aria-current={range.preset === days ? "page" : undefined}>{days} días</Link>
          ))}
        </div>
      </header>
      <form className="dash-range" action="/admin">
        <label className="field">Desde<input name="desde" type="date" defaultValue={range.fromDay} max={range.toDay} /></label>
        <label className="field">Hasta<input name="hasta" type="date" defaultValue={range.toDay} /></label>
        <button className="btn">Ver rango</button>
      </form>
      {range.notice ? <p className="dash-notice" role="status">{range.notice}</p> : null}

      <section aria-labelledby="dash-resumen">
        <h2 id="dash-resumen">Resumen</h2>
        <div className="dash-decisions">
          {cards.map((item) => (
            <article className="dash-decision" key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              {item.note}
              {"hint" in item && item.hint ? <p className="dash-hint">{item.hint}</p> : null}
              {"href" in item && item.href ? <p><Link href={item.href}>Abrir la cola</Link></p> : null}
            </article>
          ))}
        </div>
      </section>

      {alerts.length ? (
        <section aria-labelledby="dash-alertas">
          <h2 id="dash-alertas">Para actuar hoy</h2>
          <div className="dash-alerts">
            {alerts.map((alert) => (
              <article className={`dash-alert dash-alert-${alert.tone}`} key={alert.id}>
                <span className={`dash-tag dash-tag-${alert.tone}`}>{alert.tone === "good" ? "Oportunidad" : alert.tone === "warn" ? "Atención" : "Aviso"}</span>
                <h3>{alert.title}</h3>
                <p>{alert.detail}</p>
                {alert.href ? <p><Link href={alert.href}>{alert.hrefLabel || "Abrir"}</Link></p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {hasActivity ? (
        <section className="dash-panel" aria-labelledby="dash-insights">
          <h2 id="dash-insights">Qué te dicen los datos</h2>
          {insights.length ? (
            <ul className="dash-insights">{insights.map((text) => <li key={text}>{text}</li>)}</ul>
          ) : (
            <p>Aún hay poca actividad para sacar conclusiones fiables. Con más visitas verás recomendaciones aquí.</p>
          )}
        </section>
      ) : (
        <section className="dash-panel">
          <h2>Todavía no hay actividad en este rango</h2>
          <p>Comparte el enlace de tu tienda o el QR de un producto. Las visitas tuyas, con la sesión del panel abierta, no se cuentan.</p>
        </section>
      )}

      <section className="dash-panel" aria-labelledby="dash-embudo">
        <h2 id="dash-embudo">Del interés a la consulta</h2>
        <p>Son totales de cada etapa, no el recorrido de una persona. Cada porcentaje compara con la etapa anterior; guardados y consultas, con las fichas vistas.</p>
        {funnel.map((step) => (
          <div className="dash-row dash-funnel" key={step.key}>
            <span>{step.label}</span>
            <span className="dash-bar"><span style={{ width: `${(step.count / funnelMax) * 100}%` }} /></span>
            <b>{step.count}{step.rate == null ? "" : ` · ${step.rate}%`}</b>
          </div>
        ))}
      </section>

      <section className="dash-panel" aria-labelledby="dash-embudo-producto">
        <h2 id="dash-embudo-producto">Embudo por producto</h2>
        <p>Vistas de la ficha, luego quién lo guardó y quién te escribió por WhatsApp desde esa ficha. El porcentaje es sobre las vistas de ese producto.</p>
        {funnels.length ? (
          <div className="dash-product-funnels">
            {funnels.map((item) => {
              const signal = SIGNALS[item.signal];
              return (
                <article className="dash-product-funnel" key={item.id}>
                  <header className="dash-product-funnel-head">
                    <div className="dash-product">
                      <Link href={`/admin/productos/${item.id}`}>{item.name}</Link>
                      <a className="dash-quiet-link" href={`/producto/${item.slug}`} target="_blank" rel="noreferrer">Ver ficha</a>
                    </div>
                    <span className={`dash-tag dash-tag-${signal.tone}`}>{signal.text}</span>
                  </header>
                  <div className="dash-row dash-funnel">
                    <span>Vistas</span>
                    <span className="dash-bar"><span style={{ width: `${(item.views / funnelViewsPeak) * 100}%` }} /></span>
                    <b>{item.views}</b>
                  </div>
                  <div className="dash-row dash-funnel">
                    <span>Guardados</span>
                    <span className="dash-bar"><span className="dash-bar-saved" style={{ width: `${item.views ? (item.saved / item.views) * 100 : 0}%` }} /></span>
                    <b>{item.saved}{item.saveRate == null ? "" : ` · ${item.saveRate}%`}</b>
                  </div>
                  <div className="dash-row dash-funnel">
                    <span>Consultas</span>
                    <span className="dash-bar"><span className="dash-bar-contacts" style={{ width: `${item.views ? (item.contacts / item.views) * 100 : 0}%` }} /></span>
                    <b>{item.contacts}{item.contactRate == null ? "" : ` · ${item.contactRate}%`}</b>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p>Todavía no hay fichas con actividad en este rango.</p>
        )}
        {report.products.length > funnels.length ? (
          <p className="dash-hint">Mostrando {funnels.length} de {report.products.length} productos activos con movimiento.</p>
        ) : null}
      </section>

      <section className="dash-panel" aria-labelledby="dash-dias">
        <h2 id="dash-dias">Actividad por día</h2>
        <p>Barra verde: fichas vistas. Barra dorada: consultas.</p>
        <div className="dash-chart" role="img" aria-label={`Fichas vistas y consultas por día entre ${dayLabel(range.fromDay)} y ${dayLabel(range.toDay)}. Total: ${views} vistas y ${contacts} consultas.`}>
          {report.days.map((day) => (
            <div className="dash-col" key={day.day} title={`${dayLabel(day.day)}: ${pieces(day.views, "vista", "vistas")}, ${pieces(day.contacts, "consulta", "consultas")}`}>
              <span className="dash-col-views" style={{ height: `${(day.views / dayPeak) * 100}%`, minHeight: day.views ? 3 : 0 }} />
              <span className="dash-col-contacts" style={{ height: `${(day.contacts / dayPeak) * 100}%`, minHeight: day.contacts ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="dash-axis"><span>{shortDay(range.fromDay)}</span><span>{shortDay(range.toDay)}</span></div>
        <details>
          <summary>Ver tabla por día</summary>
          <table className="dash-table">
            <thead><tr><th scope="col">Día</th><th scope="col">Vistas</th><th scope="col">Consultas</th></tr></thead>
            <tbody>
              {report.days.map((day) => (
                <tr key={day.day}><th scope="row">{dayLabel(day.day)}</th><td>{day.views}</td><td>{day.contacts}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="dash-panel" aria-labelledby="dash-productos">
        <h2 id="dash-productos">Productos</h2>
        <p>Productos activos ordenados por vistas. «Guardados» suma carrito y lista; «Consultas» son clics a WhatsApp desde la ficha.</p>
        {shownProducts.length ? (
          <div className="dash-scroll" tabIndex={0} role="region" aria-label="Tabla de productos">
            <table className="dash-table">
              <thead><tr><th scope="col">Producto</th><th scope="col">Vistas</th><th scope="col">Guardados</th><th scope="col">Consultas</th><th scope="col">Lectura</th></tr></thead>
              <tbody>
                {shownProducts.map((item) => {
                  const signal = SIGNALS[productSignal(item.views, item.contacts, item.saved)];
                  return (
                    <tr key={item.id}>
                      <th scope="row">
                        <span className="dash-product">
                          <Link href={`/admin/productos/${item.id}`}>{item.name}</Link>
                          <a className="dash-quiet-link" href={`/producto/${item.slug}`} target="_blank" rel="noreferrer">Ver ficha</a>
                        </span>
                      </th>
                      <td>{item.views}</td>
                      <td>{item.saved}</td>
                      <td>{item.contacts}</td>
                      <td><span className={`dash-tag dash-tag-${signal.tone}`}>{signal.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p>No hay productos activos.</p>}
        {report.products.length > PRODUCT_ROWS ? <p className="dash-hint">Mostrando {PRODUCT_ROWS} de {report.products.length} productos activos. {pieces(unseen, "no tuvo vistas", "no tuvieron vistas")} en el rango.</p> : unseen ? <p className="dash-hint">{pieces(unseen, "producto no tuvo vistas", "productos no tuvieron vistas")} en el rango.</p> : null}
      </section>

      <div className="dash-panels dash-panels-even">
        <section className="dash-panel">
          <h2>Qué buscan</h2>
          {topSearches.length ? topSearches.map((item) => (
            <div className="dash-line" key={item.term}><span>{item.term}</span><b>{item.total}</b></div>
          )) : <p>Todavía no hay búsquedas en este rango. Cuando alguien busque en el catálogo, verás aquí qué pide.</p>}
        </section>
        <section className="dash-panel">
          <h2>Buscaron y no encontraron</h2>
          {missedSearches.length ? missedSearches.map((item) => (
            <div className="dash-line" key={item.term}><span>{item.term}</span><b>{item.empty}</b></div>
          )) : <p>{report.searches.length ? "Todas las búsquedas tuvieron resultados." : "Sin búsquedas fallidas todavía. Este bloque te dice qué productos te piden y aún no tienes."}</p>}
        </section>
        <section className="dash-panel">
          <h2>Categorías más vistas</h2>
          {report.categories.length ? report.categories.map((item) => (
            <div className="dash-line" key={item.name}><span>{item.name}</span><b>{item.total}</b></div>
          )) : <p>Sin visitas a categorías en el rango.</p>}
        </section>
        <section className="dash-panel">
          <h2>De dónde llegan</h2>
          {report.sources.length ? report.sources.map((item) => {
            const share = ratePercent(item.total, sourceTotal);
            return <div className="dash-line" key={item.source || "directo"}><span>{sourceLabel(item.source)}</span><b>{item.total}{share == null ? "" : ` · ${share}%`}</b></div>;
          }) : <p>Sin llegadas registradas.</p>}
          {report.internalNav > 0 ? <p className="dash-hint">{pieces(report.internalNav, "vista", "vistas")} más vinieron navegando dentro del catálogo (no son una llegada nueva).</p> : null}
          <p className="dash-hint">Para medir Instagram, Google o el QR, añade <code>?utm_source=instagram</code> (o google, qr) a los enlaces que compartes. Los registros antiguos sin ese dato aparecen como «Directo o sin dato».</p>
        </section>
        <section className="dash-panel">
          <h2>Desde dónde te escriben</h2>
          {report.placements.length ? report.placements.map((item) => {
            const share = ratePercent(item.total, placementTotal);
            return <div className="dash-line" key={item.placement || "sin-dato"}><span>{item.placement === "quote" ? "Formulario de cotización" : placementLabel(item.placement)}</span><b>{item.total}{share == null ? "" : ` · ${share}%`}</b></div>;
          }) : <p>Aún nadie ha pedido hablar contigo en el rango.</p>}
        </section>
        <section className="dash-panel">
          <h2>Mejor día de la semana</h2>
          {report.weekdays.map((item) => (
            <div className="dash-row" key={item.dow}>
              <span>{weekdayName(item.dow)}</span>
              <span className="dash-bar"><span style={{ width: `${(item.total / weekdayPeak) * 100}%` }} /></span>
              <b>{item.total}</b>
            </div>
          ))}
        </section>
      </div>

      <section className="dash-panel" aria-labelledby="dash-horas">
        <h2 id="dash-horas">A qué hora te visitan</h2>
        <p>Vistas y consultas por hora del día (hora de Colombia).</p>
        <div className="dash-chart dash-chart-hours" role="img" aria-label="Actividad por hora del día">
          {report.hours.map((item) => (
            <div className="dash-col" key={item.hour} title={`${hourLabel(item.hour)}: ${item.total}`}>
              <span className="dash-col-views" style={{ height: `${(item.total / hourPeak) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="dash-axis"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div>
      </section>

      <section aria-labelledby="dash-catalogo">
        <h2 id="dash-catalogo">Estado del catálogo</h2>
        <div className="stats">
          {([["Productos", report.catalog.products], ["Activos", report.catalog.active], ["Inactivos o borrador", report.catalog.inactive], ["Destacados", report.catalog.featured], ["Categorías activas", report.catalog.categories]] as const).map(([label, value]) => (
            <article className="stat" key={label}><b>{value}</b><span>{label}</span></article>
          ))}
          {canQuotes ? <article className="stat"><b>{report.quotes.inRange}</b><span>Cotizaciones en el rango</span></article> : null}
        </div>
      </section>

      <section className="dash-panel">
        <h2>Cómo se cuenta</h2>
        <p>Son páginas vistas y acciones, no personas distintas. No se cuentan robots, vistas precargadas, visitas con la sesión del panel abierta ni el mismo evento repetido en menos de 2 segundos (en los registros antiguos también se filtran esas ráfagas). Los registros anteriores no se borraron.</p>
      </section>
    </main>
  );
}
