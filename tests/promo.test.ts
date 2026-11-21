import { describe, expect, it } from "vitest";
import { allows } from "@/lib/permissions";
import {
  STORY_SAFE,
  canonicalTemplate,
  defaultCaption,
  defaultCta,
  alignCaptionPrices,
  hasBenefitPoints,
  offerAllowed,
  promoArtCopy,
  promoBenefitPoints,
  promoDeliveryUrl,
  promoExportBlocks,
  promoFileName,
  promoLink,
  promoProblem,
  promoShareText,
} from "@/lib/promo";

describe("piezas para redes", () => {
  it("toma el titular de la descripción real y no inventa un beneficio", () => {
    const art = promoArtCopy({
      template: "editorial",
      name: "O Boticário Cuide-se Bem Deleite",
      short: "Loción hidratante corporal.",
      category: "Cuerpo",
      priceLabel: "$48.000",
      compareLabel: "",
      priceMode: "fixed",
      cta: "Pedir por WhatsApp",
    });
    expect(art.headline).toBe("Loción hidratante corporal");
    expect(art.name).toContain("Deleite");
    expect(art.benefit).toBe("");
    expect(art.headline.toLowerCase()).not.toMatch(/ritual|dulce|milagro/);
    const long = promoArtCopy({
      template: "editorial",
      name: "O Boticário Cuide-se Bem Deleite",
      short: "Loción corporal de rápida absorción con aroma dulce y envolvente.",
      priceLabel: "$55.900",
      compareLabel: "",
      priceMode: "fixed",
      cta: "Pedir por WhatsApp",
    });
    expect(long.headline).toBe("Loción corporal de rápida absorción");
    expect(long.benefit).toBe("Con aroma dulce y envolvente");
    expect(defaultCaption({
      name: "O Boticário Cuide-se Bem Deleite",
      short: "Loción corporal de rápida absorción con aroma dulce y envolvente. Ayuda a mantener la piel suave e hidratada.",
      template: "editorial",
      priceLabel: "$55.900",
      compareLabel: "",
      priceMode: "fixed",
    }).toLowerCase()).toContain("piel suave");
    const source = "loción corporal de rápida absorción con aroma dulce y envolvente";
    for (const word of `${long.headline} ${long.benefit}`.toLowerCase().split(/\s+/)) {
      expect(source).toContain(word);
    }
    expect(defaultCaption({
      name: "Deleite",
      short: "Loción corporal",
      template: "editorial",
      priceLabel: "$48.000",
      compareLabel: "",
      priceMode: "fixed",
      cta: "Pedir por WhatsApp",
    }).toLowerCase()).not.toContain("antes");
  });

  it("solo muestra precio anterior en venta directa cuando el catálogo lo tiene", () => {
    expect(offerAllowed({ priceMode: "fixed", price: 62000, compare: 74000 })).toBe(true);
    expect(offerAllowed({ priceMode: "ask", price: 62000, compare: 74000 })).toBe(false);
    expect(canonicalTemplate("offer")).toBe("direct");
    expect(canonicalTemplate("featured")).toBe("editorial");
    const direct = promoArtCopy({
      template: "direct",
      name: "Nativa SPA",
      short: "Aceite corporal",
      priceLabel: "$62.000",
      compareLabel: "$74.000",
      priceMode: "fixed",
      cta: "Pedir por WhatsApp",
    });
    expect(direct.compare).toBe("$74.000");
    expect(direct.price).toBe("$62.000");
    const editorial = promoArtCopy({
      template: "editorial",
      name: "Nativa SPA",
      short: "Aceite corporal",
      priceLabel: "$62.000",
      compareLabel: "$74.000",
      priceMode: "fixed",
      cta: "Ver en el catálogo",
    });
    expect(editorial.compare).toBe("");
    expect(defaultCaption({
      name: "Nativa SPA",
      short: "Aceite corporal",
      template: "direct",
      priceLabel: "$62.000",
      compareLabel: "$74.000",
      priceMode: "fixed",
    })).toContain("Antes $74.000");
  });

  it("cambia el llamado según WhatsApp, precio a consultar y agotado", () => {
    expect(defaultCta({ hasWhatsapp: true, priceMode: "fixed", availability: "available" })).toBe("Pedir por WhatsApp");
    expect(defaultCta({ hasWhatsapp: true, priceMode: "ask", availability: "available" })).toBe("Consultar precio por WhatsApp");
    expect(defaultCta({ hasWhatsapp: false, priceMode: "ask", availability: "available" })).toBe("Solicitar cotización");
    expect(defaultCta({ hasWhatsapp: true, priceMode: "fixed", availability: "sold_out" })).toBe("Solicitar cotización");
    const ask = promoArtCopy({
      template: "direct",
      name: "Servicio de asesoría",
      short: "",
      priceLabel: "Consultar precio",
      compareLabel: "",
      priceMode: "ask",
      cta: "Solicitar cotización",
    });
    expect(ask.price).toBe("");
    expect(ask.note).toBe("Precio a consultar");
    expect(ask.headline).toBe("Servicio de asesoría");
    const ordered = promoArtCopy({
      template: "direct",
      name: "Crema de manos",
      short: "Crema de manos",
      priceLabel: "$20.000",
      compareLabel: "",
      priceMode: "fixed",
      availability: "made_to_order",
      cta: "Pedir por WhatsApp",
    });
    expect(ordered.note).toBe("Bajo pedido");
    expect(ordered.price).toBe("$20.000");
  });

  it("arma la lista de beneficio solo con frases y características reales", () => {
    const points = promoBenefitPoints({
      name: "Crema de manos",
      short: "Absorbe rápido. Deja la piel suave. El aroma es dulce.",
      facts: [{ name: "Textura", value: "ligera" }],
    });
    expect(points).toEqual(["Absorbe rápido", "Deja la piel suave", "El aroma es dulce", "Textura: ligera"]);
    expect(hasBenefitPoints({ name: "Crema de manos", short: "" })).toBe(false);
    const art = promoArtCopy({
      template: "benefit",
      name: "Crema de manos",
      short: "Absorbe rápido. Deja la piel suave. El aroma es dulce.",
      points,
      priceLabel: "$20.000",
      compareLabel: "",
      priceMode: "fixed",
      cta: "Pedir por WhatsApp",
    });
    expect(art.headline).toBe("Absorbe rápido");
    expect(art.points).toEqual(["Deja la piel suave", "El aroma es dulce", "Textura: ligera"]);
    expect(art.benefit).toBe("");
    const source = "absorbe rápido deja la piel suave el aroma es dulce textura ligera";
    for (const word of art.points.join(" ").toLowerCase().replace(/[:.]/g, "").split(/\s+/)) {
      expect(source).toContain(word);
    }
    const single = promoArtCopy({
      template: "benefit",
      name: "O Boticário Cuide-se Bem Deleite",
      short: "Loción hidratante corporal.",
      priceLabel: "$48.000",
      compareLabel: "",
      priceMode: "fixed",
      cta: "Pedir por WhatsApp",
    });
    expect(single.headline).toContain("Deleite");
    expect(single.points).toEqual(["Loción hidratante corporal"]);
    const long = "Esta frase es demasiado larga para entrar completa en la pieza sin cortar el final de la oración comercial del producto.";
    expect(promoBenefitPoints({ name: "Crema", short: `Absorbe rápido. ${long}` })).toEqual(["Absorbe rápido"]);
  });

  it("bloquea la exportación cuando el precio, el contraste o el texto fallan", () => {
    const ready = {
      priceLabel: "$48.000",
      priceMode: "fixed",
      paintedPrice: "$48.000",
      headlineContrast: 7,
      ctaContrast: 5,
      overflow: false,
      photoUrl: "",
      template: "editorial",
    };
    expect(promoExportBlocks(ready)).toEqual([]);
    expect(promoExportBlocks({ ...ready, paintedPrice: "$10" })).toEqual(["El precio de la imagen no coincide con el del producto."]);
    expect(promoExportBlocks({ ...ready, priceMode: "ask", priceLabel: "Consultar precio", paintedPrice: "$48.000" })[0]).toMatch(/no publica/);
    expect(promoExportBlocks({ ...ready, headlineContrast: 2 })[0]).toMatch(/contraste/);
    expect(promoExportBlocks({ ...ready, overflow: true })[0]).toMatch(/texto/);
    expect(promoExportBlocks(ready)).not.toContain("Este estilo necesita una foto del producto.");
    expect(STORY_SAFE.bottom).toBeGreaterThan(220);
    expect(STORY_SAFE.right).toBeGreaterThan(STORY_SAFE.left);
    expect(promoProblem({
      channel: "instagram",
      format: "square",
      template: "benefit",
      caption: "Texto de la pieza.",
      cta: "Ver en el catálogo",
      photoUrl: "",
      photos: [],
      points: [],
      priceMode: "fixed",
      price: 48000,
      compare: null,
    })).toMatch(/argumentos/i);
  });

  it("rechaza un estilo desconocido y una foto que no es del producto", () => {
    const base = {
      channel: "instagram",
      format: "square",
      template: "direct",
      caption: "Texto de la pieza.",
      cta: "Ver en el catálogo",
      photoUrl: "",
      photos: ["https://res.cloudinary.com/demo/image/upload/andario/a.jpg"],
      priceMode: "fixed",
      price: 48000,
      compare: null,
    };
    expect(promoProblem({ ...base, template: "oferta-falsa" })).toMatch(/estilo/i);
    expect(promoProblem({ ...base, photoUrl: "https://example.com/otra.jpg" })).toMatch(/foto/i);
    expect(promoProblem({ ...base, photoUrl: base.photos[0] })).toBe("");
    expect(promoProblem({ ...base, caption: "Hoy hay descuento" })).toMatch(/descuento/i);
    expect(promoProblem({ ...base, caption: "Antes $74.000, ahora $48.000" })).toMatch(/anterior/i);
    expect(promoProblem({ ...base, caption: "Antes $74.000, ahora $48.000", price: 48000, compare: 74000 })).toBe("");
    const aligned = alignCaptionPrices("Antes $74.000, ahora $62.000", {
      priceLabel: "$70.000",
      compareLabel: "$80.000",
      offer: true,
    });
    expect(aligned.caption).toBe("Antes $80.000, ahora $70.000");
    expect(alignCaptionPrices("La crema cuesta $48.000", {
      priceLabel: "$55.900",
      compareLabel: "",
      offer: false,
    }).caption).toBe("La crema cuesta $55.900");
    expect(alignCaptionPrices("Antes $74.000, ahora $48.000", {
      priceLabel: "Consultar precio",
      compareLabel: "",
      offer: false,
    }).caption).not.toMatch(/\$/);
  });

  it("marca el enlace con el canal y prepara el archivo", () => {
    expect(promoLink("https://tienda.example", "nativa spa", "instagram")).toBe(
      "https://tienda.example/producto/nativa%20spa?utm_source=instagram",
    );
    expect(promoShareText("Hola", "https://tienda.example/producto/a?utm_source=whatsapp")).toContain("utm_source=whatsapp");
    expect(promoFileName("Nativa SPA", "facebook")).toBe("nativa-spa-facebook.png");
    expect(promoDeliveryUrl("https://example.com/foto.jpg", 800)).toBe("https://example.com/foto.jpg");
    const delivery = promoDeliveryUrl("https://res.cloudinary.com/demo/image/upload/andario/a.jpg", 800);
    expect(delivery).toContain("f_jpg");
    expect(delivery).toContain("q_85");
  });

  it("deja crear piezas a marketing y al catálogo, no al asesor", () => {
    expect(allows("marketing", "promos", "write")).toBe(true);
    expect(allows("catalog", "promos", "write")).toBe(true);
    expect(allows("commercial", "promos", "read")).toBe(false);
    expect(allows("admin", "promos", "manage")).toBe(true);
  });
});
