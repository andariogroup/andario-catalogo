/**
 * Tres perfiles de identidad sintéticos para validar tokens parametrizables.
 * No modifican el branding de Tiendaya en Neon.
 */
export type QaBrandProfile = {
  id: "PERFIL_A_SOBRIO" | "PERFIL_B_EXPRESIVO" | "PERFIL_C_MINIMALISTA";
  label: string;
  cssVars: Record<string, string>;
};

export const QA_BRAND_PROFILES: QaBrandProfile[] = [
  {
    id: "PERFIL_A_SOBRIO",
    label: "Sobrio",
    cssVars: {
      "--paper": "#f7f6f3",
      "--ink": "#1c1c1a",
      "--muted": "#5c5c56",
      "--line": "#d8d5ce",
      "--brand": "#2f3a33",
      "--accent": "#6b6358",
      "--radius": "10px",
      "--font-display": '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
      "--font-body": '"Source Sans 3", "Segoe UI", sans-serif',
    },
  },
  {
    id: "PERFIL_B_EXPRESIVO",
    label: "Expresivo",
    cssVars: {
      "--paper": "#fff8f1",
      "--ink": "#1a120c",
      "--muted": "#6a4e3a",
      "--line": "#efd7c0",
      "--brand": "#c4451a",
      "--accent": "#0f766e",
      "--radius": "16px",
      "--font-display": '"Fraunces", Georgia, serif',
      "--font-body": '"DM Sans", "Segoe UI", sans-serif',
    },
  },
  {
    id: "PERFIL_C_MINIMALISTA",
    label: "Minimalista",
    cssVars: {
      "--paper": "#ffffff",
      "--ink": "#111111",
      "--muted": "#6b6b6b",
      "--line": "#e8e8e8",
      "--brand": "#111111",
      "--accent": "#111111",
      "--radius": "4px",
      "--font-display": '"IBM Plex Sans", "Segoe UI", sans-serif',
      "--font-body": '"IBM Plex Sans", "Segoe UI", sans-serif',
    },
  },
];

/** Verifica que un componente de presentación no hardcodea colores de marca. */
export function brandTokenKeys(profile: QaBrandProfile) {
  return Object.keys(profile.cssVars);
}
