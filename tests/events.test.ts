import { describe, expect, it } from "vitest";
import { allowEvent, isBotUserAgent, isProductId, type EventWindow } from "@/lib/event-guards";

describe("analítica: bots", () => {
  it("descarta rastreadores, previsualizadores y clientes sin agente", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBotUserAgent("WhatsApp/2.23.20 A")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("curl/8.4.0")).toBe(true);
  });

  it("deja pasar navegadores reales, incluido el de dentro de WhatsApp", () => {
    expect(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")).toBe(false);
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });
});

describe("analítica: límite por visitante", () => {
  it("bloquea al pasar el límite y reabre al terminar la ventana", () => {
    const store = new Map<string, EventWindow>();
    const results = Array.from({ length: 5 }, (_, i) => allowEvent(store, "1.1.1.1", 1000 + i, 3, 60_000));
    expect(results).toEqual([true, true, true, false, false]);
    expect(allowEvent(store, "2.2.2.2", 1005, 3, 60_000)).toBe(true);
    expect(allowEvent(store, "1.1.1.1", 62_000, 3, 60_000)).toBe(true);
  });
});

describe("analítica: id de producto", () => {
  it("acepta ids seguros y rechaza el resto", () => {
    expect(isProductId("3f2c1a9e-1b2c-4d5e-8f90-123456789abc")).toBe(true);
    expect(isProductId("prod_01")).toBe(true);
    expect(isProductId("x'; drop table")).toBe(false);
    expect(isProductId("a".repeat(65))).toBe(false);
    expect(isProductId("")).toBe(false);
  });
});
