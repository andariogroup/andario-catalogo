import { expect, test } from "@playwright/test";
import path from "node:path";

const evidenceDir = path.join("docs", "audits", "evidence", "purchase-info");
const productPath = "/producto/o-boticario-nativa-spa-acai-crema-hidratante-de-manos-75-g";

test.describe("información para tu compra", () => {
  test("ficha física consulta envíos y cambios y vuelve al producto", async ({ page }) => {
    await page.goto(productPath);
    await expect(page.getByRole("heading", { name: "Información para tu compra" })).toBeVisible();
    await expect(page.locator(".ficha-policies")).toHaveCount(0);

    const shipping = page.locator("details.ficha-purchase-item", { hasText: "Envíos y entregas" });
    const changes = page.locator("details.ficha-purchase-item", { hasText: "Cambios y devoluciones" });
    await expect(shipping).toHaveCount(1);
    await expect(changes).toHaveCount(1);
    await expect(shipping).not.toHaveJSProperty("open", true);
    await expect(changes).not.toHaveJSProperty("open", true);

    await shipping.locator("summary").click();
    await expect(shipping).toHaveJSProperty("open", true);
    await expect(changes).toHaveJSProperty("open", false);
    await expect(shipping.locator(".ficha-purchase-body")).toContainText("Consulta las condiciones de entrega");
    const shippingLink = shipping.getByRole("link", { name: "Ver la política completa" });
    await expect(shippingLink).toHaveAttribute("href", new RegExp(`^/politicas/envios\\?desde=${encodeURIComponent(productPath)}$`));

    await shippingLink.click();
    await expect(page).toHaveURL(/\/politicas\/envios\?desde=/);
    await expect(page.getByRole("heading", { level: 1, name: "Entregas y envíos" })).toBeVisible();
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/politicas\/envios$/);
    await expect(canonical).not.toHaveAttribute("href", /localhost|127\.0\.0\.1/);
    const back = page.getByRole("link", { name: "Volver al producto" });
    await expect(back).toHaveAttribute("href", productPath);
    await back.click();
    await expect(page).toHaveURL(new RegExp(`${productPath}$`));

    await changes.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(changes).toHaveJSProperty("open", true);
    await expect(shipping).toHaveJSProperty("open", false);
    await changes.getByRole("link", { name: "Ver la política completa" }).click();
    await expect(page).toHaveURL(/\/politicas\/cambios\?desde=/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al producto" })).toHaveAttribute("href", productPath);
  });

  test("términos y privacidad siguen en el pie y la cotización", async ({ page }) => {
    await page.goto(productPath);
    const footer = page.getByRole("navigation", { name: "Pie del catálogo" });
    await expect(footer.getByRole("link", { name: "Términos", exact: true })).toHaveAttribute("href", "/politicas/terminos");
    await expect(footer.getByRole("link", { name: "Privacidad", exact: true })).toHaveAttribute("href", "/politicas/privacidad");
    await footer.getByRole("link", { name: "Términos", exact: true }).click();
    await expect(page).toHaveURL(/\/politicas\/terminos$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al producto" })).toHaveCount(0);
    await page.goto("/politicas/privacidad");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/politicas\/privacidad$/);
  });

  test("un retorno inseguro no muestra el enlace de vuelta", async ({ page }) => {
    for (const desde of ["https://evil.example/producto/x", "http://localhost:3020/producto/x", "/admin", "/producto/../admin"]) {
      await page.goto(`/politicas/envios?desde=${encodeURIComponent(desde)}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: "Volver al producto" })).toHaveCount(0);
    }
  });

  test("la acción comercial principal sigue visible", async ({ page }) => {
    await page.goto(productPath);
    const primary = page.locator(".ficha-cta-primary");
    await expect(primary.first()).toBeVisible();
    const purchase = page.locator(".ficha-purchase");
    const primaryBox = await primary.first().boundingBox();
    const purchaseBox = await purchase.boundingBox();
    expect(primaryBox && purchaseBox && primaryBox.y < purchaseBox.y).toBeTruthy();
  });

  test("ficha y políticas no desbordan en 390, 768 y 1440", async ({ page }) => {
    for (const width of [390, 768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(productPath);
      await page.locator(".ficha-purchase").scrollIntoViewIfNeeded();
      const productScroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(productScroll).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: path.join(evidenceDir, `ficha-${width}.png`),
        fullPage: false,
      });
      await page.goto(`/politicas/envios?desde=${encodeURIComponent(productPath)}`);
      await expect(page.getByRole("heading", { level: 1, name: "Entregas y envíos" })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      const policyScroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(policyScroll).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: path.join(evidenceDir, `politica-${width}.png`),
        fullPage: false,
      });
    }
  });
});
