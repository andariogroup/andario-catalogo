import { describe, expect, it } from "vitest";
import {
  categorySeoTitle,
  collectionJsonLd,
  countryCode,
  openingHoursSpec,
  organizationJsonLd,
  pageOpenGraph,
  productJsonLd,
  productSeoDescription,
  productSeoTitle,
} from "@/lib/seo";

describe("seo: guardarraíles de título y descripción", () => {
  it("conserva un título SEO que habla del producto", () => {
    expect(productSeoTitle("O Boticário Nativa SPA Açaí Crema de Manos 75 g", "Crema de manos Nativa SPA Açaí | O Boticário")).toBe(
      "Crema de manos Nativa SPA Açaí | O Boticário",
    );
  });

  it("descarta un título copiado de la categoría", () => {
    const name = "O Boticário Nativa SPA Açaí Crema Hidratante de Manos 75 g";
    expect(productSeoTitle(name, "Cuidado de manos y uñas: cremas y manicura | Trinitarias")).toBe(name);
  });

  it("usa el nombre si no hay título propio", () => {
    expect(productSeoTitle("Bolso Aitana", "")).toBe("Bolso Aitana");
    expect(productSeoTitle("Bolso Aitana", null)).toBe("Bolso Aitana");
  });

  it("no reutiliza la descripción de la categoría", () => {
    const categoria = "Cremas, tratamientos y accesorios para el cuidado de manos y uñas con selección de belleza.";
    expect(
      productSeoDescription({ seoDescription: categoria, shortDescription: "Crema ligera con aroma de açaí.", categoryTexts: [categoria] }),
    ).toBe("Crema ligera con aroma de açaí.");
    expect(
      productSeoDescription({ seoDescription: "Crema ligera para manos suaves.", shortDescription: "Otra", categoryTexts: [categoria] }),
    ).toBe("Crema ligera para manos suaves.");
  });

  it("no usa títulos de categoría demasiado largos", () => {
    expect(categorySeoTitle("Manos y uñas", "Cuidado de manos y uñas: cremas y manicura")).toBe("Cuidado de manos y uñas: cremas y manicura");
    expect(categorySeoTitle("Manos y uñas", "Cuidado de manos y uñas: cremas, tratamientos, aceites para cutículas y accesorios de manicura")).toBe("Manos y uñas");
    expect(categorySeoTitle("Manos y uñas", "")).toBe("Manos y uñas");
    // Frase cortada por el límite de caracteres del campo.
    expect(categorySeoTitle("Manos y uñas", "Cuida tus manos y realza tus uñas con cremas hidratantes, aceites para")).toBe("Manos y uñas");
    expect(productSeoTitle("Crema de manos Nativa", "Crema de manos Nativa SPA para")).toBe("Crema de manos Nativa");
  });

  it("recorta a 160 caracteres", () => {
    expect(productSeoDescription({ description: "a".repeat(400) }).length).toBeLessThanOrEqual(160);
  });
});

describe("seo: datos estructurados", () => {
  it("convierte horarios escritos a mano al formato schema.org", () => {
    expect(openingHoursSpec("Lunes a Domingo,  9:00 a 18:00")).toBe("Mo-Su 09:00-18:00");
    expect(openingHoursSpec("Lunes a sábado 9:00 a. m. - 6:00 p. m.")).toBe("Mo-Sa 09:00-18:00");
    expect(openingHoursSpec("Viernes 8 a 12")).toBe("Fr 08:00-12:00");
  });

  it("omite horarios que no se entienden", () => {
    expect(openingHoursSpec("")).toBeUndefined();
    expect(openingHoursSpec("Lunes a sábado")).toBeUndefined();
    expect(openingHoursSpec("Cuando abrimos, abrimos")).toBeUndefined();
    expect(openingHoursSpec("Lunes 18:00 a 9:00")).toBeUndefined();
  });

  it("usa códigos de país ISO", () => {
    expect(countryCode("Colombia")).toBe("CO");
    expect(countryCode("co")).toBe("CO");
    expect(countryCode("")).toBeUndefined();
    expect(countryCode("Atlantis")).toBeUndefined();
  });

  it("publica redes oficiales https como sameAs", () => {
    const data = organizationJsonLd({
      name: "Tienda",
      url: "https://tienda.co",
      city: "Valledupar",
      region: "Cesar",
      country: "Colombia",
      phone: "",
      image: "",
      sameAs: ["https://instagram.com/tienda", "http://inseguro.com", "", "https://instagram.com/tienda"],
    });
    expect(data.sameAs).toEqual(["https://instagram.com/tienda"]);
    expect(data.address).toMatchObject({ addressCountry: "CO" });
  });

  it("publica rango cuando las variantes tienen precios distintos", () => {
    const base = { name: "Crema", description: "x", sku: "C1", image: [], url: "https://t.co/p/crema", priceMode: "fixed", availability: "available", kind: "physical", store: "Tienda" };
    const range = productJsonLd({ ...base, price: 50000, variantPrices: [50000, 80000] });
    expect(range.offers).toMatchObject({ "@type": "AggregateOffer", lowPrice: "50000", highPrice: "80000", offerCount: 3 });
    const single = productJsonLd({ ...base, price: 50000, variantPrices: [50000] });
    expect(single.offers).toMatchObject({ "@type": "Offer", price: "50000" });
  });

  it("describe la categoría como colección con sus productos", () => {
    const data = collectionJsonLd({ name: "Manos", url: "https://t.co/categoria/manos", items: [{ name: "Crema", url: "https://t.co/producto/crema" }] });
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.mainEntity).toMatchObject({ numberOfItems: 1, itemListElement: [{ position: 1, name: "Crema" }] });
  });

  it("el Open Graph de página interna es completo", () => {
    expect(pageOpenGraph({ title: "Catálogo", description: "d", path: "/catalogo", brand: "Tienda", image: "https://t.co/i.jpg" })).toMatchObject({
      url: "/catalogo",
      locale: "es_CO",
      type: "website",
      siteName: "Tienda",
      images: ["https://t.co/i.jpg"],
    });
  });
});