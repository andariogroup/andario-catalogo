export const HERO_MODES = ["image", "video", "carousel"] as const;
export type HeroMode = (typeof HERO_MODES)[number];

export function heroProblem(mode: string, slideCount: number): string | null {
  if (!(HERO_MODES as readonly string[]).includes(mode)) return "El hero tiene un modo que no existe.";
  if (mode === "carousel" && slideCount < 1) return "El carrusel necesita al menos una diapositiva.";
  return null;
}
