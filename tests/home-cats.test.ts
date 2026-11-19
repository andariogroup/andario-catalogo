import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

describe("tarjetas de categorías (portada)", () => {
  it("alinea desde arriba y reserva dos líneas de título", () => {
    const css = readFileSync(join(root, "app/globals.css"), "utf8");
    expect(css).toMatch(/\.cat-card\s*\{[\s\S]*?align-content:\s*start/);
    expect(css).not.toMatch(/\.cat-card\s*\{[\s\S]*?align-content:\s*end/);
    expect(css).toMatch(/-webkit-line-clamp:\s*2/);
    expect(css).toMatch(/min-height:\s*calc\(1\.15em \* 2\)/);
    expect(css).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
    expect(css).toMatch(/object-fit:\s*cover/);
  });

  it("expone el nombre completo en title del enlace", () => {
    const page = readFileSync(join(root, "app/(tienda)/page.tsx"), "utf8");
    expect(page).toContain("title={category.name}");
    expect(page).toContain('className="home-cats"');
  });
});
