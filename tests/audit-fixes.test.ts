import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("ajustes de la auditoría", () => {
  it("la tienda ofrece salto al contenido y un destino enfocable", () => {
    const frame = read("src/components/catalog/tienda.tsx");
    expect(frame).toContain('href="#contenido"');
    expect(frame).toContain('id="contenido"');
  });

  it("el panel SEO ya no expone el botón flotante que la tienda no muestra", () => {
    expect(read("src/components/admin/seo-form.tsx")).not.toMatch(/floatWhatsapp|floatLabel|floatSide/);
    expect(read("src/actions/content.ts")).not.toMatch(/floatWhatsapp|floatLabel|floatSide/);
  });

  it("la búsqueda usa el filtro tolerante y el conteo es count(*)", () => {
    const store = read("src/lib/store.ts");
    expect(store).toContain("productSearchClause(query.q)");
    expect(store).not.toMatch(/ilike\(products\./);
    expect(store).toMatch(/count\(\)/);
  });

  it("solo la acción principal es fija en móvil; las demás fluyen con la página", () => {
    const ficha = read("src/components/catalog/ficha.tsx");
    const css = read("src/app/public.css");
    expect(ficha).toContain("ficha-cta-extra");
    expect(css).toMatch(/\.shop \.ficha-cta-extra\s*\{/);
    expect(css).toMatch(/@media \(max-width: 720px\)\s*\{[\s\S]*?\.shop \.ficha-cta\s*\{[\s\S]*?position:\s*sticky/);
  });

  it("las vistas se registran sin bloquear la respuesta", () => {
    const events = read("src/lib/events.ts");
    expect(events).toContain("after(");
    for (const page of ["src/app/(tienda)/page.tsx", "src/app/(tienda)/catalogo/page.tsx", "src/app/(tienda)/producto/[slug]/page.tsx"]) {
      expect(read(page)).not.toContain("recordEvent(");
    }
  });

  it("el CSS público no contiene caracteres de reemplazo", () => {
    expect(read("src/app/public.css")).not.toContain("\uFFFD");
  });
});
