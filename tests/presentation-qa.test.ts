import { describe, expect, it } from "vitest";
import { cartEligible, cartNeedsQuote, cartTotals } from "@/lib/cart";
import {
  catalogEmptyCopy,
  catalogEmptyKind,
  catalogKindLabel,
} from "@/lib/catalog-page";
import {
  fichaAvailabilityLabel,
  fichaConversionPrimary,
  fichaOptionReachable,
  fichaPriceLabel,
  fichaSecondaryActions,
  fichaShowQuantity,
} from "@/lib/ficha-presentation";
import { QA_BRAND_PROFILES, brandTokenKeys } from "./fixtures/qa-brand-profiles";
import { QA_SCENARIOS, QA_VARIANT_MATRIX } from "./fixtures/qa-andario-scenarios";

describe("QA_ANDARIO empty catalog copy", () => {
  it("distingue búsqueda, filtros, categoría y combinación", () => {
    expect(catalogEmptyKind({ q: "zzzz", filterCount: 0 })).toBe("search");
    expect(catalogEmptyKind({ filterCount: 2 })).toBe("filters");
    expect(catalogEmptyKind({ categoria: "cat-1", filterCount: 0 })).toBe("category");
    expect(catalogEmptyKind({ q: "mesa", filterCount: 1 })).toBe("search_filters");
    expect(catalogEmptyKind({ filterCount: 0 })).toBe("catalog");

    expect(catalogEmptyCopy("search", "zzzz").body).toContain("zzzz");
    expect(catalogEmptyCopy("filters").body).toMatch(/filtros/i);
    expect(catalogEmptyCopy("category").body).toMatch(/categoría/i);
  });
});

describe("QA_ANDARIO presentation matrix", () => {
  it("deriva precio, disponibilidad, cantidad y CTA por capacidades", () => {
    for (const scenario of QA_SCENARIOS) {
      const price = fichaPriceLabel({
        priceMode: scenario.priceMode,
        unit: scenario.pricePesos,
        symbol: "$",
      });
      if (scenario.priceMode === "ask") expect(price).toBe("Consultar precio");
      if (scenario.priceMode === "from") expect(price).toMatch(/^Desde /);
      if (scenario.priceMode === "fixed" && scenario.pricePesos != null) expect(price).not.toMatch(/Consultar|Desde/);

      const availability = fichaAvailabilityLabel(scenario.availability);
      if (scenario.availability === "sold_out") expect(availability).toBe("Agotado");
      if (scenario.availability === "made_to_order") expect(availability).toBe("Bajo pedido");

      const showQty = fichaShowQuantity({ kind: scenario.kind, priceMode: scenario.priceMode });
      if (scenario.kind === "service" && scenario.priceMode === "ask") expect(showQty).toBe(false);
      else expect(showQty).toBe(true);

      const soldOut = scenario.availability === "sold_out";
      const primaryWithWa = fichaConversionPrimary({
        cartEligible: !soldOut,
        hasWhatsApp: true,
        soldOut,
        priceMode: scenario.priceMode,
        kind: scenario.kind,
      });
      if (!soldOut) expect(primaryWithWa).toBe("whatsapp");
      else expect(primaryWithWa).toBe("quote");

      const primaryNoWa = fichaConversionPrimary({
        cartEligible: !soldOut,
        hasWhatsApp: false,
        soldOut,
        priceMode: scenario.priceMode,
        kind: scenario.kind,
      });
      if (soldOut) expect(primaryNoWa).toBe("quote");
      else if (scenario.priceMode === "ask") expect(primaryNoWa).toBe("quote");
      else expect(primaryNoWa).toBe("cart");

      expect(catalogKindLabel(scenario.kind)).toBe(
        scenario.kind === "digital" ? "Digital" : scenario.kind === "service" ? "Servicio" : "",
      );
    }
  });

  it("bloquea combinación inexistente y variante agotada en matriz de ropa", () => {
    const values = QA_VARIANT_MATRIX.variants.flatMap((variant) =>
      Object.entries(variant.options).map(([attributeId, optionId]) => ({
        variantId: variant.id,
        attributeId,
        optionId,
      })),
    );
    const variants = QA_VARIANT_MATRIX.variants.map((variant) => ({
      id: variant.id,
      availability: variant.availability,
    }));

    const sold = fichaOptionReachable({
      attributeId: "qa_color",
      optionId: "Negro",
      picked: { qa_size: "L" },
      values,
      variants,
    });
    expect(sold.reachable).toBe(true);
    expect(sold.allSoldOut).toBe(true);

    const missing = fichaOptionReachable({
      attributeId: "qa_color",
      optionId: "Negro",
      picked: { qa_size: "S" },
      values,
      variants,
    });
    expect(missing.reachable).toBe(false);

    expect(cartEligible({ needsChoice: false, availability: "sold_out" })).toBe(false);
    expect(cartEligible({ needsChoice: true, availability: "available" })).toBe(false);
  });

  it("con WhatsApp primario el carrito queda secundario en cualquier priceMode", () => {
    const secondaryAsk = fichaSecondaryActions({
      primary: "whatsapp",
      cartEligible: true,
      hasWhatsApp: true,
      soldOut: false,
      priceMode: "ask",
    });
    expect(secondaryAsk.showCart).toBe(true);
    expect(secondaryAsk.showQuote).toBe(true);
    expect(secondaryAsk.showWhatsApp).toBe(false);

    const secondaryFixed = fichaSecondaryActions({
      primary: "whatsapp",
      cartEligible: true,
      hasWhatsApp: true,
      soldOut: false,
      priceMode: "fixed",
    });
    expect(secondaryFixed.showCart).toBe(true);
    expect(secondaryFixed.showQuote).toBe(true);
    expect(secondaryFixed.showWhatsApp).toBe(false);

    const lines = [
      {
        productId: "QA_ANDARIO_B2B_0",
        quantity: 2,
        name: "QA_ANDARIO Insumo A",
        priceMode: "ask",
        unitPesos: null as number | null,
        currencySymbol: "$",
        availability: "available",
        updatedAt: Date.now(),
      },
      {
        productId: "QA_ANDARIO_B2B_1",
        quantity: 1,
        name: "QA_ANDARIO Insumo B",
        priceMode: "fixed",
        unitPesos: 10000,
        currencySymbol: "$",
        availability: "available",
        updatedAt: Date.now(),
      },
    ];
    expect(cartNeedsQuote(lines)).toBe(true);
    const totals = cartTotals(lines);
    expect(totals.quoteCount).toBe(1);
    expect(totals.pricedCount).toBe(1);
    expect(totals.pricedSubtotal).toBe(10000);
  });

  it("unpublished fixture no se trata como activo en el escenario", () => {
    const unpublished = QA_SCENARIOS.find((item) => item.id === "QA_ANDARIO_UNPUBLISHED");
    expect(unpublished?.status).toBe("draft");
  });
});

describe("QA_ANDARIO brand profiles (fixtures isolados)", () => {
  it("define tres perfiles con tokens CSS sin tocar Tiendaya", () => {
    expect(QA_BRAND_PROFILES).toHaveLength(3);
    for (const profile of QA_BRAND_PROFILES) {
      const keys = brandTokenKeys(profile);
      expect(keys).toEqual(
        expect.arrayContaining([
          "--paper",
          "--ink",
          "--muted",
          "--line",
          "--brand",
          "--accent",
          "--radius",
          "--font-display",
          "--font-body",
        ]),
      );
      expect(profile.cssVars["--brand"]).toBeTruthy();
      expect(profile.cssVars["--paper"]).not.toBe(profile.cssVars["--ink"]);
    }
    expect(new Set(QA_BRAND_PROFILES.map((p) => p.id)).size).toBe(3);
  });
});
