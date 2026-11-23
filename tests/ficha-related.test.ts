import { describe, expect, it } from "vitest";
import { fichaPriceLabel, fichaPriceNote, fichaProseBlocks } from "@/lib/ficha-presentation";
import { rankRelatedProducts, type RelatedCandidate } from "@/lib/ficha-related";

function item(partial: Partial<RelatedCandidate> & Pick<RelatedCandidate, "id" | "name">): RelatedCandidate {
  return {
    categoryId: "sub",
    featured: false,
    sortOrder: 0,
    status: "active",
    ...partial,
  };
}

describe("recomendaciones de la ficha", () => {
  const base = {
    currentId: "actual",
    categoryId: "sub",
    parentId: "padre",
    siblingCategoryIds: ["hermana"],
  };

  it("prioriza la misma categoría, luego la familia y deja fuera al producto actual", () => {
    const picked = rankRelatedProducts({
      ...base,
      candidates: [
        item({ id: "actual", name: "Actual" }),
        item({ id: "hermana-1", name: "Hermana", categoryId: "hermana", sortOrder: 1 }),
        item({ id: "misma-2", name: "Misma B", sortOrder: 2 }),
        item({ id: "misma-1", name: "Misma A", sortOrder: 1 }),
        item({ id: "padre-1", name: "Del padre", categoryId: "padre" }),
        item({ id: "star", name: "Destacado", categoryId: "otra", featured: true, sortOrder: 9 }),
        item({ id: "baja", name: "Borrador", status: "draft", featured: true }),
        item({ id: "vacio", name: "  ", featured: true }),
        item({ id: "misma-1", name: "Duplicada", sortOrder: 0 }),
      ],
    });
    expect(picked.map((row) => row.id)).toEqual(["misma-1", "misma-2", "padre-1", "hermana-1"]);
  });

  it("muestra dos, uno o ninguno sin relleno ajeno", () => {
    expect(rankRelatedProducts({
      ...base,
      candidates: [
        item({ id: "a", name: "A" }),
        item({ id: "b", name: "B", sortOrder: 3 }),
      ],
    }).map((row) => row.id)).toEqual(["a", "b"]);

    expect(rankRelatedProducts({
      ...base,
      candidates: [item({ id: "solo", name: "Solo destacado", categoryId: "otra", featured: true })],
    }).map((row) => row.id)).toEqual(["solo"]);

    expect(rankRelatedProducts({
      ...base,
      candidates: [item({ id: "ajeno", name: "Ajeno", categoryId: "otra", featured: false })],
    })).toEqual([]);
  });

  it("no cambia el orden entre dos evaluaciones iguales", () => {
    const candidates = [
      item({ id: "b", name: "Beta", sortOrder: 2 }),
      item({ id: "a", name: "Alfa", sortOrder: 2 }),
    ];
    const first = rankRelatedProducts({ ...base, candidates }).map((row) => row.id);
    const second = rankRelatedProducts({ ...base, candidates }).map((row) => row.id);
    expect(first).toEqual(second);
    expect(first).toEqual(["a", "b"]);
  });
});

describe("presentación comercial de la ficha", () => {
  it("reserva la nota de referencia para el precio desde", () => {
    expect(fichaPriceNote("fixed")).toBe("");
    expect(fichaPriceNote("ask")).toBe("");
    expect(fichaPriceNote("from")).toMatch(/orientativo/i);
    expect(fichaPriceLabel({ priceMode: "ask", unit: 1000, symbol: "$" })).toBe("Consultar precio");
    expect(fichaPriceLabel({ priceMode: "from", unit: 1000, symbol: "$" })).toMatch(/^Desde /);
    expect(fichaPriceLabel({ priceMode: "fixed", unit: 1000, symbol: "$" })).not.toMatch(/Desde|Consultar/);
  });

  it("respeta párrafos y listas sin inventar secciones", () => {
    const blocks = fichaProseBlocks("Primera línea.\nSigue.\n\n- Suave\n- Ligera\n\n1. Abrir\n2. Aplicar");
    expect(blocks).toEqual([
      { type: "p", text: "Primera línea.\nSigue." },
      { type: "ul", items: ["Suave", "Ligera"] },
      { type: "ol", items: ["Abrir", "Aplicar"] },
    ]);
    expect(fichaProseBlocks("   ")).toEqual([]);
    expect(fichaProseBlocks("Texto único sin cortes.").map((block) => block.type === "p" ? block.text : "")).toEqual(["Texto único sin cortes."]);
  });
});
