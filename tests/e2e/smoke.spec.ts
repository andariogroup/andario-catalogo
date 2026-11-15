import { expect, test } from "@playwright/test";

test.describe("smoke público", () => {
  test("portada responde", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });

  test("login del admin se muestra", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("textbox").or(page.locator('input[type="email"]')).first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("robots niega el admin", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toMatch(/Disallow:\s*\/admin/i);
  });

  test("El negocio muestra presentación y contacto", async ({ page }) => {
    const response = await page.goto("/sobre-nosotros");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /catálogo|productos|servicios|soluciones/i }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/este texto se puede|el administrador puede/i);
  });

  test("catálogo y navegación Explorar catálogo", async ({ page }) => {
    const response = await page.goto("/catalogo");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const explore = page.getByRole("navigation", { name: /navegación principal/i }).getByRole("link", { name: /explorar catálogo/i });
    if (await explore.count()) {
      await expect(explore.first()).toBeVisible();
    } else {
      await page.getByRole("button", { name: /menú/i }).click();
      await expect(page.getByRole("link", { name: /explorar catálogo/i }).first()).toBeVisible();
    }
  });

  test("detalle de producto abre y muestra CTA comercial", async ({ page }) => {
    await page.goto("/catalogo");
    const first = page.locator("a.catalog-card-link").first();
    await expect(first).toBeVisible();
    await Promise.all([page.waitForURL(/\/producto\//), first.click()]);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    const add = page.getByRole("button", { name: /agregar al carrito/i });
    const wa = page.getByRole("link", { name: /consultar.*whatsapp/i });
    const quote = page.getByRole("button", { name: /solicitar cotización/i });
    expect((await add.count()) + (await wa.count()) + (await quote.count())).toBeGreaterThan(0);
  });

  test("carrito vacío y headers de seguridad", async ({ page, request }) => {
    const response = await page.goto("/carrito");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: /carrito/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const probe = await request.get("/catalogo");
    expect(probe.headers()["x-content-type-options"]?.toLowerCase()).toBe("nosniff");
    expect(probe.headers()["x-frame-options"]?.toUpperCase()).toBe("DENY");
    expect(probe.headers()["content-security-policy"] || "").toMatch(/default-src/);
  });
});
