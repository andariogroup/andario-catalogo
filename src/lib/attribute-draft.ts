export type AttributeDraft = {
  id: string;
  name: string;
  code: string;
  kind: string;
  unit: string;
  required: boolean;
  visible: boolean;
  filterable: boolean;
  sortOrder: string;
  options: string;
  categoryIds: string[];
};

export type AttributeCard = {
  id: string;
  name: string;
  code: string;
  kind: string;
  visible: boolean;
  filterable: boolean;
  required: boolean;
  optionCount: number;
  optionPreview: string;
  categoryCount: number;
};

export type CategoryOption = { id: string; name: string; depth: number };

export type VariantCard = {
  id: string;
  productId: string;
  productName: string;
  label: string;
  price: string;
  availability: string;
};

export function splitOptionLabels(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 24);
}

export const blankAttribute: AttributeDraft = {
  id: "",
  name: "",
  code: "",
  kind: "text",
  unit: "",
  required: false,
  visible: true,
  filterable: false,
  sortOrder: "0",
  options: "",
  categoryIds: [],
};

/** Sin categorías asignadas = atributo global. Con lista = solo esas categorías. */
export function attributeAppliesToCategory(
  attributeId: string,
  categoryId: string | null | undefined,
  links: { attributeId: string; categoryId: string }[],
) {
  const scoped = links.filter((link) => link.attributeId === attributeId);
  if (!scoped.length) return true;
  if (!categoryId) return false;
  return scoped.some((link) => link.categoryId === categoryId);
}

export function filterAttributesForCategory<T extends { id: string }>(
  items: T[],
  categoryId: string | null | undefined,
  links: { attributeId: string; categoryId: string }[],
) {
  return items.filter((item) => attributeAppliesToCategory(item.id, categoryId, links));
}

export const ATTRIBUTE_KINDS: Record<string, string> = {
  text: "Texto",
  number: "Número",
  decimal: "Decimal",
  boolean: "Sí o no",
  date: "Fecha",
  single: "Una opción",
  multi: "Varias opciones",
};
