import { describe, expect, it } from "vitest";
import { SQL_ACCENT_FROM, SQL_ACCENT_TO, escapeLike, foldText, likePattern, searchTokens } from "@/lib/search";

describe("búsqueda tolerante", () => {
  it("pliega tildes y mayúsculas", () => {
    expect(foldText("Loción Boticário Ñandú")).toBe("locion boticario nandu");
  });

  it("separa en palabras únicas y acotadas", () => {
    expect(searchTokens("  Crema   de manos, crema ")).toEqual(["crema", "de", "manos"]);
    expect(searchTokens("a b c d e f g h")).toHaveLength(6);
    expect(searchTokens("")).toEqual([]);
    expect(searchTokens(undefined)).toEqual([]);
    expect(searchTokens("%%__")).toEqual([]);
  });

  it("escapa comodines de LIKE", () => {
    expect(escapeLike("50%_\\")).toBe("50\\%\\_\\\\");
    expect(likePattern("ab")).toBe("%ab%");
  });

  it("las cadenas de translate() tienen la misma longitud", () => {
    expect([...SQL_ACCENT_FROM].length).toBe([...SQL_ACCENT_TO].length);
  });
});
