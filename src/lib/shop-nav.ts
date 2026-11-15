/** Rutas del flujo de catálogo (descubrimiento comercial). */
export function shopNavCatalogActive(path: string): boolean {
  return (
    path === "/catalogo" ||
    path.startsWith("/catalogo/") ||
    path.startsWith("/categoria/") ||
    path.startsWith("/producto/")
  );
}

export function shopNavBusinessActive(path: string): boolean {
  return path === "/sobre-nosotros" || path.startsWith("/sobre-nosotros/");
}

/**
 * `aria-current="page"` solo cuando el enlace es la página (o un hijo directo de su href).
 * En categorías/producto el enlace de catálogo usa clase activa, no aria-current.
 */
export function shopNavAriaCurrent(path: string, href: string): "page" | undefined {
  if (path === href || path.startsWith(`${href}/`)) return "page";
  return undefined;
}
