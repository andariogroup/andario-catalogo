import { describe, expect, it } from "vitest";
import { policyDocument } from "@/lib/policy-prose";
import { policyReturnPath, purchaseInfoSections, purchasePolicyHref } from "@/lib/purchase-info";

const ALL = ["envios", "cambios", "terminos", "privacidad"];

describe("información para tu compra", () => {
  it("muestra envíos y cambios en un producto físico y omite términos y privacidad", () => {
    const sections = purchaseInfoSections({ kind: "physical", policies: ALL, productPath: "/producto/crema-de-manos" });
    expect(sections.map((section) => section.title)).toEqual(["Envíos y entregas", "Cambios y devoluciones"]);
    expect(sections[0].href).toBe("/politicas/envios?desde=%2Fproducto%2Fcrema-de-manos");
    expect(sections.every((section) => !/terminos|privacidad/.test(section.href))).toBe(true);
  });

  it("no habla de transporte físico en un producto digital", () => {
    const sections = purchaseInfoSections({ kind: "digital", policies: ALL });
    expect(sections.map((section) => section.title)).toEqual(["Entrega y acceso", "Cambios"]);
    expect(sections[0].icon).toBe("access");
    expect(sections[0].summary.toLowerCase()).not.toMatch(/cobertura|plazos/);
  });

  it("habla de prestación en un servicio y de acceso en un intangible", () => {
    expect(purchaseInfoSections({ kind: "servicio", policies: ["envios"] })[0].title).toBe("Prestación");
    expect(purchaseInfoSections({ kind: "plan", policies: ["envios"] })[0].title).toBe("Acceso");
  });

  it("oculta el bloque si no hay políticas de envío ni de cambios", () => {
    expect(purchaseInfoSections({ kind: "physical", policies: ["terminos", "privacidad"] })).toEqual([]);
    expect(purchaseInfoSections({ kind: "physical", policies: [] })).toEqual([]);
  });

  it("solo acepta volver a una ficha relativa", () => {
    expect(policyReturnPath("/producto/crema-de-manos")).toBe("/producto/crema-de-manos");
    expect(policyReturnPath("https://trinitarias.co/producto/crema")).toBe("");
    expect(policyReturnPath("http://localhost:3020/producto/crema")).toBe("");
    expect(policyReturnPath("/admin/productos")).toBe("");
    expect(purchasePolicyHref("cambios", "")).toBe("/politicas/cambios");
  });
});

describe("lectura de políticas", () => {
  it("conserva el texto y marca solo los títulos ya escritos", () => {
    const source = "# Política de cambios\n\nÚltima actualización: 18 de noviembre de 2026\n\n1. Plazo\n\nEl plazo se informa en esta política.\n\n2. Estado del producto\n\nDebe conservar su empaque.\n\n3. Exclusiones\n\nNo aplica a productos de higiene abiertos.";
    const document = policyDocument(source);
    expect(document.headings.map((heading) => heading.text)).toEqual(["Política de cambios", "1. Plazo", "2. Estado del producto", "3. Exclusiones"]);
    const visible = document.blocks.map((block) => block.type === "p" || block.type === "h2" ? block.text : block.items.join(" ")).join("\n");
    expect(visible).toContain("El plazo se informa en esta política.");
    expect(visible).toContain("Última actualización: 18 de noviembre de 2026");
    expect(visible).not.toContain("# Política");
  });

  it("no arma índice con menos de tres títulos", () => {
    expect(policyDocument("1. Una sola sección\n\nTexto.").headings).toEqual([]);
  });
});
