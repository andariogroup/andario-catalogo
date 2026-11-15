export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "pieza";
}

export function categoryPath(parentSlug: string | null, slug: string): string {
  return parentSlug ? `/categoria/${parentSlug}/${slug}` : `/categoria/${slug}`;
}
