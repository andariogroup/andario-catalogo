import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildAlerts,
  buildInsights,
  change,
  changeText,
  contactBreakdown,
  contactCount,
  fillDays,
  funnelSteps,
  hourLabel,
  listDays,
  productFunnel,
  productFunnels,
  productSignal,
  ratePercent,
  resolveRange,
  searchTerm,
  sourceLabel,
  storeDay,
} from "@/lib/dashboard-metrics";
import { INTERNAL_SOURCE, ACTION_DEDUPE_MS, VIEW_DEDUPE_MS, isClientEvent, isPrefetchRequest, isRecentDuplicate, referrerSource, resolveSource } from "@/lib/event-guards";

// 21 nov 2026, 03:00 UTC = 20 nov 22:00 en Colombia (UTC-5).
const NOW = new Date("2026-11-21T03:00:00Z");

describe("dashboard: rangos por día en hora de Colombia", () => {
  it("usa el día de Colombia, no el de UTC", () => {
    expect(storeDay(NOW)).toBe("2026-11-20");
    expect(storeDay(new Date("2026-11-20T04:59:59Z"))).toBe("2026-11-19");
    expect(storeDay(new Date("2026-11-20T05:00:00Z"))).toBe("2026-11-20");
  });

  it("por defecto son 7 días completos que terminan hoy", () => {
    const range = resolveRange({}, NOW);
    expect(range.fromDay).toBe("2026-11-14");
    expect(range.toDay).toBe("2026-11-20");
    expect(range.days).toBe(7);
    expect(range.preset).toBe(7);
    expect(range.from.toISOString()).toBe("2026-11-14T05:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-21T04:59:59.999Z");
  });

  it("acepta 30 y 90 días y ignora otros valores", () => {
    expect(resolveRange({ rango: "30" }, NOW).days).toBe(30);
    expect(resolveRange({ rango: "90" }, NOW).days).toBe(90);
    expect(resolveRange({ rango: "5" }, NOW).days).toBe(7);
  });

  it("el periodo anterior es contiguo y de la misma duración", () => {
    const range = resolveRange({ rango: "7" }, NOW);
    expect(range.previousTo.getTime() + 1).toBe(range.from.getTime());
    expect((range.to.getTime() + 1 - range.from.getTime()) / 86_400_000).toBe(7);
    expect((range.previousTo.getTime() + 1 - range.previousFrom.getTime()) / 86_400_000).toBe(7);
  });

  it("ordena fechas invertidas, recorta el futuro y avisa", () => {
    const swapped = resolveRange({ desde: "2026-11-10", hasta: "2026-11-05" }, NOW);
    expect([swapped.fromDay, swapped.toDay]).toEqual(["2026-11-05", "2026-11-10"]);
    expect(swapped.notice).not.toBe("");
    const future = resolveRange({ desde: "2026-11-18", hasta: "2027-01-01" }, NOW);
    expect(future.toDay).toBe("2026-11-20");
    expect(future.notice).not.toBe("");
  });

  it("no revienta con fechas inválidas y limita el tamaño", () => {
    const invalid = resolveRange({ desde: "no-es-fecha", hasta: "2026-02-31" }, NOW);
    expect(invalid.days).toBeGreaterThan(0);
    expect(invalid.notice).not.toBe("");
    const huge = resolveRange({ desde: "2000-01-01", hasta: "2026-11-20" }, NOW);
    expect(huge.days).toBe(366);
  });

  it("lista cada día del rango, ambos extremos incluidos", () => {
    expect(listDays("2026-02-27", "2026-03-02")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  });
});

describe("dashboard: serie diaria", () => {
  it("rellena con ceros los días sin actividad y suma consultas", () => {
    const days = fillDays("2026-11-18", "2026-11-20", [
      { day: "2026-11-18", name: "product_view", total: 4 },
      { day: "2026-11-20", name: "whatsapp_click", total: 2 },
      { day: "2026-11-20", name: "cart_send", total: 1 },
    ]);
    expect(days).toEqual([
      { day: "2026-11-18", views: 4, contacts: 0 },
      { day: "2026-11-19", views: 0, contacts: 0 },
      { day: "2026-11-20", views: 0, contacts: 3 },
    ]);
  });
});

describe("dashboard: embudo y variaciones", () => {
  const counts = { catalog_view: 100, category_view: 20, product_view: 60, cart_add: 6, interest_list_add: 4, whatsapp_click: 5, cart_send: 1 };

  it("cuenta etapas y calcula el porcentaje contra la anterior", () => {
    const steps = funnelSteps(counts);
    expect(steps.map((step) => step.count)).toEqual([120, 60, 10, 6]);
    expect(steps.map((step) => step.rate)).toEqual([null, 50, 17, 10]);
    expect(contactCount(counts)).toBe(6);
  });

  it("omite el porcentaje cuando una etapa supera a su referencia", () => {
    const steps = funnelSteps({ catalog_view: 5, product_view: 2, whatsapp_click: 9 });
    expect(steps[3].count).toBe(9);
    expect(steps[3].rate).toBeNull();
  });

  it("describe la variación sin inventar porcentajes con base cero", () => {
    expect(change(0, 0).kind).toBe("none");
    expect(change(5, 0).kind).toBe("new");
    expect(change(10, 10).kind).toBe("flat");
    expect(change(15, 10)).toEqual({ kind: "up", pct: 50 });
    expect(change(5, 10)).toEqual({ kind: "down", pct: 50 });
    expect(changeText(change(15, 10))).toContain("50% más");
    expect(changeText(change(5, 0))).toContain("No había datos");
  });

  it("ratePercent devuelve null sin base", () => {
    expect(ratePercent(1, 0)).toBeNull();
    expect(ratePercent(1, 4)).toBe(25);
  });
});

describe("dashboard: lectura por producto", () => {
  it("no saca conclusiones con pocas vistas y no confunde guardados con consultas", () => {
    expect(productSignal(0, 0)).toBe("no-views");
    expect(productSignal(3, 0)).toBe("low-data");
    expect(productSignal(5, 0)).toBe("views-no-contact");
    expect(productSignal(8, 2)).toBe("converting");
    expect(productSignal(8, 0, 3)).toBe("saved-only");
    expect(contactBreakdown({ whatsapp_click: 1, cart_send: 3 })).toBe("1 por WhatsApp · 3 desde el carrito");
  });

  it("genera frases solo cuando hay datos", () => {
    expect(buildInsights({ totals: {}, products: [], searches: [], hours: [], weekdays: [] })).toEqual([]);
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, total: hour === 15 ? 9 : 0 }));
    const weekdays = Array.from({ length: 7 }, (_, dow) => ({ dow, total: dow === 6 ? 9 : 0 }));
    const insights = buildInsights({
      totals: { product_view: 12 },
      products: [
        { name: "Jabón", views: 8, contacts: 0, saved: 0 },
        { name: "Crema", views: 10, contacts: 4, saved: 0 },
      ],
      searches: [{ term: "perfume", total: 3, empty: 3 }],
      hours,
      weekdays,
    });
    const text = insights.join("\n");
    expect(text).toContain("sábado");
    expect(text).toContain("15:00 a 16:00");
    expect(text).toContain("Jabón");
    expect(text).toContain("«perfume»");
    expect(text).toContain("Crema");
  });

  it("avisa si el carrito convierte y WhatsApp de la ficha no", () => {
    const text = buildInsights({
      totals: { product_view: 20, cart_send: 3 },
      products: [],
      searches: [],
      hours: Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 })),
      weekdays: Array.from({ length: 7 }, (_, dow) => ({ dow, total: 0 })),
    }).join("\n");
    expect(text).toContain("carrito");
    expect(text).toMatch(/3 envíos/);
  });

  it("formatea horas y etiquetas", () => {
    expect(hourLabel(23)).toBe("23:00 a 00:00");
    expect(sourceLabel("")).toBe("Directo o sin dato");
    expect(sourceLabel("instagram")).toBe("Instagram");
    expect(sourceLabel("newsletter")).toBe("newsletter");
  });
});

describe("dashboard: embudo por producto y alertas", () => {
  const cream = {
    id: "1",
    name: "Crema",
    slug: "crema",
    featured: false,
    views: 20,
    contacts: 0,
    saved: 0,
  };
  const lotion = {
    id: "2",
    name: "Loción",
    slug: "locion",
    featured: false,
    views: 10,
    contacts: 3,
    saved: 2,
  };

  it("calcula tasas del embudo sobre las vistas del producto", () => {
    const funnel = productFunnel(lotion);
    expect(funnel.saveRate).toBe(20);
    expect(funnel.contactRate).toBe(30);
    expect(funnel.signal).toBe("converting");
    expect(productFunnel(cream).signal).toBe("views-no-contact");
  });

  it("lista solo productos con actividad y respeta el límite", () => {
    const idle = { ...cream, id: "3", name: "Jabón", views: 0, contacts: 0, saved: 0 };
    expect(productFunnels([cream, lotion, idle], 1)).toHaveLength(1);
    expect(productFunnels([cream, lotion, idle], 1)[0].name).toBe("Crema");
    expect(productFunnels([cream, lotion, idle], 8).map((item) => item.name)).toEqual(["Crema", "Loción"]);
  });

  it("arma alertas accionables con enlace", () => {
    const alerts = buildAlerts({
      products: [cream, lotion, { ...cream, id: "4", name: "Aceite", views: 0 }],
      searches: [{ term: "perfume", total: 2, empty: 2 }],
      totals: { product_view: 30, whatsapp_click: 0, cart_send: 0 },
      openQuotes: 2,
      canQuotes: true,
    });
    const ids = alerts.map((item) => item.id);
    expect(ids).toContain("unseen");
    expect(ids).toContain("views-no-contact");
    expect(ids).toContain("star-not-featured");
    expect(ids).toContain("missed-search");
    expect(ids).toContain("open-quotes");
    expect(ids).toContain("no-contacts");
    expect(alerts.find((item) => item.id === "star-not-featured")?.href).toBe("/admin/productos/2");
    expect(alerts.length).toBeLessThanOrEqual(6);
  });

  it("no inventa alertas sin datos", () => {
    expect(
      buildAlerts({
        products: [{ ...lotion, featured: true }],
        searches: [],
        totals: { product_view: 10, whatsapp_click: 3 },
        openQuotes: 0,
        canQuotes: true,
      }),
    ).toEqual([]);
  });
});

describe("analítica: búsquedas", () => {
  it("normaliza tildes, mayúsculas, espacios y símbolos", () => {
    expect(searchTerm("  LOCIÓN   Corporal  ")).toBe("locion corporal");
    expect(searchTerm("jabón <b>x</b>")).toBe("jabon b x b");
    expect(searchTerm("a".repeat(200)).length).toBe(60);
    expect(searchTerm(undefined)).toBe("");
  });
});

describe("analítica: precargas, duplicados y origen", () => {
  it("detecta precargas de Next y del navegador", () => {
    const read = (values: Record<string, string>) => (name: string) => values[name] ?? null;
    expect(isPrefetchRequest(read({ "next-router-prefetch": "1" }))).toBe(true);
    expect(isPrefetchRequest(read({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetchRequest(read({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
    expect(isPrefetchRequest(read({ rsc: "1" }))).toBe(false);
  });

  it("descarta el mismo evento dentro de la ventana y lo deja pasar después", () => {
    const store = new Map<string, number>();
    expect(isRecentDuplicate(store, "a", 1000, VIEW_DEDUPE_MS)).toBe(false);
    expect(isRecentDuplicate(store, "a", 1000 + VIEW_DEDUPE_MS - 1, VIEW_DEDUPE_MS)).toBe(true);
    expect(isRecentDuplicate(store, "a", 1000 + VIEW_DEDUPE_MS, VIEW_DEDUPE_MS)).toBe(false);
    expect(isRecentDuplicate(store, "b", 1000, ACTION_DEDUPE_MS)).toBe(false);
  });

  it("clasifica el origen: utm manda, luego el referente", () => {
    const own = ["tienda.co", "www.tienda.co:3000"];
    expect(resolveSource("Instagram ", "https://google.com/", own)).toBe("instagram");
    expect(resolveSource("", "https://www.google.com.co/search?q=x", own)).toBe("google");
    expect(resolveSource("", "https://l.instagram.com/?u=1", own)).toBe("instagram");
    expect(resolveSource("", "https://mi-blog.example.org/post", own)).toBe("mi-blog.example.org");
    expect(resolveSource("", "https://tienda.co/catalogo", own)).toBe(INTERNAL_SOURCE);
    expect(resolveSource("", "", own)).toBe("");
    expect(referrerSource("no es url", own)).toBe("");
  });

  it("el navegador solo puede enviar acciones, no vistas ni búsquedas", () => {
    expect(isClientEvent("whatsapp_click")).toBe(true);
    expect(isClientEvent("cart_send")).toBe(true);
    expect(isClientEvent("product_view")).toBe(false);
    expect(isClientEvent("search")).toBe(false);
    expect(isClientEvent("<script>")).toBe(false);
  });
});

describe("analítica: cableado", () => {
  const read = (path: string) => readFileSync(path, "utf8");

  it("los clics a WhatsApp se envían con sendBeacon y con su lugar", () => {
    const ficha = read("src/components/catalog/ficha.tsx");
    expect(ficha).toContain('sendEvent("whatsapp_click", trackPath, product.id, "product")');
    expect(ficha).toContain('sendEvent("whatsapp_click", trackPath, product.id, "product_secondary")');
    expect(ficha).not.toContain("trackEventAction");
    expect(read("src/lib/track-client.ts")).toContain("sendBeacon");
    expect(read("src/components/consent/analytics-hooks.tsx")).toContain('sendEvent("whatsapp_click"');
    expect(read("src/app/api/evento/route.ts")).toContain("trackClientEvent");
  });

  it("todos los enlaces de WhatsApp de la tienda registran el clic", () => {
    expect(read("src/app/(tienda)/page.tsx")).toContain('source="home"');
    expect(read("src/components/catalog/about-page.tsx")).toContain('source="about"');
    expect(read("src/components/catalog/tienda.tsx")).toContain('source="footer"');
  });

  it("las vistas ignoran precargas y sesión del panel, y el panel usa agregados SQL", () => {
    const events = read("src/lib/events.ts");
    expect(events).toContain("isPrefetchRequest");
    expect(events).toContain("SESSION_COOKIE");
    const store = read("src/lib/store.ts");
    expect(store).toContain("at time zone");
    expect(store).not.toContain("dashboardCounts");
    expect(store).not.toContain("topProducts");
  });
});
