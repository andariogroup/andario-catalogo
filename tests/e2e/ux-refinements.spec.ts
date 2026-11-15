import { expect, test } from "@playwright/test";
import path from "node:path";

const evidenceDir = path.join("docs", "audits", "evidence", "implementation");

test.describe("refinamientos UX públicos (solo lectura sobre demo)", () => {
  test("búsqueda sin resultados usa copy contextual y limpia la consulta", async ({ page }) => {
    await page.goto("/catalogo?q=QA_ANDARIO_NO_MATCH_ZZZZ");
    await expect(page.getByRole("heading", { name: /sin resultados/i })).toBeVisible();
    await expect(page.locator(".catalog-empty")).toContainText(/No encontramos resultados para/i);
    await expect(page.locator(".catalog-empty")).toContainText("QA_ANDARIO_NO_MATCH_ZZZZ");
    const clearSearch = page.getByRole("link", { name: /limpiar búsqueda|ver todo el catálogo|explorar catálogo/i }).first();
    await expect(clearSearch).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "after-empty-search-desktop.png"),
      fullPage: true,
    });
    await clearSearch.click();
    await expect(page).toHaveURL(/\/catalogo/);
    await expect(page.locator("a.catalog-card-link").first()).toBeVisible();
  });

  test("producto inexistente ofrece salida al catálogo (404)", async ({ page }) => {
    const response = await page.goto("/producto/qa-andario-unpublished-missing-slug");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /no está disponible/i })).toBeVisible();
    const catalog = page.getByRole("link", { name: /explorar catálogo/i }).first();
    await expect(catalog).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "after-404-desktop.png"),
      fullPage: true,
    });
    await catalog.click();
    await expect(page).toHaveURL(/\/catalogo/);
  });

  test("detalle muestra una acción comercial primaria dominante", async ({ page }) => {
    await page.goto("/catalogo");
    await page.locator("a.catalog-card-link").first().click();
    await expect(page).toHaveURL(/\/producto\//);
    const primary = page.locator(".ficha-cta-primary");
    await expect(primary.first()).toBeVisible();
    expect(await primary.count()).toBeLessThanOrEqual(2);
    const filled = page.locator(".ficha-cta .btn.ficha-cta-primary");
    await expect(filled.first()).toBeVisible();
    await page.screenshot({
      path: path.join(evidenceDir, "after-ficha-cta-desktop.png"),
      fullPage: false,
    });
  });

  test("no muestra WhatsApp flotante en la tienda pública", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/catalogo");
    await expect(page.locator("a.float, .float.chat-btn")).toHaveCount(0);
  });

  test("catálogo responsive 768 y 1440 sin desborde horizontal", async ({ page }) => {
    for (const width of [768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/catalogo");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: path.join(evidenceDir, `after-catalog-${width}.png`),
        fullPage: false,
      });
    }
  });
});
