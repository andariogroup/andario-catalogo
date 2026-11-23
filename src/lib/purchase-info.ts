/** Apartados de compra de la ficha. Solo enlazan políticas ya publicadas. */

export type PurchaseSection = {
  id: "envios" | "cambios";
  title: string;
  summary: string;
  href: string;
  icon: "delivery" | "access" | "return";
};

export type PurchaseKind = "physical" | "digital" | "service" | "intangible";

export function purchaseKind(kind: string): PurchaseKind {
  const value = kind.trim().toLowerCase();
  if (value === "digital") return "digital";
  if (value === "service" || value === "servicio") return "service";
  if (value === "intangible" || value === "plan") return "intangible";
  return "physical";
}

/** Ruta de regreso solo si apunta a una ficha de este catálogo. */
export function policyReturnPath(value: string | undefined): string {
  const path = (value ?? "").trim();
  if (!/^\/producto\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return "";
  return path;
}

export function purchasePolicyHref(slug: "envios" | "cambios", productPath: string) {
  const back = policyReturnPath(productPath);
  const base = `/politicas/${slug}`;
  return back ? `${base}?desde=${encodeURIComponent(back)}` : base;
}

/**
 * Envíos y cambios según el tipo comercial y las políticas publicadas.
 * No inventa costos, plazos ni garantías.
 */
export function purchaseInfoSections(input: { kind: string; policies: string[]; productPath?: string }): PurchaseSection[] {
  const family = purchaseKind(input.kind);
  const published = new Set(input.policies);
  const productPath = input.productPath ?? "";
  const sections: PurchaseSection[] = [];
  if (published.has("envios")) {
    sections.push(deliverySection(family, purchasePolicyHref("envios", productPath)));
  }
  if (published.has("cambios")) {
    sections.push(changeSection(family, purchasePolicyHref("cambios", productPath)));
  }
  return sections;
}

function deliverySection(family: PurchaseKind, href: string): PurchaseSection {
  if (family === "digital") {
    return {
      id: "envios",
      title: "Entrega y acceso",
      summary: "Consulta cómo se entrega o cómo accedes a este producto.",
      href,
      icon: "access",
    };
  }
  if (family === "service") {
    return {
      id: "envios",
      title: "Prestación",
      summary: "Consulta las condiciones de prestación aplicables a este servicio.",
      href,
      icon: "access",
    };
  }
  if (family === "intangible") {
    return {
      id: "envios",
      title: "Acceso",
      summary: "Consulta las condiciones de acceso aplicables.",
      href,
      icon: "access",
    };
  }
  return {
    id: "envios",
    title: "Envíos y entregas",
    summary: "Consulta las condiciones de entrega, cobertura, costos y plazos aplicables.",
    href,
    icon: "delivery",
  };
}

function changeSection(family: PurchaseKind, href: string): PurchaseSection {
  if (family === "service") {
    return {
      id: "cambios",
      title: "Cambios y cancelaciones",
      summary: "Consulta las condiciones de cambios o cancelación.",
      href,
      icon: "return",
    };
  }
  if (family === "digital" || family === "intangible") {
    return {
      id: "cambios",
      title: "Cambios",
      summary: "Consulta las condiciones de cambios aplicables.",
      href,
      icon: "return",
    };
  }
  return {
    id: "cambios",
    title: "Cambios y devoluciones",
    summary: "Consulta las condiciones de cambios, devoluciones y garantías.",
    href,
    icon: "return",
  };
}
