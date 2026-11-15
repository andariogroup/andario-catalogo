import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No disponible", robots: { index: false, follow: false } };

/** Fallback global (rutas fuera del layout de tienda). */
export default function NotFound() {
  return (
    <main className="wrap section store-not-found">
      <h1>Este contenido no está disponible</h1>
      <p>El enlace puede haber cambiado o la página ya no está publicada.</p>
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
