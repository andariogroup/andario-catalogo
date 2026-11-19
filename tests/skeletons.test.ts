import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

describe("skeletons públicos", () => {
  it("exporta las piezas aprobadas", () => {
    const source = readFileSync(join(root, "components/catalog/skeletons.tsx"), "utf8");
    for (const name of [
      "InlineActionSpinner",
      "CatalogCardSkeleton",
      "CatalogGridSkeleton",
      "CatalogPageSkeleton",
      "FichaSkeleton",
    ]) {
      expect(source).toContain(`export function ${name}`);
    }
  });

  it("define loading.tsx de catálogo, categoría y ficha", () => {
    const files = [
      "app/(tienda)/catalogo/loading.tsx",
      "app/(tienda)/categoria/[slug]/loading.tsx",
      "app/(tienda)/categoria/[slug]/[child]/loading.tsx",
      "app/(tienda)/producto/[slug]/loading.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).toMatch(/Skeleton/);
    }
  });
});

describe("interacción de tarjeta", () => {
  it("declara zoom 1.03, pressed 0.985 y reduced-motion", () => {
    const css = readFileSync(join(root, "app/public.css"), "utf8");
    expect(css).toContain("scale(1.03)");
    expect(css).toContain("scale(0.985)");
    expect(css).toContain("prefers-reduced-motion");
    // Sin sombra en el bloque hover de la tarjeta (no confundir con otros box-shadow del CSS).
    expect(/\.catalog-card-link:hover[^{]*\{[^}]*box-shadow/.test(css)).toBe(false);
  });
});
