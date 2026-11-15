import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "No disponible",
  robots: { index: false, follow: false },
};

/**
 * Estado 404 / no publicado dentro del layout de tienda (ShopFrame).
 * No revela si el slug existió; ofrece salida de navegación clara.
 */
export default function StoreNotFound() {
  return (
    <main className="wrap section store-not-found">
      <h1>Este producto no está disponible</h1>
      <p>
        Puede que el enlace haya cambiado o que la publicación ya no esté activa. Explora el catálogo para seguir
        viendo lo disponible.
      </p>
      <div className="store-not-found-actions">
        <Link className="btn" href="/catalogo">
          Explorar catálogo
        </Link>
        <Link className="quiet" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
