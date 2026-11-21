import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fichaCommerceSupportNote,
  fichaConversionPrimary,
  fichaSecondaryActions,
  fichaWhatsAppCtaLabel,
} from "@/lib/ficha-presentation";
import { productAsk } from "@/lib/whatsapp";

describe("ficha CTA comercial", () => {
  it("prioriza WhatsApp cuando el canal existe y deja el carrito secundario", () => {
    expect(
      fichaConversionPrimary({ cartEligible: true, hasWhatsApp: true, soldOut: false, priceMode: "fixed" }),
    ).toBe("whatsapp");
    expect(
      fichaConversionPrimary({ cartEligible: true, hasWhatsApp: false, soldOut: false, priceMode: "fixed" }),
    ).toBe("cart");
    expect(
      fichaConversionPrimary({ cartEligible: true, hasWhatsApp: false, soldOut: false, priceMode: "ask" }),
    ).toBe("quote");

    const secondary = fichaSecondaryActions({
      primary: "whatsapp",
      cartEligible: true,
      hasWhatsApp: true,
      soldOut: false,
      priceMode: "fixed",
    });
    expect(secondary.showCart).toBe(true);
    expect(secondary.showWhatsApp).toBe(false);
    expect(secondary.showQuote).toBe(true);
  });

  it("etiqueta Pedir por WhatsApp y aclara que no hay compra cerrada", () => {
    expect(fichaWhatsAppCtaLabel("fixed")).toBe("Pedir por WhatsApp");
    expect(fichaWhatsAppCtaLabel("ask")).toBe("Consultar precio por WhatsApp");
    expect(fichaCommerceSupportNote({ primary: "whatsapp", store: "Demo" })).toMatch(/disponibilidad/i);
    expect(fichaCommerceSupportNote({ primary: "cart", store: "Demo" })).toContain("Demo");

    const ask = productAsk("Demo", {
      name: "Crema",
      variant: "75 g",
      quantity: 2,
      price: "$45.000",
      url: "https://ejemplo.test/producto/crema",
    });
    expect(ask).toContain("Crema");
    expect(ask).toContain("75 g");
    expect(ask).toContain("2 unidades");
    expect(ask).toMatch(/Quiero pedirlo/i);
    expect(ask).not.toMatch(/compra confirmada|pago (completado|exitoso)/i);
    expect(ask).toMatch(/no es una oferta cerrada ni un pago realizado/i);
  });

  it("monta la jerarquía visual en la ficha pública", () => {
    const ficha = readFileSync(join(process.cwd(), "src/components/catalog/ficha.tsx"), "utf8");
    expect(ficha).toContain("ficha-cta-whatsapp");
    expect(ficha).toContain("ficha-cta-secondary");
    expect(ficha).toContain("fichaWhatsAppCtaLabel");
    expect(ficha).toContain("WhatsAppGlyph");
    expect(ficha).toMatch(/ficha-cta[\s\S]*ficha-cta-secondary[\s\S]*ficha-secondary/);

    const css = readFileSync(join(process.cwd(), "src/app/public.css"), "utf8");
    expect(css).toMatch(/\.shop \.ficha-cta-secondary\s*\{[\s\S]*?border:/);
    expect(css).toMatch(/\.shop \.ficha-cta-primary\s*\{[\s\S]*?min-height:\s*52px/);
  });
});
