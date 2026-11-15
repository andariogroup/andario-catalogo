export type CategoryDraft = {
  id: string;
  name: string;
  description: string;
  parentId: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  active: boolean;
  showOnHome: boolean;
  imageUrl: string;
};

export function toCategoryDrafts(rows: Array<{
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  status: string;
  showOnHome: boolean;
  imageUrl: string;
}>): CategoryDraft[] {
  return rows.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    parentId: category.parentId ?? "",
    sortOrder: category.sortOrder,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    active: category.status === "active",
    showOnHome: category.showOnHome,
    imageUrl: category.imageUrl,
  }));
}
