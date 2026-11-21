/**
 * Búsqueda tolerante para catálogos en español/portugués.
 * - Ignora mayúsculas y tildes ("locion" encuentra "Loción", "boticario" encuentra "Boticário").
 * - Varias palabras = todas deben aparecer (en cualquier orden y en cualquier campo).
 * Sin extensiones de base de datos: se apoya en `translate()` de PostgreSQL.
 */

const ACCENT_PAIRS: [string, string][] = [
  ["á", "a"], ["à", "a"], ["ä", "a"], ["â", "a"], ["ã", "a"],
  ["é", "e"], ["è", "e"], ["ë", "e"], ["ê", "e"],
  ["í", "i"], ["ì", "i"], ["ï", "i"], ["î", "i"],
  ["ó", "o"], ["ò", "o"], ["ö", "o"], ["ô", "o"], ["õ", "o"],
  ["ú", "u"], ["ù", "u"], ["ü", "u"], ["û", "u"],
  ["ñ", "n"], ["ç", "c"], ["ÿ", "y"],
  ["Á", "A"], ["À", "A"], ["Ä", "A"], ["Â", "A"], ["Ã", "A"],
  ["É", "E"], ["È", "E"], ["Ë", "E"], ["Ê", "E"],
  ["Í", "I"], ["Ì", "I"], ["Ï", "I"], ["Î", "I"],
  ["Ó", "O"], ["Ò", "O"], ["Ö", "O"], ["Ô", "O"], ["Õ", "O"],
  ["Ú", "U"], ["Ù", "U"], ["Ü", "U"], ["Û", "U"],
  ["Ñ", "N"], ["Ç", "C"],
];

/** Argumentos de `translate(columna, FROM, TO)`; misma longitud por construcción. */
export const SQL_ACCENT_FROM = ACCENT_PAIRS.map(([from]) => from).join("");
export const SQL_ACCENT_TO = ACCENT_PAIRS.map(([, to]) => to).join("");

export const SEARCH_MAX_LENGTH = 80;
export const SEARCH_MAX_TOKENS = 6;
const TOKEN_MAX_LENGTH = 40;

/** Minúsculas y sin diacríticos; equivale a lo que hace `translate()` en SQL. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

/** Palabras de la consulta ya plegadas; únicas, acotadas y sin vacíos. */
export function searchTokens(query: string | undefined | null): string[] {
  const folded = foldText((query ?? "").slice(0, SEARCH_MAX_LENGTH));
  const words = folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const unique: string[] = [];
  for (const word of words) {
    const token = word.slice(0, TOKEN_MAX_LENGTH);
    if (!unique.includes(token)) unique.push(token);
    if (unique.length >= SEARCH_MAX_TOKENS) break;
  }
  return unique;
}

/** Escapa comodines de LIKE para que `%` y `_` del usuario sean texto literal. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function likePattern(token: string): string {
  return `%${escapeLike(token)}%`;
}
