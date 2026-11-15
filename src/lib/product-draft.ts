export type ProductDraft = {
  id: string;
  name: string;
  sku: string;
  short: string;
  description: string;
  kind: string;
  categoryId: string;
  price: string;
  compare: string;
  priceMode: string;
  status: string;
  availability: string;
  featured: boolean;
  sortOrder: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  photos: { id: string; url: string; alt: string }[];
};

export type Choice = { id: string; name: string };

export type CategoryNode = { id: string; name: string; parentId: string };

export const blankProduct: ProductDraft = {
  id: "",
  name: "",
  sku: "",
  short: "",
  description: "",
  kind: "physical",
  categoryId: "",
  price: "",
  compare: "",
  priceMode: "fixed",
  status: "draft",
  availability: "available",
  featured: false,
  sortOrder: "0",
  seoTitle: "",
  seoDescription: "",
  tags: [],
  photos: [],
};

export function categoryNodes(rows: Array<{ id: string; name: string; parentId: string | null }>): CategoryNode[] {
  return rows.map((row) => ({ id: row.id, name: row.name, parentId: row.parentId ?? "" }));
}
