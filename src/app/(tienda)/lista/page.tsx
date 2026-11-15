import type { Metadata } from "next";
import { ListaCompra } from "@/components/catalog/lista";
import { catalogOrigin } from "@/lib/seo";
import { loadShell, quoteGuards } from "@/lib/store";

export const metadata: Metadata = { title: "Lista de interés", robots: { index: false, follow: false } };

export default async function InterestPage() {
  const shell = await loadShell();
  if (!shell) return null;
  return (
    <main className="wrap section">
      <h1>Lista de interés</h1>
      <p>
        Guarda piezas para consultarlas juntas. No es un carrito ni una compra: el carrito es el camino principal para
        enviar una solicitud.
      </p>
      <ListaCompra store={shell.business.name} phone={shell.business.whatsapp} catalogUrl={catalogOrigin(shell.settings.publicUrl)} guards={await quoteGuards()} />
    </main>
  );
}
