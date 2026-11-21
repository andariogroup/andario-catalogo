export const ROLES = ["admin", "catalog", "marketing", "commercial"] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = [
  "users",
  "brand",
  "content",
  "categories",
  "products",
  "attributes",
  "media",
  "quotes",
  "analytics",
  "seo",
  "integrations",
  "settings",
  "promos",
] as const;
export type AppModule = (typeof MODULES)[number];
export type Access = "none" | "read" | "limited" | "write" | "manage";

const RANK: Record<Access, number> = { none: 0, limited: 1, read: 2, write: 3, manage: 4 };

const MATRIX: Record<Role, Record<AppModule, Access>> = {
  admin: {
    users: "manage",
    brand: "manage",
    content: "manage",
    categories: "manage",
    products: "manage",
    attributes: "manage",
    media: "manage",
    quotes: "manage",
    analytics: "manage",
    seo: "manage",
    integrations: "manage",
    settings: "manage",
    promos: "manage",
  },
  catalog: {
    users: "none",
    brand: "none",
    content: "none",
    categories: "write",
    products: "write",
    attributes: "write",
    media: "write",
    quotes: "none",
    analytics: "limited",
    seo: "none",
    integrations: "none",
    settings: "none",
    promos: "write",
  },
  marketing: {
    users: "none",
    brand: "none",
    content: "write",
    categories: "read",
    products: "read",
    attributes: "read",
    media: "write",
    quotes: "none",
    analytics: "read",
    seo: "write",
    integrations: "write",
    settings: "none",
    promos: "write",
  },
  commercial: {
    users: "none",
    brand: "none",
    content: "none",
    categories: "read",
    products: "read",
    attributes: "read",
    media: "read",
    quotes: "manage",
    analytics: "read",
    seo: "none",
    integrations: "none",
    settings: "none",
    promos: "none",
  },
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function access(role: Role, module: AppModule): Access {
  return MATRIX[role][module];
}

export function allows(role: Role, module: AppModule, needed: Access): boolean {
  const current = access(role, module);
  if (needed === "limited") return current === "limited" || RANK[current] >= RANK.read;
  if (current === "limited") return needed === "read" ? false : RANK.limited >= RANK[needed];
  return RANK[current] >= RANK[needed];
}

export function seesQuoteContacts(role: Role): boolean {
  return allows(role, "quotes", "read");
}
