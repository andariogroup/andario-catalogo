import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { dashboardCounts, topProducts } from "@/lib/store";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function dayLabel(iso: string) {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  if (!year || !name || !day) return iso;
  return `${Number(day)} ${name} ${year}`;
}

function written(date: Date) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function percent(part: number, total: number) {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function pieces(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ rango?: string; desde?: string; hasta?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const rango = query.rango === "30" ? 30 : 7;
  const custom = Boolean(query.desde || query.hasta);
  const parsedTo = query.hasta ? new Date(`${query.hasta}T23:59:59`) : new Date();
  const to = Number.isNaN(parsedTo.getTime()) ? new Date() : parsedTo;
  const parsedFrom = query.desde ? new Date(`${query.desde}T00:00:00`) : new Date(to.getTime() - rango * 24 * 60 * 60 * 1000);
  const from = Number.isNaN(parsedFrom.getTime()) ? new Date(to.getTime() - rango * 24 * 60 * 60 * 1000) : parsedFrom;
  const counts = await dashboardCounts(from, to);
  const top = allows(user.role, "analytics", "limited") ? await topProducts(from, to) : [];
  const quotes = allows(user.role, "quotes", "read");
  const peak = counts.days.reduce((max, day) => Math.max(max, day.count), 0);
  const consult = percent(counts.whatsapp, counts.productViews);
  const focus = percent(top[0]?.count ?? 0, counts.productViews);
  const decisions = [
    {
      label: "Consulta por WhatsApp",
      value: consult == null ? "—" : `${consult}%`,
      note: consult == null ? "Sin vistas de producto en el rango, todavía no se puede medir." : `${pieces(counts.whatsapp, "clic", "clics")} por ${pieces(counts.productViews, "vista", "vistas")} de producto.`,
    },
    {
      label: "Activos sin vistas",
      value: String(counts.unseenActive),
      note: counts.active === 0 ? "No hay productos activos." : counts.unseenActive === 0 ? (counts.active === 1 ? "El activo tuvo al menos una vista." : `Los ${counts.active} activos tuvieron al menos una vista.`) : `${counts.unseenActive} de ${counts.active} activos no tuvieron vistas.`,
    },
    {
      label: "Interés concentrado",
      value: focus == null ? "—" : `${focus}%`,
      note: focus == null ? "Sin vistas de producto para ver si el interés se concentra." : top[0] ? `${top[0].name} reúne ${focus}% de las vistas.` : "Las vistas no quedaron asociadas a un producto.",
    },
    {
      label: "Por atender",
      value: quotes ? String(counts.pendingNow) : "—",
      note: quotes ? (counts.pendingNow === 0 ? "No hay solicitudes abiertas, de ninguna fecha." : `${counts.pendingNow === 1 ? "1 solicitud sigue abierta" : `${counts.pendingNow} solicitudes siguen abiertas`}, de cualquier fecha.`) : "Tu rol no ve cotizaciones.",
      href: quotes ? "/admin/cotizaciones" : "",
    },
  ];
  const period = custom ? `Del ${written(from)} al ${written(to)}.` : `Últimos ${rango} días, del ${written(from)} al ${written(to)}.`;
  const catalog = [
    ["Productos", counts.products],
    ["Activos", counts.active],
    ["Inactivos o borrador", counts.inactive],
    ["Destacados", counts.featured],
    ["Categorías activas", counts.categories],
  ] as const;
  const activity = [
    ["Visitas al catálogo", counts.views],
    ["Vistas de producto", counts.productViews],
    ["Clics a WhatsApp", counts.whatsapp],
    ...(quotes ? [["Cotizaciones en el rango", counts.quotes], ["Abiertas en el rango", counts.pending], ["Atendidas o cerradas en el rango", counts.done]] as const : []),
  ];

  return (
    <main className="dash">
      <header className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p>{period} Una cotización no es una venta.</p>
        </div>
        <div className="dash-presets">
          <Link href="/admin?rango=7" aria-current={!custom && rango === 7 ? "page" : undefined}>7 días</Link>
          <Link href="/admin?rango=30" aria-current={!custom && rango === 30 ? "page" : undefined}>30 días</Link>
        </div>
      </header>
      <form className="dash-range" action="/admin">
        <label className="field">Desde<input name="desde" type="date" defaultValue={query.desde ?? ""} /></label>
        <label className="field">Hasta<input name="hasta" type="date" defaultValue={query.hasta ?? ""} /></label>
        <button className="btn">Ver rango</button>
      </form>

      <section>
        <h2>Para decidir</h2>
        <div className="dash-decisions">
          {decisions.map((item) => (
            <article className="dash-decision" key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              <p>{item.note}</p>
              {"href" in item && item.href ? <p><Link href={item.href}>Abrir la cola</Link></p> : null}
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Catálogo</h2>
        <div className="stats">
          {catalog.map(([label, value]) => (
            <article className="stat" key={label}><b>{value}</b><span>{label}</span></article>
          ))}
        </div>
      </section>
      <section>
        <h2>Actividad</h2>
        <div className="stats">
          {activity.map(([label, value]) => (
            <article className="stat" key={label}><b>{value}</b><span>{label}</span></article>
          ))}
        </div>
      </section>

      <div className="dash-panels">
        <section className="dash-panel">
          <h2>Eventos por día</h2>
          {counts.days.length ? counts.days.map((day) => (
            <div className="dash-row" key={day.day}>
              <span>{dayLabel(day.day)}</span>
              <span className="dash-bar"><span style={{ width: `${peak ? (day.count / peak) * 100 : 0}%` }} /></span>
              <b>{day.count}</b>
            </div>
          )) : <p>Sin eventos en el rango.</p>}
        </section>
        <section className="dash-panel">
          <h2>Origen</h2>
          {counts.sources.length ? counts.sources.map((source) => (
            <div className="dash-line" key={source.source}><span>{source.source}</span><b>{source.count}</b></div>
          )) : <p>Sin utm_source en el rango.</p>}
        </section>
        <section className="dash-panel">
          <h2>Más vistos</h2>
          {top.length ? top.map((item) => (
            <div className="dash-line" key={item.name}><span>{item.name}</span><b>{item.count}</b></div>
          )) : <p>Todavía no hay vistas registradas.</p>}
        </section>
      </div>
    </main>
  );
}
