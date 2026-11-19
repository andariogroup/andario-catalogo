import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { heroProblem } from "@/lib/hero";
import { formatPesos, parsePesos } from "@/lib/money";
import { allows } from "@/lib/permissions";
import {
  aboutCatalogCtaLabel,
  aboutContactAvailable,
  aboutHasPlace,
  aboutLead,
  aboutLocationLine,
  aboutPageTitle,
  aboutStoryBody,
  aboutYearLabel,
  isLocationCentricTitle,
  publicBusinessCopy,
  scrubPlatformSentences,
} from "@/lib/about-page";
import {
  catalogActiveFilterCount,
  catalogActiveFilters,
  catalogAvailabilityLabel,
  catalogCategoryScopeIds,
  catalogCopy,
  catalogDetailCtaLabel,
  catalogIntro,
  catalogIsExploring,
  catalogLayoutMode,
  catalogPageHeading,
  catalogResultsLabel,
  catalogShowBreadcrumb,
  catalogShowSort,
} from "@/lib/catalog-page";
import {
  buildFacetGroups,
  groupSelectedOptions,
  parseCatalogOptionIds,
  pickMatchingVariant,
  priceInRange,
  shouldShowFacet,
  variantMatchesSelection,
} from "@/lib/catalog-facets";
import {
  CART_VERSION,
  addCartItem,
  cartCountLabel,
  cartEligible,
  cartLineKey,
  cartLineSubtotal,
  cartNavLabel,
  cartNeedsQuote,
  cartPriceLabel,
  cartRequestLines,
  cartStoreId,
  cartTotals,
  cartUnitCount,
  cartUnitPriceLabel,
  clampCartQuantity,
  emptyCart,
  formatCartSubtotal,
  parseCart,
  removeCartItem,
  serializeCart,
  setCartQuantity,
} from "@/lib/cart";
import { mediaDeliveryUrl } from "@/lib/images";
import { formatPublicPhone, internationalPhoneDigits, telHref } from "@/lib/phone";
import {
  fichaAvailabilityLabel,
  fichaCompareLabel,
  fichaConversionPrimary,
  fichaOptionReachable,
  fichaPriceLabel,
  fichaPrimaryAction,
  fichaPrimaryTag,
  fichaShowBlock,
  fichaShowGalleryControls,
  fichaShowQuantity,
} from "@/lib/ficha-presentation";
import {
  attributeDeleteError,
  categoryInactivationError,
  categoryTombstoneTarget,
  isStaleRedirect,
  optionRemovalError,
  productPublicPath,
  safeRedirectTarget,
  shouldClearProductRedirect,
  shouldTombstoneProductPath,
  variantRemovalError,
} from "@/lib/catalog-lifecycle";
import { attributeAppliesToCategory, filterAttributesForCategory } from "@/lib/attribute-draft";
import { mapEmbedSrc } from "@/lib/maps";
import {
  isUniqueEmailError,
  passwordSessionStamp,
  roleLabel,
  sessionPasswordStale,
  userEmailProblem,
  userLastAccess,
  userLastAdminProblem,
  userMatchesFilter,
  userNameProblem,
  userPasswordConfirmProblem,
  userPasswordProblem,
  userSaveMessage,
  userSelfDeactivateProblem,
} from "@/lib/users";
import { byArrival, isQuoteState, quoteAgeDays, quoteAgo, quoteContactProblem, quoteLineProblem, quoteManagerLabel, quoteMatchesStatuses, quoteNext, quoteOrigin, quoteReference, quoteStateLabel, quoteStepRecord, quoteUnmanaged, quoteUpdateMessage, readableVariant, retentionCutoff } from "@/lib/quotes";
import { breadcrumbJsonLd, canonicalPath, catalogCanonical, catalogOrigin, organizationJsonLd, productJsonLd, publicUrlProblem, titled } from "@/lib/seo";
import { categoryPath, slugify } from "@/lib/slug";
import { shopNavAriaCurrent, shopNavBusinessActive, shopNavCatalogActive } from "@/lib/shop-nav";
import { cartAsk, listAsk, productAsk, quoteAsk, quoteReply, whatsappHref } from "@/lib/whatsapp";


describe("contraste", () => {
  it("avisa cuando el texto claro sobre fondo claro no alcanza AA", () => {
    const weak = contrastRatio("#f7f1e8", "#ffffff");
    const strong = contrastRatio("#f7f1e8", "#1b4332");
    expect(weak).not.toBeNull();
    expect(strong).not.toBeNull();
    expect(weak!).toBeLessThan(4.5);
    expect(strong!).toBeGreaterThan(4.5);
  });
});

describe("permisos", () => {
  it("el asesor comercial gestiona cotizaciones y no cambia precios", () => {
    expect(allows("commercial", "quotes", "manage")).toBe(true);
    expect(allows("commercial", "products", "write")).toBe(false);
    expect(allows("catalog", "quotes", "read")).toBe(false);
    expect(allows("catalog", "analytics", "limited")).toBe(true);
    expect(allows("catalog", "analytics", "read")).toBe(false);
    expect(allows("marketing", "seo", "write")).toBe(true);
    expect(allows("marketing", "integrations", "write")).toBe(true);
    expect(allows("marketing", "brand", "write")).toBe(false);
    expect(allows("admin", "users", "manage")).toBe(true);
    expect(allows("admin", "integrations", "manage")).toBe(true);
    expect(allows("commercial", "users", "read")).toBe(false);
    expect(allows("catalog", "integrations", "read")).toBe(false);
  });
});

describe("usuarios", () => {
  it("valida correo, clave y filtros de la lista", () => {
    expect(roleLabel("commercial")).toBe("Asesor comercial");
    expect(userNameProblem("A")).toMatch(/2/);
    expect(userNameProblem("Ana")).toBe("");
    expect(userEmailProblem("ana@")).toMatch(/dominio/);
    expect(userEmailProblem("ana@tienda.com")).toBe("");
    expect(userPasswordProblem("", true)).toMatch(/10/);
    expect(userPasswordProblem("corta", false)).toMatch(/10/);
    expect(userPasswordProblem("sololetrasxx", false)).toMatch(/número/);
    expect(userPasswordProblem("1234567890", false)).toMatch(/letras/);
    expect(userPasswordProblem("clave-segura1", false)).toBe("");
    expect(userPasswordConfirmProblem("clave-segura1", "otra-clave12")).toMatch(/coinciden/);
    expect(userPasswordConfirmProblem("clave-segura1", "clave-segura1")).toBe("");
    expect(userPasswordConfirmProblem("", "x")).toBe("");
    expect(userLastAccess(null)).toMatch(/Aún/);
    const sample = { id: "1", name: "Ana", email: "ana@tienda.com", role: "commercial" as const, active: true, lastLoginAt: null, mine: false };
    expect(userMatchesFilter(sample, "ana", "all", "all")).toBe(true);
    expect(userMatchesFilter(sample, "", "inactive", "all")).toBe(false);
    expect(userMatchesFilter(sample, "", "all", "admin")).toBe(false);
    expect(userMatchesFilter(sample, "asesor", "all", "all")).toBe(true);
  });

  it("protege auto-desactivación y el último administrador", () => {
    expect(userSelfDeactivateProblem("a", "a", false)).toMatch(/propia/);
    expect(userSelfDeactivateProblem("a", "b", false)).toBe("");
    expect(userLastAdminProblem({
      currentRole: "admin",
      currentActive: true,
      nextRole: "catalog",
      nextActive: true,
      otherActiveAdmins: 0,
    })).toMatch(/administrador/);
    expect(userLastAdminProblem({
      currentRole: "admin",
      currentActive: true,
      nextRole: "admin",
      nextActive: false,
      otherActiveAdmins: 0,
    })).toMatch(/administrador/);
    expect(userLastAdminProblem({
      currentRole: "admin",
      currentActive: true,
      nextRole: "catalog",
      nextActive: true,
      otherActiveAdmins: 1,
    })).toBe("");
    expect(userLastAdminProblem({
      currentRole: "commercial",
      currentActive: true,
      nextRole: "catalog",
      nextActive: false,
      otherActiveAdmins: 0,
    })).toBe("");
  });

  it("arma mensajes de guardado y detecta correo duplicado", () => {
    expect(userSaveMessage({ name: "Ana", creating: true, active: true, passwordChanged: true })).toMatch(/puede entrar/);
    expect(userSaveMessage({ name: "Ana", creating: false, active: false, passwordChanged: false })).toMatch(/inactivo/);
    expect(userSaveMessage({ name: "Ana", creating: false, active: true, passwordChanged: true })).toMatch(/clave nueva/);
    expect(isUniqueEmailError({ code: "23505" })).toBe(true);
    expect(isUniqueEmailError(new Error("duplicate key value violates unique constraint \"users_email_unique\""))).toBe(true);
    expect(isUniqueEmailError({ code: "42P01" })).toBe(false);
  });

  it("invalida la sesión cuando cambia el hash de la clave", () => {
    const stamp = passwordSessionStamp("hash-prefix-and-a-unique-tail-123456");
    expect(sessionPasswordStale(stamp, "hash-prefix-and-a-unique-tail-123456")).toBe(false);
    expect(sessionPasswordStale(stamp, "hash-prefix-and-a-unique-tail-999999")).toBe(true);
    expect(sessionPasswordStale(undefined, "hash-prefix-and-a-unique-tail-123456")).toBe(false);
  });
});

describe("atributos por categoría", () => {
  const links = [
    { attributeId: "color", categoryId: "moda" },
    { attributeId: "talla", categoryId: "moda" },
    { attributeId: "talla", categoryId: "calzado" },
  ];

  it("sin vínculos el atributo es global", () => {
    expect(attributeAppliesToCategory("peso", "hogar", links)).toBe(true);
    expect(attributeAppliesToCategory("peso", null, links)).toBe(true);
  });

  it("con vínculos solo aplica a esas categorías", () => {
    expect(attributeAppliesToCategory("color", "moda", links)).toBe(true);
    expect(attributeAppliesToCategory("color", "hogar", links)).toBe(false);
    expect(attributeAppliesToCategory("color", null, links)).toBe(false);
    expect(filterAttributesForCategory([{ id: "color" }, { id: "peso" }], "hogar", links).map((item) => item.id)).toEqual(["peso"]);
  });
});

describe("retención de cotizaciones", () => {
  it("calcula el corte a partir de los días", () => {
    const now = new Date("2026-11-12T12:00:00.000Z");
    expect(retentionCutoff(0, now)).toBeNull();
    expect(retentionCutoff(30, now)?.toISOString()).toBe("2026-10-13T12:00:00.000Z");
  });
});

describe("catálogo público", () => {
  it("arma etiquetas, layout y filtros sin inventar copy", () => {
    expect(catalogAvailabilityLabel("sold_out")).toBe("Agotado");
    expect(catalogAvailabilityLabel("made_to_order")).toBe("Bajo pedido");
    expect(catalogAvailabilityLabel("available")).toBe("");
    expect(catalogResultsLabel(1, ["physical"])).toBe("1 producto");
    expect(catalogResultsLabel(3, ["service"])).toBe("3 servicios");
    expect(catalogResultsLabel(0, ["digital"])).toBe("0 productos digitales");
    expect(catalogResultsLabel(0, [])).toBe("0 productos");
    expect(catalogDetailCtaLabel("physical")).toBe("Ver producto");
    expect(catalogDetailCtaLabel("digital")).toBe("Ver producto");
    expect(catalogDetailCtaLabel("service")).toBe("Ver detalles");
    expect(catalogDetailCtaLabel("plan")).toBe("Ver detalles");
    expect(catalogCopy("Este texto se puede reemplazar")).toBe("");
    expect(catalogIntro({ slogan: "Piezas con oficio", shortDescription: "Atelier en Medellín" })).toMatch(/Atelier/);
    expect(catalogIntro({ slogan: "", shortDescription: "" })).toBe("");
    expect(catalogIsExploring({ orden: "name" })).toBe(false);
    expect(catalogIsExploring({ q: "bolso" })).toBe(true);
    expect(catalogLayoutMode(1, false)).toBe("grid");
    expect(catalogLayoutMode(1, true)).toBe("grid");
    expect(catalogLayoutMode(12, false)).toBe("grid");
    expect(catalogLayoutMode(0, true)).toBe("empty");
    expect(catalogShowSort(0)).toBe(false);
    expect(catalogShowSort(1)).toBe(false);
    expect(catalogShowSort(2)).toBe(true);
    expect(catalogPageHeading(undefined)).toBe("Catálogo");
    expect(catalogPageHeading({ name: "Iluminación" })).toBe("Iluminación");
    expect(catalogShowBreadcrumb(undefined)).toBe(false);
    expect(catalogShowBreadcrumb({ parentId: null })).toBe(true);
    expect(catalogShowBreadcrumb({ parentId: "padre" })).toBe(true);
    expect(
      catalogActiveFilters({ q: "bolso", disponibilidad: "available", orden: "name" }, []).map((chip) => chip.label),
    ).toEqual(["Buscar: bolso", "Disponible"]);
    expect(
      catalogCategoryScopeIds("moda", [
        { id: "moda", parentId: null },
        { id: "bolsos", parentId: "moda" },
        { id: "hogar", parentId: null },
      ]),
    ).toEqual(["moda", "bolsos"]);
    expect(catalogCategoryScopeIds("bolsos", [{ id: "moda", parentId: null }, { id: "bolsos", parentId: "moda" }])).toEqual([
      "bolsos",
    ]);
    expect(catalogActiveFilterCount({ disponibilidad: "available", opciones: "a,b", tipo: "physical" })).toBe(4);
  });

  it("evalúa combinaciones reales de variantes y facetas", () => {
    const options = [
      { id: "negro", attributeId: "color", label: "Negro" },
      { id: "caramelo", attributeId: "color", label: "Caramelo" },
      { id: "s", attributeId: "talla", label: "S" },
      { id: "m", attributeId: "talla", label: "M" },
    ];
    const selected = groupSelectedOptions(["negro", "m"], options);
    expect(selected.get("color")?.has("negro")).toBe(true);
    expect(selected.get("talla")?.has("m")).toBe(true);

    const v1 = [
      { variantId: "v1", attributeId: "color", optionId: "negro" },
      { variantId: "v1", attributeId: "talla", optionId: "s" },
    ];
    const v3 = [
      { variantId: "v3", attributeId: "color", optionId: "negro" },
      { variantId: "v3", attributeId: "talla", optionId: "m" },
    ];
    expect(variantMatchesSelection(v1, selected)).toBe(false);
    expect(variantMatchesSelection(v3, selected)).toBe(true);

    const picked = pickMatchingVariant({
      variants: [
        { id: "v3", productId: "p1", pricePesos: "100", availability: "sold_out", imageUrl: "" },
        { id: "v4", productId: "p1", pricePesos: "120", availability: "available", imageUrl: "https://cdn/x.jpg" },
      ],
      valuesByVariant: new Map([
        ["v3", v3],
        [
          "v4",
          [
            { variantId: "v4", attributeId: "color", optionId: "negro" },
            { variantId: "v4", attributeId: "talla", optionId: "m" },
          ],
        ],
      ]),
      selectedByAttribute: selected,
    });
    expect(picked?.id).toBe("v4");
    expect(priceInRange("100", 50, 150)).toBe(true);
    expect(priceInRange(null, 50, 150)).toBe(false);
    expect(shouldShowFacet(1, false)).toBe(false);
    expect(shouldShowFacet(2, false)).toBe(true);
    expect(parseCatalogOptionIds({ opciones: "a,b", opcion: "c" })).toEqual(["a", "b"]);
    expect(parseCatalogOptionIds({ opcion: "c" })).toEqual(["c"]);

    const groups = buildFacetGroups({
      attributes: [
        { id: "color", name: "Color", code: "color", sortOrder: 1 },
        { id: "talla", name: "Talla", code: "talla", sortOrder: 2 },
      ],
      options,
      optionHits: new Map([
        ["negro", 2],
        ["caramelo", 1],
        ["s", 1],
      ]),
      selectedOptionIds: [],
    });
    expect(groups.find((group) => group.id === "color")?.options).toHaveLength(2);
    expect(groups.find((group) => group.id === "talla")).toBeUndefined();
  });
});

describe("ciclo de vida del catálogo (borrados y redirects)", () => {
  it("define tumbas y limpieza de rutas de producto", () => {
    expect(productPublicPath("edredon-aura-acolchado")).toBe("/producto/edredon-aura-acolchado");
    expect(shouldTombstoneProductPath("active", "inactive")).toBe(true);
    expect(shouldTombstoneProductPath("active", "draft")).toBe(true);
    expect(shouldTombstoneProductPath("active", "active")).toBe(false);
    expect(shouldTombstoneProductPath("draft", "inactive")).toBe(false);
    expect(shouldClearProductRedirect("active")).toBe(true);
    expect(shouldClearProductRedirect("draft")).toBe(false);
  });

  it("bloquea inactivar categorías con hijos o productos publicados", () => {
    expect(categoryInactivationError({ activeProductCount: 0, activeChildCount: 2 })).toMatch(/subcategoría/);
    expect(categoryInactivationError({ activeProductCount: 3, activeChildCount: 0 })).toMatch(/producto/);
    expect(categoryInactivationError({ activeProductCount: 0, activeChildCount: 0 })).toBe("");
    expect(categoryTombstoneTarget({ parentSlug: "hogar", parentActive: true })).toBe("/categoria/hogar");
    expect(categoryTombstoneTarget({ parentSlug: null, parentActive: false })).toBe("/catalogo");
  });

  it("bloquea borrar atributos u opciones usados en productos publicados", () => {
    expect(attributeDeleteError({ activeProductCount: 2, variantCount: 5 })).toMatch(/publicado/);
    expect(attributeDeleteError({ activeProductCount: 0, variantCount: 0 })).toBe("");
    expect(
      optionRemovalError({ removedLabelCount: 1, activeProductCount: 1, variantCount: 2 }),
    ).toMatch(/opciones/);
    expect(optionRemovalError({ removedLabelCount: 0, activeProductCount: 9, variantCount: 9 })).toBe("");
  });

  it("bloquea quitar variantes que rompen atributos obligatorios en productos active", () => {
    expect(
      variantRemovalError({ productStatus: "active", remainingVariantCount: 0, requiredGap: "Color es obligatorio." }),
    ).toMatch(/Color es obligatorio/);
    expect(variantRemovalError({ productStatus: "draft", remainingVariantCount: 0, requiredGap: "Color es obligatorio." })).toBe(
      "",
    );
    expect(variantRemovalError({ productStatus: "active", remainingVariantCount: 1, requiredGap: "" })).toBe("");
  });

  it("detecta redirects zombie y valida destinos seguros", () => {
    expect(isStaleRedirect("/producto/edredon-aura-acolchado", ["/producto/edredon-aura-acolchado"])).toBe(true);
    expect(isStaleRedirect("/producto/viejo", ["/producto/edredon-aura-acolchado"])).toBe(false);
    expect(safeRedirectTarget("/catalogo")).toBe("/catalogo");
    expect(safeRedirectTarget("//evil.com")).toBe("");
    expect(safeRedirectTarget("/catalogo?x=1")).toBe("");
    expect(safeRedirectTarget("https://evil.com")).toBe("");
  });
});

describe("página El negocio", () => {
  const base = {
    name: "Casa Lino",
    slogan: "Piezas con oficio",
    shortDescription: "Atelier de textiles para el hogar.",
    description: "Diseñamos y seleccionamos textiles para espacios cotidianos.",
    storyTitle: "",
    story: "Empezamos en un taller pequeño y hoy trabajamos con piezas hechas con calma.",
    storyImageUrl: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    commercialMessage: "Te acompañamos a elegir con claridad.",
    yearStarted: 2018,
    address: "Calle 10 #20-30",
    city: "Medellín",
    region: "Antioquia",
    country: "Colombia",
    mapsUrl: "https://maps.google.com/?q=Medellin",
    phone: "6041234567",
    email: "hola@casa-lino.com",
    whatsapp: "573001112233",
    hours: "Lunes a sábado, 9:00 a 18:00",
    attentionScope: "Atención presencial y virtual",
    deliveryText: "Entregas en el Área Metropolitana",
    commercialTerms: "",
  };

  it("arma título, textos y oculta copy provisional", () => {
    expect(aboutPageTitle(base)).toBe("Conoce Casa Lino");
    expect(aboutPageTitle({ ...base, storyTitle: "Medellín" })).toBe("Conoce Casa Lino");
    expect(aboutPageTitle({ ...base, storyTitle: "Casa Lino en Portobelo" })).toBe("Conoce Casa Lino");
    expect(aboutPageTitle({ ...base, storyTitle: "Hecho con oficio" })).toBe("Hecho con oficio");
    expect(isLocationCentricTitle("Casa Lino en Portobelo", base)).toBe(true);
    expect(aboutLead(base)).toMatch(/Atelier/);
    expect(aboutStoryBody(base)).toMatch(/taller/);
    expect(publicBusinessCopy("Este texto se puede reemplazar desde el administrador")).toBe("");
    expect(publicBusinessCopy("Somos los mejores del mercado")).toBe("");
    expect(publicBusinessCopy("Las entregas se coordinan por WhatsApp. Este texto no calcula el valor del envío.")).toBe("");
  });

  it("oculta año irrelevante y copy de plataforma, y reduce eco de ubicación", () => {
    expect(aboutYearLabel(2018, new Date("2026-11-12"))).toBe("Desde 2018");
    expect(aboutYearLabel(2026, new Date("2026-11-12"))).toBe("");
    expect(aboutYearLabel(null)).toBe("");
    expect(
      scrubPlatformSentences(
        "Tiendaya es el catálogo del negocio ubicado en el edificio Portobelo, en Valledupar. Aquí se publican las piezas, el precio de referencia y la forma de pedir información por WhatsApp.",
      ),
    ).toBe("");
    expect(
      aboutLead(
        {
          ...base,
          shortDescription: "Casa Lino muestra sus productos desde la Calle 10 #20-30, en Medellín.",
        },
        { placeVisible: true },
      ),
    ).toMatch(/muestra sus productos/i);
    expect(
      aboutLead(
        {
          ...base,
          shortDescription: "Casa Lino muestra sus productos desde la Calle 10 #20-30, en Medellín.",
        },
        { placeVisible: true },
      ),
    ).not.toMatch(/Medellín|Calle 10/i);
    expect(
      aboutStoryBody(
        {
          ...base,
          shortDescription: "",
          description: "",
          story:
            "Tiendaya es el catálogo del negocio ubicado en el edificio Portobelo, en Valledupar. Aquí se publican las piezas, el precio de referencia y la forma de pedir información por WhatsApp.",
        },
        { placeVisible: true },
      ),
    ).toBe("");
  });

  it("adapta el CTA y el contacto a datos reales", () => {
    expect(aboutCatalogCtaLabel(base)).toMatch(/productos|Explorar/i);
    expect(aboutCatalogCtaLabel({ ...base, attentionScope: "Asesorías virtuales", deliveryText: "", commercialTerms: "", commercialMessage: "" })).toBe("Conocer servicios");
    expect(aboutCatalogCtaLabel({ ...base, attentionScope: "Cursos digitales", deliveryText: "Entrega por correo", commercialTerms: "", commercialMessage: "" })).toMatch(/catálogo|soluciones/i);
    expect(aboutLocationLine(base)).toContain("Calle 10");
    expect(aboutHasPlace({ ...base, address: "", city: "", mapsUrl: "" })).toBe(false);
    expect(aboutContactAvailable({ ...base, whatsapp: "", phone: "", email: "", hours: "", attentionScope: "", deliveryText: "", commercialTerms: "", address: "", city: "", mapsUrl: "" })).toBe(false);
    expect(whatsappHref(base.whatsapp, "Hola")).toContain("wa.me/573001112233");
    expect(whatsappHref("12", "Hola")).toBeNull();
    expect(mapEmbedSrc(base.mapsUrl)).toContain("maps.google.com/maps?q=");
    expect(mapEmbedSrc("https://example.com")).toBe("");
  });
});

describe("pesos", () => {
  it("acepta pesos enteros y rechaza negativos o decimales", () => {
    expect(parsePesos("210.000")).toBe(210000);
    expect(parsePesos("0")).toBeNull();
    expect(parsePesos("-10")).toBeNull();
    expect(parsePesos("10.5")).toBeNull();
    expect(formatPesos(210000)).toContain("210");
    expect(formatPesos(null)).toBe("Consultar");
  });
});

describe("slugs", () => {
  it("normaliza y arma la ruta de categoría", () => {
    expect(slugify("Café Sierra Nevada")).toBe("cafe-sierra-nevada");
    expect(categoryPath("cafe", "molido")).toBe("/categoria/cafe/molido");
    expect(categoryPath(null, "cafe")).toBe("/categoria/cafe");
  });
});

describe("whatsapp", () => {
  it("arma wa.me y distingue consulta, lista y referencia", () => {
    expect(whatsappHref("321", "hola")).toBeNull();
    expect(whatsappHref("12345678", "hola")).toBeNull();
    expect(whatsappHref("3001112233", "hola")).toContain("https://wa.me/573001112233");
    expect(whatsappHref("+57 300 111 2233", "hola")).toContain("https://wa.me/573001112233");
    const asked = productAsk("Andario", { name: "Camisa", sku: "C1", price: "$80.000", url: "https://catalogo.ejemplo/producto/camisa" });
    expect(asked).toContain("no es una oferta cerrada");
    expect(asked).toContain("Hola, vi en Andario");
    expect(productAsk("Andario", { name: "Camisa" }, "Hola, vi el bolso.")).toContain("Hola, vi el bolso.");
    expect(productAsk("Andario", { name: "Camisa" }, "  ")).toContain("Hola, vi en Andario");
    expect(listAsk("Andario", [{ name: "Camisa", quantity: 2 }], "https://catalogo.ejemplo")).toContain("Camisa");
    expect(quoteAsk("Andario", "AC-2026-ABC123")).toContain("AC-2026-ABC123");
    const reply = quoteReply("Tiendaya", "Ana", "AC-2026-ABC123", ["Bolso · Color: Caramelo"]);
    expect(reply).toContain("Hola Ana, te escribimos de Tiendaya");
    expect(reply).toContain("Bolso · Color: Caramelo");
    expect(reply).not.toContain("Quiero continuar");
    const cartMessage = cartAsk(
      "Andario",
      [
        { name: "Edredón Aura", variant: "Blanco / Queen", quantity: 1, price: "$220.000" },
        { name: "Gafas Urbanas", quantity: 2 },
      ],
      { subtotal: "$220.000", catalogUrl: "https://catalogo.ejemplo" },
    );
    expect(cartMessage).toContain("Edredón Aura");
    expect(cartMessage).toContain("Variante: Blanco / Queen");
    expect(cartMessage).toContain("Cantidad: 2");
    expect(cartMessage).toContain("Subtotal de referencia: $220.000");
    expect(cartMessage).toContain("no es una oferta cerrada");
    expect(whatsappHref("3001112233", cartMessage)).toContain(encodeURIComponent("Edredón Aura"));
  });
});

describe("cotizaciones", () => {
  it("solo usa los cuatro estados y una referencia AC", () => {
    expect(isQuoteState("nueva")).toBe(true);
    expect(isQuoteState("vendida")).toBe(false);
    expect(quoteStateLabel("en-gestion")).toBe("En gestión");
    expect(quoteReference(new Date("2026-11-10T00:00:00Z"), "abc123")).toBe("AC-2026-ABC123");
    const labels = new Map([["11111111-1111-4111-8111-111111111111", "Color: Caramelo"]]);
    expect(readableVariant("11111111-1111-4111-8111-111111111111", labels)).toBe("Color: Caramelo");
    expect(readableVariant("Color: Caramelo", labels)).toBe("Color: Caramelo");
    expect(readableVariant("22222222-2222-4222-8222-222222222222", labels)).toBe("Variante ya no está en el catálogo");
    expect(quoteNext("nueva").status).toBe("en-gestion");
    expect(quoteNext("cerrada").label).toBe("Volver a abrir");
    const now = new Date("2026-11-11T20:00:00Z");
    expect(quoteAgo(new Date("2026-11-11T19:00:00Z"), now)).toBe("Hace 1 hora");
    expect(quoteAgo(new Date("2026-10-26T20:00:00Z"), now)).toBe("Hace 16 días");
    expect(byArrival([{ arrived: 1 }, { arrived: 5 }, { arrived: 3 }]).map((item) => item.arrived)).toEqual([5, 3, 1]);
    expect(quoteContactProblem("12345678", "")).toMatch(/WhatsApp/);
    expect(quoteContactProblem("", "ana@")).toMatch(/correo/);
    expect(quoteContactProblem("", "ana@tienda.com")).toBe("");
    expect(quoteContactProblem("3001112233", "")).toBe("");
    expect(quoteContactProblem("", "")).toMatch(/WhatsApp o un correo/);
    expect(quoteUpdateMessage(false, false)).toMatch(/nada nuevo/);
    expect(quoteUpdateMessage(false, true)).toMatch(/nota/);
    expect(quoteUpdateMessage(true, false)).toMatch(/estado/);
    expect(quoteMatchesStatuses("cerrada", [])).toBe(true);
    expect(quoteMatchesStatuses("nueva", ["open", "cerrada"])).toBe(true);
    expect(quoteMatchesStatuses("cerrada", ["open"])).toBe(false);
    expect(quoteMatchesStatuses("atendida", ["nueva", "cerrada"])).toBe(false);
    expect(quoteOrigin("/producto/bolso")).toBe("/producto/bolso");
    expect(quoteOrigin("/cotizacion")).toBe("/cotizacion");
    expect(quoteOrigin("https://tienda.ejemplo/producto/bolso")).toBe("");
    expect(quoteLineProblem({ productName: "Bolso", productAvailability: "sold_out", variantAvailability: null, hasVariants: true, variantId: "" })).toMatch(/agotado/);
    expect(quoteLineProblem({ productName: "Bolso", productAvailability: "available", variantAvailability: null, hasVariants: true, variantId: "" })).toMatch(/variante/);
    expect(quoteLineProblem({ productName: "Bolso", productAvailability: "available", variantAvailability: "available", hasVariants: true, variantId: "v1" })).toBe("");
    expect(quoteAgeDays(new Date("2026-11-09T20:00:00Z"), now)).toBe(2);
    expect(quoteUnmanaged("nueva", new Date("2026-11-09T19:00:00Z"), 2, now)).toBe(true);
    expect(quoteUnmanaged("nueva", new Date("2026-11-10T20:00:00Z"), 2, now)).toBe(false);
    expect(quoteUnmanaged("en-gestion", new Date("2026-11-01T20:00:00Z"), 15, now)).toBe(false);
    expect(quoteManagerLabel("", new Map(), "nueva")).toBe("Nadie la ha tomado");
    expect(quoteManagerLabel("ana@tienda.com", new Map([["ana@tienda.com", "Ana"]]), "en-gestion")).toBe("La gestiona Ana");
    expect(quoteStepRecord("paso-cotizacion-en-gestion")).toBe("Pasó a En gestión");
    expect(quoteStepRecord("anoto-cotizacion")).toBe("");
    expect(retentionCutoff(365, now)?.toISOString()).toBe("2025-11-11T20:00:00.000Z");
    expect(retentionCutoff(0, now)).toBeNull();
  });
});

describe("hero", () => {
  it("exige diapositivas para el carrusel", () => {
    expect(heroProblem("carousel", 0)).toBeTruthy();
    expect(heroProblem("image", 0)).toBeNull();
    expect(heroProblem("otro", 1)).toBeTruthy();
  });
});

describe("seo", () => {
  it("canonicaliza sin query y no inventa oferta cuando el precio se consulta", () => {
    expect(canonicalPath("/producto/camisa?utm_source=qr")).toBe("/producto/camisa");
    expect(catalogCanonical({})).toBe("/catalogo");
    expect(catalogCanonical({ q: "bolso", pagina: "2", utm_source: "qr" })).toBe("/catalogo?q=bolso&pagina=2");
    expect(catalogCanonical({ pagina: "1" }, 1)).toBe("/catalogo");
    const place = organizationJsonLd({ name: "Tiendaya", url: "https://catalogo.ejemplo", city: "Valledupar", region: "Cesar", country: "Colombia", phone: "", image: "", address: "Edificio Portobelo", hours: "Lunes a sábado" });
    expect(place.address).toMatchObject({ streetAddress: "Edificio Portobelo", addressLocality: "Valledupar" });
    expect(place.openingHours).toBe("Lunes a sábado");
    const bare = organizationJsonLd({ name: "Tiendaya", url: "https://catalogo.ejemplo", city: "", region: "", country: "", phone: "", image: "" });
    expect(bare.address).toBeUndefined();
    expect(bare.openingHours).toBeUndefined();
    expect(publicUrlProblem("")).toBe("");
    expect(publicUrlProblem("https://catalogo.ejemplo/")).toBe("");
    expect(publicUrlProblem("http://catalogo.ejemplo")).toMatch(/https/);
    expect(publicUrlProblem("https://catalogo.ejemplo/tienda")).toMatch(/dominio/);
    expect(catalogOrigin("")).toMatch(/^https?:\/\//);
    expect(catalogOrigin("https://catalogo.ejemplo")).toBe("https://catalogo.ejemplo");
    expect(publicUrlProblem("https://www.trinitarias.co")).toBe("");
    expect(publicUrlProblem("https://www.trinitarias.co/")).toBe("");
    expect(catalogOrigin("https://www.trinitarias.co")).toBe("https://www.trinitarias.co");
    expect(catalogOrigin("https://www.trinitarias.co/")).toBe("https://www.trinitarias.co");
    const store = organizationJsonLd({
      name: "TRINITARIAS",
      url: "https://www.trinitarias.co",
      city: "Valledupar",
      region: "Cesar",
      country: "CO",
      phone: "",
      image: "",
    });
    expect(store).toMatchObject({ "@type": "LocalBusiness", name: "TRINITARIAS", url: "https://www.trinitarias.co" });
    expect(titled("Bolso | Tiendaya", "Tiendaya")).toEqual({ absolute: "Bolso | Tiendaya" });
    expect(titled("Bolsos", "Tiendaya")).toBe("Bolsos");
    expect(titled("Bolso Aitana", "TRINITARIAS")).toBe("Bolso Aitana");
    expect(titled("Bolso | TRINITARIAS", "TRINITARIAS")).toEqual({ absolute: "Bolso | TRINITARIAS" });
    const ask = productJsonLd({ name: "Servicio", description: "Asesoría", sku: "S1", image: [], url: "https://catalogo.ejemplo/producto/servicio", price: null, priceMode: "ask", availability: "available", kind: "service", store: "Andario" });
    expect(ask.offers).toBeUndefined();
    expect(ask["@type"]).toBe("Service");
    const product = productJsonLd({ name: "Camisa", description: "Lino", sku: "C1", image: ["https://res.cloudinary.com/demo/image.jpg"], url: "https://catalogo.ejemplo/producto/camisa", price: 80000, priceMode: "fixed", availability: "sold_out", kind: "physical", store: "Andario" });
    expect(product.offers).toMatchObject({ price: "80000", availability: "https://schema.org/OutOfStock" });
    const branded = productJsonLd({
      name: "Bolso",
      description: "Accesorio",
      sku: "B1",
      image: [],
      url: "https://www.trinitarias.co/producto/bolso",
      price: 10000,
      priceMode: "fixed",
      availability: "available",
      kind: "physical",
      store: "TRINITARIAS",
    });
    expect(branded.brand).toEqual({ "@type": "Brand", name: "TRINITARIAS" });
    expect(JSON.stringify(branded)).not.toMatch(/Tiendaya/i);
    const crumbs = breadcrumbJsonLd([{ name: "Inicio", url: "https://catalogo.ejemplo" }]);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
  });
});

describe("ficha: presentación universal", () => {
  it("decide bloques y precios sin lógica por categoría", () => {
    expect(fichaShowQuantity()).toBe(true);
    expect(fichaShowQuantity({ kind: "physical", priceMode: "fixed" })).toBe(true);
    expect(fichaShowQuantity({ kind: "service", priceMode: "ask" })).toBe(false);
    expect(fichaShowQuantity({ kind: "service", priceMode: "fixed" })).toBe(true);
    expect(fichaShowQuantity({ kind: "digital", priceMode: "fixed" })).toBe(true);
    expect(fichaShowGalleryControls(1)).toBe(false);
    expect(fichaShowGalleryControls(2)).toBe(true);
    expect(fichaShowBlock("")).toBe(false);
    expect(fichaShowBlock("  ")).toBe(false);
    expect(fichaShowBlock("Resumen")).toBe(true);
    expect(fichaShowBlock([])).toBe(false);
    expect(fichaShowBlock([{ id: "1" }])).toBe(true);
    expect(fichaPrimaryTag(["destacado", "nuevo"])).toBe("nuevo");
    expect(fichaPrimaryTag([])).toBe("");
    expect(fichaAvailabilityLabel("sold_out")).toBe("Agotado");
    expect(fichaAvailabilityLabel("made_to_order")).toBe("Bajo pedido");
    expect(fichaAvailabilityLabel("available")).toBe("Disponible");
    expect(fichaPriceLabel({ priceMode: "ask", unit: null, symbol: "$" })).toBe("Consultar precio");
    expect(fichaPriceLabel({ priceMode: "from", unit: 10000, symbol: "$" })).toMatch(/^Desde /);
    expect(fichaPriceLabel({ priceMode: "fixed", unit: 220000, symbol: "$" })).toBe("$220.000");
    expect(fichaCompareLabel({ comparePesos: 240000, unit: 220000, symbol: "$" })).toBe("$240.000");
    expect(fichaCompareLabel({ comparePesos: 200000, unit: 220000, symbol: "$" })).toBe("");
    expect(fichaPrimaryAction({ hasWhatsApp: true, soldOut: false })).toBe("whatsapp");
    expect(fichaPrimaryAction({ hasWhatsApp: true, soldOut: true })).toBe("quote");
    expect(fichaPrimaryAction({ hasWhatsApp: false, soldOut: false })).toBe("quote");
    expect(fichaConversionPrimary({ cartEligible: true, hasWhatsApp: true, soldOut: false })).toBe("cart");
    expect(fichaConversionPrimary({ cartEligible: false, hasWhatsApp: true, soldOut: false })).toBe("whatsapp");
    expect(fichaConversionPrimary({ cartEligible: false, hasWhatsApp: false, soldOut: true })).toBe("quote");
    expect(
      fichaConversionPrimary({
        cartEligible: true,
        hasWhatsApp: true,
        soldOut: false,
        priceMode: "ask",
      }),
    ).toBe("whatsapp");
    expect(
      fichaConversionPrimary({
        cartEligible: true,
        hasWhatsApp: false,
        soldOut: false,
        priceMode: "ask",
      }),
    ).toBe("quote");
  });

  it("marca opciones inalcanzables sin inventar variantes", () => {
    const values = [
      { variantId: "v1", attributeId: "color", optionId: "blanco" },
      { variantId: "v1", attributeId: "talla", optionId: "queen" },
      { variantId: "v2", attributeId: "color", optionId: "gris" },
      { variantId: "v2", attributeId: "talla", optionId: "king" },
    ];
    const variants = [
      { id: "v1", availability: "available" },
      { id: "v2", availability: "sold_out" },
    ];
    expect(
      fichaOptionReachable({
        attributeId: "talla",
        optionId: "king",
        picked: { color: "blanco" },
        values,
        variants,
      }).reachable,
    ).toBe(false);
    expect(
      fichaOptionReachable({
        attributeId: "talla",
        optionId: "queen",
        picked: { color: "blanco" },
        values,
        variants,
      }),
    ).toEqual({ reachable: true, allSoldOut: false });
    expect(
      fichaOptionReachable({
        attributeId: "talla",
        optionId: "king",
        picked: { color: "gris" },
        values,
        variants,
      }),
    ).toEqual({ reachable: true, allSoldOut: true });
  });
});

describe("navegación principal", () => {
  it("marca el flujo de catálogo y usa aria-current solo en la ruta del enlace", () => {
    expect(shopNavCatalogActive("/catalogo")).toBe(true);
    expect(shopNavCatalogActive("/categoria/moda")).toBe(true);
    expect(shopNavCatalogActive("/categoria/moda/bolsos")).toBe(true);
    expect(shopNavCatalogActive("/producto/edredon-aura-acolchado")).toBe(true);
    expect(shopNavCatalogActive("/carrito")).toBe(false);
    expect(shopNavCatalogActive("/sobre-nosotros")).toBe(false);
    expect(shopNavBusinessActive("/sobre-nosotros")).toBe(true);
    expect(shopNavBusinessActive("/catalogo")).toBe(false);
    expect(shopNavAriaCurrent("/catalogo", "/catalogo")).toBe("page");
    expect(shopNavAriaCurrent("/catalogo?q=bolso", "/catalogo")).toBeUndefined();
    expect(shopNavAriaCurrent("/producto/camisa", "/catalogo")).toBeUndefined();
    expect(shopNavAriaCurrent("/sobre-nosotros", "/sobre-nosotros")).toBe("page");
  });
});

describe("carrito comercial", () => {
  const base = {
    productId: "p1",
    name: "Camisa Lino",
    priceMode: "fixed",
    unitPesos: 80000,
    currencySymbol: "$",
    availability: "available",
  };

  it("aísla por tienda y descarta versiones o datos inválidos", () => {
    expect(cartStoreId(1, "https://catalogo.ejemplo/")).toBe("1:https://catalogo.ejemplo");
    const a = emptyCart("1:a");
    const withItem = addCartItem(a, { ...base, quantity: 2 });
    expect(parseCart(serializeCart(withItem), "1:b").items).toEqual([]);
    expect(parseCart('{"version":99,"storeId":"1:a","items":[]}', "1:a").items).toEqual([]);
    expect(parseCart("{no-json", "1:a").storeId).toBe("1:a");
    expect(parseCart(serializeCart(withItem), "1:a").version).toBe(CART_VERSION);
  });

  it("agrega, consolida, separa variantes y calcula subtotales", () => {
    expect(cartEligible({ needsChoice: true, availability: "available" })).toBe(false);
    expect(cartEligible({ needsChoice: false, availability: "sold_out" })).toBe(false);
    expect(cartEligible({ needsChoice: false, availability: "made_to_order" })).toBe(true);
    expect(clampCartQuantity(0)).toBe(1);
    expect(clampCartQuantity(99)).toBe(20);

    let state = emptyCart("1:demo");
    state = addCartItem(state, { ...base, quantity: 1 });
    state = addCartItem(state, { ...base, quantity: 2 });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
    expect(cartUnitCount(state.items)).toBe(3);
    expect(cartLineKey("p1", "v1")).not.toBe(cartLineKey("p1", "v2"));

    state = addCartItem(state, { ...base, variantId: "v1", variantLabel: "M", quantity: 1 });
    expect(state.items).toHaveLength(2);

    state = setCartQuantity(state, "p1", undefined, 5);
    expect(state.items.find((item) => !item.variantId)?.quantity).toBe(5);
    expect(cartLineSubtotal(state.items.find((item) => !item.variantId)!)).toBe(400000);

    const askLine = addCartItem(emptyCart("1:demo"), {
      ...base,
      productId: "p2",
      name: "Servicio",
      priceMode: "ask",
      unitPesos: 0,
      quantity: 1,
    }).items[0];
    expect(cartPriceLabel(askLine)).toBe("Consultar precio");
    expect(cartLineSubtotal(askLine)).toBeNull();

    const mixed = [
      { ...base, quantity: 1, updatedAt: 1 },
      { ...askLine, updatedAt: 2 },
    ];
    const totals = cartTotals(mixed);
    expect(totals.pricedCount).toBe(1);
    expect(totals.quoteCount).toBe(1);
    expect(formatCartSubtotal(totals)).toBe("$80.000");

    state = removeCartItem(state, "p1", "v1");
    expect(state.items.every((item) => item.variantId !== "v1")).toBe(true);

    const sold = addCartItem(emptyCart("1:demo"), { ...base, availability: "sold_out", quantity: 1 });
    expect(sold.items).toHaveLength(0);

    expect(cartNavLabel(0)).toBe("Carrito");
    expect(cartNavLabel(1)).toBe("Carrito, 1 unidad seleccionada");
    expect(cartNavLabel(3)).toBe("Carrito, 3 unidades seleccionadas");
    expect(cartCountLabel(2, 3)).toBe("2 productos · 3 unidades");
    expect(cartCountLabel(1, 1)).toBe("1 producto · 1 unidad");
    expect(cartNeedsQuote([{ priceMode: "fixed", unitPesos: 1000 }])).toBe(false);
    expect(cartNeedsQuote([{ priceMode: "ask", unitPesos: null }])).toBe(true);
    expect(cartNeedsQuote([{ priceMode: "fixed", unitPesos: null }])).toBe(true);
    expect(cartUnitPriceLabel({ ...base, quantity: 1, updatedAt: 1, priceMode: "ask", unitPesos: null })).toBe(
      "Consultar precio",
    );
    expect(cartRequestLines([{ productId: "p1", variantId: "v1", quantity: 2 }])).toEqual([
      { productId: "p1", variantId: "v1", quantity: 2 },
    ]);
    expect(cartRequestLines([{ productId: "p1", quantity: 99 }])[0].quantity).toBe(20);
  });
});

describe("teléfono público parametrizado", () => {
  it("normaliza a +57… sin inventar otro número", () => {
    expect(internationalPhoneDigits("3213660046")).toBe("573213660046");
    expect(internationalPhoneDigits("573213660046")).toBe("573213660046");
    expect(internationalPhoneDigits("+57 321 366 0046")).toBe("573213660046");
    expect(formatPublicPhone("3213660046")).toBe("+573213660046");
    expect(telHref("3213660046")).toBe("tel:+573213660046");
  });
});

describe("entrega de medios", () => {
  it("inserta f_auto/q_auto/w_ en Cloudinary sin tocar URLs ajenas", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v1/andario/media/foto.png";
    const out = mediaDeliveryUrl(src, { width: 640, height: 640, crop: "fill" });
    expect(out).toContain("/upload/f_auto,q_auto,w_640,h_640,c_fill/");
    expect(mediaDeliveryUrl("https://example.com/a.png", { width: 100 })).toBe("https://example.com/a.png");
    expect(mediaDeliveryUrl("", { width: 100 })).toBe("");
  });
});

