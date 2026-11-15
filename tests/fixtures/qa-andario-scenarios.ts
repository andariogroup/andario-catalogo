/**
 * Fixtures sintéticos QA_ANDARIO_* — solo datos en memoria.
 * NO se escriben en Neon ni en la demo Tiendaya.
 */
export type QaScenarioId =
  | "QA_ANDARIO_PRODUCT_SIMPLE"
  | "QA_ANDARIO_VARIANTS"
  | "QA_ANDARIO_MADE_TO_ORDER"
  | "QA_ANDARIO_SERVICE"
  | "QA_ANDARIO_DIGITAL"
  | "QA_ANDARIO_VEHICLE"
  | "QA_ANDARIO_PROPERTY"
  | "QA_ANDARIO_B2B"
  | "QA_ANDARIO_UNPUBLISHED";

export type QaProductFixture = {
  id: QaScenarioId;
  name: string;
  kind: "physical" | "digital" | "service";
  priceMode: "fixed" | "from" | "ask";
  pricePesos: number | null;
  availability: "available" | "sold_out" | "made_to_order";
  status: "active" | "draft";
  hasVariants: boolean;
  facts?: { name: string; value: string }[];
};

export const QA_SCENARIOS: QaProductFixture[] = [
  {
    id: "QA_ANDARIO_PRODUCT_SIMPLE",
    name: "QA_ANDARIO Producto simple",
    kind: "physical",
    priceMode: "fixed",
    pricePesos: 45000,
    availability: "available",
    status: "active",
    hasVariants: false,
  },
  {
    id: "QA_ANDARIO_VARIANTS",
    name: "QA_ANDARIO Camiseta variantes",
    kind: "physical",
    priceMode: "fixed",
    pricePesos: 59900,
    availability: "available",
    status: "active",
    hasVariants: true,
  },
  {
    id: "QA_ANDARIO_MADE_TO_ORDER",
    name: "QA_ANDARIO Mueble bajo pedido",
    kind: "physical",
    priceMode: "from",
    pricePesos: 890000,
    availability: "made_to_order",
    status: "active",
    hasVariants: false,
    facts: [
      { name: "Ancho", value: "120 cm" },
      { name: "Material", value: "Roble" },
    ],
  },
  {
    id: "QA_ANDARIO_SERVICE",
    name: "QA_ANDARIO Asesoría profesional",
    kind: "service",
    priceMode: "ask",
    pricePesos: null,
    availability: "available",
    status: "active",
    hasVariants: false,
  },
  {
    id: "QA_ANDARIO_DIGITAL",
    name: "QA_ANDARIO Guía digital",
    kind: "digital",
    priceMode: "fixed",
    pricePesos: 30000,
    availability: "available",
    status: "active",
    hasVariants: false,
  },
  {
    id: "QA_ANDARIO_VEHICLE",
    name: "QA_ANDARIO Vehículo demo",
    kind: "physical",
    priceMode: "fixed",
    pricePesos: 45000000,
    availability: "available",
    status: "active",
    hasVariants: false,
    facts: [
      { name: "Año", value: "2019" },
      { name: "Kilometraje", value: "62000" },
    ],
  },
  {
    id: "QA_ANDARIO_PROPERTY",
    name: "QA_ANDARIO Inmueble demo",
    kind: "physical",
    priceMode: "ask",
    pricePesos: null,
    availability: "available",
    status: "active",
    hasVariants: false,
    facts: [
      { name: "Área", value: "86 m²" },
      { name: "Habitaciones", value: "3" },
    ],
  },
  {
    id: "QA_ANDARIO_B2B",
    name: "QA_ANDARIO Insumo B2B",
    kind: "physical",
    priceMode: "ask",
    pricePesos: null,
    availability: "available",
    status: "active",
    hasVariants: false,
  },
  {
    id: "QA_ANDARIO_UNPUBLISHED",
    name: "QA_ANDARIO Despublicado",
    kind: "physical",
    priceMode: "fixed",
    pricePesos: 10000,
    availability: "available",
    status: "draft",
    hasVariants: false,
  },
];

export const QA_VARIANT_MATRIX = {
  productId: "QA_ANDARIO_VARIANTS",
  attributes: [
    { id: "qa_size", name: "Talla", options: ["S", "M", "L"] },
    { id: "qa_color", name: "Color", options: ["Blanco", "Negro"] },
  ],
  /** Solo combinaciones reales — no inventar el cruce completo. */
  variants: [
    { id: "qa_v1", options: { qa_size: "S", qa_color: "Blanco" }, pricePesos: 59900, availability: "available" },
    { id: "qa_v2", options: { qa_size: "M", qa_color: "Blanco" }, pricePesos: 59900, availability: "available" },
    { id: "qa_v3", options: { qa_size: "L", qa_color: "Negro" }, pricePesos: 64900, availability: "sold_out" },
  ],
} as const;
