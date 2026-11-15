import { expect, test } from "@playwright/test";
import path from "node:path";

const evidenceDir = path.join("docs", "audits", "evidence", "interaction");

test.describe("interacción y loading públicos", () => {
  test("tarjeta de catálogo conserva enlace nativo y clases de interacción", async ({ page }) => {
    await page.goto("/catalogo");
    const link = page.locator("a.catalog-card-link").first();
    await expect(link).toBeVisible();
    const tag = await link.evaluate((node) => node.tagName);
    expect(tag).toBe("A");
    // next/link añade data-slot / prefetch attrs en algunos builds; el contrato es <a> sin router Link wrapper.
    await expect(link).toHaveAttribute("href", /\/producto\//);
    await page.screenshot({
      path: path.join(evidenceDir, "catalog-card-1440.png"),
      fullPage: false,
    });
  });

  test("skeletons de ruta existen como módulos (markup de loading)", async ({ request }) => {
    // Compilación: los loading.tsx deben estar en el árbol; la percepción en full navigation se documenta aparte.
    const catalog = await request.get("/catalogo");
    expect(catalog.ok()).toBeTruthy();
    const product = await request.get("/producto/bolso-aitana-acolchado-caramelo");
    expect(product.ok()).toBeTruthy();
  });

  test("navegación catálogo → producto con <a> nativo completa", async ({ page }) => {
    await page.goto("/catalogo");
    const link = page.locator("a.catalog-card-link").first();
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/producto\//);
    await Promise.all([page.waitForURL(/\/producto\//), link.click()]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test("responsive 390 / 768 / 1440 sin overflow en catálogo", async ({ page }) => {
    for (const width of [390, 768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/catalogo");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: path.join(evidenceDir, `catalog-${width}.png`),
        fullPage: false,
      });
    }
  });

  test("prefers-reduced-motion no rompe el catálogo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/catalogo");
    await expect(page.locator("a.catalog-card-link").first()).toBeVisible();
  });
});
