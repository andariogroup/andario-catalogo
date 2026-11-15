import { AdminShell } from "@/components/admin/shell";
import { requireUser } from "@/lib/auth";
import { allows } from "@/lib/permissions";
import { openQuoteCount } from "@/lib/store";

const links = [
  { href: "/admin", label: "Dashboard", module: "analytics" as const, needed: "limited" as const },
  { href: "/admin/negocio", label: "Mi negocio", module: "brand" as const, needed: "read" as const },
  { href: "/admin/apariencia", label: "Apariencia", module: "brand" as const, needed: "read" as const },
  { href: "/admin/inicio", label: "Página de inicio", module: "content" as const, needed: "read" as const },
  { href: "/admin/categorias", label: "Categorías", module: "categories" as const, needed: "read" as const },
  { href: "/admin/productos", label: "Productos", module: "products" as const, needed: "read" as const },
  { href: "/admin/atributos", label: "Atributos y variantes", module: "attributes" as const, needed: "read" as const },
  { href: "/admin/multimedia", label: "Multimedia", module: "media" as const, needed: "read" as const },
  { href: "/admin/cotizaciones", label: "Cotizaciones", module: "quotes" as const, needed: "read" as const },
  { href: "/admin/seo", label: "SEO y configuración", module: "seo" as const, needed: "read" as const },
  { href: "/admin/usuarios", label: "Usuarios", module: "users" as const, needed: "manage" as const },
];

export const metadata = { title: { absolute: "Andario Catálogo" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pending = allows(user.role, "quotes", "read") ? await openQuoteCount() : 0;
  const visible = links.filter((link) => allows(user.role, link.module, link.needed) || (link.module === "analytics" && allows(user.role, "analytics", "limited")));
  return <AdminShell links={visible.map(({ href, label }) => ({ href, label: href === "/admin/cotizaciones" && pending ? `Cotizaciones · ${pending}` : label }))} name={user.name} email={user.email}>{children}</AdminShell>;
}
